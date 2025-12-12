
import React from 'react';

export const Header = () => (
  <header className="bg-white/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-emerald-100 sticky top-0 z-20">
    <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent flex items-center gap-2">
        <span className="text-2xl">🤖</span> Byte
    </h1>
    {/* Profile removed as requested */}
  </header>
);
