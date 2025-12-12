
import { GoogleGenAI, Type, FunctionDeclaration, Modality, LiveServerMessage } from "@google/genai";
import { FridgeItem, Substitution, WasteScore, StoreLocation } from "../types";

// Ensure API key is available
const apiKey = process.env.API_KEY || '';
if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey });

// --- Helpers ---
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const resizeAndCompressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
            height = height * (MAX_WIDTH / width);
            width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG 0.7 quality which is efficient for API transmission
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Robust JSON parser helper
const parseModelJSON = (text: string) => {
    if (!text) return null;
    
    // 1. Strip Markdown
    let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // 2. Find start of JSON object
    const start = clean.indexOf('{');
    if (start === -1) return null;
    clean = clean.substring(start);

    // 3. Try basic parsing first (fastest)
    try {
        return JSON.parse(clean);
    } catch (e) {
        // 4. If failed (likely due to trailing text), try to find the balancing closing brace
        // This simple counter works well for standard JSON responses without tricky string contents
        let balance = 0;
        let end = -1;
        for (let i = 0; i < clean.length; i++) {
            if (clean[i] === '{') balance++;
            else if (clean[i] === '}') {
                balance--;
                if (balance === 0) {
                    end = i;
                    break;
                }
            }
        }
        
        if (end !== -1) {
            try {
                return JSON.parse(clean.substring(0, end + 1));
            } catch (innerE) {
                // Last resort: try slicing at the last '}' found in the entire string
                const lastBrace = clean.lastIndexOf('}');
                if (lastBrace !== -1) {
                    try {
                        return JSON.parse(clean.substring(0, lastBrace + 1));
                    } catch (finalE) {
                        console.error("Failed to parse JSON:", finalE);
                        return null;
                    }
                }
                return null;
            }
        }
        return null;
    }
};

// --- Fridge Analysis (Image Understanding) ---
export const analyzeFridgeImage = async (file: File, onProgress?: (status: string) => void): Promise<FridgeItem[]> => {
  try {
    if (onProgress) onProgress("Optimizing image...");
    
    // Resize and compress for speed
    const base64Data = await resizeAndCompressImage(file);
    
    if (onProgress) onProgress("Analyzing with Gemini Flash...");

    const imagePart = {
        inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg'
        }
    };
    
    // Improved Prompt for Ingredient Normalization and Categorization
    const prompt = `
You are a food ingredient extraction model.
Analyze the provided image to detect ingredients.
Return a cleaned, normalized, structured list grouped by food categories.

Rules:
- Normalize names (e.g., "bell pepper" -> "Bell Peppers", "eggs" -> "Eggs").
- Remove utensils, packaging, labels, reflections, or non-food items.
- Group items into these specific categories: Produce, Protein, Dairy, Bakery, Pantry, Frozen, Beverages, Other.
- No explanation text, only JSON.

Output JSON structure:
{
  "categories": {
    "produce": ["List of strings"],
    "dairy": ["List of strings"],
    "pantry": ["List of strings"],
    "protein": ["List of strings"],
    "bakery": ["List of strings"],
    "frozen": ["List of strings"],
    "beverages": ["List of strings"],
    "other": ["List of strings"]
  }
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [imagePart, { text: prompt }]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const data = parseModelJSON(response.text);
    if (!data) return [];
    
    const mappedItems: FridgeItem[] = [];

    // Parse the structured category response
    if (data.categories) {
        for (const [key, items] of Object.entries(data.categories)) {
            const lowerKey = key.toLowerCase();
            let category: FridgeItem['category'] = 'Other';

            if (lowerKey === 'produce') category = 'Produce';
            else if (lowerKey === 'protein') category = 'Protein';
            else if (lowerKey === 'dairy') category = 'Dairy';
            else if (lowerKey === 'bakery') category = 'Bakery';
            else if (lowerKey === 'pantry') category = 'Pantry';
            else if (lowerKey === 'frozen') category = 'Frozen';
            else if (lowerKey === 'beverages') category = 'Beverages';
            
            if (Array.isArray(items)) {
                items.forEach((name: string) => {
                    // Title case the ingredient name just in case
                    const cleanName = name.charAt(0).toUpperCase() + name.slice(1);
                    mappedItems.push({
                        name: cleanName,
                        category: category,
                        isPrioritized: false
                    });
                });
            }
        }
    } else if (Array.isArray(data)) {
        // Fallback for older format if model hallucinates schema
        return data.map((item: any) => ({ ...item, isPrioritized: false }));
    }
    
    return mappedItems;
  } catch (error) {
    console.error("Error analyzing fridge:", error);
    throw error;
  }
};

// --- Recipe Generation ---
export const generateRecipes = async (
  ingredients: string[], 
  dietary: string, 
  allergens: string,
  cravings: string[],
  location: {lat: number, lng: number} | null,
  excludeIds: string[] = [],
  prioritizedIngredients: string[] = [],
  savedRecipes: any[] = []
): Promise<any[]> => {
  
  const locationContext = location 
    ? `User Location: Lat ${location.lat}, Lng ${location.lng}. (Infer region to assume common local pantry staples).` 
    : 'Location: Unknown.';

  const priorityContext = prioritizedIngredients.length > 0 
    ? `MUST USE: ${prioritizedIngredients.join(', ')}.` 
    : '';
    
  const savedContext = savedRecipes.length > 0
    ? `User Favorites (for taste preference): ${savedRecipes.map(r => r.title).join(', ')}.`
    : '';

  // Optimized prompt for Gemini reasoning with STRICT cravings adherence and Safety checks
  const prompt = `
    You are a smart culinary AI designed to minimize food waste and suggest recipes based on available ingredients.
    
    INPUT DATA:
    - Available Ingredients: ${ingredients.join(', ')}.
    - ${priorityContext}
    - Dietary: ${dietary}. 
    - Allergens: ${allergens || 'None'}. 
    - Cravings: ${cravings.length > 0 ? cravings.join(', ') : 'None'}. 
    - ${locationContext}
    - ${savedContext}
    
    TASK:
    Generate exactly 3 recipes following these CRITICAL rules in order of priority:
    
    1. ⛔ SAFETY (Allergens): STRICTLY EXCLUDE ingredients containing "${allergens}". This is a hard constraint.
    2. 🥦 DIETARY: Recipes MUST be strictly "${dietary}". (e.g. If Vegan, absolutely no animal products).
    3. 😋 CRAVINGS: You MUST satisfy the craving "${cravings.join(', ')}".
       - CONFLICT RESOLUTION: If a craving conflicts with an allergen/diet (e.g. "Sweet" craving but "No Sugar" allergen, or "Creamy" craving but "Vegan" diet), you MUST use compliant substitutes (e.g. Fruit/Stevia for sugar, Cashews/Coconut for cream) to achieve the flavor profile.
    4. ♻️ WASTE REDUCTION: Target recipes using >80% of "Available Ingredients".
    5. 🛍️ SHOPPING: Keep "missingIngredients" minimal.
    6. 🏠 PANTRY: Assume standard regional pantry staples (oil, salt, pepper, basic spices) are available.
    7. 📝 CLARITY: Steps must be clear and numbered.
    
    RETURN JSON ONLY (No markdown):
    { "recipes": [{
      "id": "generate_unique_string",
      "title": "string",
      "description": "string",
      "ingredients": ["string"], // All ingredients needed
      "missingIngredients": ["string"], // Items user needs to buy
      "steps": ["Step 1...", "Step 2..."],
      "difficulty": "Easy"|"Medium"|"Hard",
      "prepTime": "e.g. 30 mins",
      "calories": number,
      "tags": ["string"]
    }]}
    
    Exclude IDs: ${excludeIds.join(', ')}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Switch to Pro for better reasoning
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const data = parseModelJSON(response.text);
    if (!data) return [];
    
    return data.recipes || [];
  } catch (error) {
    console.error("Error generating recipes:", error);
    return [];
  }
};

// --- Substitution Reasoning ---
export const suggestSubstitutions = async (
    available: string[], 
    missing: string[],
    dietary: string,
    allergens: string,
    cravings: string[]
): Promise<Substitution[]> => {
  const prompt = `
    You are an expert food substitution engine.
    
    INPUT:
    - Available Ingredients (Fridge): ${JSON.stringify(available)}
    - Missing Ingredients (Needed): ${JSON.stringify(missing)}
    - Dietary Restriction: ${dietary}
    - Allergens to Avoid: ${allergens}
    - User Cravings: ${cravings.join(', ')}

    TASK:
    For EVERY item in the "Missing Ingredients" list, suggest the best possible substitution.
    
    RULES:
    1. STRICT MATCHING: The "missing" key in output MUST match the input string EXACTLY (case-insensitive).
    2. CONTEXT AWARENESS: 
       - Substitute MUST respect Dietary (${dietary}) and Allergens (${allergens}).
       - Substitute SHOULD align with Cravings (${cravings}) if possible.
    3. PRIORITY 1 (Fridge): Use items from "Available Ingredients" if they make culinary sense and fit the constraints. Set "source": "Fridge".
    4. PRIORITY 2 (Pantry/Buy): If no fridge item works, suggest a common store item. Set "source": "Buy" (or "Pantry" if it's basic like salt/oil).
    5. CLARITY: Provide a short, helpful explanation ("Use X instead because...").
    
    OUTPUT JSON:
    {
      "substitutions": [
        {
          "missing": "Input Item Name",
          "substitute": "Name of substitute ingredient",
          "source": "Fridge" | "Pantry" | "Buy",
          "explanation": "Reasoning...",
          "confidence": 0.9
        }
      ]
    }
    
    Return JSON ONLY.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Switch to Pro for better reasoning
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const data = parseModelJSON(response.text);
    return data?.substitutions || [];
  } catch (error) {
    console.error("Substitution Error:", error);
    return [];
  }
};

// --- Food Waste Score ---
export const calculateWasteScore = async (
  available: string[],
  used: string[],
  recipeName: string
): Promise<WasteScore | null> => {
    const prompt = `
You are a scoring model.
Given user ingredients and selected recipe, calculate:
% of ingredients used
Items left unused
Final “waste-minimization score” (0–100)

Input:
{
  "available": ${JSON.stringify(available)},
  "used_ingredients": ${JSON.stringify(used)},
  "recipe_name": "${recipeName}"
}

Rules:
Score = (number of unique available items found in used_ingredients) / (total unique available items) * 100.
Note: Only count "available" items that are actually used in the recipe.
Keep explanation short (max 1 sentence).

Output JSON:
{
  "score": 87,
  "unused": ["string"],
  "explanation": "string"
}

Return JSON ONLY.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Switch to Pro for better reasoning
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });
        
        const data = parseModelJSON(response.text);
        return data as WasteScore;
    } catch (e) {
        console.error("Waste Score Error", e);
        return null;
    }
}

// --- Text to Speech (TTS) ---
export const generateSpeech = async (text: string): Promise<ArrayBuffer> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");
    
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};

// --- Maps Grounding (Grocery Stores) ---
export const findGroceryStores = async (lat: number, lng: number): Promise<StoreLocation[]> => {
  try {
    const prompt = `
      Find grocery stores near Latitude: ${lat}, Longitude: ${lng}.
      Return a list of exactly 5 stores.
      
      Structure your response as a JSON object with a "stores" array.
      Include a "distance" field estimate if possible (e.g. "0.8 mi").
      
      Example Output:
      {
        "stores": [
          {
            "name": "Store Name",
            "address": "Full Address",
            "rating": "4.5",
            "phoneNumber": "(555) 123-4567",
            "openNow": "Yes/No/Unknown",
            "distance": "0.5 mi"
          }
        ]
      }
      
      If you can't find phone/rating, put "N/A".
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Reverted to 2.5-flash due to tool support
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        },
      },
    });

    const data = parseModelJSON(response.text);
    return data?.stores || [];
  } catch (error) {
    console.error("Maps Error:", error);
    return [];
  }
};

// --- Search Grounding (Food Safety/Trends) ---
export const searchFoodInfo = async (query: string): Promise<{text: string, chunks: any[]}> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Updated to gemini-3-pro-preview
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return {
      text: response.text || "No information found.",
      chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Search Error:", error);
    return { text: "Search unavailable.", chunks: [] };
  }
};

// --- Chat Bot (General) ---
export const chatWithBot = async (history: {role: string, parts: {text: string}[]}[], message: string) => {
    const chat = ai.chats.create({
        model: 'gemini-3-pro-preview', // Confirmed usage of 3-pro
        history: history as any,
    });
    const result = await chat.sendMessage({ message });
    return result.text;
}

// --- Live API Helpers ---

// Helper to decode base64 to ArrayBuffer (for audio output)
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to decode raw PCM data into an AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Helper to create PCM blob for input
function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  
  // Custom encode function for the blob data
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export class LiveClient {
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;

  constructor(private onTranscription: (inText: string, outText: string) => void) {}

  async connect() {
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Initialize Audio Processing for Input
    this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createBlob(inputData);
        if (this.sessionPromise) {
            this.sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
            });
        }
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);

    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => console.log('Live Session Opened'),
        onmessage: async (message: LiveServerMessage) => {
          // Handle Audio Output
          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio && this.outputAudioContext) {
             this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
             const audioBuffer = await decodeAudioData(
                 decode(base64Audio),
                 this.outputAudioContext,
                 24000,
                 1
             );
             const source = this.outputAudioContext.createBufferSource();
             source.buffer = audioBuffer;
             source.connect(this.outputAudioContext.destination);
             source.addEventListener('ended', () => {
                 this.sources.delete(source);
             });
             source.start(this.nextStartTime);
             this.nextStartTime += audioBuffer.duration;
             this.sources.add(source);
          }

          // Handle Transcription
          let inText = '';
          let outText = '';
          if (message.serverContent?.inputTranscription) {
              inText = message.serverContent.inputTranscription.text || '';
          }
          if (message.serverContent?.outputTranscription) {
              outText = message.serverContent.outputTranscription.text || '';
          }
          if (inText || outText) {
              this.onTranscription(inText, outText);
          }
        },
        onerror: (e) => console.error("Live API Error", e),
        onclose: () => console.log("Live Session Closed"),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
           voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: "You are a helpful, energetic sous-chef helping the user cook. Keep answers concise and helpful for a busy cook."
      }
    });
  }

  async disconnect() {
     if (this.sessionPromise) {
         const session = await this.sessionPromise;
         session.close();
         this.sessionPromise = null;
     }
     if (this.stream) {
         this.stream.getTracks().forEach(track => track.stop());
     }
     if (this.inputAudioContext) this.inputAudioContext.close();
     if (this.outputAudioContext) this.outputAudioContext.close();
     this.sources.forEach(s => s.stop());
     this.sources.clear();
  }
}
