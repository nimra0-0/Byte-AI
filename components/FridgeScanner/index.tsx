
import React, { useState, useEffect } from 'react';
import { CameraIcon, TrashIcon } from '../Icons';
import { analyzeFridgeImage } from '../../services/geminiService';
import { FridgeItem } from '../../types';

interface FridgeScannerProps {
    onIngredientsFound: (ing: FridgeItem[], preview: string) => void;
    currentPreview: string | null;
    onClearImage: () => void;
}

const LOADING_MESSAGES = [
  "📸 Scanning your fridge...",
  "🔍 Identifying fresh ingredients...",
  "✨ Almost done...",
  "🎉 Ready to cook!"
];

export const FridgeScanner: React.FC<FridgeScannerProps> = ({ 
    onIngredientsFound, 
    currentPreview,
    onClearImage
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isAnalyzing) {
        setLoadingMsgIndex(0);
        return;
    }

    const interval = setInterval(() => {
        setLoadingMsgIndex((prev) => {
            if (prev >= LOADING_MESSAGES.length - 1) return prev;
            return prev + 1;
        });
    }, 2500);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const objectUrl = URL.createObjectURL(file);
      
      setLocalPreview(objectUrl);
      setIsAnalyzing(true);
      setLoadingMsgIndex(0);
      
      try {
        const detectedIngredients = await analyzeFridgeImage(file);
        onIngredientsFound(detectedIngredients, objectUrl);
      } catch (err) {
        alert("Failed to analyze image. Please try again.");
        URL.revokeObjectURL(objectUrl);
        setLocalPreview(null);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleClear = () => {
      setLocalPreview(null);
      onClearImage();
  };

  const activePreview = localPreview || currentPreview;

  return (
    // min-h-full ensures it takes up at least the visible area for centering, but expands if needed.
    <div className="flex flex-col min-h-full w-full bg-[#f8fafc] py-6">
        {/* Header Section */}
        <div className="flex-none px-6 pb-4 text-center z-10">
          <h2 className="text-2xl font-bold text-emerald-900 tracking-tight">What's in your fridge?</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Snap a photo to let the AI chef decide.</p>
        </div>

        {/* 
           Image Container
           flex-1 combined with min-h-full on parent centers this content.
           Removed fixed heights and strict aspect ratios to allow natural sizing.
        */}
        <div className="flex-1 w-full flex flex-col items-center justify-center p-4">
            <div className={`relative w-full max-w-sm aspect-[3/4] bg-white rounded-3xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden shadow-sm transition-all group ${activePreview ? 'border-emerald-400' : 'border-emerald-200 hover:bg-emerald-50'} ${isAnalyzing ? 'cursor-wait' : 'cursor-pointer'}`}>
            
            {activePreview ? (
                <>
                <img src={activePreview} alt="Fridge" className={`w-full h-full object-cover transition-all duration-500 ${isAnalyzing ? 'scale-105 blur-[2px]' : 'scale-100'}`} />
                
                {isAnalyzing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/10 backdrop-blur-sm">
                        <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-xl flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300 border border-white/50">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center text-lg animate-pulse">✨</div>
                            </div>
                            <p className="text-emerald-800 font-bold text-xs min-w-[180px] text-center transition-all duration-500">
                                {LOADING_MESSAGES[loadingMsgIndex]}
                            </p>
                        </div>
                    </div>
                )}

                {!isAnalyzing && (
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px] z-20">
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleClear();
                            }}
                            className="bg-white text-red-500 p-4 rounded-full shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all hover:scale-110"
                        >
                            <TrashIcon />
                        </button>
                    </div>
                )}
                </>
            ) : (
                <div className="text-center pointer-events-none z-0 p-4 flex flex-col items-center">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-sm border border-emerald-100">
                        <CameraIcon />
                    </div>
                    <span className="block text-lg font-bold text-emerald-800">Upload Photo</span>
                    <span className="text-xs text-slate-400 mt-2 max-w-[200px] leading-relaxed">
                        Tap here to open camera or upload an existing image
                    </span>
                </div>
            )}
            
            <input 
                type="file" 
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className={`absolute inset-0 opacity-0 z-10 ${isAnalyzing ? 'cursor-wait' : 'cursor-pointer'}`}
                disabled={isAnalyzing}
                title={isAnalyzing ? "Analyzing..." : "Upload image"}
            />
            </div>
        </div>

        {/* Footer Status */}
        <div className="flex-none min-h-[40px] flex items-center justify-center mt-2 px-4">
            {isAnalyzing ? (
                <p className="text-slate-400 text-[10px] italic animate-pulse text-center truncate w-full">
                    "Cooking is like love. It should be entered into with abandon or not at all."
                </p>
            ) : (
                activePreview && (
                    <button onClick={handleClear} className="text-xs text-slate-400 hover:text-red-500 font-medium transition-colors">
                        Retake Photo
                    </button>
                )
            )}
        </div>
    </div>
  );
};
