import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { 
  User, 
  Calendar, 
  MapPin, 
  Clock, 
  FileText, 
  Euro,
  Loader2,
  Church,
  FileSignature,
  CheckCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ClientAddressDetails } from "@/components/quotes/client-address-details";
import { StudioInfo } from "@/components/quotes/studio-info";
import { CeremonyDetails } from "@/components/quotes/ceremony-details";
import { PublicFixedModule } from "@/components/quotes/public-fixed-module";
import { PublicVariableModule } from "@/components/quotes/public-variable-module";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


// Layout specifico per la visualizzazione pubblica
const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <header className="bg-primary py-5 shadow-md">
        <div className="container px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-center">
            <div className="bg-white/10 p-1 px-3 rounded-full">
              <h1 className="text-2xl md:text-3xl font-playfair text-primary-foreground tracking-wide">
                <span className="font-bold">Image</span>
                <span className="font-light">Studio</span>
                <span className="text-lg md:text-xl ml-2 opacity-80 font-light">Preventivo</span>
              </h1>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 container px-4 sm:px-6 md:px-8 py-6 md:py-10">{children}</main>
      <footer className="bg-muted py-5 border-t shadow-inner">
        <div className="container px-4 text-center">
          <div className="flex flex-col items-center justify-center space-y-2">
            <p className="text-sm md:text-base text-muted-foreground">
              Preventivo generato da <span className="font-medium">ImageStudio</span>
            </p>
            <p className="text-xs text-muted-foreground/70">
              © {new Date().getFullYear()} - Tutti i diritti riservati
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function PublicQuotePage() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isExpired, setIsExpired] = useState(false);
  const [selectedModuleItems, setSelectedModuleItems] = useState<Record<number, number[]>>({});
  const [signature, setSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carica i dati del preventivo tramite token di condivisione
  const { data: quote, isLoading, error } = useQuery({
    queryKey: ["/api/quotes/share", token],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/share/${token}`);
      if (!res.ok) {
        if (res.status === 404) {
          setIsExpired(true);
          throw new Error("Preventivo non trovato o link scaduto");
        }
        throw new Error("Errore nel caricamento del preventivo");
      }
      return res.json();
    },
  });

  // Carica i moduli del preventivo
  const { data: modules = [], isLoading: isLoadingModules } = useQuery({
    queryKey: ["/api/quotes/share", token, "modules"],
    queryFn: async () => {
      if (!quote?.id) return [];

      try {
        const res = await fetch(`/api/quotes/${quote.id}/modules`);
        if (!res.ok) return [];
        return res.json();
      } catch (err) {
        console.error("Errore nel caricamento dei moduli:", err);
        return [];
      }
    },
    enabled: !!quote?.id,
  });

  // Funzione per gestire la selezione degli elementi nei moduli variabili
  const handleModuleItemSelection = (moduleId: number, selectedItems: number[]) => {
    console.log(`[LOG] Selezione modulo ${moduleId}, elementi selezionati:`, selectedItems);

    setSelectedModuleItems(prev => {
      const newSelections = {
        ...prev,
        [moduleId]: selectedItems
      };

      // Log per debugging
      console.log(`[LOG] Nuovo stato selezioni moduli:`, newSelections);
      return newSelections;
    });
  };

  // Gestione firma e conferma preventivo
  const handleSignQuote = async () => {
    //Check if quote is already signed
    if (quote && (quote.status === "approved" || quote.status === "confermato")) {
      toast({
        title: "Errore",
        description: "Il preventivo è già stato firmato",
        variant: "destructive",
      });
      return;
    }

    if (!signature.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci il tuo nome e cognome per firmare",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/quotes/share/${token}/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signature: signature.trim(),
          status: "approved",
          signedAt: new Date().toISOString(),
          selectedModuleItems: selectedModuleItems
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Errore durante la firma del preventivo");
      }

      toast({
        title: "Preventivo confermato",
        description: "Grazie per aver confermato il preventivo!",
      });

      // Reindirizza alla pagina di conferma
      setLocation(`/quotes/public/confirmation/${token}`);
    } catch (error) {
      console.error("Errore firma preventivo:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la firma del preventivo",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (error) {
      toast({
        title: "Errore",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Caricamento preventivo...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (isExpired || !quote) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Preventivo non disponibile</h2>
            <p className="text-muted-foreground mb-6">
              Il preventivo richiesto non esiste o il link di condivisione è scaduto.
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto">
        {/* Intestazione preventivo */}
        <div className="text-center mb-10 bg-primary/5 py-8 px-4 rounded-lg shadow-sm border border-primary/10">
          <h1 className="text-3xl md:text-4xl font-playfair font-bold mb-3">{quote.title}</h1>
          <Badge 
            variant={quote.status === "confermato" || quote.status === "approved" ? "success" : 
                     quote.status === "in attesa" || quote.status === "pending" ? "warning" : 
                     "default"}
            className="mb-2 px-3 py-1 text-sm"
          >
            {quote.status === "draft" ? "Bozza" : 
             quote.status === "pending" || quote.status === "in attesa" ? "In attesa" : 
             quote.status === "approved" || quote.status === "confermato" ? "Confermato" : 
             quote.status === "rejected" || quote.status === "rifiutato" ? "Rifiutato" : 
             quote.status || "Preventivo"}
          </Badge>
          <p className="text-muted-foreground mt-2">
            Creato il {quote.createdAt ? format(new Date(quote.createdAt), "dd/MM/yyyy", { locale: it }) : ""}
          </p>
        </div>

        {/* Dettagli cliente */}
        <ClientAddressDetails
          client={quote.client}
          secondClient={quote.secondClient}
          className="mb-6"
          showAddresses={true}
        />

        {/* Dettagli evento */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Dettagli Evento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Tipo Evento</h4>
                <p className="font-medium">{quote.category?.name || "Non specificato"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Data</h4>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                  <p className="font-medium">
                    {quote.eventDate ? format(new Date(quote.eventDate), "dd/MM/yyyy", { locale: it }) : "Non specificata"}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Orario</h4>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                  <p className="font-medium">
                    {quote.isFullDay ? "Giornata intera" : 
                     (quote.eventTime ? quote.eventTime : "Non specificato") +
                     (quote.eventEndTime ? ` - ${quote.eventEndTime}` : "")}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Location</h4>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                  <p className="font-medium">{quote.location || "Non specificata"}</p>
                </div>
              </div>

              {/* Utilizziamo il componente CeremonyDetails per una visualizzazione più elegante */}
              {(quote.ceremonyLocation || quote.ceremonyTime) && (
                <div className="col-span-1 md:col-span-2">
                  <CeremonyDetails 
                    readOnly={true}
                    ceremony={{
                      location: quote.ceremonyLocation,
                      time: quote.ceremonyTime
                    }}
                    className="bg-muted/30 p-3 rounded-md border border-muted mt-2"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Servizi/Moduli */}
        <Card className="mb-6 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary" />
              Servizi inclusi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {quote.quoteItems && quote.quoteItems.length > 0 ? (
              <div className="space-y-4">
                {quote.quoteItems.map((item: any) => (
                  <div key={item.id} className="border rounded-md p-4 hover:border-primary/30 transition-colors duration-200 bg-background shadow-sm">
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <h4 className="font-medium text-base md:text-lg">{item.service?.name || "Servizio"}</h4>
                      <Badge variant="outline" className="bg-primary/5 text-primary">€ {(item.total || 0).toLocaleString()}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {item.quantity || 1} x €{(item.unitPrice || 0).toLocaleString()}
                      {item.hasDiscount && (
                        <span className="text-green-600 font-medium"> (-{item.discountType === 'percentage' ? `${item.discountValue}%` : `€${item.discountValue}`})</span>
                      )}
                    </p>
                    {item.description && (
                      <p className="text-sm mt-3 bg-muted p-3 rounded-md border border-border/50">{item.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 border rounded-md bg-muted/20">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">Nessun servizio incluso nel preventivo</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col md:flex-row md:justify-between border-t py-5 gap-4 bg-muted/10">
            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground">Totale Servizi</p>
              <p className="font-medium text-xl">€ {(quote.subtotal || 0).toLocaleString()}</p>
            </div>
            {quote.discount > 0 && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Sconto</p>
                <p className="font-medium text-xl text-green-600">- € {(quote.discount || 0).toLocaleString()}</p>
              </div>
            )}
            <div className="text-center md:text-right bg-primary/5 px-6 py-3 rounded-md border border-primary/10">
              <p className="text-sm font-medium text-primary">Totale Preventivo</p>
              <p className="font-bold text-2xl">€ {(quote.total || 0).toLocaleString()}</p>
            </div>
          </CardFooter>
        </Card>

        {/* Moduli del preventivo */}
        {modules && modules.length > 0 && (
          <Card className="mb-8 border-primary/20">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                {modules.length > 1 ? "Moduli" : "Modulo"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="mb-2 text-sm text-muted-foreground">
                Qui puoi visualizzare i {modules.length > 1 ? "moduli" : "modulo"} inclusi nel preventivo.
                {modules.some(m => m.type === 'variable') && (
                  <p className="mt-1">
                    I moduli <span className="font-medium">variabili</span> ti permettono di selezionare le opzioni che preferisci.
                  </p>
                )}
              </div>

              <div className="space-y-6 mt-4">
                {/* Moduli fissi */}
                {modules.filter(m => m.type === 'fixed').map(module => (
                  <PublicFixedModule key={module.id} module={module} />
                ))}

                {/* Moduli variabili */}
                {modules.filter(m => m.type === 'variable').map(module => (
                  <PublicVariableModule 
                    key={module.id} 
                    module={module}
                    onSelectionChange={handleModuleItemSelection}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sezione Firma Digitale */}
        <Card className="mb-8 border-primary/20">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="flex items-center">
              <FileSignature className="h-5 w-5 mr-2 text-primary" />
              Firma Digitale
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {quote.status === "approved" || quote.status === "confermato" ? (
              <div className="text-center space-y-4">
                <div className="max-w-sm mx-auto">
                  <div className="border-2 border-primary/10 rounded-lg p-6 bg-primary/5">
                    <p className="text-sm text-muted-foreground mb-4">
                      Preventivo firmato da:
                    </p>
                    <p className="font-playfair text-2xl text-primary mb-2" style={{ fontFamily: 'Dancing Script, cursive' }}>
                      {quote.signature}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Firmato il {quote.signedAt ? format(new Date(quote.signedAt), "dd/MM/yyyy 'alle' HH:mm", { locale: it }) : ""}
                    </p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-center text-sm text-green-600">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Preventivo confermato e firmato
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      da {quote.signature}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Firmando questo documento, confermi di accettare il preventivo e tutti i servizi/prodotti inclusi.
                </p>

                <div className="max-w-sm mx-auto space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signature">Nome e Cognome</Label>
                    <Input
                      id="signature"
                      placeholder="Inserisci il tuo nome e cognome"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleSignQuote}
                    disabled={!signature.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Elaborazione...
                      </>
                    ) : (
                      <>
                        <FileSignature className="mr-2 h-4 w-4" />
                        Firma e Conferma
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Note */}
        {quote.notes && (
          <Card className="mt-10 mb-6 overflow-hidden shadow-md">
            <CardHeader className="bg-primary text-primary-foreground border-b">
              <CardTitle className="text-center font-playfair">Per qualsiasi informazione</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-center mb-6 text-muted-foreground">
                Contattaci direttamente per confermare il tuo preventivo o per richieste personalizzate.
              </p>
              <div className="bg-muted/20 p-5 rounded-lg border">
                <StudioInfo className="mx-auto max-w-md" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PublicLayout>
  );
}