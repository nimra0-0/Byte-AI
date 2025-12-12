
import React from 'react';
import { CameraIcon, ChefIcon, CartIcon, MicIcon } from '../Icons';

interface BottomNavProps {
    activeTab: 'scan' | 'recipes' | 'shopping' | 'assistant';
    setActiveTab: (tab: 'scan' | 'recipes' | 'shopping' | 'assistant') => void;
    shoppingCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, shoppingCount }) => {
    const activeClass = "text-emerald-600 scale-105 transition-transform";
    const inactiveClass = "text-slate-400 hover:text-emerald-400 transition-colors";

    return (
      <nav className="bg-white border-t border-slate-100 flex justify-around p-3 pb-6 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] w-full flex-shrink-0">
          <button onClick={() => setActiveTab('scan')} className={`flex flex-col items-center space-y-1 ${activeTab === 'scan' ? activeClass : inactiveClass}`}>
              <CameraIcon />
              <span className="text-[10px] font-medium">Scan</span>
          </button>
          <button onClick={() => setActiveTab('recipes')} className={`flex flex-col items-center space-y-1 ${activeTab === 'recipes' ? activeClass : inactiveClass}`}>
              <ChefIcon />
              <span className="text-[10px] font-medium">Recipes</span>
          </button>
          <button onClick={() => setActiveTab('shopping')} className={`relative flex flex-col items-center space-y-1 ${activeTab === 'shopping' ? activeClass : inactiveClass}`}>
              <CartIcon />
              {shoppingCount > 0 && <span className="absolute -top-1 right-2 w-4 h-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-sm">{shoppingCount}</span>}
              <span className="text-[10px] font-medium">Shop</span>
          </button>
          <button onClick={() => setActiveTab('assistant')} className={`flex flex-col items-center space-y-1 ${activeTab === 'assistant' ? activeClass : inactiveClass}`}>
              <MicIcon />
              <span className="text-[10px] font-medium">Assistant</span>
          </button>
      </nav>
    );
}
