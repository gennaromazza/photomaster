import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Loader2, ArrowLeft, CalendarIcon, FileText, ClipboardList, 
  Users, MoreVertical, Check, X, Send, Clock, PlusCircle,
  Link as LinkIcon, RefreshCw, CheckCircle2, Package, Info
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
import ModuleManager from "@/components/quotes/modules/module-manager";
import { format } from "date-fns";
import { it } from "date-fns/locale";

// Definisce i tipi di stato unificati per i lavori
type JobStatus = 
  | "draft" // Bozza, prima fase
  | "pending" // In attesa (preventivo inviato ma non firmato)
  | "confirmed" // Confermato (preventivo firmato o evento confermato)
  | "in_progress" // In corso (evento in fase di realizzazione)
  | "completed" // Completato
  | "cancelled"; // Annullato

export default function NewJobDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("info"); // Default è il tab "info"
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
  
  // Ottiene lo stato unificato del lavoro
  const getJobStatus = (): JobStatus => {
    if (!job) return "draft";
    
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
    if (!job) return [];
    
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
              { label: "Crea evento", action: "create_event", icon: <CalendarIcon className="h-4 w-4 mr-2" /> },
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{job.title}</h1>
            <Badge variant={getStatusColor(currentStatus)} className="flex items-center gap-1 text-sm py-1.5 px-2.5">
              {getStatusIcon(currentStatus)}
              {getStatusText(currentStatus)}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {job.type === "quote" ? "Preventivo" : "Evento"} - ID: {job.id}
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap justify-end">
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

      {/* Dettagli client e info generali in alto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Colonna sinistra: cliente */}
        <div className="border rounded-md p-5 bg-muted/20">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-primary/80" />
            Cliente
          </h3>
          
          {job.clientId ? (
            <ClientInfo clientId={job.clientId} />
          ) : (
            <p className="text-muted-foreground text-sm">Nessun cliente associato</p>
          )}
        </div>

        {/* Colonna centrale: info preventivo o evento */}
        <div className="border rounded-md p-5 bg-muted/20">
          {job.type === "quote" ? (
            <>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary/80" />
                Preventivo
              </h3>
              
              {quote ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Stato</p>
                    <Badge variant={
                      quote.isSigned ? "green" : 
                      quote.status === "sent" || quote.status === "shared" ? "amber" :
                      quote.status === "cancelled" ? "destructive" : "secondary"
                    }>
                      {quote.isSigned ? "Firmato" : 
                      quote.status === "sent" ? "Inviato" :
                      quote.status === "shared" ? "Condiviso" :
                      quote.status === "cancelled" ? "Annullato" : "Bozza"}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1">Creato il</p>
                    <p>{quote.createdAt ? format(new Date(quote.createdAt), "d MMMM yyyy", { locale: it }) : "N/D"}</p>
                  </div>
                  
                  {quote.isSigned && (
                    <div>
                      <p className="text-sm font-medium mb-1">Firmato il</p>
                      <p>{quote.signedAt ? format(new Date(quote.signedAt), "d MMMM yyyy", { locale: it }) : "N/D"}</p>
                    </div>
                  )}
                  
                  {quote.total && (
                    <div>
                      <p className="text-sm font-medium mb-1">Totale</p>
                      <p className="text-lg font-semibold">€ {(quote.total / 100).toFixed(2)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Dati preventivo non disponibili</p>
              )}
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-primary/80" />
                Evento
              </h3>
              
              {event ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Data</p>
                    <p>{event.date ? format(new Date(event.date), "d MMMM yyyy", { locale: it }) : "Data non impostata"}</p>
                  </div>
                  
                  {event.location && (
                    <div>
                      <p className="text-sm font-medium mb-1">Luogo</p>
                      <p>{event.location}</p>
                    </div>
                  )}
                  
                  {event.status && (
                    <div>
                      <p className="text-sm font-medium mb-1">Stato</p>
                      <Badge variant={
                        event.status === "completed" ? "green" : 
                        event.status === "in progress" ? "blue" :
                        event.status === "cancelled" ? "destructive" : "amber"
                      }>
                        {event.status}
                      </Badge>
                    </div>
                  )}
                  
                  {event.quoteId && (
                    <div>
                      <p className="text-sm font-medium mb-1">Origine</p>
                      <p className="flex items-center">
                        <FileText className="h-3 w-3 mr-1" />
                        Da preventivo #{event.quoteId}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Dati evento non disponibili</p>
              )}
            </>
          )}
        </div>

        {/* Colonna destra: azioni contestuali */}
        <div className="border rounded-md p-5 bg-muted/20">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <MoreVertical className="h-5 w-5 mr-2 text-primary/80" />
            Azioni Disponibili
          </h3>
          
          {availableActions.length > 0 ? (
            <div className="space-y-2">
              {availableActions.map((action, index) => (
                <Button 
                  key={index}
                  variant="outline" 
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleAction(action.status || action.action || "")}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nessuna azione disponibile per lo stato attuale
            </p>
          )}
        </div>
      </div>

      {/* Contenuto principale con tabs */}
      <div className="border rounded-md p-6 bg-white">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start mb-6 bg-muted/40">
            {/* Tab Riepilogo sempre presente */}
            <TabsTrigger value="info" className="flex items-center">
              <Info className="mr-2 h-4 w-4" />
              Riepilogo
            </TabsTrigger>
            
            {hasQuoteTab && (
              <TabsTrigger value="quote" className="flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                Preventivo
              </TabsTrigger>
            )}
            
            {hasEventTab && (
              <TabsTrigger value="event" className="flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" />
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
          
          {/* Tab di Riepilogo unificato - NOVITÀ */}
          <TabsContent value="info" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Info principali del lavoro */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Riepilogo Lavoro</h3>
                <div className="border rounded-md p-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Titolo</p>
                    <p className="text-lg">{job.title}</p>
                  </div>
                
                  <div>
                    <p className="text-sm font-medium mb-1">Tipo</p>
                    <Badge variant="outline" className="flex w-fit items-center gap-1">
                      {job.type === "quote" ? (
                        <FileText className="h-3 w-3" />
                      ) : (
                        <CalendarIcon className="h-3 w-3" />
                      )}
                      {job.type === "quote" ? "Preventivo" : "Evento"}
                    </Badge>
                  </div>
                
                  <div>
                    <p className="text-sm font-medium mb-1">Stato</p>
                    <Badge variant={getStatusColor(currentStatus)}>
                      {getStatusText(currentStatus)}
                    </Badge>
                  </div>
                  
                  {event?.date && (
                    <div>
                      <p className="text-sm font-medium mb-1">Data Evento</p>
                      <p>{format(new Date(event.date), "d MMMM yyyy", { locale: it })}</p>
                    </div>
                  )}
                  
                  {quote?.createdAt && (
                    <div>
                      <p className="text-sm font-medium mb-1">Data Creazione</p>
                      <p>{format(new Date(quote.createdAt), "d MMMM yyyy", { locale: it })}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Elementi correlati */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Elementi Collegati</h3>
                <div className="border rounded-md p-4 space-y-4">
                  {/* Mostra preventivo associato se è un evento */}
                  {job.type === "event" && job.quoteId && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Preventivo #{job.quoteId}</p>
                          <p className="text-xs text-muted-foreground">Origine dell'evento</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/jobs/${job.quoteId}`)}
                      >
                        Visualizza
                      </Button>
                    </div>
                  )}
                  
                  {/* Mostra eventi associati se è un preventivo */}
                  {job.type === "quote" && job.eventId && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Evento #{job.eventId}</p>
                          <p className="text-xs text-muted-foreground">Evento creato da questo preventivo</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/jobs/${job.eventId}`)}
                      >
                        Visualizza
                      </Button>
                    </div>
                  )}
                  
                  {/* Conteggio moduli se è un preventivo */}
                  {job.type === "quote" && modules && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Moduli ({modules.length})</p>
                          <p className="text-xs text-muted-foreground">
                            {modules.length > 0 
                              ? "Moduli configurati per questo preventivo" 
                              : "Nessun modulo configurato"}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setActiveTab("modules")}
                      >
                        Visualizza
                      </Button>
                    </div>
                  )}
                  
                  {/* Link condivisione per preventivi */}
                  {job.type === "quote" && quote?.isShared && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <LinkIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Link di condivisione</p>
                          <p className="text-xs text-muted-foreground">Preventivo condiviso con il cliente</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/quotes/${job.quoteId}/share`)}
                      >
                        Gestisci
                      </Button>
                    </div>
                  )}
                  
                  {/* Se non ci sono elementi collegati */}
                  {((job.type === "quote" && !job.eventId && (!modules || modules.length === 0) && !quote?.isShared) || 
                    (job.type === "event" && !job.quoteId)) && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nessun elemento collegato
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Tab del Preventivo */}
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
          
          {/* Tab dell'Evento */}
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
          
          {/* Tab dei Moduli */}
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
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Gestisci Moduli
                      </Button>
                    )}
                  </div>
                  
                  {modules.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground border rounded-md bg-muted/40">
                      <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                      <p>Nessun modulo creato per questo preventivo</p>
                      {currentStatus !== "confirmed" && currentStatus !== "completed" && currentStatus !== "cancelled" && (
                        <Button 
                          variant="link" 
                          onClick={() => navigate(`/quotes/${job.quoteId}/modules`)}
                        >
                          Crea il primo modulo
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {modules.map((module: any) => (
                        <div key={module.id} className="border rounded-md p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{module.name}</h4>
                            {module.type === "variable" && (
                              <Badge variant="outline">Modulo variabile</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm mb-4">{module.description}</p>
                          
                          {module.items && module.items.length > 0 ? (
                            <ul className="space-y-2">
                              {module.items.map((item: any) => (
                                <li key={item.id} className="flex justify-between text-sm">
                                  <span>{item.serviceName || item.productName || item.bundleName}</span>
                                  <span className="font-medium">{item.price ? `€${item.price.toFixed(2)}` : null}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">Nessun item in questo modulo</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p>Nessun preventivo associato per gestire i moduli</p>
                </div>
              )}
            </TabsContent>
          )}
          
          {/* Tab delle Attività */}
          {hasTasksTab && (
            <TabsContent value="tasks" className="mt-0">
              <EventTasks eventId={event?.id} />
            </TabsContent>
          )}
          
          {/* Tab dei Collaboratori */}
          {hasCollaboratorsTab && (
            <TabsContent value="collaborators" className="mt-0">
              <EventCollaborators eventId={event?.id} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}