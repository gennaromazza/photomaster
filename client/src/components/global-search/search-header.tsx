import React from 'react';
import { GlobalSearchBar } from './search-bar';

/**
 * Header con la barra di ricerca integrata
 * Da inserire nella navbar dell'applicazione
 */
export function GlobalSearchHeader() {
  return (
    <div className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-sm border-b">
      <div className="container flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="hidden lg:block lg:w-[260px]">
          <span className="font-semibold text-lg">Image Studios</span>
        </div>
        
        <div className="flex-1 max-w-lg mx-auto">
          <GlobalSearchBar />
        </div>
        
        <div className="flex items-center gap-4">
          {/* Se necessario, aggiungere qui altri elementi della navbar */}
        </div>
      </div>
    </div>
  );
}