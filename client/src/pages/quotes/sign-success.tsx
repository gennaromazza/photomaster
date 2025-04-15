import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import SignConfirmation from "@/components/quotes/sign-confirmation";
import { Loader2 } from "lucide-react";
import { getQueryParams } from "@/lib/utils";

const SignSuccessPage = () => {
  const [clientName, setClientName] = useState<string | undefined>(undefined);
  const [quoteTitle, setQuoteTitle] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = getQueryParams();
    const token = params.token;
    
    if (!token) {
      // Se non c'è un token, reindirizza alla home
      setLocation("/");
      return;
    }
    
    // Estrai le informazioni dal localStorage se disponibili
    const storedClient = localStorage.getItem('signedQuoteClient');
    const storedQuote = localStorage.getItem('signedQuoteTitle');
    
    if (storedClient) {
      try {
        setClientName(storedClient);
      } catch (e) {
        console.error("Errore nel parsing del client", e);
      }
    }
    
    if (storedQuote) {
      try {
        setQuoteTitle(storedQuote);
      } catch (e) {
        console.error("Errore nel parsing del titolo preventivo", e);
      }
    }
    
    // Rimuovi le informazioni dal localStorage dopo averle utilizzate
    localStorage.removeItem('signedQuoteClient');
    localStorage.removeItem('signedQuoteTitle');
    
    // Simula un breve caricamento per dare il tempo alle animazioni di avviarsi
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, [setLocation]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#f9f7f7] to-[#edf2f7]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-medium text-gray-600">Caricamento...</p>
      </div>
    );
  }

  return <SignConfirmation clientName={clientName} quoteTitle={quoteTitle} />;
};

export default SignSuccessPage;