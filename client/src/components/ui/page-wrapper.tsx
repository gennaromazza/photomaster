import React from "react";

/**
 * Componente wrapper per le pagine principali dell'applicazione
 * Fornisce una struttura coerente con margini e massima larghezza
 */
export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="container py-6 mx-auto max-w-screen-2xl">
      {children}
    </div>
  );
}