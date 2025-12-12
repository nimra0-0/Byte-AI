
export interface FridgeItem {
  name: string;
  category: 'Produce' | 'Protein' | 'Dairy' | 'Bakery' | 'Pantry' | 'Frozen' | 'Beverages' | 'Other';
  isPrioritized?: boolean;
}

// Helper to check if an object is a FridgeItem (for migration)
export const isFridgeItem = (item: any): item is FridgeItem => {
    return typeof item === 'object' && item !== null && 'name' in item && 'category' in item;
}

export interface Ingredient {
  name: string;
  quantity?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  missingIngredients: string[];
  steps: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prepTime: string;
  calories: number;
  tags: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export enum DietaryFilter {
  NONE = 'None',
  VEGETARIAN = 'Vegetarian',
  VEGAN = 'Vegan',
  KETO = 'Keto',
  GLUTEN_FREE = 'Gluten Free',
  PALEO = 'Paleo'
}

export type Craving = 'Spicy' | 'Sweet' | 'Savory' | 'Sour' | 'Comfort' | 'Light';

export interface StoreLocation {
  name: string;
  address: string;
  rating?: string;
  phoneNumber?: string;
  openNow?: string;
  distance?: string; // e.g. "0.8 mi"
}

export interface SearchResult {
  title: string;
  uri: string;
}

export interface Substitution {
  missing: string;
  substitute: string;
  source: 'Fridge' | 'Pantry' | 'Buy';
  explanation: string;
  confidence: number;
}

export interface WasteScore {
  score: number;
  unused: string[];
  explanation: string;
}
