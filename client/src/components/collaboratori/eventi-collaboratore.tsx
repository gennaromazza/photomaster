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
import { format, isAfter, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  const [filter, setFilter] = useState<"tutti" | "passati" | "futuri">("tutti");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"assegnati" | "disponibili">("assegnati");

  // Recupera la lista degli eventi assegnati al collaboratore
  const { data: eventi, isLoading, error } = useQuery({
    queryKey: [`/api/collaboratori/${collaboratoreId}/eventi`],
    staleTime: 5 * 60 * 1000, // 5 minuti
  });

  // Recupera la lista di tutti gli eventi disponibili per l'assegnazione
  const { data: eventiDisponibili, isLoading: isLoadingEventi } = useQuery({
    queryKey: ["/api/events"],
    staleTime: 5 * 60 * 1000,
    enabled: isModalOpen, // Carica solo quando il modal è aperto
  });
  
  // Recupera la lista degli eventi senza collaboratori
  const { data: eventiSenzaCollaboratori, isLoading: isLoadingEventiSenza, error: errorEventiSenza } = useQuery({
    queryKey: ["/api/events/senza-collaboratori"],
    staleTime: 5 * 60 * 1000, // 5 minuti
    enabled: activeTab === "disponibili", // Carica solo quando la tab "disponibili" è attiva
  });

  // Filtra gli eventi in base alla tab selezionata (tutti, passati, futuri)
  const filteredEventi = eventi ? eventi.filter((evento) => {
    const dataEvento = new Date(evento.eventDate);
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
      const response = await apiRequest(
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
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/eventi`] });
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/dashboard`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/senza-collaboratori`] });
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
      const response = await apiRequest(
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
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/eventi`] });
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/dashboard`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/senza-collaboratori`] });
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
                        {!eventiDisponibili || eventiDisponibili.length === 0 ? (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            Nessun evento disponibile
                          </div>
                        ) : (
                          eventiDisponibili.map((evento: any) => (
                            <SelectItem key={evento.id} value={evento.id.toString()}>
                              {evento.title} ({format(new Date(evento.date), "dd/MM/yyyy")})
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

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEventi.map((evento) => {
          // Determiniamo l'ID dell'evento per il link
          const eventoId = evento.eventoId;
          
          return (
            <Link href={`/events/${eventoId}`} key={evento.id}>
              <Card className="overflow-hidden hover:shadow-md hover:border-primary transition-all cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold group flex items-center">
                        {evento.titolo || evento.title}
                        <ExternalLink className="w-4 h-4 ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </CardTitle>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-1" />
                        {format(new Date(evento.data || evento.eventDate), "PPP", { locale: it })}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {evento.ruolo || 'Non specificato'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{evento.location || 'Luogo non specificato'}</p>
                        {evento.address && (
                          <p className="text-xs text-muted-foreground">{evento.address}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">{evento.time || 'Orario non specificato'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
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

    if (!eventiSenzaCollaboratori || eventiSenzaCollaboratori.length === 0) {
      return (
        <div className="bg-muted/40 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            Nessun evento senza collaboratori trovato.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {eventiSenzaCollaboratori.map((evento) => (
          <div key={evento.id} className="relative group">
            <Link href={`/events/${evento.id}`}>
              <Card className="overflow-hidden hover:shadow-md hover:border-primary transition-all cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold group flex items-center">
                        {evento.title}
                        <ExternalLink className="w-4 h-4 ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </CardTitle>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-1" />
                        {format(new Date(evento.date), "PPP", { locale: it })}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{evento.location || 'Luogo non specificato'}</p>
                        {evento.address && (
                          <p className="text-xs text-muted-foreground">{evento.address}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">
                          {evento.description && evento.description.length > 120
                            ? `${evento.description.substring(0, 120)}...`
                            : evento.description || 'Nessuna descrizione disponibile'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            {/* Pulsante Assegna posizionato in alto a destra sulla card */}
            <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex items-center gap-1 bg-white shadow-sm"
                    disabled={assegnaRapidoMutation.isPending}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Assegna</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                  <p className="text-sm mb-2 font-medium">Ruolo per questo evento:</p>
                  <div className="flex flex-col gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => assegnaRapidoMutation.mutate({ 
                        eventoId: evento.id, 
                        ruolo: "fotografo" 
                      })}
                      disabled={assegnaRapidoMutation.isPending}
                    >
                      {assegnaRapidoMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
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
                      {assegnaRapidoMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
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
                      {assegnaRapidoMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
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
                      {assegnaRapidoMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      Grafico
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        ))}
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
                            {!eventiDisponibili || eventiDisponibili.length === 0 ? (
                              <div className="p-2 text-center text-sm text-muted-foreground">
                                Nessun evento disponibile
                              </div>
                            ) : (
                              eventiDisponibili.map((evento: any) => (
                                <SelectItem key={evento.id} value={evento.id.toString()}>
                                  {evento.title} ({format(new Date(evento.date), "dd/MM/yyyy")})
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