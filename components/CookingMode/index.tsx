
import React, { useState } from 'react';
import { PlayIcon, StopIcon } from '../Icons';
import { generateSpeech } from '../../services/geminiService';
import { Recipe } from '../../types';

interface CookingModeProps {
    recipe: Recipe;
    onBack: () => void;
}

export const CookingMode: React.FC<CookingModeProps> = ({ recipe, onBack }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const playStep = async () => {
    setIsPlaying(true);
    try {
        const text = `Step ${currentStep + 1}. ${recipe.steps[currentStep]}`;
        const audioBuffer = await generateSpeech(text);
        
        const ctx = new AudioContext();
        const buffer = await ctx.decodeAudioData(audioBuffer);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setIsPlaying(false);
        source.start(0);
    } catch (e) {
        console.error("TTS Failed", e);
        setIsPlaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f8fafc] flex justify-center">
        <div className="w-full max-w-md bg-white h-full relative flex flex-col shadow-2xl">
           <div className="flex justify-between items-center p-4 border-b bg-white">
               <button onClick={onBack} className="text-slate-500 hover:text-slate-800">
                   ← Exit Cooking
               </button>
               <h3 className="font-bold text-slate-800 truncate max-w-[200px]">{recipe.title}</h3>
               <div className="w-8"></div>
           </div>

           <div className="flex-1 flex flex-col items-center justify-center p-8 text-center overflow-y-auto">
               <span className="text-sm font-bold text-blue-500 tracking-wider uppercase mb-4">Step {currentStep + 1} of {recipe.steps.length}</span>
               <p className="text-2xl md:text-4xl font-medium text-slate-800 leading-snug">
                   {recipe.steps[currentStep]}
               </p>
           </div>

           <div className="p-6 pb-10 bg-slate-50 border-t flex items-center justify-between">
                <button 
                   disabled={currentStep === 0}
                   onClick={() => setCurrentStep(c => c - 1)}
                   className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-50"
                >
                    Prev
                </button>
                
                <button 
                  onClick={playStep}
                  className={`p-4 rounded-full ${isPlaying ? 'bg-red-100 text-red-600' : 'bg-blue-600 text-white shadow-lg shadow-blue-200'}`}
                >
                   {isPlaying ? <StopIcon /> : <PlayIcon />}
                </button>

                <button 
                   disabled={currentStep === recipe.steps.length - 1}
                   onClick={() => setCurrentStep(c => c + 1)}
                   className="px-6 py-3 rounded-xl bg-slate-900 text-white disabled:opacity-50"
                >
                    Next
                </button>
           </div>
        </div>
    </div>
  );
};
