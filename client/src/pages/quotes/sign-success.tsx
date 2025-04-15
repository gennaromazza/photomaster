import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getQueryParams } from "@/lib/utils";
import SignConfirmation from "@/components/quotes/sign-confirmation";

export default function SignSuccessPage() {
  const [clientName, setClientName] = useState<string>("");
  const [quoteTitle, setQuoteTitle] = useState<string>("");
  const [clientEmail, setClientEmail] = useState<string>("");
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Tenta di recuperare i dati dal localStorage
    const storedClientName = localStorage.getItem('signedQuoteClient');
    const storedQuoteTitle = localStorage.getItem('signedQuoteTitle');
    const storedClientEmail = localStorage.getItem('signedQuoteEmail');
    
    if (storedClientName) {
      setClientName(storedClientName);
      // Dopo aver recuperato il dato, lo rimuoviamo per evitare che persista
      localStorage.removeItem('signedQuoteClient');
    }
    
    if (storedQuoteTitle) {
      setQuoteTitle(storedQuoteTitle);
      localStorage.removeItem('signedQuoteTitle');
    }
    
    if (storedClientEmail) {
      setClientEmail(storedClientEmail);
      localStorage.removeItem('signedQuoteEmail');
    }
    
    // Se non ci sono dati nel localStorage, potrebbe essere che l'utente è arrivato
    // direttamente a questa pagina senza passare dal flusso di firma
    if (!storedClientName && !storedQuoteTitle) {
      const params = getQueryParams();
      if (!params.token) {
        // Reindirizza alla home se non ci sono né dati né token
        setLocation("/");
      }
    }
  }, [setLocation]);
  
  return (
    <SignConfirmation 
      clientName={clientName} 
      quoteTitle={quoteTitle} 
      clientEmail={clientEmail}
    />
  );
}