
import React, { useState, useMemo } from 'react';
import { TrashIcon, MapIcon, ListIcon, PhoneIcon, StarIcon } from '../Icons';
import { findGroceryStores } from '../../services/geminiService';
import { StoreLocation } from '../../types';

interface ShoppingListProps {
    items: string[];
    onRemove: (i: string) => void;
    // Lifted state props for persistence
    stores: StoreLocation[];
    setStores: (s: StoreLocation[]) => void;
    viewMode: 'map' | 'list';
    setViewMode: (v: 'map' | 'list') => void;
    userLoc: {lat: number, lng: number} | null;
}

export const ShoppingList: React.FC<ShoppingListProps> = ({ 
    items, 
    onRemove, 
    stores, 
    setStores, 
    viewMode, 
    setViewMode, 
    userLoc 
}) => {
    const [findingStores, setFindingStores] = useState(false);

    const handleFindStores = () => {
        if (!userLoc) {
             alert("Location not available.");
             return;
        }
        setFindingStores(true);
        // We use the passed userLoc directly
        (async () => {
            try {
                const result = await findGroceryStores(userLoc.lat, userLoc.lng);
                setStores(result);
                if (result.length > 0) setViewMode('map');
            } catch(e) {
                console.error(e);
            } finally {
                setFindingStores(false);
            }
        })();
    };

    // Sorting Logic
    const sortedStores = useMemo(() => {
        return [...stores].sort((a, b) => {
            // 1. Sort by Open Status (Open Now > Unknown > No)
            const getOpenScore = (status?: string) => {
                if (!status) return 1;
                const lower = status.toLowerCase();
                if (lower.includes('yes') || lower.includes('open')) return 2;
                if (lower.includes('unknown') || lower === 'n/a') return 1;
                return 0; // Closed
            };
            
            const scoreA = getOpenScore(a.openNow);
            const scoreB = getOpenScore(b.openNow);
            
            if (scoreA !== scoreB) return scoreB - scoreA; // Descending score (Open first)

            // 2. Sort by Distance (Closest first)
            const parseDistance = (dist?: string) => {
                if (!dist) return Infinity;
                // Extract number from string like "0.5 mi" or "1.2 km"
                const match = dist.match(/([0-9.]+)/);
                return match ? parseFloat(match[1]) : Infinity;
            };

            const distA = parseDistance(a.distance);
            const distB = parseDistance(b.distance);

            return distA - distB; // Ascending distance
        });
    }, [stores]);

    return (
        <div className="flex flex-col w-full h-full relative">
            {/* 1. Top Section: Shopping List (Flex-1 to take available space) */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#f8fafc]">
                <div className="p-4 pb-2 bg-white/90 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100 flex justify-between items-center shadow-sm">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span>🛒</span> Shopping List
                    </h2>
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                        {items.length} Items
                    </span>
                </div>
                
                <div className="overflow-y-auto flex-1 p-4 pb-20">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                            <p className="text-5xl mb-4">🥬</p>
                            <p className="font-medium">Your basket is empty</p>
                            <p className="text-xs mt-1">Add missing ingredients from recipes</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {items.map((item, idx) => (
                                <li key={`${item}-${idx}`} className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-slate-100 group hover:border-emerald-200 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {/* Removed the radio/checkbox visual div as requested */}
                                        <span className="font-medium text-slate-700 capitalize ml-2">{item}</span>
                                    </div>
                                    <button onClick={() => onRemove(item)} className="text-slate-300 hover:text-red-500 p-2 transition-colors">
                                        <TrashIcon />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* 2. Bottom Section: Nearby Stores (Fixed Height / Overlay) */}
            <div className="h-[45%] flex-none bg-white border-t border-slate-200 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] z-20 flex flex-col">
                <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-white relative z-10">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Nearby Stores</h3>
                        {userLoc && <p className="text-[10px] text-slate-500">Based on your current location</p>}
                    </div>
                    
                    {stores.length > 0 ? (
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setViewMode('map')}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all ${viewMode === 'map' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <MapIcon /> Map
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all ${viewMode === 'list' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <ListIcon /> List
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={handleFindStores}
                            disabled={findingStores}
                            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-70 shadow-sm"
                        >
                            {findingStores ? 'Locating...' : 'Find Stores'}
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-hidden relative bg-slate-50">
                    {!userLoc ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center p-6 opacity-50">
                                <p className="text-4xl mb-2">🗺️</p>
                                <p className="text-sm font-medium text-slate-500">Find grocery stores nearby</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'map' && (
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    className="w-full h-full border-0"
                                    loading="lazy" 
                                    allowFullScreen 
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={`https://maps.google.com/maps?q=grocery+stores+near+${userLoc.lat},${userLoc.lng}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                                ></iframe>
                            )}

                            {viewMode === 'list' && (
                                <div className="h-full overflow-y-auto p-4 space-y-3">
                                    {sortedStores.map((store, i) => (
                                        <div key={i} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">{store.name}</h4>
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{store.address}</p>
                                                {store.distance && (
                                                    <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                                                        📍 {store.distance} away
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-2">
                                                    {store.rating && store.rating !== 'N/A' && (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">
                                                            <StarIcon filled={true} /> {store.rating}
                                                        </span>
                                                    )}
                                                    {store.openNow && (
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${store.openNow.toLowerCase().includes('yes') ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                            {store.openNow.toLowerCase().includes('yes') ? 'Open Now' : 'Check Hours'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {store.phoneNumber && store.phoneNumber !== 'N/A' && (
                                                <a 
                                                    href={`tel:${store.phoneNumber}`}
                                                    className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                                                >
                                                    <PhoneIcon />
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                    {sortedStores.length === 0 && !findingStores && (
                                        <p className="text-center text-xs text-slate-400 mt-4">No stores found. Try the Map view.</p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                    
                    {findingStores && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                             <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-2"></div>
                             <p className="text-xs font-bold text-emerald-800">Searching nearby...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
