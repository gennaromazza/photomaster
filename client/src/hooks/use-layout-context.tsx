import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';

interface LayoutContextType {
  layoutMounted: boolean;
  registerLayout: () => boolean;
  unregisterLayout: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

/**
 * Provider per il contesto del layout
 * Gestisce lo stato del layout per evitare duplicazioni
 */
export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [layoutMounted, setLayoutMounted] = useState(false);
  const [location] = useLocation();
  
  // Reset il layout quando cambia la location
  useEffect(() => {
    setLayoutMounted(false);
  }, [location]);
  
  /**
   * Registra un layout. Restituisce true se il layout può essere montato,
   * false se esiste già un layout montato.
   */
  const registerLayout = (): boolean => {
    if (layoutMounted) {
      return false;
    }
    
    setLayoutMounted(true);
    return true;
  };
  
  /**
   * Deregistra un layout
   */
  const unregisterLayout = () => {
    setLayoutMounted(false);
  };
  
  return (
    <LayoutContext.Provider 
      value={{ 
        layoutMounted, 
        registerLayout, 
        unregisterLayout
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

/**
 * Hook per utilizzare il contesto del layout
 */
export function useLayoutContext() {
  const context = useContext(LayoutContext);
  
  if (context === undefined) {
    throw new Error('useLayoutContext deve essere usato all\'interno di un LayoutProvider');
  }
  
  return context;
}