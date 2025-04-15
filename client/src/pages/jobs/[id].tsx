import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Calendar, FileText, ClipboardList, Users } from "lucide-react";
import QuoteInfo from "@/components/quotes/quote-info";
import EventInfo from "@/components/events/event-info";
import EventTasks from "@/components/events/event-tasks";
import EventCollaborators from "@/components/events/event-collaborators";
import ClientInfo from "@/components/clients/client-info";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("info");
  
  // Estrai l'ID e il tipo dalla URL
  const jobId = parseInt(params.id);
  
  // Ottieni i dettagli del lavoro
  const { data: job, isLoading: isLoadingJob } = useQuery({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId && !isNaN(jobId),
  });
  
  // Ottieni i dettagli del preventivo associato (se esiste)
  const { data: quote, isLoading: isLoadingQuote } = useQuery({
    queryKey: ["/api/quotes", job?.quoteId],
    enabled: !!job?.quoteId,
  });
  
  // Ottieni i dettagli dell'evento associato (se esiste)
  const { data: event, isLoading: isLoadingEvent } = useQuery({
    queryKey: ["/api/events", job?.eventId],
    enabled: !!job?.eventId,
  });
  
  // Quando il job viene caricato, imposta il tab attivo in base al tipo
  useEffect(() => {
    if (job) {
      if (job.type === "quote" && !job.eventId) {
        setActiveTab("quote");
      } else if (job.type === "event" && !job.quoteId) {
        setActiveTab("event");
      }
    }
  }, [job]);
  
  // Se c'è un errore o il job non esiste
  if (!isLoadingJob && !job) {
    return (
      <div className="container py-10">
        <div className="text-center my-10">
          <h2 className="text-2xl font-semibold mb-2">Lavoro non trovato</h2>
          <p className="text-muted-foreground mb-6">Il lavoro richiesto non esiste o è stato rimosso.</p>
          <Button onClick={() => navigate("/jobs")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla lista lavori
          </Button>
        </div>
      </div>
    );
  }
  
  // Se sta caricando
  if (isLoadingJob || (job?.quoteId && isLoadingQuote) || (job?.eventId && isLoadingEvent)) {
    return (
      <div className="container py-10">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }
  
  // Determina quali tab mostrare in base ai dati disponibili
  const hasQuoteTab = !!job.quoteId || job.type === "quote";
  const hasEventTab = !!job.eventId || job.type === "event";
  const hasTasksTab = !!job.eventId;
  const hasCollaboratorsTab = !!job.eventId;
  
  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => navigate("/jobs")} 
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla lista
          </Button>
          <h1 className="text-3xl font-bold">{job.title}</h1>
          <p className="text-muted-foreground">
            {job.type === "quote" ? "Preventivo" : "Evento"} - ID: {job.id}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start mb-6">
              {hasQuoteTab && (
                <TabsTrigger value="quote" className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  Preventivo
                </TabsTrigger>
              )}
              {hasEventTab && (
                <TabsTrigger value="event" className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  Evento
                </TabsTrigger>
              )}
              {hasTasksTab && (
                <TabsTrigger value="tasks" className="flex items-center">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Attività
                </TabsTrigger>
              )}
              {hasCollaboratorsTab && (
                <TabsTrigger value="collaborators" className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Collaboratori
                </TabsTrigger>
              )}
            </TabsList>
            
            {hasQuoteTab && (
              <TabsContent value="quote" className="mt-0">
                {quote ? (
                  <QuoteInfo quote={quote} />
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>Nessun preventivo associato</p>
                  </div>
                )}
              </TabsContent>
            )}
            
            {hasEventTab && (
              <TabsContent value="event" className="mt-0">
                {event ? (
                  <EventInfo event={event} />
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>Nessun evento associato</p>
                  </div>
                )}
              </TabsContent>
            )}
            
            {hasTasksTab && (
              <TabsContent value="tasks" className="mt-0">
                <EventTasks eventId={job.eventId} />
              </TabsContent>
            )}
            
            {hasCollaboratorsTab && (
              <TabsContent value="collaborators" className="mt-0">
                <EventCollaborators eventId={job.eventId} />
              </TabsContent>
            )}
          </Tabs>
        </div>
        
        <div>
          <ClientInfo 
            clientId={job.clientId || (quote?.clientId || event?.clientId)} 
            mode="compact"
          />
        </div>
      </div>
    </div>
  );
}