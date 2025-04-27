import React, { useEffect, useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
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

  useEffect(() => {
    if (quoteQuery.error) {
      toast({
        title: "Errore",
        description: (quoteQuery.error as Error).message,
        variant: "destructive",
      });
    }
  }, [quoteQuery.error, toast]);

  if (quoteQuery.isLoading) {
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

  if (isExpired || !quoteQuery.data) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">
              Preventivo non disponibile
            </h2>
            <p className="text-muted-foreground mb-6">
              Il preventivo richiesto non esiste o il link di condivisione è
              scaduto.
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
          <h1 className="text-3xl md:text-4xl font-playfair font-bold mb-3">
            {quoteQuery.data.title}
          </h1>
          <Badge
            variant={
              quoteQuery.data.status === "confermato" ||
              quoteQuery.data.status === "approved"
                ? "success"
                : quoteQuery.data.status === "in attesa" ||
                    quoteQuery.data.status === "pending"
                  ? "warning"
                  : "default"
            }
            className="mb-2 px-3 py-1 text-sm"
          >
            {quoteQuery.data.status === "draft"
              ? "Bozza"
              : quoteQuery.data.status === "pending" ||
                  quoteQuery.data.status === "in attesa"
                ? "In attesa"
                : quoteQuery.data.status === "approved" ||
                    quoteQuery.data.status === "confermato"
                  ? "Confermato"
                  : quoteQuery.data.status === "rejected" ||
                      quoteQuery.data.status === "rifiutato"
                    ? "Rifiutato"
                    : quoteQuery.data.status || "Preventivo"}
          </Badge>
          <p className="text-muted-foreground mt-2">
            Creato il{" "}
            {quoteQuery.data.createdAt
              ? format(new Date(quoteQuery.data.createdAt), "dd/MM/yyyy", {
                  locale: it,
                })
              : ""}
          </p>
        </div>

        {/* Dettagli cliente */}
        <ClientAddressDetails
          client={quoteQuery.data.client}
          secondClient={quoteQuery.data.secondClient}
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
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Tipo Evento
                </h4>
                <p className="font-medium">
                  {quoteQuery.data.category?.name || "Non specificato"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Data
                </h4>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                  <p className="font-medium">
                    {quoteQuery.data.eventDate
                      ? format(
                          new Date(quoteQuery.data.eventDate),
                          "dd/MM/yyyy",
                          {
                            locale: it,
                          },
                        )
                      : "Non specificata"}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Orario
                </h4>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                  <p className="font-medium">
                    {quoteQuery.data.isFullDay
                      ? "Giornata intera"
                      : (quoteQuery.data.eventTime
                          ? quoteQuery.data.eventTime
                          : "Non specificato") +
                        (quoteQuery.data.eventEndTime
                          ? ` - ${quoteQuery.data.eventEndTime}`
                          : "")}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Location
                </h4>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                  <p className="font-medium">
                    {quoteQuery.data.location || "Non specificata"}
                  </p>
                </div>
              </div>

              {/* Utilizziamo il componente CeremonyDetails per una visualizzazione più elegante */}
              {(quoteQuery.data.ceremonyLocation ||
                quoteQuery.data.ceremonyTime) && (
                <div className="col-span-1 md:col-span-2">
                  <CeremonyDetails
                    readOnly={true}
                    ceremony={{
                      location: quoteQuery.data.ceremonyLocation,
                      time: quoteQuery.data.ceremonyTime,
                    }}
                    className="bg-muted/30 p-3 rounded-md border border-muted mt-2"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sezione Pagamenti - visibile solo se il preventivo è stato firmato */}
        {(quoteQuery.data.status === "approved" ||
          quoteQuery.data.status === "confermato") && (
          <Card className="mb-8 border-primary/20">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="flex items-center">
                <Euro className="h-5 w-5 mr-2 text-primary" />
                Pagamenti
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <FinancialSummaryWrapper
                quoteId={quoteQuery.data.id}
                quoteTotal={quoteQuery.data.total || 0}
                readOnly={true}
                clientName={
                  quoteQuery.data.client?.firstName &&
                  quoteQuery.data.client?.lastName
                    ? `${quoteQuery.data.client.firstName} ${quoteQuery.data.client.lastName}`
                    : undefined
                }
                quoteStatus={quoteQuery.data.status || ""}
              />
            </CardContent>
          </Card>
        )}

        {/* Moduli del preventivo */}
        {modules && modules.length > 0 && (
          <Card className="mb-8 border-primary/20">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-primary" />
                  {modules.length > 1 ? "Moduli" : "Modulo"}
                </div>
                {quoteQuery.data.modulesSum > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-2 bg-green-50 text-green-700 font-medium border-green-200"
                  >
                    Totale Moduli:{" "}
                    {(quoteQuery.data.modulesSum / 100).toLocaleString(
                      "it-IT",
                      { style: "currency", currency: "EUR" },
                    )}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="mb-4 text-sm">
                <h3 className="font-semibold text-base mb-2">
                  Guida al preventivo
                </h3>
                <p className="text-muted-foreground mb-2">
                  Qui puoi visualizzare i{" "}
                  {modules.length > 1 ? "moduli" : "modulo"} inclusi nel
                  preventivo.
                </p>

                {modules.some((m) => m.type === "fixed") && (
                  <div className="flex items-start gap-2 mb-2 p-2 bg-primary/5 rounded-md">
                    <div className="mt-1 text-primary">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                      </svg>
                    </div>
                    <div>
                      <span className="font-medium">Moduli fissi:</span>{" "}
                      Rappresentano i servizi inclusi di base nel pacchetto
                      scelto. Questi elementi sono sempre inclusi nel
                      preventivo.
                    </div>
                  </div>
                )}

                {modules.some((m) => m.type === "variable") && (
                  <div className="flex items-start gap-2 p-2 bg-primary/5 rounded-md">
                    <div className="mt-1 text-primary">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                      </svg>
                    </div>
                    <div>
                      <span className="font-medium">Moduli variabili:</span> Ti
                      permettono di personalizzare il pacchetto selezionando le
                      opzioni che preferisci.
                      <ul className="list-disc list-inside mt-1 ml-2 text-xs">
                        <li>
                          Le opzioni contrassegnate come{" "}
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            Obbligatorio
                          </span>{" "}
                          non possono essere deselezionate.
                        </li>
                        <li>
                          Ogni modulo variabile può richiedere un numero minimo
                          e massimo di selezioni.
                        </li>
                        <li>
                          Leggi attentamente le istruzioni all'interno di ogni
                          modulo per comprendere i requisiti di selezione.
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6 mt-4">
                {/* Moduli fissi */}
                {modules
                  .filter((m) => m.type === "fixed")
                  .map((module) => (
                    <PublicFixedModule key={module.id} module={module} />
                  ))}

                {/* Moduli variabili */}
                {modules
                  .filter((m) => m.type === "variable")
                  .map((module) => (
                    <PublicVariableModule
                      key={module.id}
                      module={module}
                      onSelectionChange={
                        quoteQuery.data &&
                        (quoteQuery.data.status === "approved" ||
                          quoteQuery.data.status === "confermato")
                          ? undefined
                          : handleModuleItemSelection
                      }
                      disabled={
                        quoteQuery.data &&
                        (quoteQuery.data.status === "approved" ||
                          quoteQuery.data.status === "confermato")
                      }
                    />
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clausole contrattuali - Aggiunto prima della firma */}
        <Card className="mb-8 border-primary/20">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary" />
              Termini e Clausole Contrattuali
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ContractClauses
              quoteId={quoteQuery.data.id}
              readOnly={
                quoteQuery.data.status === "approved" ||
                quoteQuery.data.status === "confermato"
              }
              onClausesAccepted={(accepted) => {
                setAllClausesAccepted(accepted);
              }}
            />
          </CardContent>
        </Card>

        {/* Note */}
        {quoteQuery.data.notes && (
          <Card className="mt-10 mb-6 overflow-hidden shadow-md">
            <CardHeader className="bg-primary text-primary-foreground border-b">
              <CardTitle className="text-center font-playfair">
                Per qualsiasi informazione
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-center mb-6 text-muted-foreground">
                Contattaci direttamente per confermare il tuo preventivo o per
                richieste personalizzate.
              </p>
              <div className="bg-muted/20 p-5 rounded-lg border">
                <StudioInfo className="mx-auto max-w-md" />
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
            {quoteQuery.data.status === "approved" ||
            quoteQuery.data.status === "confermato" ? (
              <div className="text-center space-y-4">
                <div className="max-w-sm mx-auto">
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200 mb-4">
                    <div className="flex items-center justify-center text-sm text-green-700">
                      <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                      Preventivo confermato e firmato
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 bg-primary/5">
                    <p className="text-sm text-muted-foreground mb-3 text-center">
                      Firmato da:
                    </p>
                    <p className="text-center text-3xl text-primary font-handwriting-great-vibes">
                      {quoteQuery.data.signature ||
                        (quoteQuery.data.client
                          ? `${quoteQuery.data.client.firstName} ${quoteQuery.data.client.lastName}`.trim()
                          : "Nome non disponibile")}
                    </p>
                    {quoteQuery.data.signedAt && (
                      <p className="text-xs text-muted-foreground mt-3 text-center">
                        in data{" "}
                        {format(
                          new Date(quoteQuery.data.signedAt),
                          "d MMMM yyyy",
                          { locale: it },
                        )}
                      </p>
                    )}
                  </div>

                  <div className="mt-8 p-4 rounded-md bg-muted text-center">
                    <p className="text-sm">
                      Questo preventivo è stato approvato e non può essere
                      modificato.
                      <br />
                      <span className="text-primary font-medium">
                        Grazie per la vostra fiducia!
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Firmando questo documento, confermi di accettare il preventivo
                  e tutti i servizi/prodotti inclusi, insieme a tutte le
                  clausole contrattuali.
                </p>

                <div className="max-w-sm mx-auto">
                  <SignaturePad
                    onSignatureSubmit={handleSignQuote}
                    isSubmitting={isSubmitting}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
