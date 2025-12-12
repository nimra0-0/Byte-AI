
# Byte 🤖

Byte is your smart, AI-powered culinary companion designed to reduce food waste and simplify meal planning. By simply snapping a photo of your open fridge, Byte identifies ingredients, categorizes them, and generates personalized recipes tailored to your dietary needs and cravings.

It features a real-time AI cooking assistant, food waste minimization scoring, smart ingredient substitutions, and local grocery store finding.

---

## 🚀 Features

*   **📸 AI Fridge Scanning**: Uses Gemini Vision to analyze photos of your fridge and detect ingredients automatically.
*   **🥗 Smart Recipe Generation**: Creates unique recipes based *strictly* on your available ingredients to minimize shopping.
*   **🌱 Food Waste Score**: Calculates a "Waste Minimization Score" (0-100) for every recipe, showing you how much of your existing stock is utilized.
*   **🔄 Smart Substitutions**: Missing an ingredient? The AI suggests culinary substitutes based on what you *do* have in your kitchen.
*   **👨‍🍳 Guided Cooking Mode**: Step-by-step cooking interface with Read-Aloud (Text-to-Speech) capabilities for hands-free cooking.
*   **🎙️ Context-Aware Voice Assistant**: A real-time, conversational AI sous-chef (powered by Gemini Live API) that knows what ingredients you scanned and helps you cook.
*   **🛒 Shopping List & Maps**: One-click add-to-cart for missing items and Google Maps integration to find nearby grocery stores.
*   **⚙️ Dietary & Cravings Filters**: Filter by Vegan, Keto, Gluten-Free, and specify cravings (Spicy, Comfort, etc.).

---

## 🛠️ Tech Stack

*   **Frontend**: React 19, TypeScript, Tailwind CSS
*   **AI Models (Google Gemini)**:
    *   `gemini-2.5-flash`: Image analysis (Vision) and Maps Grounding.
    *   `gemini-3-pro-preview`: Recipe generation, substitutions, waste scoring, advanced chat reasoning, and Search Grounding.
    *   `gemini-2.5-flash-native-audio-preview`: Real-time voice interaction (Live API).
    *   `gemini-2.5-flash-preview-tts`: Text-to-Speech generation.
*   **Icons**: Custom SVG Icons.
*   **State Management**: React Hooks & Local Storage persistence.

---

## 📦 Local Installation

Follow these steps to run Byte locally:

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/byte-app.git
    cd byte-app
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory and add your Google Gemini API key:
    ```env
    API_KEY=your_google_ai_studio_api_key_here
    ```

4.  **Start the development server**
    ```bash
    npm run dev
    ```

5.  **Open in Browser**
    Navigate to `http://localhost:1234` (or the port shown in your terminal).

---

## 🔑 Environment Variables

| Variable  | Description |
| :--- | :--- |
| `API_KEY` | **Required**. Your Google GenAI API Key. Get one at [aistudio.google.com](https://aistudio.google.com). |

---

## 🧠 AI Pipeline

1.  **Ingestion**: User uploads/snaps a photo (`.jpg`/`.png`).
2.  **Vision Analysis**: Image is sent to `gemini-2.5-flash`. The model identifies food items and ignores packaging/utensils.
3.  **Normalization**: Raw data is structured into categories (Produce, Dairy, Protein, etc.).
4.  **Recipe RAG**:
    *   *Input*: Available Ingredients + Dietary Filters + User Location.
    *   *Process*: `gemini-3-pro-preview` generates 3 distinct recipes with specific metadata (Calories, Prep Time).
5.  **Scoring & Subs**:
    *   *Waste Score*: `gemini-3-pro-preview` compares recipe ingredients vs. fridge inventory to calculate usage %.
    *   *Substitutions*: Checks `missingIngredients` against `availableIngredients` to find swaps using `gemini-3-pro-preview`.
6.  **Interaction**: User enters **Cooking Mode** (TTS enabled) or talks to the **Live Assistant** (Audio-to-Audio streaming) with full context of their fridge inventory.

---

## 📂 Project Structure

```
/
├── components/
│   ├── Assistant/        # Live Voice & Chat UI
│   ├── CookingMode/      # Step-by-step player with TTS
│   ├── FridgeScanner/    # Camera & Image Analysis
│   ├── Layout/           # Header & Shell
│   ├── Navigation/       # Bottom Tabs
│   ├── RecipeDetails/    # Recipe View, Substitutions & Waste Score
│   ├── RecipeGenerator/  # Filtering & List View
│   ├── ShoppingList/     # Cart & Maps Integration
│   └── Icons.tsx         # SVG Assets
├── services/
│   └── geminiService.ts  # All API interactions (Vision, Chat, Live, Maps)
├── types/
│   └── index.ts          # TS Interfaces
├── App.tsx               # Main Router & State
├── index.tsx             # Entry point
└── metadata.json         # Permissions config
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
