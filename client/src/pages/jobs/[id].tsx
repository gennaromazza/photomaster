import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Icons
import { 
  Calendar, 
  MapPin, 
  Clock, 
  User, 
  Users, 
  ClipboardList,
  FileText,
  Share2,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";

// Custom components
import EventTasks from "@/components/events/event-tasks";
import ModuleManager from "@/components/quotes/modules/module-manager";
import CollaboratorsCard from "@/components/events/collaborators-card";
import QuoteActions from "@/components/quotes/quote-actions";
import SkeletonLayout from "@/components/ui/skeleton-layout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CeremonyDetails } from "@/components/quotes/ceremony-details";

/**
 * Pagina unificata per visualizzare e gestire lavori (preventivi ed eventi)
 * Questa pagina mostra tutti i dettagli relativi a un lavoro, che può essere
 * un preventivo, un evento o entrambi (quando un preventivo è stato firmato)
 */
export default function JobDetailPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");

  // Determina se l'ID corrisponde a un preventivo o a un evento
  const { data: quoteData, isLoading: isLoadingQuote } = useQuery({
    queryKey: ["/api/quotes", parseInt(id)],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/quotes/${id}`);
        if (!res.ok) {
          // Se non è un preventivo, probabilmente è un evento
          return null;
        }
        return await res.json();
      } catch (error) {
        return null;
      }
    },
  });

  // Carica l'evento (indipendentemente se viene da un preventivo o meno)
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: ["/api/events", parseInt(id)],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/events/${id}`);
        if (!res.ok) {
          if (quoteData && quoteData.eventId) {
            // Se il preventivo ha un evento associato, caricalo
            const eventRes = await fetch(`/api/events/${quoteData.eventId}`);
            if (eventRes.ok) {
              return await eventRes.json();
            }
          }
          return null;
        }
        return await res.json();
      } catch (error) {
        return null;
      }
    },
    enabled: !isLoadingQuote,
  });

  // Se è un evento, carica il preventivo associato (se presente)
  const { data: associatedQuote, isLoading: isLoadingAssociatedQuote } = useQuery({
    queryKey: ["/api/quotes/by-event", parseInt(id)],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/quotes/by-event/${id}`);
        if (!res.ok) {
          return null;
        }
        return await res.json();
      } catch (error) {
        return null;
      }
    },
    enabled: !!eventData && !quoteData,
  });

  // Determiniamo quale dato usare per la visualizzazione
  const quote = quoteData || associatedQuote;
  const event = eventData || (quote?.eventId ? { id: quote.eventId } : null);

  // Determiniamo se c'è un collegamento tra evento e preventivo
  const hasQuoteEventLink = (quote && event) ? true : false;

  // Caricamento dati client
  const { data: client } = useQuery({
    queryKey: ["/api/clients", quote?.clientId || event?.clientId],
    enabled: !!(quote?.clientId || event?.clientId),
  });

  // Caricamento dati secondo client (se presente)
  const { data: secondClient } = useQuery({
    queryKey: ["/api/clients", quote?.secondClientId || event?.secondClientId],
    enabled: !!(quote?.secondClientId || event?.secondClientId),
  });

  // Stato di caricamento globale
  const isLoading = isLoadingQuote || isLoadingEvent || isLoadingAssociatedQuote;

  // Formattazione date
  const eventDate = event?.date || quote?.eventDate;
  const formattedEventDate = eventDate ? format(new Date(eventDate), "EEEE d MMMM yyyy", { locale: it }) : null;

  // Mutation per eliminare
  const deleteQuoteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/quotes/${quote.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Preventivo eliminato",
        description: "Il preventivo è stato eliminato con successo"
      });
      navigate("/quotes");
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/events/${event.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Evento eliminato",
        description: "L'evento è stato eliminato con successo"
      });
      navigate("/events");
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <SkeletonLayout />
      </div>
    );
  }

  // Se non troviamo né preventivo né evento, mostra errore 404
  if (!quote && !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-3xl font-bold mb-4">Elemento non trovato</h1>
        <p className="text-gray-500 mb-8">
          Non è stato possibile trovare il preventivo o l'evento richiesto.
        </p>
        <Button onClick={() => navigate("/dashboard")}>
          Torna alla Dashboard
        </Button>
      </div>
    );
  }

  // Determina il tipo della pagina in base ai dati disponibili
  const pageType = quote && event ? "combinato" : (quote ? "preventivo" : "evento");

  return (
    <div className="container mx-auto py-8">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {quote && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href="/quotes">Preventivi</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          {event && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href="/events">Eventi</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>
              {quote?.title || event?.title || "Dettaglio"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Intestazione */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-display font-semibold">
              {quote?.title || event?.title}
            </h1>
            {pageType === "combinato" && (
              <Badge variant="outline" className="ml-2">
                Preventivo firmato
              </Badge>
            )}
            {event?.fromSignedQuote && (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                Da preventivo firmato
              </Badge>
            )}
            {event && (
              <Badge
                className={
                  event.status === "upcoming"
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : event.status === "in-progress"
                    ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                    : event.status === "completed"
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-red-100 text-red-800 hover:bg-red-200"
                }
              >
                {event.status === "upcoming"
                  ? "Prossimo"
                  : event.status === "in-progress"
                  ? "In Corso"
                  : event.status === "completed"
                  ? "Completato"
                  : "Annullato"}
              </Badge>
            )}
          </div>
          
          {client && (
            <div className="flex items-center text-gray-600 mb-1">
              <User className="h-4 w-4 mr-2" />
              Cliente: <span className="font-medium ml-1">{client.firstName} {client.lastName}</span>
              {secondClient && (
                <span className="ml-2">
                  e <span className="font-medium">{secondClient.firstName} {secondClient.lastName}</span>
                </span>
              )}
            </div>
          )}
          
          {(quote?.eventType || event?.eventType) && (
            <div className="text-gray-600">
              Tipo: <span className="font-medium">{quote?.eventType || event?.eventType}</span>
            </div>
          )}
        </div>

        {/* Azioni */}
        <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-2">
          {quote && (
            <>
              {!quote.isSigned && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/quotes/new-quote?edit=${quote.id}`)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifica
                </Button>
              )}
              
              <QuoteActions 
                quote={quote} 
                onShareSuccess={(link) => {
                  toast({
                    title: "Link generato",
                    description: "Link di condivisione generato con successo"
                  });
                }}
              />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Questa azione non può essere annullata. Il preventivo verrà eliminato permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => deleteQuoteMutation.mutate()}
                    >
                      Elimina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          
          {event && quote && event.id !== parseInt(id) && (
            <Button
              variant="outline"
              onClick={() => navigate(`/jobs/${event.id}`)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Vai all'evento
            </Button>
          )}
          
          {quote && event && quote.id !== parseInt(id) && (
            <Button
              variant="outline"
              onClick={() => navigate(`/jobs/${quote.id}`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Vai al preventivo
            </Button>
          )}
        </div>
      </div>

      {/* Contenuto principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonna sinistra - Informazioni */}
        <div className="lg:col-span-1">
          {/* Card cliente */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex items-center">
                <Users className="h-5 w-5 mr-2 text-primary/80" />
                {client && secondClient ? "Clienti" : "Cliente"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{client.firstName} {client.lastName}</h3>
                        <p className="text-sm text-gray-500">{client.email || "Email non specificata"}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/clients/${client.id}`)}
                        className="text-primary"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                    {client.phone && (
                      <div className="text-sm mt-1">
                        <span className="text-gray-500">Tel:</span> {client.phone}
                      </div>
                    )}
                    {client.address && (
                      <div className="text-sm mt-1">
                        <span className="text-gray-500">Indirizzo:</span> {client.address}
                      </div>
                    )}
                  </div>

                  {secondClient && (
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{secondClient.firstName} {secondClient.lastName}</h3>
                          <p className="text-sm text-gray-500">{secondClient.email || "Email non specificata"}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/clients/${secondClient.id}`)}
                          className="text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      {secondClient.phone && (
                        <div className="text-sm mt-1">
                          <span className="text-gray-500">Tel:</span> {secondClient.phone}
                        </div>
                      )}
                      {secondClient.address && (
                        <div className="text-sm mt-1">
                          <span className="text-gray-500">Indirizzo:</span> {secondClient.address}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 italic">
                  Nessun cliente associato
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card evento */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary/80" />
                Dettagli Evento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium">Data Evento</dt>
                  <dd className="text-base">
                    {formattedEventDate || (
                      <span className="text-muted-foreground text-sm italic">Non specificata</span>
                    )}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium">Ora Inizio</dt>
                  <dd className="text-base">
                    {(quote?.eventTime || event?.eventTime) || (
                      <span className="text-muted-foreground text-sm italic">Non specificata</span>
                    )}
                  </dd>
                </div>
                
                {(quote?.eventEndTime || event?.eventEndTime) && (
                  <div>
                    <dt className="text-sm font-medium">Ora Fine</dt>
                    <dd className="text-base">{quote?.eventEndTime || event?.eventEndTime}</dd>
                  </div>
                )}
                
                {(quote?.isFullDay || event?.isFullDay) && (
                  <div>
                    <dt className="text-sm font-medium">Durata</dt>
                    <dd className="text-base">Giornata intera</dd>
                  </div>
                )}
                
                <div>
                  <dt className="text-sm font-medium">Luogo</dt>
                  <dd className="text-base">
                    {(quote?.location || event?.location) || (
                      <span className="text-muted-foreground text-sm italic">Non specificato</span>
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Card cerimonia se presente */}
          {(quote?.hasCeremony || event?.hasCeremony) && (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center">
                  <i className="ri-hearts-line mr-2 text-lg text-primary/80"></i>
                  Dettagli Cerimonia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CeremonyDetails
                  readOnly
                  ceremony={{
                    hasCeremony: quote?.hasCeremony || event?.hasCeremony || false,
                    ceremonyType: quote?.ceremonyType || event?.ceremonyType || "",
                    ceremonyLocation: quote?.ceremonyLocation || event?.ceremonyLocation || "",
                    ceremonyTime: quote?.ceremonyTime || event?.ceremonyTime || "",
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Collaboratori per gli eventi */}
          {event && (
            <div className="mb-6">
              <CollaboratorsCard eventId={event.id} />
            </div>
          )}
        </div>

        {/* Colonna destra - Tabs con dettagli, moduli, attività */}
        <div className="lg:col-span-2">
          <Card>
            <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="px-6 pb-0">
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="details">Dettagli</TabsTrigger>
                  {quote && <TabsTrigger value="modules">Moduli</TabsTrigger>}
                  <TabsTrigger value="tasks">Attività</TabsTrigger>
                  <TabsTrigger value="files">File</TabsTrigger>
                </TabsList>
              </CardHeader>

              {/* Tab dettagli */}
              <TabsContent value="details" className="m-0">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Note/Descrizione */}
                    <div>
                      <h3 className="text-lg font-medium mb-2">
                        {quote ? "Note Preventivo" : "Descrizione Evento"}
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-md">
                        {quote?.notes || event?.description ? (
                          <p className="whitespace-pre-line">
                            {quote?.notes || event?.description}
                          </p>
                        ) : (
                          <p className="text-gray-500 italic">Nessuna nota</p>
                        )}
                      </div>
                    </div>

                    {/* Informazioni finanziarie per preventivi */}
                    {quote && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Riepilogo Finanziario</h3>
                        <div className="bg-gray-50 p-4 rounded-md">
                          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <dt className="text-sm text-gray-500">Subtotale</dt>
                              <dd className="text-lg font-medium">{quote.subtotal?.toFixed(2) || 0}€</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Sconto</dt>
                              <dd className="text-lg font-medium">
                                {quote.discount?.toFixed(2) || 0}€
                                {quote.discountType === "percentage" && quote.discountValue && (
                                  <span className="text-sm ml-1 text-gray-500">({quote.discountValue}%)</span>
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">IVA</dt>
                              <dd className="text-lg font-medium">{quote.taxAmount?.toFixed(2) || 0}€</dd>
                            </div>
                            <div className="col-span-3">
                              <div className="h-px bg-gray-200 my-2"></div>
                            </div>
                            <div className="col-span-3">
                              <dt className="text-sm text-gray-500">Totale</dt>
                              <dd className="text-xl font-semibold text-primary">{quote.total?.toFixed(2) || 0}€</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    )}

                    {/* Stato firma per preventivi */}
                    {quote && (
                      <div>
                        <h3 className="text-lg font-medium mb-2">Stato Firma</h3>
                        <div className="bg-gray-50 p-4 rounded-md">
                          {quote.isSigned ? (
                            <div className="space-y-2">
                              <div className="flex items-center text-green-600">
                                <i className="ri-checkbox-circle-line text-xl mr-2"></i>
                                <span className="font-medium">Preventivo firmato</span>
                              </div>
                              {quote.signedAt && (
                                <p className="text-sm text-gray-600">
                                  Firmato il {format(new Date(quote.signedAt), "d MMMM yyyy", { locale: it })}
                                </p>
                              )}
                              {quote.signature && (
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">Firma cliente:</p>
                                  <div className="border border-gray-200 rounded p-2 bg-white">
                                    <img 
                                      src={quote.signature} 
                                      alt="Firma cliente" 
                                      className="max-h-24"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center text-amber-600">
                                <i className="ri-time-line text-xl mr-2"></i>
                                <span className="font-medium">In attesa di firma</span>
                              </div>
                              {quote.shareToken && (
                                <p className="text-sm text-gray-600">
                                  Link di condivisione attivo
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </TabsContent>

              {/* Tab moduli per preventivi */}
              {quote && (
                <TabsContent value="modules" className="m-0">
                  <CardContent className="p-6">
                    <ModuleManager 
                      quoteId={quote.id}
                      isSignedQuote={quote.isSigned || false}
                    />
                  </CardContent>
                </TabsContent>
              )}

              {/* Tab attività */}
              <TabsContent value="tasks" className="m-0">
                <CardContent className="p-6">
                  {/* Utilizziamo il componente EventTasks per gestire le attività */}
                  {event ? (
                    <EventTasks eventId={event.id} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="text-4xl text-gray-300 mb-2">
                        <ClipboardList className="h-12 w-12 mx-auto" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Crea evento prima</h3>
                      <p className="text-gray-500 mb-4">
                        Per gestire le attività, è necessario prima creare un evento
                      </p>
                      {quote && !quote.eventId && !quote.isSigned && (
                        <Button 
                          variant="outline"
                          onClick={() => navigate(`/events/new?quoteId=${quote.id}`)}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Crea evento
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </TabsContent>

              {/* Tab file/allegati (da implementare) */}
              <TabsContent value="files" className="m-0">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="text-4xl text-gray-300 mb-2">
                      <i className="ri-file-upload-line text-5xl"></i>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Nessun file</h3>
                    <p className="text-gray-500 mb-4">
                      Non ci sono ancora file caricati per questo lavoro
                    </p>
                    <Button disabled variant="outline">
                      <i className="ri-upload-2-line mr-2"></i>
                      Carica file
                    </Button>
                    <p className="text-xs text-gray-400 mt-2">
                      Funzionalità in arrivo
                    </p>
                  </div>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}