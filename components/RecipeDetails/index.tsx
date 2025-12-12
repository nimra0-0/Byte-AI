
import React, { useState, useEffect } from 'react';
import { HeartIcon, CartPlusIcon, CartCheckIcon, CheckIcon, SparklesIcon } from '../Icons';
import { Recipe, FridgeItem, Substitution, WasteScore, DietaryFilter, Craving } from '../../types';
import { suggestSubstitutions, calculateWasteScore } from '../../services/geminiService';

interface RecipeDetailsProps {
    recipe: Recipe;
    isSaved: boolean;
    onToggleSave: () => void;
    onBack: () => void;
    onStartCooking: () => void;
    shoppingList: string[];
    onToggleShoppingList: (item: string) => void;
    availableIngredients: FridgeItem[];
    dietary: DietaryFilter;
    allergens: string;
    cravings: Craving[];
}

export const RecipeDetails: React.FC<RecipeDetailsProps> = ({ 
    recipe, 
    isSaved,
    onToggleSave,
    onBack, 
    onStartCooking,
    shoppingList,
    onToggleShoppingList,
    availableIngredients,
    dietary,
    allergens,
    cravings
}) => {
    const [checkedState, setCheckedState] = useState<{ [key: string]: boolean }>({});
    const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [hasLoadedSubs, setHasLoadedSubs] = useState(false);
    const [viewMode, setViewMode] = useState<'original' | 'substituted'>('original');
    const [loadingIngredients, setLoadingIngredients] = useState<Set<string>>(new Set());
    
    // Waste Score State
    const [wasteScore, setWasteScore] = useState<WasteScore | null>(null);
    const [loadingScore, setLoadingScore] = useState(false);

    useEffect(() => {
        const initialState: {[key:string]: boolean} = {};
        recipe.ingredients.forEach(ing => {
            const isMissing = recipe.missingIngredients.some(missing => 
                ing.toLowerCase().includes(missing.toLowerCase())
            );
            initialState[ing] = !isMissing;
        });
        setCheckedState(initialState);
        
        // Load Waste Score on mount
        const loadScore = async () => {
            setLoadingScore(true);
            const availableNames = availableIngredients.map(i => i.name);
            const score = await calculateWasteScore(availableNames, recipe.ingredients, recipe.title);
            setWasteScore(score);
            setLoadingScore(false);
        };
        loadScore();
    }, [recipe, availableIngredients]);

    const handleTogglePrep = (ing: string) => {
        setCheckedState(prev => ({ ...prev, [ing]: !prev[ing] }));
    };

    const handleAddAllMissing = () => {
        // Add items that are currently unchecked (missing)
        recipe.ingredients.forEach(ing => {
            const isMissing = !checkedState[ing];
            if (isMissing && !shoppingList.includes(ing)) {
                onToggleShoppingList(ing);
            }
        });
    };

    const getCurrentMissingIngredients = () => {
        return Object.entries(checkedState)
            .filter(([_, isChecked]) => !isChecked)
            .map(([name]) => name);
    };

    const handleFindSubstitutions = async () => {
        setLoadingSubs(true);
        try {
            const missingNames = getCurrentMissingIngredients();
            
            const availableNames = availableIngredients
                .map(i => i.name)
                .filter(name => !missingNames.some(m => name.toLowerCase().includes(m.toLowerCase())));

            const subs = await suggestSubstitutions(
                availableNames, 
                missingNames,
                dietary,
                allergens,
                cravings
            );
            setSubstitutions(subs);
            setViewMode('substituted');
            setHasLoadedSubs(true);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSubs(false);
        }
    };

    const handleFindSingleSubstitution = async (ing: string) => {
        setLoadingIngredients(prev => new Set(prev).add(ing));
        try {
            const availableNames = availableIngredients
                .map(i => i.name)
                .filter(n => !n.toLowerCase().includes(ing.toLowerCase()));
            
            const subs = await suggestSubstitutions(
                availableNames, 
                [ing],
                dietary,
                allergens,
                cravings
            );
            
            setSubstitutions(prev => {
                const filtered = prev.filter(s => s.missing !== ing);
                return [...filtered, ...subs];
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingIngredients(prev => {
                const next = new Set(prev);
                next.delete(ing);
                return next;
            });
        }
    };

    const hasMissingItems = Object.values(checkedState).some(isChecked => !isChecked);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-500 border-emerald-500';
        if (score >= 50) return 'text-orange-500 border-orange-500';
        return 'text-red-500 border-red-500';
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#f8fafc] flex justify-center">
            <div className="w-full max-w-md bg-white h-full relative flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex-none bg-white/90 backdrop-blur-md z-20 border-b border-slate-100 flex justify-between items-center pr-4 shadow-sm sticky top-0">
                    <div className="flex items-center p-4">
                        <button onClick={onBack} className="text-slate-500 hover:text-emerald-600 p-2 -ml-2 transition-colors">
                            ← Back
                        </button>
                        <span className="font-bold text-slate-800 ml-2">Recipe Details</span>
                    </div>
                    <button 
                        onClick={onToggleSave}
                        className={`p-2.5 rounded-full transition-all ${isSaved ? 'bg-red-50 text-red-500 animate-heart-pop' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-red-400'}`}
                    >
                        <HeartIcon filled={isSaved} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto pb-32 p-6 scroll-smooth">
                    {/* Visual Header Placeholder */}
                    <div className="h-48 bg-gradient-to-br from-emerald-50 to-orange-50 rounded-2xl mb-6 flex items-center justify-center border border-slate-100 shadow-inner">
                        <span className="text-6xl opacity-50">🍲</span>
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900 mb-2">{recipe.title}</h1>
                    <p className="text-slate-500 mb-6 leading-relaxed">{recipe.description}</p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100">
                            <div className="text-[10px] text-emerald-600 uppercase font-bold mb-1 tracking-wider">Time</div>
                            <div className="font-bold text-slate-700">{recipe.prepTime}</div>
                        </div>
                        <div className="bg-orange-50 rounded-2xl p-4 text-center border border-orange-100">
                            <div className="text-[10px] text-orange-600 uppercase font-bold mb-1 tracking-wider">Calories</div>
                            <div className="font-bold text-slate-700">{recipe.calories}</div>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Difficulty</div>
                            <div className={`font-bold ${recipe.difficulty === 'Easy' ? 'text-emerald-600' : recipe.difficulty === 'Medium' ? 'text-orange-500' : 'text-red-500'}`}>
                                {recipe.difficulty}
                            </div>
                        </div>
                    </div>

                    {/* Waste Score Card */}
                    <div className="bg-white border border-slate-100 shadow-md rounded-2xl p-5 mb-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10 text-6xl rotate-12">♻️</div>
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <span className="text-lg">🌱</span> Food Waste Score
                                </h3>
                                {loadingScore ? (
                                    <div className="mt-2 text-xs text-slate-400 animate-pulse">Calculating impact...</div>
                                ) : wasteScore ? (
                                    <div className="mt-2">
                                        <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
                                            {wasteScore.explanation}
                                        </p>
                                        {wasteScore.unused.length > 0 && (
                                            <div className="mt-3">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Leftover Fridge Items</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {wasteScore.unused.slice(0, 5).map(u => (
                                                        <span key={u} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{u}</span>
                                                    ))}
                                                    {wasteScore.unused.length > 5 && <span className="text-[10px] text-slate-400 px-1">+{wasteScore.unused.length - 5} more</span>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mt-2 text-xs text-slate-400">Score unavailable</div>
                                )}
                            </div>

                            {/* Circular Score Indicator */}
                            {!loadingScore && wasteScore && (
                                <div className={`flex items-center justify-center w-16 h-16 rounded-full border-4 ${getScoreColor(wasteScore.score)} bg-white shadow-sm flex-shrink-0`}>
                                    <div className="text-center">
                                        <span className={`block text-lg font-extrabold leading-none ${getScoreColor(wasteScore.score).split(' ')[0]}`}>{wasteScore.score}</span>
                                        <span className="text-[8px] font-bold text-slate-400">/100</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                            <h3 className="text-lg font-bold text-slate-800">Ingredients</h3>
                            {hasMissingItems && (
                                <div className="flex items-center gap-2">
                                    {hasLoadedSubs ? (
                                        <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
                                            <button
                                                onClick={() => setViewMode('original')}
                                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${viewMode === 'original' ? 'bg-white shadow text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Original
                                            </button>
                                            <button
                                                onClick={() => setViewMode('substituted')}
                                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${viewMode === 'substituted' ? 'bg-indigo-500 shadow text-white' : 'text-slate-400 hover:text-indigo-500'}`}
                                            >
                                                Substituted
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={handleFindSubstitutions}
                                            disabled={loadingSubs}
                                            className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <SparklesIcon /> {loadingSubs ? 'Scanning...' : 'Substitutions'}
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleAddAllMissing}
                                        className="text-xs font-bold text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-lg transition-colors"
                                    >
                                        + Cart Missing
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-3">
                            {recipe.ingredients.map((ing, idx) => {
                                const isPrepped = checkedState[ing];
                                const isEffectivelyMissing = !isPrepped;
                                const isInCart = shoppingList.includes(ing);
                                
                                const substitution = substitutions.find(s => 
                                    s.missing.toLowerCase() === ing.toLowerCase() ||
                                    ing.toLowerCase().includes(s.missing.toLowerCase()) ||
                                    s.missing.toLowerCase().includes(ing.toLowerCase())
                                );

                                const isLoadingSingle = loadingIngredients.has(ing);
                                const substituteInCart = substitution && shoppingList.includes(substitution.substitute);

                                return (
                                    <div key={idx} className={`flex flex-col p-3 rounded-xl border transition-all ${isEffectivelyMissing ? 'bg-orange-50/30 border-orange-100' : 'bg-white border-slate-100'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1 cursor-pointer group" onClick={() => handleTogglePrep(ing)}>
                                                <div 
                                                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shadow-sm ${isPrepped ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300 group-hover:border-emerald-400'}`}
                                                >
                                                    {isPrepped && <CheckIcon />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`${isPrepped ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'} text-sm font-medium transition-all`}>
                                                        {ing}
                                                    </span>
                                                    {isEffectivelyMissing && <span className="text-[10px] text-orange-500 font-bold mt-0.5">Missing</span>}
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => onToggleShoppingList(ing)}
                                                className={`ml-3 p-2 rounded-full transition-all active:scale-95 ${isInCart ? 'bg-emerald-100 text-emerald-700' : isEffectivelyMissing ? 'bg-orange-100 text-orange-600 shadow-sm hover:bg-orange-200' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'}`}
                                                title={isInCart ? "Remove from cart" : "Add to cart"}
                                            >
                                                {isInCart ? <CartCheckIcon /> : <CartPlusIcon />}
                                            </button>
                                        </div>

                                        {/* Substitution Suggestion */}
                                        {isEffectivelyMissing && viewMode === 'substituted' && (
                                            <>
                                                {substitution ? (
                                                    <div className="mt-3 bg-indigo-50/50 rounded-lg p-3 border border-indigo-100 text-xs animate-in slide-in-from-top-2">
                                                        <div className="flex items-center gap-1.5 font-bold text-indigo-700 mb-1">
                                                            <SparklesIcon /> 
                                                            {substitution.source === 'Fridge' ? 'Use from Fridge:' : 'Substitute:'} <span className="underline">{substitution.substitute}</span>
                                                        </div>
                                                        <p className="text-indigo-900/80 mb-2">{substitution.explanation}</p>
                                                        
                                                        {substitution.source === 'Buy' && (
                                                            <button 
                                                                onClick={() => onToggleShoppingList(substitution.substitute)}
                                                                className={`w-full py-1.5 rounded-md font-bold text-[10px] transition-colors flex items-center justify-center gap-1 ${substituteInCart ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-100'}`}
                                                            >
                                                                {substituteInCart ? <CartCheckIcon /> : <CartPlusIcon />}
                                                                {substituteInCart ? 'Added to Cart' : `Add ${substitution.substitute} to Cart`}
                                                            </button>
                                                        )}
                                                        {substitution.source === 'Fridge' && (
                                                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-white px-2 py-1 rounded-md border border-emerald-100 w-fit">
                                                                <CheckIcon /> In Stock
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleFindSingleSubstitution(ing)}
                                                        disabled={isLoadingSingle}
                                                        className="mt-2 w-full text-center text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2 rounded-lg transition-colors border border-indigo-100 border-dashed"
                                                    >
                                                        {isLoadingSingle ? 'Finding...' : 'Find Substitute'}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Instructions</h3>
                        <div className="space-y-6 relative">
                            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-100"></div>
                            
                            {recipe.steps.map((step, i) => (
                                <div key={i} className="flex gap-4 relative">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-emerald-100 text-emerald-600 font-bold flex items-center justify-center text-sm shadow-sm z-10">
                                        {i + 1}
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4 flex-1 border border-slate-100">
                                        <p className="text-slate-600 text-sm leading-relaxed">{step}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Fixed Footer */}
                <div className="flex-none p-4 bg-white/95 backdrop-blur border-t border-slate-100 absolute bottom-0 left-0 right-0 z-20">
                    <button 
                        onClick={onStartCooking}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all active:scale-[0.99]"
                    >
                        Start Guided Cooking
                    </button>
                </div>
            </div>
        </div>
    );
};
