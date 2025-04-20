import { useState, useEffect } from 'react';

/**
 * Hook per implementare un debounce su un valore
 * Utile per ritardare le chiamate API durante la digitazione dell'utente
 * 
 * @param value - Valore da applicare il debounce
 * @param delay - Ritardo in ms (default: 500ms)
 * @returns Valore con debounce applicato
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Imposta un timer che aggiorna il valore dopo il ritardo specificato
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Pulisci il timer se il valore cambia prima che sia trascorso il ritardo
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}