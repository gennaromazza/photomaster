import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Event, Client } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import CollaboratorsCard from "@/components/events/collaborators-card";

const formSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio"),
  description: z.string().optional(),
  eventType: z.string().min(1, "Il tipo di evento è obbligatorio"),
  clientId: z.number({
    required_error: "Il cliente è obbligatorio",
    invalid_type_error: "Seleziona un cliente",
  }),
  location: z.string().optional(),
  status: z.string().min(1, "Lo stato è obbligatorio"),
  eventDate: z.string().optional(),
  coverImage: z.string().optional(),
});

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");

  // Carica i dati dell'evento
  const {
    data: event,
    isLoading: isLoadingEvent,
  } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !isNaN(eventId),
  });

  // Carica i dati del cliente
  const {
    data: clients = [],
    isLoading: isLoadingClients,
  } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Ottieni il cliente associato all'evento
  const client = event ? clients.find(c => c.id === event.clientId) : null;

  // Configurazione form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: event?.title || "",
      description: event?.description || "",
      clientId: event?.clientId,
      location: event?.location || "",
      eventType: event?.eventType || "wedding",
      status: event?.status || "upcoming",
      eventDate: event?.eventDate ? new Date(event.eventDate).toISOString().split('T')[0] : undefined,
      coverImage: event?.coverImage || "",
    },
  });

  // Aggiorna i valori del form quando l'evento viene caricato
  useState(() => {
    if (event) {
      form.reset({
        title: event.title,
        description: event.description,
        clientId: event.clientId,
        location: event.location,
        eventType: event.eventType,
        status: event.status,
        eventDate: event.eventDate ? new Date(event.eventDate).toISOString().split('T')[0] : undefined,
        coverImage: event.coverImage,
      });
    }
  });

  // Mutation per aggiornare l'evento
  const updateEventMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const res = await apiRequest("PUT", `/api/events/${eventId}`, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Errore durante l'aggiornamento dell'evento");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Evento aggiornato",
        description: "Le informazioni dell'evento sono state aggiornate con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare l'evento
  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/events/${eventId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Errore durante l'eliminazione dell'evento");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      navigate("/events");
      toast({
        title: "Evento eliminato",
        description: "L'evento è stato eliminato con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    updateEventMutation.mutate(data);
  };

  const handleDelete = () => {
    if (window.confirm("Sei sicuro di voler eliminare questo evento? Questa azione non può essere annullata.")) {
      deleteEventMutation.mutate();
    }
  };

  if (isLoadingEvent) {
    return (
      <div className="lg:px-8 px-4 mt-6 py-8 flex justify-center">
        <div className="animate-pulse text-gray-500">Caricamento evento...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="lg:px-8 px-4 mt-6 py-8 flex flex-col items-center justify-center">
        <div className="text-4xl text-gray-300 mb-2">
          <i className="ri-error-warning-line"></i>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Evento non trovato</h3>
        <p className="text-gray-500 mb-4">L'evento che stai cercando non esiste o è stato rimosso</p>
        <Link href="/events">
          <Button variant="outline">
            <i className="ri-arrow-left-line mr-2"></i>
            Torna alla lista eventi
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="lg:px-8 px-4 mt-6 lg:mt-8 pb-16">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div className="flex items-center">
          <Link href="/events">
            <Button variant="ghost" size="icon" className="mr-2 h-8 w-8">
              <i className="ri-arrow-left-line"></i>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-semibold text-gray-900">
              {event.title}
            </h1>
            <div className="flex items-center mt-1 text-gray-500">
              <Badge 
                variant={
                  event.status === "upcoming" ? "gray" :
                  event.status === "in-progress" ? "blue" :
                  event.status === "completed" ? "green" : "red"
                }
                className="mr-2"
              >
                {event.status === "upcoming" ? "Prossimo" :
                 event.status === "in-progress" ? "In Corso" :
                 event.status === "completed" ? "Completato" : "Annullato"}
              </Badge>
              <span>{event.eventType === "wedding" ? "Matrimonio" :
                    event.eventType === "portrait" ? "Ritratto" :
                    event.eventType === "fashion" ? "Moda" :
                    event.eventType === "event" ? "Evento" : "Altro"}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 lg:mt-0 flex space-x-3">
          <Button variant="outline" onClick={handleDelete} className="text-red-600 border-red-200 hover:bg-red-50">
            <i className="ri-delete-bin-line mr-2"></i>
            Elimina
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonna sinistra */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Dettagli Evento</CardTitle>
              <CardDescription>Informazioni generali sull'evento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.coverImage && (
                <div className="aspect-video overflow-hidden rounded-md mb-6">
                  <img 
                    src={event.coverImage} 
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Cliente</h3>
                {client ? (
                  <Link href={`/clients/${client.id}`}>
                    <a className="mt-1 flex items-center text-primary hover:underline">
                      <i className="ri-user-line mr-2"></i>
                      {client.firstName} {client.lastName}
                    </a>
                  </Link>
                ) : (
                  <p className="mt-1 text-gray-700">Cliente non disponibile</p>
                )}
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Data</h3>
                <p className="mt-1 text-gray-700">
                  {event.eventDate ? (
                    format(new Date(event.eventDate), "d MMMM yyyy", { locale: it })
                  ) : (
                    "Data non specificata"
                  )}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Luogo</h3>
                <p className="mt-1 text-gray-700">
                  {event.location || "Luogo non specificato"}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Tipo</h3>
                <p className="mt-1 text-gray-700">
                  {event.eventType === "wedding" ? "Matrimonio" :
                   event.eventType === "portrait" ? "Ritratto" :
                   event.eventType === "fashion" ? "Moda" :
                   event.eventType === "event" ? "Evento" : "Altro"}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Stato</h3>
                <p className="mt-1">
                  <Badge 
                    variant={
                      event.status === "upcoming" ? "gray" :
                      event.status === "in-progress" ? "blue" :
                      event.status === "completed" ? "green" : "red"
                    }
                  >
                    {event.status === "upcoming" ? "Prossimo" :
                     event.status === "in-progress" ? "In Corso" :
                     event.status === "completed" ? "Completato" : "Annullato"}
                  </Badge>
                </p>
              </div>
              
              {event.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Descrizione</h3>
                  <p className="text-gray-700 whitespace-pre-line text-sm">
                    {event.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-8">
            <CollaboratorsCard eventId={eventId} />
          </div>
        </div>

        {/* Colonna destra */}
        <div className="lg:col-span-2">
          <Card>
            <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="px-6 pb-0">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="details">Dettagli</TabsTrigger>
                  <TabsTrigger value="tasks">Attività</TabsTrigger>
                  <TabsTrigger value="contracts">Contratti</TabsTrigger>
                </TabsList>
              </CardHeader>

            <TabsContent value="details" className="m-0">
              <CardContent className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Titolo Evento</FormLabel>
                            <FormControl>
                              <Input placeholder="Matrimonio Bianchi" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cliente</FormLabel>
                            <Select
                              disabled={true}
                              value={field.value?.toString()}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona un cliente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clients.map((client) => (
                                  <SelectItem key={client.id} value={client.id.toString()}>
                                    {client.firstName} {client.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="eventDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data Evento</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Luogo</FormLabel>
                            <FormControl>
                              <Input placeholder="Indirizzo o nome location" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="eventType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo Evento</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona il tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="wedding">Matrimonio</SelectItem>
                                <SelectItem value="portrait">Ritratto</SelectItem>
                                <SelectItem value="fashion">Moda</SelectItem>
                                <SelectItem value="event">Evento</SelectItem>
                                <SelectItem value="other">Altro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stato</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona lo stato" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="upcoming">Prossimo</SelectItem>
                                <SelectItem value="in-progress">In Corso</SelectItem>
                                <SelectItem value="completed">Completato</SelectItem>
                                <SelectItem value="cancelled">Annullato</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="coverImage"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Immagine di Copertina (URL)</FormLabel>
                            <FormControl>
                              <Input placeholder="URL immagine" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Descrizione</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Descrizione dell'evento..." 
                                className="min-h-32"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={updateEventMutation.isPending}
                      >
                        {updateEventMutation.isPending && (
                          <i className="ri-loader-4-line animate-spin mr-2"></i>
                        )}
                        Salva Modifiche
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </TabsContent>

            <TabsContent value="tasks" className="m-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium">Attività</h3>
                  <Button size="sm">
                    <i className="ri-add-line mr-2"></i>
                    Nuova Attività
                  </Button>
                </div>
                
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-4xl text-gray-300 mb-2">
                    <i className="ri-task-line"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Nessuna attività</h3>
                  <p className="text-gray-500 mb-4">
                    Non ci sono attività associate a questo evento
                  </p>
                  <Button variant="outline">
                    <i className="ri-add-line mr-2"></i>
                    Crea nuova attività
                  </Button>
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="contracts" className="m-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium">Contratti</h3>
                  <Button size="sm">
                    <i className="ri-file-list-3-line mr-2"></i>
                    Nuovo Contratto
                  </Button>
                </div>
                
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-4xl text-gray-300 mb-2">
                    <i className="ri-file-list-3-line"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Nessun contratto</h3>
                  <p className="text-gray-500 mb-4">
                    Non ci sono contratti associati a questo evento
                  </p>
                  <Button variant="outline">
                    <i className="ri-file-list-3-line mr-2"></i>
                    Crea nuovo contratto
                  </Button>
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