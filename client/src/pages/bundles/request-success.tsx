import { useEffect, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { CheckCircle, ArrowLeft, Package as PackageIcon, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Layout from "@/components/layout/layout";
import { useQuery } from "@tanstack/react-query";

export default function RequestSuccessPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const quoteId = params.get("quoteId");
  
  // Recupera i dati memorizzati nel localStorage
  const [clientName, setClientName] = useState<string>("");
  const [clientEmail, setClientEmail] = useState<string>("");
  
  // Usa useQuery per recuperare opzionalmente i dettagli del preventivo
  const { data: quote } = useQuery({
    queryKey: ["/api/quotes", quoteId],
    queryFn: async () => {
      if (!quoteId) return null;
      try {
        const res = await fetch(`/api/quotes/${quoteId}`);
        if (!res.ok) return null;
        return await res.json();
      } catch (error) {
        console.error("Errore nel recupero del preventivo:", error);
        return null;
      }
    },
    enabled: !!quoteId,
    // Non è necessario ricaricare i dati in questo caso
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  // Carica i dati dal localStorage all'avvio
  useEffect(() => {
    const storedName = localStorage.getItem("requestedQuoteClientName") || "";
    const storedEmail = localStorage.getItem("requestedQuoteClientEmail") || "";
    
    setClientName(storedName);
    setClientEmail(storedEmail);
    
    // Pulizia dati sensibili dal localStorage dopo averli letti
    localStorage.removeItem("requestedQuoteClientName");
    localStorage.removeItem("requestedQuoteClientEmail");
  }, []);

  return (
    <Layout>
      <div className="container mx-auto py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg border-primary/10 overflow-hidden">
            <div className="bg-primary/10 p-8 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-center mb-2">Richiesta Inviata!</h1>
              <p className="text-center text-muted-foreground">
                La tua richiesta di preventivo è stata ricevuta con successo.
              </p>
            </div>
            
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Grazie{clientName ? `, ${clientName}` : ""}!</h2>
                <p className="text-muted-foreground">
                  Abbiamo ricevuto la tua richiesta di preventivo 
                  {quote?.title ? ` per "${quote.title}"` : ""}.
                  Ti contatteremo presto all'indirizzo email {clientEmail || "fornito"} per discutere i dettagli.
                </p>
              </div>
              
              <div className="bg-muted/40 rounded-lg p-4 space-y-3">
                <h3 className="font-medium flex items-center">
                  <PackageIcon className="h-4 w-4 mr-2 text-primary" />
                  Passaggi successivi:
                </h3>
                <ul className="space-y-2 text-sm pl-6 list-disc">
                  <li>Riceverai un'email di conferma con un riepilogo della tua richiesta.</li>
                  <li>Un nostro consulente esaminerà la tua richiesta entro 1-2 giorni lavorativi.</li>
                  <li>Ti contatteremo per discutere eventuali dettagli aggiuntivi o personalizzazioni.</li>
                  <li>Riceverai il preventivo definitivo con tutte le informazioni.</li>
                </ul>
              </div>
              
              {quote?.eventDate && (
                <div className="flex items-center space-x-3 p-3 border border-primary/20 rounded-md bg-primary/5">
                  <Calendar className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">Data evento provvisoria:</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(quote.eventDate).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="p-8 pt-0 flex justify-center">
              <Button 
                onClick={() => navigate("/bundles")} 
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Torna ai Pacchetti
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
}