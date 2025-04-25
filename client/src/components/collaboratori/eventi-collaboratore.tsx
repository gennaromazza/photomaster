import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, AlertTriangle, Calendar, MapPin, Clock, Plus, Info, UserPlus, 
  ExternalLink, FileText, Users, FileSignature, ChevronRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, isAfter, parseISO, isValid } from "date-fns";
import { it } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  adaptedApiRequest, 
  adaptedQueryFn, 
  invalidateBothQueries 
} from "@/utils/api-adapter";
import { Link } from "wouter";


import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Definizione delle interfacce per tipizzare i dati
export interface Evento {
  id: number;
  title: string;
  eventDate?: Date | string;
  date?: Date | string; // Supporto per entrambi i formati
  data?: Date | string; // Supporto per formato italiano legacy
  location?: string;
  description?: string;
  status?: string;
  clientName?: string;
  clientFirstName?: string; // Supporto per formato legacy
  clientLastName?: string; // Supporto per formato legacy
  eventoId?: number; // Supporto per formato legacy
  clienteQuoteId?: number; // Supporto per formato legacy
  titolo?: string; // Supporto per formato legacy italiano (title in inglese)
  ruolo?: string; // Ruolo del collaboratore nell'evento
  quote?: {
    id: number;
    title: string;
    client?: {
      firstName: string;
      lastName: string;
    };
  };
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";

interface EventoCollaboratoreListProps {
  collaboratoreId: number;
}

const eventoCollaboratoreSchema = z.object({
  eventoId: z.string().min(1, "Seleziona un evento"),
  ruolo: z.enum(["fotografo", "videomaker", "assistente", "grafico"], {
    required_error: "Seleziona un ruolo",
  }),
  dataAssegnazione: z.date({
    required_error: "Seleziona una data",
  }).min(new Date('2020-01-01'), "Data non valida"),
  note: z.string().optional(),
});

type EventoCollaboratoreFormValues = z.infer<typeof eventoCollaboratoreSchema>;

export function EventoCollaboratoreList({ collaboratoreId }: EventoCollaboratoreListProps) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("tutti");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"assegnati" | "disponibili">("assegnati");

  // Recupera la lista degli eventi assegnati al collaboratore - prova con la versione inglese
  const { data: eventiEnglish = [], isLoading: isLoadingEnglish, error: errorEnglish } = useQuery<Evento[]>({
    queryKey: [`/api/collaborators/${collaboratoreId}/events`], 
    staleTime: 5 * 60 * 1000, // 5 minuti
  });

  // Fallback alla versione italiana se quella inglese fallisce o non restituisce dati
  const { data: eventiItalian = [], isLoading: isLoadingItalian, error: errorItalian } = useQuery<Evento[]>({
    queryKey: [`/api/collaboratori/${collaboratoreId}/eventi`],
    staleTime: 5 * 60 * 1000, // 5 minuti
    enabled: isLoadingEnglish === false,
  });

  // Combina i risultati delle due API
  const eventi = (Array.isArray(eventiEnglish) && eventiEnglish.length > 0) 
    ? eventiEnglish 
    : (Array.isArray(eventiItalian) ? eventiItalian : []);
  const isLoading = isLoadingEnglish || isLoadingItalian;
  const error = (Array.isArray(eventiEnglish) && eventiEnglish.length > 0) ? null : errorEnglish;

  // Recupera la lista di tutti gli eventi disponibili per l'assegnazione
  const { data: eventiDisponibili = [], isLoading: isLoadingEventi } = useQuery<Evento[]>({
    queryKey: ["/api/events"],
    staleTime: 5 * 60 * 1000,
    enabled: isModalOpen, // Carica solo quando il modal è aperto
  });
  
  // Recupera la lista degli eventi senza collaboratori
  const { data: eventiSenzaCollaboratori = [], isLoading: isLoadingEventiSenza, error: errorEventiSenza } = useQuery<Evento[]>({
    queryKey: ["/api/events/senza-collaboratori"],
    staleTime: 5 * 60 * 1000, // 5 minuti
    enabled: activeTab === "disponibili", // Carica solo quando la tab "disponibili" è attiva
  });

  // Funzione helper per estrarre e normalizzare la data dagli eventi
  function getEventDate(evento: Evento): Date | null {
    // Cerca in tutti i possibili campi di data in ordine di priorità
    const dateString = evento.eventDate || evento.date || evento.data;
    if (!dateString) {
      console.warn("Evento senza data:", evento);
      return null;
    }
    
    try {
      // Prima prova con parseISO che è più affidabile per le stringhe ISO
      let date = parseISO(dateString.toString());
      
      // Se la data non è valida, prova il costruttore standard di Date
      if (!isValid(date)) {
        date = new Date(dateString);
      }
      
      // Se ancora non è valida, segnala il problema e ritorna null
      if (!isValid(date)) {
        console.warn("Data evento non valida:", dateString);
        return null;
      }
      
      return date;
    } catch (error) {
      console.error("Errore nel parsing della data:", error);
      return null;
    }
  }

  // Filtra gli eventi in base alla tab selezionata (tutti, passati, futuri)
  const filteredEventi = Array.isArray(eventi) ? eventi.filter((evento) => {
    if (!evento) return false;
    
    const dataEvento = getEventDate(evento);
    // Se non abbiamo una data valida, includi comunque l'evento
    if (!dataEvento) return true;
    
    const oggi = new Date();
    
    if (filter === "passati") {
      return dataEvento < oggi;
    } else if (filter === "futuri") {
      return dataEvento >= oggi;
    }
    
    return true;
  }) : [];

  // Form per l'aggiunta di un nuovo evento al collaboratore
  const form = useForm<EventoCollaboratoreFormValues>({
    resolver: zodResolver(eventoCollaboratoreSchema),
    defaultValues: {
      ruolo: "fotografo",
      dataAssegnazione: new Date(),
      note: "",
    },
  });

  // Mutation per l'aggiunta di un nuovo evento al collaboratore
  const addEventoMutation = useMutation({
    mutationFn: async (data: EventoCollaboratoreFormValues) => {
      const response = await adaptedApiRequest(
        "POST", 
        `/api/collaboratori/${collaboratoreId}/eventi`,
        {
          ...data,
          eventoId: parseInt(data.eventoId),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Evento assegnato",
        description: "L'evento è stato assegnato con successo al collaboratore.",
      });
      // Invalida entrambe le versioni delle query (italiana e inglese)
      invalidateBothQueries(`/api/collaboratori/${collaboratoreId}/eventi`);
      invalidateBothQueries(`/api/collaboratori/${collaboratoreId}/dashboard`);
      invalidateBothQueries(`/api/events/senza-collaboratori`);
      setIsModalOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'assegnazione dell'evento.",
        variant: "destructive",
      });
      console.error("Errore durante l'assegnazione dell'evento:", error);
    },
  });
  
  // Mutation per l'assegnazione rapida di un evento dalla lista eventi senza collaboratori
  const assegnaRapidoMutation = useMutation({
    mutationFn: async ({ eventoId, ruolo }: { eventoId: number, ruolo: string }) => {
      const response = await adaptedApiRequest(
        "POST", 
        `/api/collaboratori/${collaboratoreId}/eventi`,
        {
          eventoId,
          ruolo,
          dataAssegnazione: new Date(),
          note: "Assegnazione rapida dalla dashboard"
        }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Evento assegnato",
        description: "L'evento è stato assegnato con successo al collaboratore.",
      });
      // Invalida entrambe le versioni delle query (italiana e inglese)
      invalidateBothQueries(`/api/collaboratori/${collaboratoreId}/eventi`);
      invalidateBothQueries(`/api/collaboratori/${collaboratoreId}/dashboard`);
      invalidateBothQueries(`/api/events/senza-collaboratori`);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'assegnazione dell'evento.",
        variant: "destructive",
      });
      console.error("Errore durante l'assegnazione rapida dell'evento:", error);
    },
  });

  // Gestisce la sottomissione del form
  function onSubmit(data: EventoCollaboratoreFormValues) {
    addEventoMutation.mutate(data);
  }

  // Mostro il loader durante il caricamento
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mostro un messaggio di errore se qualcosa è andato storto
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-lg text-muted-foreground">
          Si è verificato un errore durante il caricamento degli eventi
        </p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Riprova
        </Button>
      </div>
    );
  }

  // Toolbar e messaggio per lista vuota
  const toolbarContent = (
    <div className="flex justify-between items-center mb-6">
      <div className="flex gap-2">
        <Button 
          variant={filter === "tutti" ? "default" : "outline"} 
          size="sm"
          onClick={() => setFilter("tutti")}
        >
          Tutti
        </Button>
        <Button 
          variant={filter === "futuri" ? "default" : "outline"} 
          size="sm"
          onClick={() => setFilter("futuri")}
        >
          Futuri
        </Button>
        <Button 
          variant={filter === "passati" ? "default" : "outline"} 
          size="sm"
          onClick={() => setFilter("passati")}
        >
          Passati
        </Button>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Evento
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assegna Evento</DialogTitle>
            <DialogDescription>
              Assegna un evento al collaboratore specificando il ruolo e altre informazioni
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="eventoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evento</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isLoadingEventi || addEventoMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un evento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!Array.isArray(eventiDisponibili) || eventiDisponibili.length === 0 ? (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            Nessun evento disponibile
                          </div>
                        ) : (
                          eventiDisponibili.map((evento: any) => (
                            <SelectItem key={evento.id} value={evento.id.toString()}>
                              {evento.title} ({format(new Date(evento.date || evento.data), "dd/MM/yyyy")})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ruolo"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Ruolo</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-1"
                        disabled={addEventoMutation.isPending}
                      >
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="fotografo" />
                          </FormControl>
                          <FormLabel className="font-normal">Fotografo</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="videomaker" />
                          </FormControl>
                          <FormLabel className="font-normal">Videomaker</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="assistente" />
                          </FormControl>
                          <FormLabel className="font-normal">Assistente</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="grafico" />
                          </FormControl>
                          <FormLabel className="font-normal">Grafico</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataAssegnazione"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data assegnazione</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={addEventoMutation.isPending}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: it })
                            ) : (
                              <span>Seleziona una data</span>
                            )}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        {/* Qui andrebbe un DatePicker, uso input date per semplicità */}
                        <Input
                          type="date"
                          onChange={(e) => {
                            field.onChange(e.target.valueAsDate);
                          }}
                          value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                          className="w-full"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (opzionale)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Inserisci eventuali note..."
                        className="resize-none"
                        {...field}
                        disabled={addEventoMutation.isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      Puoi specificare dettagli aggiuntivi sul ruolo o sull'assegnazione
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={addEventoMutation.isPending}
                >
                  Annulla
                </Button>
                <Button 
                  type="submit"
                  disabled={addEventoMutation.isPending}
                >
                  {addEventoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Assegna Evento
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Funzione per mostrare informazioni eliminata perché duplicata di renderEventiDisponibili

  // Renderizza il contenuto della scheda "Eventi Assegnati"
  const renderEventiAssegnati = () => {
    if (filteredEventi.length === 0) {
      return (
        <div className="bg-muted/40 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            Nessun evento {filter !== "tutti" ? filter : ""} trovato per questo collaboratore.
          </p>
        </div>
      );
    }

    // Visualizzazione a lista invece che a card
    return (
      <div className="overflow-hidden border rounded-md shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titolo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Luogo</TableHead>
              <TableHead>Ruolo</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEventi.map((evento) => {
              // Determiniamo l'ID dell'evento per il link
              const eventoId = evento.eventoId;
              const clienteQuoteId = evento.clienteQuoteId; // ID per il preventivo
              
              return (
                <TableRow key={evento.id} className="hover:bg-muted/50 cursor-default">
                  <TableCell>
                    <div className="font-medium">{evento.titolo || evento.title}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary/60" />
                      <div>
                        {evento.clientFirstName && evento.clientLastName ? 
                          `${evento.clientFirstName} ${evento.clientLastName}` : 
                          'Cliente non specificato'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-primary/60" />
                      <span>
                        {(() => {
                          try {
                            const date = getEventDate(evento);
                            return date ? format(date, "dd/MM/yyyy", { locale: it }) : "Data non valida";
                          } catch (error) {
                            console.error("Errore formattazione data:", error);
                            return "Errore data";
                          }
                        })()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-primary/60" />
                      <span>{evento.location || 'N/D'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {evento.ruolo || 'Non specificato'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild className="h-8 px-2">
                        <Link href={`/events/${eventoId}`}>
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          <span>Evento</span>
                        </Link>
                      </Button>
                      
                      {clienteQuoteId && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 px-2">
                              <FileText className="h-3.5 w-3.5 mr-1" />
                              <span>Preventivo</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-6xl h-[90vh]">
                            <DialogHeader>
                              <DialogTitle className="text-xl">Dettaglio Preventivo</DialogTitle>
                              <DialogDescription>
                                Visualizzazione dettagliata del preventivo associato all'evento
                              </DialogDescription>
                            </DialogHeader>
                            <div className="h-full overflow-y-auto -mx-6 px-6">
                              <iframe 
                                src={`/quotes/detail/${clienteQuoteId}`} 
                                className="w-full h-[calc(90vh-120px)] border-0"
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Renderizza il contenuto della scheda "Eventi Disponibili"
  const renderEventiDisponibili = () => {
    if (isLoadingEventiSenza) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (errorEventiSenza) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
          <p className="text-lg text-muted-foreground">
            Si è verificato un errore durante il caricamento degli eventi
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/events/senza-collaboratori"] })}
          >
            Riprova
          </Button>
        </div>
      );
    }

    if (!Array.isArray(eventiSenzaCollaboratori) || eventiSenzaCollaboratori.length === 0) {
      return (
        <div className="bg-muted/40 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            Nessun evento senza collaboratori trovato.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-hidden border rounded-md shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titolo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Luogo</TableHead>
              <TableHead>Dettagli</TableHead>
              <TableHead>Assegna</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventiSenzaCollaboratori.map((evento) => {
              const clienteInfo = evento.clientFirstName && evento.clientLastName 
                ? `${evento.clientFirstName} ${evento.clientLastName}` 
                : 'Cliente non specificato';
              
              return (
                <TableRow key={evento.id} className="hover:bg-muted/50 cursor-default">
                  <TableCell>
                    <div className="font-medium">{evento.title}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary/60" />
                      <div>{clienteInfo}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-primary/60" />
                      <span>
                        {(() => {
                          try {
                            const date = getEventDate(evento);
                            return date ? format(date, "dd/MM/yyyy", { locale: it }) : "Data non valida";
                          } catch (error) {
                            console.error("Errore formattazione data:", error);
                            return "Errore data";
                          }
                        })()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-primary/60" />
                      <span>{evento.location || 'N/D'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild className="h-8 px-2">
                      <Link href={`/events/${evento.id}`}>
                        <Info className="h-3.5 w-3.5 mr-1" />
                        <span>Dettagli</span>
                      </Link>
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex items-center gap-1"
                          disabled={assegnaRapidoMutation.isPending}
                        >
                          <UserPlus className="h-4 w-4" />
                          <span>Assegna</span>
                          {assegnaRapidoMutation.isPending && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2">
                        <p className="text-sm mb-2 font-medium">Seleziona ruolo:</p>
                        <div className="flex flex-col gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => assegnaRapidoMutation.mutate({ 
                              eventoId: evento.id, 
                              ruolo: "fotografo" 
                            })}
                            disabled={assegnaRapidoMutation.isPending}
                          >
                            Fotografo
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => assegnaRapidoMutation.mutate({ 
                              eventoId: evento.id, 
                              ruolo: "videomaker" 
                            })}
                            disabled={assegnaRapidoMutation.isPending}
                          >
                            Videomaker
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => assegnaRapidoMutation.mutate({ 
                              eventoId: evento.id, 
                              ruolo: "assistente" 
                            })}
                            disabled={assegnaRapidoMutation.isPending}
                          >
                            Assistente
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => assegnaRapidoMutation.mutate({ 
                              eventoId: evento.id, 
                              ruolo: "grafico" 
                            })}
                            disabled={assegnaRapidoMutation.isPending}
                          >
                            Grafico
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Struttura principale con tabs
  return (
    <div className="space-y-4">
      <Tabs defaultValue="assegnati" className="w-full" onValueChange={(value) => setActiveTab(value as "assegnati" | "disponibili")}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="assegnati">Eventi Assegnati</TabsTrigger>
            <TabsTrigger value="disponibili">Eventi Disponibili</TabsTrigger>
          </TabsList>
          
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Assegna Evento</DialogTitle>
                <DialogDescription>
                  Assegna un evento al collaboratore specificando il ruolo e altre informazioni
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="eventoId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Evento</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          disabled={isLoadingEventi || addEventoMutation.isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona un evento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {!Array.isArray(eventiDisponibili) || eventiDisponibili.length === 0 ? (
                              <div className="p-2 text-center text-sm text-muted-foreground">
                                Nessun evento disponibile
                              </div>
                            ) : (
                              eventiDisponibili.map((evento: any) => (
                                <SelectItem key={evento.id} value={evento.id.toString()}>
                                  {evento.title} 
                                  {(() => {
                                    try {
                                      const date = getEventDate(evento);
                                      return date ? `(${format(date, "dd/MM/yyyy")})` : "(Data non disponibile)";
                                    } catch (error) {
                                      return "(Errore data)";
                                    }
                                  })()}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ruolo"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Ruolo</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-1"
                            disabled={addEventoMutation.isPending}
                          >
                            <FormItem className="flex items-center space-x-1 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="fotografo" />
                              </FormControl>
                              <FormLabel className="font-normal">Fotografo</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-1 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="videomaker" />
                              </FormControl>
                              <FormLabel className="font-normal">Videomaker</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-1 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="assistente" />
                              </FormControl>
                              <FormLabel className="font-normal">Assistente</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-1 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="grafico" />
                              </FormControl>
                              <FormLabel className="font-normal">Grafico</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dataAssegnazione"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data assegnazione</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={addEventoMutation.isPending}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: it })
                                ) : (
                                  <span>Seleziona una data</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Input
                              type="date"
                              onChange={(e) => {
                                field.onChange(e.target.valueAsDate);
                              }}
                              value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                              className="w-full"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note (opzionale)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Inserisci eventuali note..."
                            className="resize-none"
                            {...field}
                            disabled={addEventoMutation.isPending}
                          />
                        </FormControl>
                        <FormDescription>
                          Puoi specificare dettagli aggiuntivi sul ruolo o sull'assegnazione
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsModalOpen(false)}
                      disabled={addEventoMutation.isPending}
                    >
                      Annulla
                    </Button>
                    <Button 
                      type="submit"
                      disabled={addEventoMutation.isPending}
                    >
                      {addEventoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Assegna Evento
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        <TabsContent value="assegnati" className="mt-0">
          {activeTab === "assegnati" && (
            <>
              {filter !== "tutti" && (
                <div className="flex gap-2 mb-4">
                  <Button 
                    variant={filter === "tutti" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setFilter("tutti")}
                  >
                    Tutti
                  </Button>
                  <Button 
                    variant={filter === "futuri" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setFilter("futuri")}
                  >
                    Futuri
                  </Button>
                  <Button 
                    variant={filter === "passati" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setFilter("passati")}
                  >
                    Passati
                  </Button>
                </div>
              )}
              {renderEventiAssegnati()}
            </>
          )}
        </TabsContent>
        <TabsContent value="disponibili" className="mt-0">
          {activeTab === "disponibili" && renderEventiDisponibili()}
        </TabsContent>
      </Tabs>
    </div>
  );
}