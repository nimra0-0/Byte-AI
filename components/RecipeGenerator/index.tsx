
import React, { useState, useMemo, useEffect } from 'react';
import { HeartIcon, StarIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon } from '../Icons';
import { generateRecipes } from '../../services/geminiService';
import { Recipe, DietaryFilter, Craving, FridgeItem } from '../../types';

interface RecipeGeneratorProps {
    ingredients: FridgeItem[];
    setIngredients: React.Dispatch<React.SetStateAction<FridgeItem[]>>;
    recipes: Recipe[];
    setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
    savedRecipes: Recipe[];
    onToggleSave: (r: Recipe) => void;
    onSelectRecipe: (r: Recipe) => void;
    onAddToShoppingList: (item: string) => void;
    dietary: DietaryFilter;
    setDietary: (d: DietaryFilter) => void;
    allergens: string;
    setAllergens: (a: string) => void;
    cravings: Craving[];
    setCravings: React.Dispatch<React.SetStateAction<Craving[]>>;
    location: {lat: number, lng: number} | null;
}

const LOADING_STEPS = [
    "🤔 Analyzing your fridge inventory...",
    "🌶️ Pairing compatible flavors...",
    "🥦 Checking dietary restrictions...",
    "📚 Consulting culinary databases...",
    "⚖️ Calculating nutritional macros...",
    "✨ Plating up your menu..."
];

export const RecipeGenerator: React.FC<RecipeGeneratorProps> = ({ 
    ingredients, 
    setIngredients,
    recipes,
    setRecipes,
    savedRecipes,
    onToggleSave,
    onSelectRecipe, 
    onAddToShoppingList,
    dietary,
    setDietary,
    allergens,
    setAllergens,
    cravings,
    setCravings,
    location
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newIngredient, setNewIngredient] = useState('');
  const [view, setView] = useState<'generated' | 'saved'>('generated');
  const [loadingStep, setLoadingStep] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
      'Produce': true,
      'Protein': true,
      'Dairy': true,
      'Other': false,
      'Pantry': false,
      'Frozen': false,
      'Bakery': false,
      'Beverages': false,
  });

  const availableCravings: Craving[] = ['Spicy', 'Sweet', 'Savory', 'Sour', 'Comfort', 'Light'];

  // Effect to cycle through loading messages
  useEffect(() => {
    if (loading) {
      setLoadingStep(0);
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 1500); // Slower interval for readability
      return () => clearInterval(interval);
    }
  }, [loading]);

  const groupedIngredients = useMemo(() => {
      const groups: Record<string, FridgeItem[]> = {};
      ingredients.forEach(item => {
          if (!groups[item.category]) groups[item.category] = [];
          groups[item.category].push(item);
      });
      return groups;
  }, [ingredients]);

  const toggleCategory = (cat: string) => {
      setExpandedCategories(prev => ({...prev, [cat]: !prev[cat]}));
  };

  const fetchRecipes = async (isLoadMore = false) => {
    if (ingredients.length === 0) return;
    isLoadMore ? setLoadingMore(true) : setLoading(true);
    
    try {
      const existingIds = isLoadMore ? recipes.map(r => r.id) : [];
      const ingredientNames = ingredients.map(i => i.name);
      const prioritizedNames = ingredients.filter(i => i.isPrioritized).map(i => i.name);

      const res = await generateRecipes(
          ingredientNames, 
          dietary, 
          allergens, 
          cravings, 
          location, 
          existingIds,
          prioritizedNames,
          savedRecipes // Pass saved recipes for better personalization
      );
      
      if (isLoadMore) {
        setRecipes(prev => [...prev, ...res]);
      } else {
        setRecipes(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      isLoadMore ? setLoadingMore(false) : setLoading(false);
    }
  };

  const handleAddIngredient = () => {
    const trimmed = newIngredient.trim();
    if (trimmed && !ingredients.some(i => i.name.toLowerCase() === trimmed.toLowerCase())) {
      setIngredients([...ingredients, { name: trimmed, category: 'Other', isPrioritized: false }]);
      setNewIngredient('');
      setExpandedCategories(prev => ({...prev, 'Other': true}));
    }
  };

  const handleRemoveIngredient = (name: string) => {
    setIngredients(ingredients.filter(i => i.name !== name));
  };

  const togglePriority = (name: string) => {
      setIngredients(ingredients.map(i => 
          i.name === name ? { ...i, isPrioritized: !i.isPrioritized } : i
      ));
  };

  const toggleCraving = (c: Craving) => {
    if (cravings.includes(c)) {
      setCravings(cravings.filter(item => item !== c));
    } else {
      setCravings([...cravings, c]);
    }
  };

  const displayedRecipes = view === 'generated' ? recipes : savedRecipes;
  const categories = Object.keys(groupedIngredients).sort();

  return (
    // min-h-full allows the component to fill the scroll container or expand it. No internal scrolling.
    <div className="flex flex-col w-full min-h-full">
      {/* Sticky Header: Sticks to the top of the 'main' scroll area */}
      <div className="sticky top-0 z-20 flex justify-between items-center px-4 py-3 bg-[#f8fafc]/95 backdrop-blur-sm border-b border-slate-100">
         <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Recipes</h2>
         <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner">
             <button 
                onClick={() => setView('generated')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'generated' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 Ideas
             </button>
             <button 
                onClick={() => setView('saved')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'saved' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 Saved ({savedRecipes.length})
             </button>
         </div>
      </div>

      <div className="p-4 pb-20">
        {view === 'generated' && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-8 space-y-6">
            {/* Ingredients Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                  <label className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Your Ingredients ({ingredients.length})</label>
                  <div className="flex gap-2 w-1/2">
                      <input 
                          value={newIngredient}
                          onChange={(e) => setNewIngredient(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
                          placeholder="Add item..."
                          className="w-full text-xs p-2.5 bg-white text-slate-800 placeholder-slate-400 border border-slate-200 rounded-lg outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                      />
                      <button onClick={handleAddIngredient} className="bg-emerald-50 text-emerald-600 px-3 rounded-lg text-lg hover:bg-emerald-100 font-bold transition-colors">+</button>
                  </div>
              </div>

              <div className="space-y-3">
                  {categories.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">No ingredients added yet. Snap a photo!</p>}
                  {categories.map(cat => {
                      const isOpen = expandedCategories[cat];
                      const count = groupedIngredients[cat].length;
                      return (
                          <div key={cat} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                              <button 
                                  onClick={() => toggleCategory(cat)}
                                  className="w-full flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                              >
                                  <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                      {cat} 
                                      <span className="bg-white text-emerald-600 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-100">{count}</span>
                                  </span>
                                  <span className="text-slate-400">
                                      {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                  </span>
                              </button>
                              
                              {isOpen && (
                                  <div className="p-3 bg-white flex flex-wrap gap-2 animate-fadeIn">
                                      {groupedIngredients[cat].map(ing => (
                                          <div 
                                              key={ing.name} 
                                              className={`pl-3 pr-1 py-1 rounded-full text-xs font-medium border flex items-center gap-2 transition-all hover:shadow-sm ${ing.isPrioritized ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                                          >
                                              <span onClick={() => togglePriority(ing.name)} className="cursor-pointer truncate max-w-[100px]">{ing.name}</span>
                                              
                                              <div className="flex items-center gap-1 border-l border-slate-200/50 pl-1">
                                                  <button onClick={() => togglePriority(ing.name)} className="p-1 hover:scale-110 transition-transform group" title="Prioritize">
                                                      <StarIcon filled={!!ing.isPrioritized} />
                                                  </button>
                                                  <button 
                                                      onClick={() => handleRemoveIngredient(ing.name)} 
                                                      className="p-1 text-slate-400 hover:text-red-500 animate-shake"
                                                  >
                                                      ×
                                                  </button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1.5 block">Dietary</label>
                  <div className="relative">
                      <select 
                          value={dietary} 
                          onChange={(e) => setDietary(e.target.value as DietaryFilter)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-800 focus:border-emerald-500 outline-none appearance-none pr-8"
                      >
                          {Object.values(DietaryFilter).map(f => (
                              <option key={f} value={f}>{f}</option>
                          ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDownIcon />
                      </div>
                  </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1.5 block">Allergens</label>
                    <input 
                        value={allergens}
                        onChange={(e) => setAllergens(e.target.value)}
                        placeholder="e.g. peanuts"
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-800 placeholder-slate-400 focus:border-emerald-500 outline-none"
                    />
                </div>
            </div>

            {/* Cravings */}
            <div>
                <label className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2 block">Cravings</label>
                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                    {availableCravings.map(c => (
                        <button 
                          key={c} 
                          onClick={() => toggleCraving(c)}
                          className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${cravings.includes(c) ? 'bg-orange-100 border-orange-200 text-orange-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-200'}`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            <button 
              onClick={() => fetchRecipes(false)}
              disabled={loading}
              className={`w-full py-4 bg-gradient-to-r ${loading ? 'from-slate-400 to-slate-500 cursor-not-allowed' : 'from-emerald-600 to-emerald-800 shadow-emerald-200 hover:shadow-emerald-300 hover:scale-[1.01] active:scale-[0.99]'} text-white rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2`}
            >
              {loading ? (
                  <>🔥 Firing up the stove...</>
              ) : recipes.length > 0 ? (
                  <>🔄 Remix Menu</>
              ) : (
                  <>✨ Invent Recipes</>
              )}
            </button>
        </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 animate-in fade-in duration-500">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(16,185,129,0.2)] mb-8 animate-bounce relative">
                 👨‍🍳
                 <div className="absolute -bottom-2 w-16 h-2 bg-black/10 rounded-[100%] blur-sm animate-pulse"></div>
             </div>
             
             <div className="space-y-2 text-center max-w-[280px]">
                 <h3 className="text-xl font-bold text-slate-800">Chef is thinking...</h3>
                 {/* Increased height to h-12 to prevent text cutoff and added leading-tight */}
                 <div className="h-12 relative overflow-hidden flex items-center justify-center">
                    {LOADING_STEPS.map((step, index) => (
                        <p 
                            key={index}
                            className={`text-emerald-600 font-medium text-sm leading-tight absolute w-full transition-all duration-500 transform ${
                                index === loadingStep 
                                ? 'translate-y-0 opacity-100' 
                                : 'translate-y-full opacity-0'
                            }`}
                        >
                            {step}
                        </p>
                    ))}
                 </div>
             </div>
          </div>
        ) : (
          <>
              {view === 'saved' && displayedRecipes.length === 0 && (
                  <div className="text-center py-20 text-slate-400">
                      <p className="mb-2 text-4xl">🧑‍🍳</p>
                      <p>No saved recipes yet.</p>
                  </div>
              )}
              
              <div className="space-y-6 pb-4">
              {displayedRecipes.map(recipe => {
                  const isSaved = savedRecipes.some(r => r.id === recipe.id);
                  const missingCount = recipe.missingIngredients.length;
                  const totalIngredients = recipe.ingredients.length;
                  const availableCount = Math.max(0, totalIngredients - missingCount);
                  const progressPercent = Math.min(100, (availableCount / totalIngredients) * 100);

                  return (
                  <div 
                      key={recipe.id} 
                      onClick={() => onSelectRecipe(recipe)}
                      className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                  >
                      {/* Fake Image Placeholder */}
                      <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20 transform group-hover:scale-110 transition-transform duration-700">
                              🍽️
                          </div>
                          {/* Tags Overlay */}
                          <div className="absolute bottom-3 left-3 flex gap-2">
                               {(recipe.tags && recipe.tags.length > 0 ? recipe.tags : [recipe.difficulty, recipe.prepTime]).slice(0,3).map((tag, i) => (
                                   <span key={i} className="bg-white/90 backdrop-blur text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                                       {tag}
                                   </span>
                               ))}
                          </div>
                          <button 
                              onClick={(e) => { e.stopPropagation(); onToggleSave(recipe); }}
                              className={`absolute top-3 right-3 p-2.5 rounded-full shadow-md hover:scale-110 transition-transform active:scale-95 ${isSaved ? 'bg-white text-red-500 animate-heart-pop' : 'bg-white/80 text-slate-400 hover:text-red-400'}`}
                          >
                              <HeartIcon filled={isSaved} />
                          </button>
                      </div>

                      <div className="p-5">
                          <div className="flex justify-between items-start mb-2">
                              <h3 className="text-lg font-bold text-slate-800 leading-tight group-hover:text-emerald-700 transition-colors">{recipe.title}</h3>
                              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg shrink-0 ml-2">
                                  {recipe.calories} cal
                              </span>
                          </div>
                          <p className="text-slate-500 text-xs mb-4 line-clamp-2 leading-relaxed">{recipe.description}</p>
                          
                          {/* Ingredients Progress */}
                          <div className="mb-4">
                              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
                                  <span className={missingCount === 0 ? "text-emerald-600" : "text-slate-500"}>
                                      {missingCount === 0 ? "You have everything!" : `${availableCount}/${totalIngredients} Ingredients`}
                                  </span>
                                  <span className="text-orange-500">{missingCount > 0 ? `${missingCount} missing` : ''}</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                      className={`h-full rounded-full ${missingCount === 0 ? 'bg-emerald-500' : 'bg-orange-400'}`} 
                                      style={{ width: `${progressPercent}%` }}
                                  ></div>
                              </div>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                               <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
                                   <span>⏱ {recipe.prepTime}</span>
                               </div>
                               <span className="text-emerald-600 text-xs font-bold group-hover:translate-x-1 transition-transform">View Recipe →</span>
                          </div>
                      </div>
                  </div>
              )})}
              </div>

              {view === 'generated' && recipes.length > 0 && (
                  <div className="mt-10 mb-8 flex justify-center">
                      <button 
                          onClick={() => fetchRecipes(true)}
                          disabled={loadingMore}
                          className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-full font-bold shadow-sm hover:bg-slate-50 hover:border-emerald-200 transition-all disabled:opacity-50"
                      >
                          {loadingMore ? 'Mixing more options...' : 'Load More Recipes'}
                      </button>
                  </div>
              )}
          </>
        )}
      </div>
    </div>
  );
};
