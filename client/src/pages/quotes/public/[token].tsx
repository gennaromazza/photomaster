import React, { useEffect, useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  CheckCircle,
  FileCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ClientAddressDetails } from "@/components/quotes/client-address-details";
import { StudioInfo } from "@/components/quotes/studio-info";
import { CeremonyDetails } from "@/components/quotes/ceremony-details";
import ContractClauses from "@/components/quotes/contract-clauses";
import { useCompanyProfile } from "@/config/companyProfile";
import { PublicFixedModule } from "@/components/quotes/public-fixed-module";
import { PublicVariableModule } from "@/components/quotes/public-variable-module";
import { FinancialSummaryWrapper } from "@/components/quotes/financial-summary-wrapper";
import { SignaturePad } from "@/components/quotes/signature-pad";
import { Watermark } from "@/components/ui/watermark";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SocialMediaShowcase } from "@/components/shared/social-media-showcase";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";


// Layout specifico per la visualizzazione pubblica
const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  // Query per ottenere le impostazioni dell'applicazione (con staleTime per migliorare performance)
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    staleTime: 30 * 60 * 1000, // 30 minuti - le impostazioni cambiano raramente
    gcTime: 60 * 60 * 1000, // 1 ora
  });

  // Estrai le impostazioni della filigrana, o usa valori predefiniti
  const watermarkSettings =
    (settings?.additionalSettings as any)?.watermark || {};
  const watermarkText =
    watermarkSettings.text || settings?.companyName || "ImageStudio";
  const watermarkOpacity = watermarkSettings.opacity || 0.07;
  const watermarkRotate = watermarkSettings.rotate || -30;
  const watermarkPosition = watermarkSettings.position || "center";

  // Rendering della pagina con filigrana personalizzata
  return (
    <div className="min-h-screen flex flex-col bg-background/50 overflow-hidden relative">
      {/* Filigrana personalizzata */}
      <Watermark
        text={watermarkText}
        opacity={watermarkOpacity}
        fontSize="1.8rem"
        rotate={watermarkRotate}
        repeat={12}
        position={watermarkPosition as "center" | "top" | "bottom"}
        color="var(--primary)"
      />

      {/* Aggiungiamo il componente social nella modalità floating sul lato destro della pagina */}
      <SocialMediaShowcase
        settings={settings}
        variant="floating"
        showFollowText={false}
      />

      <header className="bg-primary py-5 shadow-md relative z-10">
        <div className="container px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-center">
            <div className="bg-white/10 p-1 px-3 rounded-full">
              <h1 className="text-2xl md:text-3xl font-playfair text-primary-foreground tracking-wide">
                <span className="font-bold">Image</span>
                <span className="font-light">Studio</span>
                <span className="text-lg md:text-xl ml-2 opacity-80 font-light">
                  Preventivo
                </span>
              </h1>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 container px-4 sm:px-6 md:px-8 py-6 md:py-10 relative z-10">
        {children}
      </main>
      <footer className="bg-muted py-5 border-t shadow-inner relative z-10">
        <div className="container px-4 text-center">
          <div className="flex flex-col items-center justify-center space-y-5">
            {/* Aggiungiamo il componente SocialMediaShowcase con variante footer */}
            <SocialMediaShowcase
              settings={settings}
              variant="footer"
              title="Seguici sui social"
            />

            <div className="flex flex-col items-center space-y-2">
              <p className="text-sm md:text-base text-muted-foreground">
                Preventivo generato da{" "}
                <span className="font-medium">
                  {settings?.companyName || "ImageStudio"}
                </span>
              </p>
              <p className="text-xs text-muted-foreground/70">
                © {new Date().getFullYear()} - Tutti i diritti riservati
              </p>
            </div>
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
  const [selectedModuleItems, setSelectedModuleItems] = useState<
    Record<number, number[]>
  >({});
  const [signature, setSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allClausesAccepted, setAllClausesAccepted] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Utilizziamo useMemo per ottenere una reference stabile nel tempo del token
  // Questo evita query inutili causate dal token che cambia reference
  const memoizedToken = useMemo(() => token, [token]);

  // Carica i dati del preventivo tramite token di condivisione con aggiornamento automatico
  const quoteQuery = useQuery({
    queryKey: ["/api/quotes/share", memoizedToken],
    queryFn: async ({ queryKey }) => {
      // Tipo esplicito per evitare problemi con QueryKey
      const [_baseUrl, tokenValue] = queryKey as [string, string];
      if (!tokenValue) {
        setIsExpired(true);
        throw new Error("Token preventivo mancante");
      }

      try {
        const res = await fetch(`/api/quotes/share/${tokenValue}`);
        if (!res.ok) {
          if (res.status === 404) {
            setIsExpired(true);
            throw new Error("Preventivo non trovato o link scaduto");
          }
          throw new Error("Errore nel caricamento del preventivo");
        }
        return res.json();
      } catch (error) {
        console.error("Errore caricamento preventivo:", error);
        throw error;
      }
    },
    // Performance optimization:
    staleTime: 60 * 1000, // 1 minuto prima di considerare i dati obsoleti
    gcTime: 5 * 60 * 1000, // 5 minuti in cache
    // Aggiornamento automatico ogni 60 secondi invece di 30
    // Un intervallo più lungo riduce il carico sul server
    refetchInterval: 60 * 1000,
    // Disabilitiamo il refetch in background per risparmiare risorse
    refetchIntervalInBackground: false,
  });

  const clientQuery = useQuery({
    queryKey: ["/api/clients", quoteQuery.data?.clientId],
    queryFn: async () => {
      const clientId = quoteQuery.data?.clientId;
      if (!clientId) return {};
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) {
        throw new Error("Errore nel caricamento del cliente");
      }
      return res.json();
    },
    enabled: !!quoteQuery.data?.clientId,
  });


  const quoteItemsQuery = useQuery({
    queryKey: ["/api/quotes/items", quoteQuery.data?.id],
    queryFn: async () => {
      const quoteId = quoteQuery.data?.id;
      if (!quoteId) return [];
      const res = await fetch(`/api/quotes/${quoteId}/items`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!quoteQuery.data?.id,
  });

  const { data: companyProfile, isLoading: isLoadingCompanyProfile } = useCompanyProfile();
  const companyName = companyProfile?.companyName || "ImageStudio";
  const companyLogo = companyProfile?.logo;
  const companyInfoString = companyProfile?.companyInfoString || "ImageStudio";


  // Carica i moduli del preventivo
  const { data: modules = [], isLoading: isLoadingModules } = useQuery({
    queryKey: ["/api/quotes/modules", quoteQuery.data?.id],
    queryFn: async ({ queryKey }) => {
      // Tipo esplicito per evitare problemi con QueryKey
      const [_baseUrl, quoteId] = queryKey as [string, number | undefined];
      if (!quoteId) return [];

      try {
        const res = await fetch(`/api/quotes/${quoteId}/modules`);
        if (!res.ok) return [];
        return res.json();
      } catch (err) {
        console.error("Errore nel caricamento dei moduli:", err);
        return [];
      }
    },
    // Abilita la query solo quando il quoteId è disponibile
    enabled: !!quoteQuery.data?.id,
    // Performance optimization:
    staleTime: 2 * 60 * 1000, // 2 minuti prima di considerare i dati obsoleti
    gcTime: 5 * 60 * 1000, // 5 minuti in cache
    // Aggiornamento automatico ogni 30 secondi invece di 15
    refetchInterval: 30 * 1000,
    // Disabilitiamo il refetch in background per risparmiare risorse
    refetchIntervalInBackground: false,
  });

  // Funzione per gestire la selezione degli elementi nei moduli variabili
  // Funzione memorizzata con useMemo per evitare ricreazioni inutili
  const handleModuleItemSelection = useMemo(
    () => (moduleId: number, selectedItems: number[]) => {
      setSelectedModuleItems((prev) => ({
        ...prev,
        [moduleId]: selectedItems,
      }));
    },
    [],
  );

  // Funzione di validazione per i moduli variabili - usando useMemo per evitare ricalcoli inutili
  const isSelectionValidForAllModules = useMemo(
    () =>
      (): {
        isValid: boolean;
        message?: string;
      } => {
        if (!modules?.length) return { isValid: true };

        // Esamina tutti i moduli variabili
        for (const module of modules) {
          if (module.type !== "variable") continue;

          // Ottieni gli item selezionati per questo modulo
          const selectedItems = selectedModuleItems[module.id] || [];

          // Verifica i requisiti minimi
          if (
            module.minSelectCount &&
            selectedItems.length < module.minSelectCount
          ) {
            return {
              isValid: false,
              message: `Nel modulo "${module.name}" devi selezionare almeno ${module.minSelectCount} ${module.minSelectCount === 1 ? "elemento" : "elementi"}.`,
            };
          }

          // Verifica i requisiti massimi
          if (
            module.maxSelectCount &&
            selectedItems.length > module.maxSelectCount
          ) {
            return {
              isValid: false,
              message: `Nel modulo "${module.name}" puoi selezionare al massimo ${module.maxSelectCount} ${module.maxSelectCount === 1 ? "elemento" : "elementi"}.`,
            };
          }
        }

        return { isValid: true };
      },
    [modules, selectedModuleItems],
  );

  // Gestione firma e conferma preventivo - implementato come funzione per gestire la firma
  const handleSignQuote = async (signatureValue: string) => {
    //Check if quote is already signed
    if (
      quoteQuery.data &&
      (quoteQuery.data.status === "approved" ||
        quoteQuery.data.status === "confermato")
    ) {
      toast({
        title: "Errore",
        description: "Il preventivo è già stato firmato",
        variant: "destructive",
      });
      return;
    }

    if (!signatureValue.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci il tuo nome e cognome per firmare",
        variant: "destructive",
      });
      return;
    }

    // Verifica che le clausole obbligatorie siano state accettate
    if (!allClausesAccepted) {
      toast({
        title: "Clausole non accettate",
        description:
          "Devi accettare tutte le clausole obbligatorie prima di firmare",
        variant: "destructive",
      });
      return;
    }

    // Aggiorna lo stato locale della firma
    setSignature(signatureValue);

    // Verifica tutti i moduli variabili per assicurarsi che rispettino i requisiti minimi/massimi
    const validationResult = isSelectionValidForAllModules();
    if (!validationResult.isValid) {
      toast({
        title: "Selezione non valida",
        description:
          validationResult.message ||
          "Verifica le selezioni nei moduli variabili",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Prima proviamo ad accettare le clausole
      try {
        await apiRequest(
          "POST",
          `/api/clauses/quote/${quoteQuery.data?.id}/accept`,
          {},
        );
        console.log("Clausole accettate con successo");
      } catch (error) {
        console.error("Errore nell'accettazione delle clausole:", error);
        // Continua comunque con la firma anche se fallisce l'accettazione delle clausole
      }

      // Poi procediamo con la firma del preventivo
      const response = await apiRequest(
        "POST",
        `/api/quotes/share/${token}/sign`,
        {
          signature: signatureValue.trim(),
          status: "approved",
          signedAt: new Date().toISOString(),
          selectedModuleItems: selectedModuleItems,
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || "Errore durante la firma del preventivo",
        );
      }

      //Added code to create the event after successful quote signing.  Assumes /api/events endpoint exists.
      await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: quoteQuery.data?.title,
          description: quoteQuery.data?.notes || "",
          date: quoteQuery.data?.eventDate,
          location: quoteQuery.data?.location,
          clientId: quoteQuery.data?.client.id, // Assuming client object has an id property. Adjust as needed
          secondClientId: quoteQuery.data?.secondClient?.id || null, //Handle optional second client
          quoteId: quoteQuery.data?.id,
          status: "confirmed",
          eventType: quoteQuery.data?.eventType || "wedding",
          categoryId: quoteQuery.data?.category?.id, // Assuming category object has an id property. Adjust as needed.
          leadSourceId: quoteQuery.data?.leadSourceId,
          ceremonyLocation: quoteQuery.data?.ceremonyLocation,
          ceremonyTime: quoteQuery.data?.ceremonyTime,
        }),
      });

      // Salviamo i dati nel localStorage per la pagina di conferma
      if (quoteQuery.data?.client) {
        localStorage.setItem(
          "signedQuoteClient",
          `${quoteQuery.data.client.firstName} ${quoteQuery.data.client.lastName}`.trim(),
        );
        if (quoteQuery.data.client.email) {
          localStorage.setItem(
            "signedQuoteEmail",
            quoteQuery.data.client.email,
          );
        }
      }
      if (quoteQuery.data?.title) {
        localStorage.setItem("signedQuoteTitle", quoteQuery.data.title);
      }

      toast({
        title: "Preventivo confermato",
        description: "Grazie per aver confermato il preventivo!",
      });

      // Reindirizza alla pagina di conferma
      setLocation(`/quotes/sign-success?token=${token}`);
    } catch (error) {
      console.error("Errore firma preventivo:", error);
      toast({
        title: "Errore",
        description:
          "Si è verificato un errore durante la firma del preventivo",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSign = () => {
    if (!agreed) {
      toast({ title: "Errore", description: "Devi accettare i termini e le condizioni", variant: "destructive" });
      return;
    }
    handleSignQuote(signature);
  };

  const signQuoteMutation = useMutation({
    mutationFn: () => handleSignQuote(signature),
  });


  useEffect(() => {
    if (quoteQuery.error) {
      toast({
        title: "Errore",
        description: (quoteQuery.error as Error).message,
        variant: "destructive",
      });
    }
  }, [quoteQuery.error, toast]);

  const id = quoteQuery.data?.id;
  const client = clientQuery?.data;
  const quoteItems = quoteItemsQuery?.data || [];
  const isApproved = quoteQuery.data?.status === "approved";


  // Loading state
  if (quoteQuery.isLoading || clientQuery.isLoading || isLoadingCompanyProfile || quoteItemsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#8B7355]" />
          <p className="mt-4 text-[#6B5C4D] font-serif">Caricamento preventivo...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (quoteQuery.isError || !quoteQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <Card className="w-full max-w-2xl text-center border-[#D2B48C] bg-white/90">
          <CardHeader>
            <CardTitle className="text-2xl font-serif text-[#6B5C4D]">Preventivo non disponibile</CardTitle>
            <CardDescription className="text-[#8B7355]">
              Il preventivo richiesto non esiste o non è più disponibile.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <a href="/" className="inline-flex items-center justify-center rounded-md bg-[#8B7355] hover:bg-[#6B5C4D] px-6 py-3 text-sm font-medium text-white transition-colors">
              Torna alla Home
            </a>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const quote = quoteQuery.data;
  
  // Se il preventivo è già stato approvato
  if (isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] p-6">
        <Card className="w-full max-w-2xl border-[#D2B48C] bg-white/90 shadow-lg">
          <CardHeader className="text-center border-b border-[#D2B48C]/30">
            <CardTitle className="text-2xl font-serif text-[#6B5C4D]">Preventivo già approvato</CardTitle>
            <CardDescription className="text-[#8B7355]">
              Grazie! Questo preventivo è stato approvato il {formatDate(new Date(quote.updatedAt || quote.createdAt))}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center text-[#4A7F3F] my-8">
              <div className="rounded-full bg-[#E8F5E9] p-4">
                <FileCheck className="h-10 w-10" />
              </div>
            </div>
            <div className="text-center space-y-3">
              <p className="text-[#6B5C4D] font-serif">Un nostro rappresentante ti contatterà presto per organizzare i dettagli.</p>
              <p className="text-sm text-[#8B7355]">Riferimento preventivo: #{quote.id}</p>
            </div>
          </CardContent>
          <CardFooter className="justify-center border-t border-[#D2B48C]/30 pt-6">
            <p className="text-sm text-[#8B7355] font-serif">
              {companyInfoString}
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-10 px-4">
      <div className="container mx-auto">
        <Card className="w-full max-w-4xl mx-auto border-[#D2B48C] bg-white/90 shadow-lg">
          <CardHeader className="text-center border-b border-[#D2B48C]/30 bg-[#F5EDE3]">
            <div className="mb-6">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="h-20 mx-auto" />
              ) : (
                <h1 className="text-3xl font-serif font-bold text-[#6B5C4D]">{companyName}</h1>
              )}
            </div>
            <CardTitle className="text-2xl font-serif text-[#6B5C4D]">Preventivo: {quote.title}</CardTitle>
            <CardDescription className="text-[#8B7355] mt-2">
              Creato il {formatDate(new Date(quote.createdAt))}
              {quote.expiryDate && ` · Valido fino al ${formatDate(new Date(quote.expiryDate))}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8 pt-8">
            {/* Dettagli cliente */}
            <div className="bg-[#F9F6F0] p-6 rounded-lg border border-[#D2B48C]/30">
              <h3 className="font-serif text-lg text-[#6B5C4D] mb-4">Informazioni Cliente</h3>
              <div className="space-y-2 text-[#8B7355]">
                <p><span className="font-medium">Nome:</span> {client.firstName} {client.lastName}</p>
                <p><span className="font-medium">Email:</span> {client.email}</p>
                {client.phone && <p><span className="font-medium">Telefono:</span> {client.phone}</p>}
                {client.address && <p><span className="font-medium">Indirizzo:</span> {client.address}</p>}
              </div>
            </div>

            {/* Elementi del preventivo */}
            <div>
              <h3 className="font-serif text-lg text-[#6B5C4D] mb-4">Servizi e Prodotti</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#D2B48C]/30">
                      <th className="text-left py-4 px-4 font-serif text-[#6B5C4D]">Descrizione</th>
                      <th className="text-right py-4 px-4 font-serif text-[#6B5C4D]">Quantità</th>
                      <th className="text-right py-4 px-4 font-serif text-[#6B5C4D]">Prezzo</th>
                      <th className="text-right py-4 px-4 font-serif text-[#6B5C4D]">Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteItemsQuery.isLoading ? (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-[#8B7355]">Caricamento...</td>
                      </tr>
                    ) : quoteItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-[#8B7355]">Nessun prodotto o servizio</td>
                      </tr>
                    ) : (
                      quoteItems.map((item: any) => (
                        <tr key={item.id} className="border-b border-[#D2B48C]/30">
                          <td className="py-4 px-4">
                            <div className="font-medium text-[#6B5C4D]">{item.serviceName || "Servizio"}</div>
                            {item.notes && (
                              <div className="text-sm text-[#8B7355] mt-1">{item.notes}</div>
                            )}
                          </td>
                          <td className="text-right py-4 px-4 text-[#8B7355]">{item.quantity}</td>
                          <td className="text-right py-4 px-4">
                            {item.hasDiscount && item.discountValue ? (
                              <div>
                                <span className="line-through text-[#B8A99A] mr-2">
                                  {formatCurrency(item.unitPrice)}
                                </span>
                                <span className="text-[#8B7355]">{formatCurrency(item.discountedPrice || item.unitPrice)}</span>
                              </div>
                            ) : (
                              <span className="text-[#8B7355]">{formatCurrency(item.unitPrice)}</span>
                            )}
                          </td>
                          <td className="text-right py-4 px-4 font-medium text-[#6B5C4D]">{formatCurrency(item.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Riepilogo totali */}
            <div className="pt-6 space-y-3 border-t border-[#D2B48C]/30">
              <div className="flex justify-between text-[#8B7355]">
                <span>Subtotale</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between text-[#4A7F3F]">
                  <span>Sconto</span>
                  <span>-{formatCurrency(quote.discount)}</span>
                </div>
              )}
              {quote.tax > 0 && (
                <div className="flex justify-between text-[#8B7355]">
                  <span>IVA ({(quote.tax / quote.subtotal * 100).toFixed(0)}%)</span>
                  <span>{formatCurrency(quote.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-serif text-xl pt-3 text-[#6B5C4D] border-t border-[#D2B48C]/30">
                <span>Totale</span>
                <span>{formatCurrency(quote.total)}</span>
              </div>
            </div>

            {/* Note */}
            {quote.notes && (
              <div className="pt-6">
                <h3 className="font-serif text-lg text-[#6B5C4D] mb-3">Note</h3>
                <div className="bg-[#F9F6F0] p-6 rounded-lg border border-[#D2B48C]/30 whitespace-pre-wrap text-[#8B7355]">
                  {quote.notes}
                </div>
              </div>
            )}

            <Separator className="my-8 bg-[#D2B48C]/30" />

            {/* Clausole contrattuali */}
            <ContractClauses 
              quoteId={id as string} 
              onClausesAccepted={setAllClausesAccepted}
            />

            <Separator className="my-8 bg-[#D2B48C]/30" />

            {/* Sezione firma */}
            <div className="pt-6">
              <h3 className="font-serif text-lg text-[#6B5C4D] mb-4">Approva Preventivo</h3>
              <p className="text-sm text-[#8B7355] mb-6">
                Per approvare il preventivo, inserisci il tuo nome e cognome nel campo sottostante. 
                Questa firma digitale conferma la tua accettazione dei termini e dei costi indicati.
              </p>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="signature" className="text-[#6B5C4D]">La tua firma</Label>
                  <Input
                    id="signature"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Inserisci il tuo nome e cognome"
                    className="max-w-md border-[#D2B48C] focus:ring-[#8B7355]"
                  />
                </div>

                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 border-[#D2B48C] text-[#8B7355] focus:ring-[#8B7355]"
                  />
                  <Label htmlFor="terms" className="text-sm font-normal text-[#8B7355]">
                    Accetto i termini e le condizioni e autorizzo il trattamento dei miei dati personali 
                    in conformità con la normativa sulla privacy. Confermo di aver letto e compreso il 
                    preventivo e approvo i servizi e i relativi costi indicati.
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex-col items-start space-y-6 pt-8 bg-[#F5EDE3] rounded-b-lg border-t border-[#D2B48C]/30">
            <Button 
              onClick={handleSign} 
              disabled={signQuoteMutation.isPending}
              className="w-full sm:w-auto bg-[#8B7355] hover:bg-[#6B5C4D] text-white"
            >
              {signQuoteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Elaborazione...
                </>
              ) : (
                <>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Approva e Firma
                </>
              )}
            </Button>

            <div className="text-xs text-[#8B7355] mt-6 w-full text-center font-serif">
              <p>{companyInfoString}</p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}