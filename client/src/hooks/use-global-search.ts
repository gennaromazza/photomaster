import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useDebounce } from './use-debounce';

// Tipi di risultati disponibili nella ricerca
export type SearchResultType = 'cliente' | 'evento' | 'preventivo' | 'contratto' | 'galleria';

// Rappresenta un singolo risultato di ricerca
export interface SearchResult {
  id: number;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  path: string;
  createdAt?: string;
  imageUrl?: string;
}

// Rappresenta la risposta dall'API di ricerca
export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
}

/**
 * Hook per la gestione della ricerca globale
 * 
 * @param initialQuery - Query di ricerca iniziale (opzionale)
 * @returns Tutto il necessario per gestire la ricerca
 */
export function useGlobalSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 300); // 300ms di debounce
  
  // Richiesta solo se c'è un testo di ricerca non vuoto
  const searchQuery = useQuery<SearchResponse>({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return { results: [], totalCount: 0 };
      }
      
      const response = await apiRequest('GET', `/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      return await response.json();
    },
    // Non eseguire se la query è vuota o troppo corta
    enabled: debouncedQuery.length >= 2,
    // Imposta un tempo di stale più breve per i risultati di ricerca
    staleTime: 30000, // 30 secondi,
    placeholderData: (prevData) => prevData, // Equivalente a keepPreviousData in v5
  });

  // Reset della ricerca
  const resetSearch = () => {
    setQuery('');
  };

  return {
    query,
    setQuery,
    debouncedQuery,
    results: searchQuery.data?.results || [],
    totalCount: searchQuery.data?.totalCount || 0,
    isLoading: searchQuery.isLoading,
    isError: searchQuery.isError,
    error: searchQuery.error,
    resetSearch,
  };
}