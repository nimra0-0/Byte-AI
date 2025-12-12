
import React, { useState, useEffect, useRef } from 'react';
import { Recipe, DietaryFilter, Craving, FridgeItem, StoreLocation } from './types';
import { Header } from './components/Layout/Header';
import { BottomNav } from './components/Navigation/BottomNav';
import { FridgeScanner } from './components/FridgeScanner';
import { RecipeGenerator } from './components/RecipeGenerator';
import { RecipeDetails } from './components/RecipeDetails';
import { CookingMode } from './components/CookingMode';
import { ShoppingList } from './components/ShoppingList';
import { Assistant } from './components/Assistant';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'recipes' | 'shopping' | 'assistant'>('scan');
  const mainScrollRef = useRef<HTMLDivElement>(null);
  
  // Persisted State
  const [fridgeImage, setFridgeImage] = useState<string | null>(null);
  
  const [ingredients, setIngredients] = useState<FridgeItem[]>(() => {
    const saved = localStorage.getItem('ca_ingredients');
    if (!saved) return [];
    try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
             return parsed.map((name: string) => ({ 
                 name, 
                 category: 'Other', 
                 isPrioritized: false 
             }));
        }
        return parsed;
    } catch(e) {
        return [];
    }
  });

  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem('ca_recipes');
    return saved ? JSON.parse(saved) : [];
  });
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>(() => {
      const saved = localStorage.getItem('ca_savedRecipes');
      return saved ? JSON.parse(saved) : [];
  });
  const [shoppingList, setShoppingList] = useState<string[]>(() => {
    const saved = localStorage.getItem('ca_shoppingList');
    return saved ? JSON.parse(saved) : [];
  });
  const [dietary, setDietary] = useState<DietaryFilter>(() => {
      const saved = localStorage.getItem('ca_dietary');
      if (saved && Object.values(DietaryFilter).includes(saved as DietaryFilter)) {
          return saved as DietaryFilter;
      }
      return DietaryFilter.NONE;
  });
  const [allergens, setAllergens] = useState(() => localStorage.getItem('ca_allergens') || '');
  const [cravings, setCravings] = useState<Craving[]>(() => {
      const saved = localStorage.getItem('ca_cravings');
      return saved ? JSON.parse(saved) : [];
  });

  // Map & Store State (Lifted for persistence)
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [storeViewMode, setStoreViewMode] = useState<'map' | 'list'>('map');

  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Persistence Effects
  useEffect(() => { localStorage.setItem('ca_ingredients', JSON.stringify(ingredients)); }, [ingredients]);
  useEffect(() => { localStorage.setItem('ca_recipes', JSON.stringify(recipes)); }, [recipes]);
  useEffect(() => { localStorage.setItem('ca_savedRecipes', JSON.stringify(savedRecipes)); }, [savedRecipes]);
  useEffect(() => { localStorage.setItem('ca_shoppingList', JSON.stringify(shoppingList)); }, [shoppingList]);
  useEffect(() => { localStorage.setItem('ca_dietary', dietary); }, [dietary]);
  useEffect(() => { localStorage.setItem('ca_allergens', allergens); }, [allergens]);
  useEffect(() => { localStorage.setItem('ca_cravings', JSON.stringify(cravings)); }, [cravings]);

  // Scroll to top on tab change
  useEffect(() => {
    if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // Get Location on Mount
  useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (err) => {
                console.log("Location permission denied or dismissed:", err.message);
                // Gracefully fail silently for location on mount
            }
        );
    }
  }, []);

  const handleIngredientsFound = (ing: FridgeItem[], previewUrl: string) => {
    setIngredients(ing);
    setFridgeImage(previewUrl);
    setActiveTab('recipes');
  };

  const handleClearImage = () => {
      if (fridgeImage) URL.revokeObjectURL(fridgeImage);
      setFridgeImage(null);
  };

  const handleAddToShoppingList = (item: string) => {
      if(!shoppingList.includes(item)) {
          setShoppingList(prev => [...prev, item]);
      }
  };

  const handleToggleShoppingItem = (item: string) => {
    if (shoppingList.includes(item)) {
        setShoppingList(prev => prev.filter(i => i !== item));
    } else {
        setShoppingList(prev => [...prev, item]);
    }
  };

  const removeFromShoppingList = (item: string) => {
      setShoppingList(prev => prev.filter(i => i !== item));
  };

  const handleToggleSaveRecipe = (recipe: Recipe) => {
      const isSaved = savedRecipes.some(r => r.id === recipe.id);
      if (isSaved) {
          setSavedRecipes(prev => prev.filter(r => r.id !== recipe.id));
      } else {
          setSavedRecipes(prev => [...prev, recipe]);
      }
  };

  // Main View Logic
  if (activeRecipe) {
      if (isCookingMode) {
          return <CookingMode recipe={activeRecipe} onBack={() => setIsCookingMode(false)} />;
      }
      return (
          <RecipeDetails 
            recipe={activeRecipe} 
            isSaved={savedRecipes.some(r => r.id === activeRecipe.id)}
            onToggleSave={() => handleToggleSaveRecipe(activeRecipe)}
            onBack={() => setActiveRecipe(null)}
            onStartCooking={() => setIsCookingMode(true)}
            shoppingList={shoppingList}
            onToggleShoppingList={handleToggleShoppingItem}
            availableIngredients={ingredients}
            dietary={dietary}
            allergens={allergens}
            cravings={cravings}
          />
      );
  }

  return (
    // Outer Wrapper: Fixed to viewport (h-[100dvh]) to prevent window scrolling.
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col bg-[#f8fafc] max-w-md mx-auto shadow-2xl overflow-hidden font-sans text-slate-900">
      
      <Header />

      {/* Main Content Area: Flex-1 fills space between Header and Nav. Overflow-y-auto handles scrolling. */}
      <main 
        ref={mainScrollRef}
        className="flex-1 w-full relative overflow-y-auto overflow-x-hidden scroll-smooth"
      >
          {activeTab === 'scan' && (
              <FridgeScanner 
                onIngredientsFound={handleIngredientsFound} 
                currentPreview={fridgeImage}
                onClearImage={handleClearImage}
              />
          )}
          {activeTab === 'recipes' && (
              <RecipeGenerator 
                ingredients={ingredients} 
                setIngredients={setIngredients}
                recipes={recipes}
                setRecipes={setRecipes}
                savedRecipes={savedRecipes}
                onToggleSave={handleToggleSaveRecipe}
                onSelectRecipe={setActiveRecipe} 
                onAddToShoppingList={handleAddToShoppingList}
                dietary={dietary}
                setDietary={setDietary}
                allergens={allergens}
                setAllergens={setAllergens}
                cravings={cravings}
                setCravings={setCravings}
                location={userLocation}
              />
          )}
          {activeTab === 'shopping' && (
            <ShoppingList 
                items={shoppingList} 
                onRemove={removeFromShoppingList} 
                stores={stores}
                setStores={setStores}
                viewMode={storeViewMode}
                setViewMode={setStoreViewMode}
                userLoc={userLocation}
            />
          )}
          {activeTab === 'assistant' && (
            <Assistant 
                ingredients={ingredients}
                recipes={recipes}
                shoppingList={shoppingList}
            />
          )}
      </main>

      <BottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        shoppingCount={shoppingList.length} 
      />
    </div>
  );
}
