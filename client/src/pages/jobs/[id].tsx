import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import ClientInfo from "@/components/clients/client-info";
import QuoteInfo from "@/components/quotes/quote-info";
import EventInfo from "@/components/events/event-info";
import EventTasks from "@/components/events/event-tasks";
import EventCollaborators from "@/components/events/event-collaborators";
import { useToast } from "@/hooks/use-toast";

// Icons
import { ArrowLeft, Calendar, FileText, Pencil, CalendarPlus } from "lucide-react";

/**
 * Pagina unificata per visualizzare e gestire lavori (preventivi ed eventi)
 * Questa pagina mostra tutti i dettagli relativi a un lavoro, che può essere
 * un preventivo, un evento o entrambi (quando un preventivo è stato firmato)
 */
export default function JobDetailPage() {
  const [, params] = useRoute("/jobs/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");
  const [isQuote, setIsQuote] = useState(false);
  const [isEvent, setIsEvent] = useState(false);
  const [quoteId, setQuoteId] = useState<number | null>(null);
  const [eventId, setEventId] = useState<number | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);

  const id = params?.id ? parseInt(params.id) : 0;

  // Carica dati del preventivo
  const { 
    data: quote, 
    isLoading: isLoadingQuote,
    error: quoteError
  } = useQuery({
    queryKey: ["/api/quotes", id],
    enabled: isQuote,
  });

  // Carica dati dell'evento
  const { 
    data: event, 
    isLoading: isLoadingEvent,
    error: eventError
  } = useQuery({
    queryKey: ["/api/events", id],
    enabled: isEvent,
  });

  // Determina il tipo di lavoro (preventivo o evento) in base all'ID
  useEffect(() => {
    const checkJobType = async () => {
      try {
        // Verifica se è un preventivo
        const quoteResponse = await fetch(`/api/quotes/${id}`);
        if (quoteResponse.ok) {
          const quoteData = await quoteResponse.json();
          setIsQuote(true);
          setQuoteId(quoteData.id);
          setClientId(quoteData.clientId);
          
          // Se il preventivo ha un evento associato, imposta l'ID dell'evento
          if (quoteData.eventId) {
            setIsEvent(true);
            setEventId(quoteData.eventId);
          }
          return;
        }

        // Verifica se è un evento
        const eventResponse = await fetch(`/api/events/${id}`);
        if (eventResponse.ok) {
          const eventData = await eventResponse.json();
          setIsEvent(true);
          setEventId(eventData.id);
          setClientId(eventData.clientId);
          
          // Se l'evento ha un preventivo associato, imposta l'ID del preventivo
          if (eventData.quoteId) {
            setIsQuote(true);
            setQuoteId(eventData.quoteId);
          }
          return;
        }

        // Se non è né preventivo né evento, mostra un errore
        toast({
          title: "Lavoro non trovato",
          description: "Il lavoro richiesto non esiste",
          variant: "destructive",
        });
        navigate("/jobs");
      } catch (error) {
        console.error("Errore nel controllo del tipo di lavoro:", error);
        toast({
          title: "Errore",
          description: "Si è verificato un errore nel caricamento del lavoro",
          variant: "destructive",
        });
      }
    };

    checkJobType();
  }, [id, navigate, toast]);

  // Gestione degli errori di caricamento
  useEffect(() => {
    if (quoteError) {
      console.error("Errore nel caricamento del preventivo:", quoteError);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati del preventivo",
        variant: "destructive",
      });
    }
    if (eventError) {
      console.error("Errore nel caricamento dell'evento:", eventError);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati dell'evento",
        variant: "destructive",
      });
    }
  }, [quoteError, eventError, toast]);

  // Carica i dati del cliente
  const { 
    data: client, 
    isLoading: isLoadingClient
  } = useQuery({
    queryKey: ["/api/clients", clientId],
    enabled: clientId !== null,
  });

  // Se entrambi i dettagli (preventivo ed evento) stanno caricando, mostra uno stato di caricamento
  if ((isQuote && isLoadingQuote) || (isEvent && isLoadingEvent) || (clientId && isLoadingClient)) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
          <h3 className="text-lg font-medium">Caricamento in corso...</h3>
          <p className="text-gray-500 mt-2">Caricamento dei dettagli del lavoro</p>
        </div>
      </div>
    );
  }

  // Se non è stato trovato né preventivo né evento, mostra un messaggio di errore
  if (!isQuote && !isEvent) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-2"
            onClick={() => navigate("/jobs")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <h1 className="text-3xl font-display font-semibold">Lavoro non trovato</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Errore</CardTitle>
            <CardDescription>Il lavoro richiesto non esiste o non è accessibile</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Verifica l'URL o torna alla pagina dei lavori per visualizzare tutti i lavori disponibili.</p>
            <Button 
              onClick={() => navigate("/jobs")} 
              className="mt-4"
            >
              Torna ai lavori
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ottieni titolo e stato del lavoro
  const getJobTitle = () => {
    if (isQuote && quote) return quote.title;
    if (isEvent && event) return event.title;
    return "Dettagli lavoro";
  };

  const getJobStatus = () => {
    if (isQuote && quote) {
      return quote.isSigned ? (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
          Firmato
        </Badge>
      ) : (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
          In attesa
        </Badge>
      );
    }
    
    if (isEvent && event) {
      switch (event.status) {
        case "upcoming":
          return (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
              Prossimo
            </Badge>
          );
        case "in-progress":
          return (
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
              In Corso
            </Badge>
          );
        case "completed":
          return (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
              Completato
            </Badge>
          );
        default:
          return (
            <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
              Annullato
            </Badge>
          );
      }
    }
    
    return null;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            className="mr-2"
            onClick={() => navigate("/jobs")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display font-semibold">{getJobTitle()}</h1>
              {getJobStatus()}
            </div>
            <div className="flex items-center mt-1 text-gray-500">
              {isQuote && (
                <>
                  <FileText className="h-4 w-4 mr-1.5" />
                  <span className="mr-4">Preventivo</span>
                </>
              )}
              {isEvent && (
                <>
                  <Calendar className="h-4 w-4 mr-1.5" />
                  <span>Evento</span>
                </>
              )}
              {client && (
                <span className="mx-2">
                  • Cliente: {client.firstName} {client.lastName}
                </span>
              )}
              {isEvent && event && (
                <span className="mx-2">
                  • Data: {format(new Date(event.date), "d MMMM yyyy", { locale: it })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          {isQuote && quote && !quote.isSigned && (
            <Button 
              variant="outline"
              onClick={() => navigate(`/quotes/new-quote?edit=${quote.id}`)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Modifica Preventivo
            </Button>
          )}
          
          {isQuote && quote && !quote.eventId && (
            <Button 
              onClick={() => navigate(`/events/new?quoteId=${quote.id}`)}
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Crea Evento
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-6">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="info" className="flex-1 md:flex-initial">Informazioni</TabsTrigger>
            {isQuote && <TabsTrigger value="quote" className="flex-1 md:flex-initial">Preventivo</TabsTrigger>}
            {isEvent && <TabsTrigger value="event" className="flex-1 md:flex-initial">Evento</TabsTrigger>}
            {isEvent && <TabsTrigger value="tasks" className="flex-1 md:flex-initial">Attività</TabsTrigger>}
            {isEvent && <TabsTrigger value="collaborators" className="flex-1 md:flex-initial">Collaboratori</TabsTrigger>}
          </TabsList>
        </div>

        {/* Tab Informazioni Generali */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {client && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Cliente</CardTitle>
                  <CardDescription>Dettagli del cliente associato</CardDescription>
                </CardHeader>
                <CardContent>
                  <ClientInfo client={client} minimal />
                  <div className="mt-4 flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/clients/${client.id}`)}
                    >
                      Visualizza Cliente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isQuote && quote && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Preventivo</CardTitle>
                  <CardDescription>Riepilogo del preventivo</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="font-medium text-gray-500">Stato:</dt>
                      <dd>
                        {quote.isSigned ? (
                          <Badge className="bg-green-100 text-green-800">Firmato</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800">In attesa</Badge>
                        )}
                      </dd>
                    </div>
                    {quote.signedAt && (
                      <div className="flex justify-between">
                        <dt className="font-medium text-gray-500">Firmato il:</dt>
                        <dd>{format(new Date(quote.signedAt), "d MMM yyyy", { locale: it })}</dd>
                      </div>
                    )}
                    {quote.eventDate && (
                      <div className="flex justify-between">
                        <dt className="font-medium text-gray-500">Data evento:</dt>
                        <dd>{format(new Date(quote.eventDate), "d MMM yyyy", { locale: it })}</dd>
                      </div>
                    )}
                    {quote.createdAt && (
                      <div className="flex justify-between">
                        <dt className="font-medium text-gray-500">Creato il:</dt>
                        <dd>{format(new Date(quote.createdAt), "d MMM yyyy", { locale: it })}</dd>
                      </div>
                    )}
                  </dl>
                  <Separator className="my-4" />
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => setActiveTab("quote")}
                      size="sm"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Dettagli Preventivo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isEvent && event && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Evento</CardTitle>
                  <CardDescription>Riepilogo dell'evento</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="font-medium text-gray-500">Stato:</dt>
                      <dd>
                        {event.status === "upcoming" ? (
                          <Badge className="bg-amber-100 text-amber-800">Prossimo</Badge>
                        ) : event.status === "in-progress" ? (
                          <Badge className="bg-blue-100 text-blue-800">In Corso</Badge>
                        ) : event.status === "completed" ? (
                          <Badge className="bg-green-100 text-green-800">Completato</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">Annullato</Badge>
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium text-gray-500">Data:</dt>
                      <dd>{format(new Date(event.date), "d MMM yyyy", { locale: it })}</dd>
                    </div>
                    {event.duration && (
                      <div className="flex justify-between">
                        <dt className="font-medium text-gray-500">Durata:</dt>
                        <dd>{event.duration} ore</dd>
                      </div>
                    )}
                    {event.fromSignedQuote && (
                      <div className="flex justify-between">
                        <dt className="font-medium text-gray-500">Da preventivo:</dt>
                        <dd>
                          <Badge variant="outline" size="sm">
                            Creato da preventivo firmato
                          </Badge>
                        </dd>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex justify-between">
                        <dt className="font-medium text-gray-500">Luogo:</dt>
                        <dd>{event.location}</dd>
                      </div>
                    )}
                  </dl>
                  <Separator className="my-4" />
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => setActiveTab("event")}
                      size="sm"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Dettagli Evento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab Preventivo */}
        {isQuote && (
          <TabsContent value="quote">
            {quote && <QuoteInfo quote={quote} />}
          </TabsContent>
        )}

        {/* Tab Evento */}
        {isEvent && (
          <TabsContent value="event">
            {event && <EventInfo event={event} />}
          </TabsContent>
        )}

        {/* Tab Attività */}
        {isEvent && (
          <TabsContent value="tasks">
            {event && <EventTasks eventId={event.id} />}
          </TabsContent>
        )}

        {/* Tab Collaboratori */}
        {isEvent && (
          <TabsContent value="collaborators">
            {event && <EventCollaborators eventId={event.id} />}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}