import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Loader2, ArrowLeft, Calendar, FileText, ClipboardList, 
  Users, MoreVertical, Check, X, Send, Clock,
  Link as LinkIcon, RefreshCw, CheckCircle2, Package
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import QuoteInfo from "@/components/quotes/quote-info";
import EventInfo from "@/components/events/event-info";
import EventTasks from "@/components/events/event-tasks";
import EventCollaborators from "@/components/events/event-collaborators";
import ClientInfo from "@/components/clients/client-info";

// Definisce i tipi di stato unificati per i lavori
type JobStatus = 
  | "draft" // Bozza, prima fase
  | "pending" // In attesa (preventivo inviato ma non firmato)
  | "confirmed" // Confermato (preventivo firmato o evento confermato)
  | "in_progress" // In corso (evento in fase di realizzazione)
  | "completed" // Completato
  | "cancelled"; // Annullato

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("info");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  // Carica i moduli del preventivo se è un preventivo
  const { data: modules = [] } = useQuery({
    queryKey: ["/api/quotes", job?.quoteId, "modules"],
    enabled: !!job?.quoteId && job?.type === "quote",
  });

  // Mutation per aggiornare lo stato del lavoro
  const updateJobStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: JobStatus }) => {
      const res = await apiRequest("PATCH", `/api/jobs/${jobId}/status`, { status });
      
      if (!res.ok) {
        throw new Error("Impossibile aggiornare lo stato del lavoro");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
      
      if (job?.quoteId) {
        queryClient.invalidateQueries({ queryKey: ["/api/quotes", job.quoteId] });
      }
      
      if (job?.eventId) {
        queryClient.invalidateQueries({ queryKey: ["/api/events", job.eventId] });
      }
      
      toast({
        title: "Stato aggiornato",
        description: "Lo stato del lavoro è stato aggiornato con successo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
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
  
  // Ottiene lo stato unificato del lavoro
  const getJobStatus = (): JobStatus => {
    if (job.type === "quote") {
      if (quote?.isSigned) {
        return "confirmed";
      } else if (quote?.status === "sent" || quote?.status === "shared") {
        return "pending";
      } else {
        return "draft";
      }
    } else if (job.type === "event") {
      switch (job.status?.toLowerCase()) {
        case "completed":
          return "completed";
        case "in progress":
          return "in_progress";
        case "scheduled":
          return "confirmed";
        case "cancelled":
          return "cancelled";
        default:
          return "draft";
      }
    }
    return "draft";
  };
  
  // Ottiene il colore dello stato
  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case "confirmed":
        return "green";
      case "pending":
        return "amber";
      case "in_progress":
        return "blue";
      case "completed":
        return "green";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };
  
  // Ottiene il testo dello stato
  const getStatusText = (status: JobStatus) => {
    switch (status) {
      case "draft":
        return "Bozza";
      case "pending":
        return "In Attesa";
      case "confirmed":
        return "Confermato";
      case "in_progress":
        return "In Corso";
      case "completed":
        return "Completato";
      case "cancelled":
        return "Annullato";
      default:
        return "Sconosciuto";
    }
  };
  
  // Ottiene l'icona dello stato
  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case "draft":
        return <Clock className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "confirmed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "in_progress":
        return <RefreshCw className="h-4 w-4" />;
      case "completed":
        return <Check className="h-4 w-4" />;
      case "cancelled":
        return <X className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Aggiorna lo stato del lavoro
  const updateJobStatus = (status: JobStatus) => {
    updateJobStatusMutation.mutate({ status });
  };
  
  // Ottiene le azioni disponibili in base allo stato attuale
  const getAvailableActions = (status: JobStatus) => {
    switch (status) {
      case "draft":
        return [
          { label: "Segna come inviato", status: "pending", icon: <Send className="h-4 w-4 mr-2" /> },
          { label: "Annulla", status: "cancelled", icon: <X className="h-4 w-4 mr-2" /> },
        ];
      case "pending":
        return [
          { label: "Segna come confermato", status: "confirmed", icon: <Check className="h-4 w-4 mr-2" /> },
          { label: "Annulla", status: "cancelled", icon: <X className="h-4 w-4 mr-2" /> },
        ];
      case "confirmed":
        return job.type === "quote" 
          ? [
              { label: "Crea evento", action: "create_event", icon: <Calendar className="h-4 w-4 mr-2" /> },
              { label: "Riattiva", status: "pending", icon: <RefreshCw className="h-4 w-4 mr-2" /> },
              { label: "Annulla", status: "cancelled", icon: <X className="h-4 w-4 mr-2" /> },
            ]
          : [
              { label: "Segna come in corso", status: "in_progress", icon: <RefreshCw className="h-4 w-4 mr-2" /> },
              { label: "Annulla", status: "cancelled", icon: <X className="h-4 w-4 mr-2" /> },
            ];
      case "in_progress":
        return [
          { label: "Segna come completato", status: "completed", icon: <Check className="h-4 w-4 mr-2" /> },
          { label: "Annulla", status: "cancelled", icon: <X className="h-4 w-4 mr-2" /> },
        ];
      case "completed":
        return [
          { label: "Riapri", status: "in_progress", icon: <RefreshCw className="h-4 w-4 mr-2" /> },
        ];
      case "cancelled":
        return [
          { label: "Riattiva", status: job.type === "quote" ? "pending" : "confirmed", icon: <RefreshCw className="h-4 w-4 mr-2" /> },
        ];
      default:
        return [];
    }
  };
  
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
  const hasModulesTab = !!job.quoteId || (job.type === "quote" && modules.length > 0);
  const hasTasksTab = !!job.eventId;
  const hasCollaboratorsTab = !!job.eventId;
  
  // Ottieni lo stato attuale del lavoro
  const currentStatus = getJobStatus();
  
  // Verifica se il lavoro è modificabile in base allo stato
  const isEditable = currentStatus !== "completed" && currentStatus !== "cancelled";
  
  // Crea evento da un preventivo firmato
  const createEventFromQuote = async () => {
    try {
      const res = await apiRequest("POST", `/api/quotes/${job.quoteId}/create-event`, {});
      
      if (!res.ok) {
        throw new Error("Impossibile creare l'evento dal preventivo");
      }
      
      const data = await res.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      
      toast({
        title: "Evento creato",
        description: "L'evento è stato creato dal preventivo con successo.",
      });
      
      // Reindirizza alla pagina dell'evento appena creato
      navigate(`/jobs/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  // Gestisce le azioni del menu
  const handleAction = (action: string | JobStatus) => {
    if (action === "create_event") {
      createEventFromQuote();
    } else {
      updateJobStatus(action as JobStatus);
    }
  };
  
  // Ottieni le azioni disponibili per il menu contestuale
  const availableActions = getAvailableActions(currentStatus);

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
        
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <Badge variant={getStatusColor(currentStatus)} className="flex items-center gap-1 text-sm py-1.5 px-2.5">
            {getStatusIcon(currentStatus)}
            {getStatusText(currentStatus)}
          </Badge>
          
          {isEditable && availableActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Azioni
                  <MoreVertical className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {availableActions.map((action, index) => (
                  <DropdownMenuItem 
                    key={index}
                    onClick={() => handleAction(action.status || action.action || "")}
                    className="flex items-center cursor-pointer"
                  >
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {job.type === "quote" && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(job.quoteId ? `/quotes/${job.quoteId}/edit` : `/quotes/new-redesign?edit=${job.id}`)}
              disabled={currentStatus === "completed" || currentStatus === "cancelled" || quote?.isSigned}
            >
              Modifica Preventivo
            </Button>
          )}
          
          {job.type === "quote" && quote && !quote.isSigned && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/quotes/${job.quoteId}/share`)}
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              Condividi
            </Button>
          )}
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
              {hasModulesTab && (
                <TabsTrigger value="modules" className="flex items-center">
                  <Package className="mr-2 h-4 w-4" />
                  Moduli
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
            
            {hasModulesTab && (
              <TabsContent value="modules" className="mt-0">
                {job.quoteId ? (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Moduli del preventivo</h3>
                      {currentStatus !== "confirmed" && currentStatus !== "completed" && currentStatus !== "cancelled" && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/quotes/${job.quoteId}/modules`)}
                        >
                          Gestisci moduli
                        </Button>
                      )}
                    </div>
                    {modules.length > 0 ? (
                      <div className="space-y-4">
                        {modules.map((module: any) => (
                          <div key={module.id} className="border rounded-md p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium">{module.name}</h4>
                              <Badge variant={module.moduleType === "fixed" ? "blue" : "amber"}>
                                {module.moduleType === "fixed" ? "Fisso" : "Variabile"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{module.description}</p>
                            {module.selections && module.selections.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-medium mb-1">Selezioni:</p>
                                <ul className="text-sm space-y-1">
                                  {module.selections.map((selection: any) => (
                                    <li key={selection.id} className="flex items-center">
                                      <div className="w-3 h-3 rounded-full bg-primary mr-2"></div>
                                      {selection.serviceName || selection.productName || selection.bundleName || "Servizio/Prodotto"}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        <p>Nessun modulo configurato per questo preventivo</p>
                        <Button 
                          variant="link" 
                          onClick={() => navigate(`/quotes/${job.quoteId}/modules`)}
                          className="mt-2"
                        >
                          Aggiungi moduli
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>Nessun preventivo associato</p>
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
          
          {/* Stato del lavoro */}
          <div className="mt-6 border rounded-md p-4">
            <h3 className="text-sm font-medium mb-2">Stato del lavoro</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Stato attuale:</span>
                <Badge variant={getStatusColor(currentStatus)}>
                  {getStatusText(currentStatus)}
                </Badge>
              </div>
              
              {job.type === "quote" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Preventivo:</span>
                  <span className="text-sm">
                    {quote?.isSigned ? "Firmato" : (quote?.status === "sent" || quote?.status === "shared" ? "Inviato" : "In bozza")}
                  </span>
                </div>
              )}
              
              {quote?.isSigned && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Firmato il:</span>
                  <span className="text-sm">
                    {new Date(quote.signedAt).toLocaleDateString('it-IT')}
                  </span>
                </div>
              )}
              
              {job.eventId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Data evento:</span>
                  <span className="text-sm">
                    {new Date(event?.date).toLocaleDateString('it-IT')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}