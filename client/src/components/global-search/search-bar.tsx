import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGlobalSearch } from '@/hooks/use-global-search';
import { SearchResultItem } from './search-result-item';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * Componente della barra di ricerca globale
 * Mostra suggerimenti live durante la digitazione
 */
export function GlobalSearchBar() {
  const {
    query,
    setQuery,
    results,
    totalCount,
    isLoading,
    isError,
    resetSearch
  } = useGlobalSearch();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Chiudi i risultati quando si fa clic all'esterno
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        inputRef.current && 
        resultsRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        !resultsRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Focus sull'input quando si preme Ctrl+K o Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Gestione navigazione con frecce nella lista dei risultati
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < results.length) {
      e.preventDefault();
      handleSelectResult(results[activeIndex].path);
    }
  };
  
  const handleSelectResult = (path: string) => {
    setIsOpen(false);
    resetSearch();
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setActiveIndex(0);
    setIsOpen(value.length > 0);
  };
  
  const handleClearSearch = () => {
    resetSearch();
    inputRef.current?.focus();
  };
  
  return (
    <div className="relative max-w-md w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          placeholder="Cerca clienti, eventi, preventivi..."
          className="pl-10 pr-10 rounded-full"
          autoComplete="off"
        />
        
        {(query.length > 0 || isLoading) && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleClearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Shortcut indicator */}
      <div className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 items-center gap-1 text-xs text-muted-foreground">
        <kbd className="px-1.5 py-0.5 bg-muted border rounded-sm text-xs">
          <span className="text-xs">Ctrl</span>
        </kbd>
        <span>+</span>
        <kbd className="px-1.5 py-0.5 bg-muted border rounded-sm text-xs">
          <span className="text-xs">K</span>
        </kbd>
      </div>
      
      {/* Results dropdown */}
      {isOpen && (
        <div
          ref={resultsRef}
          className={cn(
            "absolute mt-2 w-full bg-background border rounded-md shadow-lg z-50 overflow-hidden transition-all",
            "max-h-[calc(80vh-64px)] overflow-y-auto"
          )}
        >
          {isError ? (
            <div className="p-4 text-center text-muted-foreground">
              Si è verificato un errore. Riprova più tardi.
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="border-b py-2 px-4">
                <p className="text-xs text-muted-foreground">
                  {totalCount} risultati trovati
                </p>
              </div>
              <div>
                {results.map((result, index) => (
                  <SearchResultItem
                    key={`${result.type}-${result.id}`}
                    result={result}
                    isActive={index === activeIndex}
                    onSelect={() => handleSelectResult(result.path)}
                  />
                ))}
              </div>
            </div>
          ) : query.length > 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Nessun risultato trovato per "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}