import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, 
  AlertTriangle, 
  Calendar as LucideCalendar, 
  FileCheck, 
  MoreHorizontal, 
  PlayCircle, 
  CheckCircle, 
  Clock, 
  Star, 
  Plus, 
  ArrowRight,
  AlertCircle,
  Bell,
  CalendarIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, isAfter, parseISO, addDays, differenceInHours } from "date-fns";
import { it } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { formatCurrency, cn } from "@/lib/utils";
import { IconBrandWhatsapp } from "@/components/ui/icons/whatsapp";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface MontaggioCollaboratoreListProps {
  collaboratoreId: number;
}

// Schema di validazione per il form completamento montaggio
const completaMontaggioSchema = z.object({
  saldo: z.coerce.number().positive('Il saldo deve essere maggiore di zero'),
  note: z.string().optional(),
});

// Schema di validazione per il form aggiunta montaggio
const aggiungiMontaggioSchema = z.object({
  tipoMontaggio: z.enum(["foto", "video", "album", "slideshow", "altro"], {
    required_error: "Seleziona un tipo di montaggio",
  }),
  dataConsegnaPrevista: z.date({
    required_error: "La data di consegna è obbligatoria",
  }),
  priorita: z.coerce.number().min(1).max(10).default(5),
  note: z.string().optional(),
  eventoId: z.coerce.number().positive('Seleziona un evento'),
});

type CompletaMontaggioFormValues = z.infer<typeof completaMontaggioSchema>;
type AggiungiMontaggioFormValues = z.infer<typeof aggiungiMontaggioSchema>;

// Numero di elementi per pagina
const ITEMS_PER_PAGE = 9;

export function MontaggioCollaboratoreList({ collaboratoreId }: MontaggioCollaboratoreListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filtroStato, setFiltroStato] = useState<"tutti" | "da_fare" | "in_corso" | "completati" | "priorita_alta">("tutti");
  const [montaggioSelezionato, setMontaggioSelezionato] = useState<any | null>(null);
  const [isCompletaDialogOpen, setIsCompletaDialogOpen] = useState(false);
  const [isAvviaDialogOpen, setIsAvviaDialogOpen] = useState(false);
  const [isAggiungiDialogOpen, setIsAggiungiDialogOpen] = useState(false);
  const [eventoSelezionato, setEventoSelezionato] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Form per completamento
  const completaForm = useForm<CompletaMontaggioFormValues>({
    resolver: zodResolver(completaMontaggioSchema),
    defaultValues: {
      saldo: undefined,
      note: "",
    },
  });
  
  // Form per aggiunta nuovo montaggio
  const aggiungiForm = useForm<AggiungiMontaggioFormValues>({
    resolver: zodResolver(aggiungiMontaggioSchema),
    defaultValues: {
      tipoMontaggio: "video",
      dataConsegnaPrevista: addDays(new Date(), 14),
      priorita: 5,
      note: "",
      eventoId: undefined,
    },
  });

  // Query per recuperare il collaboratore
  const { data: collaboratore, isLoading: isLoadingCollaboratore } = useQuery<any>({
    queryKey: [`/api/collaborators/${collaboratoreId}`],
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  // Query per recuperare gli eventi del collaboratore
  const { data: eventi = [], isLoading: isLoadingEventi } = useQuery<any[]>({
    queryKey: [`/api/collaboratori/${collaboratoreId}/eventi`],
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  // Query per recuperare i montaggi - Approccio Event-Centric
  // Primo recuperiamo gli eventi per questo collaboratore
  // Poi per ogni evento recuperiamo i montaggi associati
  const [montaggi, setMontaggi] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  
  // Recupera i montaggi per ogni evento del collaboratore
  const fetchAllMontaggi = useCallback(async () => {
    if (!eventi || eventi.length === 0) return;
    
    setIsLoading(true);
    try {
      // Per ogni evento, recupera i montaggi
      const montaggiPromises = eventi.map((evento: any) => 
        fetch(`/api/eventi/${evento.id}/montaggi`)
          .then(res => res.json())
          .then(data => data.map((montaggio: any) => ({
            ...montaggio,
            eventoTitle: evento.title,
            eventoData: evento.date
          })))
      );
      
      const allMontaggi = await Promise.all(montaggiPromises);
      // Appiattisci l'array di array
      const montaggiFlatList = allMontaggi.flat();
      
      // Filtra solo i montaggi di questo collaboratore
      const montaggiCollaboratore = montaggiFlatList.filter(
        (m: any) => m.collaboratore?.id === Number(collaboratoreId)
      );
      
      setMontaggi(montaggiCollaboratore);
      setError(null);
    } catch (err) {
      console.error("Errore nel recupero dei montaggi:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [eventi, collaboratoreId]);
  
  // Esegui fetchAllMontaggi quando cambia eventi
  React.useEffect(() => {
    if (eventi && eventi.length > 0) {
      fetchAllMontaggi();
    }
  }, [eventi, fetchAllMontaggi]);

  // Mutation per avviare un montaggio - Approccio Event-Centric
  const avviaMutation = useMutation({
    mutationFn: async (montaggioId: number) => {
      // Prima recuperiamo il montaggio per ottenere l'eventoId
      const montaggio = montaggi.find(m => m.id === montaggioId);
      if (!montaggio) {
        throw new Error("Montaggio non trovato");
      }
      
      // Poi aggiorniamo il montaggio tramite il nuovo endpoint evento-centrico
      const response = await apiRequest(
        "PATCH", 
        `/api/eventi/${montaggio.eventoId}/montaggi/${montaggioId}`,
        { 
          stato: "in_corso",
          dataPrimoContatto: new Date().toISOString(),
        }
      );
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Montaggio avviato",
        description: "Il montaggio è stato avviato con successo.",
      });
      
      // Ricarichiamo i montaggi dopo l'operazione
      fetchAllMontaggi();
      
      // Invalida la cache della dashboard
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/dashboard`] });
      setIsAvviaDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'avvio del montaggio.",
        variant: "destructive",
      });
    },
  });

  // Mutation per completare un montaggio - Approccio Event-Centric
  const completaMutation = useMutation({
    mutationFn: async ({ montaggioId, saldo, note }: { montaggioId: number; saldo: number; note?: string }) => {
      // Prima recuperiamo il montaggio per ottenere l'eventoId
      const montaggio = montaggi.find(m => m.id === montaggioId);
      if (!montaggio) {
        throw new Error("Montaggio non trovato");
      }
      
      const eventoId = montaggio.eventoId;
      if (!eventoId) throw new Error("ID evento non trovato");
      
      // Poi aggiorniamo lo stato del montaggio tramite il nuovo endpoint evento-centrico
      const montaggioResponse = await apiRequest(
        "PATCH", 
        `/api/eventi/${eventoId}/montaggi/${montaggioId}`,
        { 
          stato: "completato",
          saldoImporto: saldo,
          dataConsegnaEffettiva: new Date().toISOString(),
          note,
        }
      );

      if (!montaggioResponse.ok) {
        throw new Error("Errore nell'aggiornamento del montaggio");
      }

      // Poi registriamo il pagamento tramite il nuovo endpoint evento-centrico
      const pagamentoResponse = await apiRequest(
        "POST",
        `/api/eventi/${eventoId}/pagamenti`,
        {
          collaboratoreId: Number(collaboratoreId),
          tipo: "montaggio_saldo",
          importo: saldo,
          dataPagamento: new Date().toISOString(),
          metodoPagamento: "bonifico",
          note: `Saldo montaggio completato - ${note || ""}`,
        }
      );

      if (!pagamentoResponse.ok) {
        throw new Error("Errore nella registrazione del pagamento");
      }

      return montaggioResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Montaggio completato",
        description: "Il montaggio è stato completato e il saldo registrato.",
      });
      
      // Ricarichiamo i montaggi dopo l'operazione
      fetchAllMontaggi();
      
      // Invalidiamo la cache della dashboard
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/dashboard`] });
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/pagamenti`] });
      
      setIsCompletaDialogOpen(false);
      completaForm.reset();
      setMontaggioSelezionato(null);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il completamento del montaggio.",
        variant: "destructive",
      });
    },
  });

  // Handler per avviare un montaggio
  const handleAvviaMontaggio = useCallback((montaggio: any) => {
    setMontaggioSelezionato(montaggio);
    setIsAvviaDialogOpen(true);
  }, []);

  // Handler per confermare l'avvio di un montaggio
  const confirmAvviaMontaggio = useCallback(() => {
    if (!montaggioSelezionato) return;
    avviaMutation.mutate(montaggioSelezionato.id);
  }, [montaggioSelezionato, avviaMutation]);

  // Handler per completare un montaggio
  const handleCompletaMontaggio = useCallback((montaggio: any) => {
    setMontaggioSelezionato(montaggio);
    setIsCompletaDialogOpen(true);
    // Pre-compila il saldo se disponibile nel montaggio
    if (montaggio.acconto) {
      completaForm.setValue('saldo', Number(montaggio.acconto));
    }
  }, [completaForm]);
  
  // Handler per aprire il dialog aggiungi montaggio
  const handleAggiungiMontaggio = useCallback(() => {
    setIsAggiungiDialogOpen(true);
    // Reset del form
    aggiungiForm.reset({
      tipoMontaggio: "video",
      dataConsegnaPrevista: addDays(new Date(), 14),
      priorita: 5,
      note: "",
      eventoId: undefined,
    });
  }, [aggiungiForm]);

  // Handler per inviare il form di completamento
  const onSubmitCompletaMontaggio = useCallback((values: CompletaMontaggioFormValues) => {
    if (!montaggioSelezionato) return;
    
    completaMutation.mutate({
      montaggioId: montaggioSelezionato.id,
      saldo: values.saldo,
      note: values.note,
    });
  }, [montaggioSelezionato, completaMutation]);

  // Mutation per aggiungere un nuovo montaggio
  const aggiungiMutation = useMutation({
    mutationFn: async (values: AggiungiMontaggioFormValues) => {
      const { eventoId, tipoMontaggio, dataConsegnaPrevista, priorita, note } = values;
      
      // Validazione lato client extra
      if (!eventoId) throw new Error("Evento non selezionato");
      
      // Trova l'evento corretto dagli eventi disponibili
      const eventoSelezionato = eventi.find((e: any) => e.eventoId === eventoId || e.id === eventoId);
      if (!eventoSelezionato) throw new Error("Evento non trovato nei dati disponibili");
      
      // Utilizza l'eventoId corretto (quello del sistema, non dell'assegnazione)
      const eventoIdCorretto = eventoSelezionato.eventoId || eventoSelezionato.id;
      
      console.log(`Creazione montaggio per evento ID: ${eventoIdCorretto}`);
      
      // Prepara i dati per la chiamata API
      const montaggioData = {
        collaboratoreId: Number(collaboratoreId),
        tipoMontaggio,
        dataConsegnaPrevista: dataConsegnaPrevista.toISOString(),
        priorita,
        note,
        stato: "da_fare",
      };
      
      // Invia la richiesta all'API
      const response = await apiRequest(
        "POST",
        `/api/eventi/${eventoIdCorretto}/montaggi`,
        montaggioData
      );
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Montaggio aggiunto",
        description: "Il montaggio è stato assegnato con successo.",
      });
      
      // Ricarichiamo i montaggi dopo l'operazione
      fetchAllMontaggi();
      
      // Invalidiamo la cache
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/dashboard`] });
      
      // Chiudiamo il dialog e resettiamo il form
      setIsAggiungiDialogOpen(false);
      aggiungiForm.reset({
        tipoMontaggio: "video",
        dataConsegnaPrevista: addDays(new Date(), 14),
        priorita: 5,
        note: "",
        eventoId: undefined,
      });
      setEventoSelezionato(null);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore durante l'aggiunta del montaggio: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handler per preselezionare un evento nel form
  const handleSelectEvento = useCallback((evento: any) => {
    if (!evento) return;
    
    setEventoSelezionato(evento);
    aggiungiForm.setValue('eventoId', evento.id);
  }, [aggiungiForm]);
  
  // Handler per inviare il form di aggiunta
  const onSubmitAggiungiMontaggio = useCallback((values: AggiungiMontaggioFormValues) => {
    aggiungiMutation.mutate(values);
  }, [aggiungiMutation]);
  
  // Gestione del cambio pagina
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Filtra i montaggi in base allo stato selezionato (memoized)
  const filteredMontaggi = useMemo(() => {
    if (!montaggi?.length) return [];
    
    return montaggi.filter((montaggio) => {
      if (filtroStato === "tutti") return true;
      
      if (filtroStato === "priorita_alta") {
        return montaggio.priorita >= 8 && montaggio.stato !== "completato";
      }
      
      switch (filtroStato) {
        case "da_fare": return montaggio.stato === "da_fare";
        case "in_corso": return montaggio.stato === "in_corso";
        case "completati": return montaggio.stato === "completato";
        default: return true;
      }
    });
  }, [montaggi, filtroStato]);

  // Calcola le informazioni per la paginazione
  const paginatedData = useMemo(() => {
    const totalPages = Math.ceil(filteredMontaggi.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentItems = filteredMontaggi.slice(startIndex, endIndex);
    
    // Resetta la pagina corrente se è fuori range
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
    
    return {
      currentItems,
      totalPages,
      currentPage
    };
  }, [filteredMontaggi, currentPage]);

  // Calcola i totali per i badge (memoized)
  const stats = useMemo(() => {
    if (!montaggi?.length) return { total: 0, pending: 0, priority: 0, inScadenza: 0 };
    
    const inScadenzaItems = montaggi.filter(m => {
      if (m.stato === "completato") return false;
      const dataConsegna = parseISO(m.dataConsegnaPrevista);
      const now = new Date();
      const oreAllaScadenza = differenceInHours(dataConsegna, now);
      return oreAllaScadenza > 0 && oreAllaScadenza <= 48; // Entro 48 ore
    });
    
    return {
      total: montaggi.length,
      pending: montaggi.filter(m => m.stato !== "completato").length,
      priority: montaggi.filter(m => m.priorita >= 8 && m.stato !== "completato").length,
      inScadenza: inScadenzaItems.length
    };
  }, [montaggi]);

  // Render degli skeleton per il caricamento
  const renderSkeletons = () => {
    return Array(6).fill(0).map((_, i) => (
      <Card key={`skeleton-${i}`} className="overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-2 w-full mt-2" />
            <div className="flex justify-between mt-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  };

  // Stato di caricamento
  if (isLoading && !montaggi.length) {
    return (
      <div className="space-y-6">
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-24" />
            </div>
          </CardHeader>
        </Card>
        
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={`btn-${i}`} className="h-9 w-20" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderSkeletons()}
        </div>
      </div>
    );
  }

  // Stato di errore
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-lg text-muted-foreground">
          Si è verificato un errore durante il caricamento dei montaggi
        </p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={fetchAllMontaggi}
        >
          Riprova
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-medium">Coda Montaggi</CardTitle>
              <Badge variant="secondary" role="status">{stats.total}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <div className="flex items-center">
                <Badge variant="outline" className="mr-2" role="status">{stats.pending}</Badge>
                <span className="text-muted-foreground">In attesa</span>
              </div>
              {stats.priority > 0 && (
                <div className="flex items-center">
                  <Badge variant="destructive" className="mr-2" role="status">{stats.priority}</Badge>
                  <span className="text-muted-foreground">Priorità alta</span>
                </div>
              )}
              {stats.inScadenza > 0 && (
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2 bg-amber-500 hover:bg-amber-600 text-white" role="status">
                    {stats.inScadenza}
                  </Badge>
                  <span className="text-muted-foreground">In scadenza</span>
                </div>
              )}
            </div>
            <Button 
              onClick={handleAggiungiMontaggio}
              size="sm"
              className="mt-2 sm:mt-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              Aggiungi Montaggio
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button 
          variant={filtroStato === "tutti" ? "default" : "outline"} 
          size="sm"
          onClick={() => {
            setFiltroStato("tutti");
            setCurrentPage(1);
          }}
        >
          Tutti
        </Button>
        <Button 
          variant={filtroStato === "da_fare" ? "default" : "outline"} 
          size="sm"
          onClick={() => {
            setFiltroStato("da_fare");
            setCurrentPage(1);
          }}
        >
          Da fare
        </Button>
        <Button 
          variant={filtroStato === "in_corso" ? "default" : "outline"} 
          size="sm"
          onClick={() => {
            setFiltroStato("in_corso");
            setCurrentPage(1);
          }}
        >
          In corso
        </Button>
        <Button 
          variant={filtroStato === "completati" ? "default" : "outline"} 
          size="sm"
          onClick={() => {
            setFiltroStato("completati");
            setCurrentPage(1);
          }}
        >
          Completati
        </Button>
        {stats.priority > 0 && (
          <Button 
            variant={filtroStato === "priorita_alta" ? "default" : "outline"} 
            size="sm"
            className={filtroStato !== "priorita_alta" ? "bg-rose-100 text-rose-900 border-rose-200 hover:bg-rose-200 hover:text-rose-900" : ""}
            onClick={() => {
              setFiltroStato("priorita_alta");
              setCurrentPage(1);
            }}
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Priorità alta
          </Button>
        )}
      </div>
      
      {/* Nessun montaggio */}
      {filteredMontaggi.length === 0 ? (
        <div className="bg-muted/40 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            Nessun montaggio {filtroStato !== "tutti" ? (
              filtroStato === "priorita_alta" ? "con priorità alta" : filtroStato.replace('_', ' ')
            ) : ""} trovato.
          </p>
        </div>
      ) : (
        <>
          {/* Griglia montaggi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedData.currentItems.map((montaggio) => {
              // Calcola la data di consegna
              const dataConsegna = parseISO(montaggio.dataConsegnaPrevista);
              const isScaduto = isAfter(new Date(), dataConsegna) && montaggio.stato !== "completato";
              const isInScadenza = !isScaduto && 
                                  montaggio.stato !== "completato" && 
                                  differenceInHours(dataConsegna, new Date()) <= 48;
              
              // Determina i colori e lo stile in base allo stato
              let progressValue = 0;
              let statusBadgeVariant: "default" | "secondary" | "outline" | "destructive" = "outline";
              
              switch (montaggio.stato) {
                case "completato":
                  progressValue = 100;
                  statusBadgeVariant = "default";
                  break;
                case "in_corso":
                  progressValue = 50;
                  statusBadgeVariant = "secondary";
                  break;
                case "da_fare":
                  progressValue = 0;
                  statusBadgeVariant = isScaduto ? "destructive" : "outline";
                  break;
              }

              // Trova l'evento associato
              const eventoAssociato = eventi.find((e: any) => e.id === montaggio.eventoId);
              
              return (
                <Card 
                  key={montaggio.id} 
                  className={cn(
                    "overflow-hidden",
                    isScaduto && montaggio.stato !== "completato" ? 'border-destructive/50' : '',
                    isInScadenza && montaggio.stato !== "completato" ? 'border-amber-400/80' : '',
                    montaggio.priorita >= 8 && montaggio.stato !== "completato" ? 'ring-1 ring-rose-400' : ''
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col mb-4 gap-2">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold truncate">
                          {eventoAssociato?.titolo || montaggio.titolo || `Montaggio #${montaggio.id}`}
                        </h3>
                        <Badge variant={statusBadgeVariant} className="ml-2" role="status" aria-live="polite">
                          {montaggio.stato === "completato" 
                            ? "Completato" 
                            : montaggio.stato === "in_corso" 
                              ? "In corso" 
                              : "Da fare"}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-1" aria-hidden="true" />
                        <span>Consegna: {format(dataConsegna, "dd/MM/yyyy", { locale: it })}</span>
                        
                        {isScaduto && montaggio.stato !== "completato" && (
                          <Badge variant="destructive" className="ml-2 text-xs" aria-live="assertive">
                            Scaduto
                          </Badge>
                        )}
                        
                        {isInScadenza && !isScaduto && (
                          <Badge variant="outline" className="ml-2 text-xs border-amber-400 text-amber-600 bg-amber-50" aria-live="polite">
                            <Bell className="h-3 w-3 mr-1" aria-hidden="true" />
                            In scadenza
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Star className="w-4 h-4 mr-1" aria-hidden="true" />
                        <span>Priorità:</span> 
                        <span className={cn(
                          "ml-1 font-medium", 
                          montaggio.priorita >= 8 ? 'text-destructive' : ''
                        )}>
                          {montaggio.priorita}/10
                        </span>
                      </div>

                      {montaggio.dataPrimoContatto && (
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Clock className="w-4 h-4 mr-1" aria-hidden="true" />
                          <span>Avviato: {format(parseISO(montaggio.dataPrimoContatto), "dd/MM/yyyy", { locale: it })}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between mb-1 text-sm" role="progressbar" aria-valuenow={progressValue} aria-valuemin={0} aria-valuemax={100}>
                        <span>Avanzamento</span>
                        <span>{progressValue}%</span>
                      </div>
                      <Progress value={progressValue} className="h-2" />
                    </div>
                    
                    {montaggio.acconto && (
                      <div className="mb-3 mt-4 p-2 bg-muted/30 rounded border border-border/50">
                        <div className="flex justify-between text-sm">
                          <span>Acconto:</span>
                          <span className="font-medium">{formatCurrency(Number(montaggio.acconto))}</span>
                        </div>
                        {montaggio.saldo && (
                          <div className="flex justify-between text-sm mt-1">
                            <span>Saldo:</span>
                            <span className="font-medium">{formatCurrency(Number(montaggio.saldo))}</span>
                          </div>
                        )}
                        {montaggio.acconto && montaggio.saldo && (
                          <div className="flex justify-between text-sm mt-1 border-t pt-1">
                            <span>Totale:</span>
                            <span className="font-medium">{formatCurrency(Number(montaggio.acconto) + Number(montaggio.saldo))}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {montaggio.note && (
                      <div className="mt-3 p-2 bg-muted/30 rounded-md text-sm border border-border/50">
                        <p className="font-medium mb-1">Note:</p>
                        <p className="text-muted-foreground text-xs">{montaggio.note}</p>
                      </div>
                    )}

                    <div className="mt-4 flex justify-between items-center border-t pt-3">
                      <div className="flex gap-2">
                        {collaboratore?.phone && (
                          <a
                            href={`https://wa.me/${collaboratore.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `Stato montaggio per ${eventoAssociato?.titolo || montaggio.titolo || `Montaggio #${montaggio.id}`}: ${
                                montaggio.stato === "completato" 
                                  ? "Completato" 
                                  : montaggio.stato === "in_corso" 
                                    ? "In corso" 
                                    : "Da fare"
                              }.`
                            )}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            aria-label="Invia stato montaggio via WhatsApp"
                            className="inline-flex items-center justify-center p-1.5 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                          >
                            <IconBrandWhatsapp size={20} aria-hidden="true" />
                            <span className="sr-only">Invia su WhatsApp</span>
                          </a>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {montaggio.stato === "da_fare" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAvviaMontaggio(montaggio)}
                            className="gap-1"
                            disabled={avviaMutation.isPending && avviaMutation.variables === montaggio.id}
                            aria-busy={avviaMutation.isPending && avviaMutation.variables === montaggio.id}
                            aria-describedby={`avvia-desc-${montaggio.id}`}
                          >
                            {avviaMutation.isPending && avviaMutation.variables === montaggio.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
                            ) : (
                              <PlayCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                            )}
                            Avvia
                            <span id={`avvia-desc-${montaggio.id}`} className="sr-only">Avvia montaggio per {eventoAssociato?.titolo || montaggio.titolo || `Montaggio #${montaggio.id}`}</span>
                          </Button>
                        )}
                        
                        {montaggio.stato === "in_corso" && (
                          <Button 
                            size="sm" 
                            onClick={() => handleCompletaMontaggio(montaggio)}
                            className="gap-1"
                            disabled={completaMutation.isPending}
                            aria-busy={completaMutation.isPending}
                            aria-describedby={`completa-desc-${montaggio.id}`}
                          >
                            {completaMutation.isPending && completaMutation.variables?.montaggioId === montaggio.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                            )}
                            Completa
                            <span id={`completa-desc-${montaggio.id}`} className="sr-only">Completa montaggio per {eventoAssociato?.titolo || montaggio.titolo || `Montaggio #${montaggio.id}`}</span>
                          </Button>
                        )}
                        
                        {montaggio.stato === "completato" && (
                          <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200" role="status">
                            <CheckCircle className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                            Completato
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {/* Paginazione */}
          {paginatedData.totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    aria-disabled={currentPage === 1}
                    tabIndex={currentPage === 1 ? -1 : 0}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {/* Prima pagina */}
                {currentPage > 2 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
                  </PaginationItem>
                )}
                
                {/* Ellipsis se necessario */}
                {currentPage > 3 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                
                {/* Pagina precedente se non è la prima */}
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => handlePageChange(currentPage - 1)}>
                      {currentPage - 1}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                {/* Pagina corrente */}
                <PaginationItem>
                  <PaginationLink isActive>{currentPage}</PaginationLink>
                </PaginationItem>
                
                {/* Pagina successiva se non è l'ultima */}
                {currentPage < paginatedData.totalPages && (
                  <PaginationItem>
                    <PaginationLink onClick={() => handlePageChange(currentPage + 1)}>
                      {currentPage + 1}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                {/* Ellipsis se necessario */}
                {currentPage < paginatedData.totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                
                {/* Ultima pagina */}
                {currentPage < paginatedData.totalPages - 1 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => handlePageChange(paginatedData.totalPages)}>
                      {paginatedData.totalPages}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(Math.min(paginatedData.totalPages, currentPage + 1))}
                    aria-disabled={currentPage === paginatedData.totalPages}
                    tabIndex={currentPage === paginatedData.totalPages ? -1 : 0}
                    className={currentPage === paginatedData.totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
      
      {/* Dialog per avviare montaggio */}
      <Dialog open={isAvviaDialogOpen} onOpenChange={setIsAvviaDialogOpen}>
        <DialogContent
          aria-labelledby="avvio-montaggio-titolo"
          aria-describedby="avvio-montaggio-descrizione"
          className="sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle id="avvio-montaggio-titolo">Avvia montaggio</DialogTitle>
            <DialogDescription id="avvio-montaggio-descrizione">
              Conferma di voler avviare il lavoro su questo montaggio.
            </DialogDescription>
          </DialogHeader>
          
          {montaggioSelezionato && (
            <div className="py-4">
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="font-medium">
                  {eventi.find((e: any) => e.id === montaggioSelezionato.eventoId)?.titolo || 
                   montaggioSelezionato.titolo || 
                   `Montaggio #${montaggioSelezionato.id}`}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Priorità: {montaggioSelezionato.priorita}/10
                </p>
                <p className="text-sm text-muted-foreground">
                  Consegna: {format(parseISO(montaggioSelezionato.dataConsegnaPrevista), "PPP", { locale: it })}
                </p>
                {montaggioSelezionato.acconto && (
                  <p className="text-sm text-muted-foreground">
                    Acconto: {formatCurrency(Number(montaggioSelezionato.acconto))}
                  </p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAvviaDialogOpen(false)}
              disabled={avviaMutation.isPending}
            >
              Annulla
            </Button>
            <Button 
              onClick={confirmAvviaMontaggio} 
              disabled={avviaMutation.isPending}
              aria-busy={avviaMutation.isPending}
            >
              {avviaMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Conferma avvio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per completare montaggio */}
      <Dialog open={isCompletaDialogOpen} onOpenChange={setIsCompletaDialogOpen}>
        <DialogContent
          aria-labelledby="completa-montaggio-titolo"
          aria-describedby="completa-montaggio-descrizione"
          className="sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle id="completa-montaggio-titolo">Completa montaggio</DialogTitle>
            <DialogDescription id="completa-montaggio-descrizione">
              Registra il saldo finale per questo montaggio.
            </DialogDescription>
          </DialogHeader>
          
          {montaggioSelezionato && (
            <Form {...completaForm}>
              <form onSubmit={completaForm.handleSubmit(onSubmitCompletaMontaggio)} className="space-y-6">
                <div className="p-3 bg-muted/30 rounded-md mb-4">
                  <p className="font-medium">
                    {eventi.find((e: any) => e.id === montaggioSelezionato.eventoId)?.titolo || 
                     montaggioSelezionato.titolo || 
                     `Montaggio #${montaggioSelezionato.id}`}
                  </p>
                  {montaggioSelezionato.acconto && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Acconto: {formatCurrency(Number(montaggioSelezionato.acconto))}
                    </p>
                  )}
                </div>

                <FormField
                  control={completaForm.control}
                  name="saldo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="input-saldo">Importo saldo (€)</FormLabel>
                      <FormControl>
                        <Input
                          id="input-saldo"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          aria-describedby="saldo-description"
                          aria-required="true"
                        />
                      </FormControl>
                      <FormDescription id="saldo-description">
                        Inserisci l'importo del saldo da pagare
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={completaForm.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="input-note">Note (opzionale)</FormLabel>
                      <FormControl>
                        <Textarea
                          id="input-note"
                          placeholder="Aggiungi note sul lavoro completato"
                          {...field}
                          rows={3}
                          aria-describedby="note-description"
                        />
                      </FormControl>
                      <FormDescription id="note-description">
                        Aggiungi eventuali dettagli o commenti sul montaggio completato
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCompletaDialogOpen(false)}
                    disabled={completaMutation.isPending}
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={completaMutation.isPending}
                    aria-busy={completaMutation.isPending}
                  >
                    {completaMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                    Completa e registra saldo
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Dialog aggiungi montaggio */}
      <Dialog open={isAggiungiDialogOpen} onOpenChange={setIsAggiungiDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Assegna Nuovo Montaggio</DialogTitle>
            <DialogDescription>
              Inserisci i dettagli per assegnare un nuovo montaggio a {collaboratore?.firstName} {collaboratore?.lastName}.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...aggiungiForm}>
            <form onSubmit={aggiungiForm.handleSubmit(onSubmitAggiungiMontaggio)} className="space-y-4">
              
              {/* Evento */}
              <FormField
                control={aggiungiForm.control}
                name="eventoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evento</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        // L'id nell'evento restituito dall'API è l'id dell'assegnazione, non dell'evento
                        // Dobbiamo usare eventoId per il collegamento corretto
                        const evento = eventi.find((e: any) => e.eventoId === parseInt(value) || e.id === parseInt(value));
                        setEventoSelezionato(evento);
                      }}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un evento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventi?.map((evento) => (
                          <SelectItem key={`evento-${evento.id}`} value={evento.eventoId?.toString() || evento.id.toString()}>
                            {evento.titolo || evento.title || `Evento #${evento.eventoId || evento.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Seleziona l'evento per cui assegnare il montaggio.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Tipo Montaggio */}
              <FormField
                control={aggiungiForm.control}
                name="tipoMontaggio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo di Montaggio</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona il tipo di montaggio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="foto">Foto</SelectItem>
                        <SelectItem value="album">Album</SelectItem>
                        <SelectItem value="slideshow">Slideshow</SelectItem>
                        <SelectItem value="altro">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Data Consegna */}
              <FormField
                control={aggiungiForm.control}
                name="dataConsegnaPrevista"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Consegna Prevista</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: it })
                            ) : (
                              <span>Seleziona una data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date: Date | undefined) => field.onChange(date)}
                          disabled={(date: Date) =>
                            date < new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Priorità */}
              <FormField
                control={aggiungiForm.control}
                name="priorita"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorità (1-10)</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input 
                          type="number" 
                          min={1} 
                          max={10}
                          {...field}
                          value={field.value ?? 5}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                        />
                        <span className="ml-2 text-muted-foreground">{field.value}/10</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      La priorità aiuta a organizzare il lavoro (10 = massima).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Note */}
              <FormField
                control={aggiungiForm.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Inserisci eventuali note o istruzioni per il montaggio..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAggiungiDialogOpen(false)}
                >
                  Annulla
                </Button>
                <Button 
                  type="submit"
                  disabled={aggiungiMutation.isPending || !aggiungiForm.formState.isValid}
                >
                  {aggiungiMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creazione in corso...
                    </>
                  ) : (
                    <>Assegna Montaggio</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}