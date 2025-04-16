import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { insertQuoteSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/layout/layout";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  Search, 
  Plus, 
  User, 
  Mail, 
  Phone, 
  CalendarIcon, 
  Clock, 
  MapPin,
  Calendar as CalendarIcon2,
  Paperclip,
  Save
} from "lucide-react";
import { CommandInput, CommandList, CommandItem, CommandGroup, Command } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import { it } from "date-fns/locale";

// Estensione dello schema di validazione per il preventivo
const quoteFormSchema = insertQuoteSchema.extend({
  title: z.string().min(1, "Il titolo è obbligatorio"),
  clientId: z.coerce.number().min(1, "Seleziona un cliente"),
  subtotal: z.coerce.number().min(0, "Inserisci un subtotale valido"),
  tax: z.coerce.number().optional().default(0),
  discount: z.coerce.number().optional().default(0),
  total: z.coerce.number().min(0, "Inserisci un totale valido"),
  notes: z.string().optional(),
  eventId: z.coerce.number().optional(),
  eventDate: z.date().optional(),
  eventTime: z.string().optional(),
  eventEndTime: z.string().optional(),
  location: z.string().optional(),
  eventType: z.string().optional(),
  workflow: z.string().optional().default("default"),
  categoryId: z.coerce.number().optional(),
  leadSourceId: z.coerce.number().optional(),
  assignedCollaborators: z.array(z.number()).optional().default([]),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

// Nuovo schema per il form di creazione cliente rapido
const clientFormSchema = z.object({
  firstName: z.string().min(1, "Il nome è obbligatorio"),
  lastName: z.string().min(1, "Il cognome è obbligatorio"),
  email: z.string().email("Email non valida"),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function NewQuotePage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [showClientSuccess, setShowClientSuccess] = useState(false);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);

  // Query per ottenere i clienti
  const { data: clients = [], isLoading: isLoadingClients } = useQuery<any[]>({
    queryKey: ["/api/clients"],
    // Quando l'API non restituisce dati, useremo un array vuoto
    // Questa è una scelta di implementazione comune per evitare errori quando si itera su data
  });

  // Query per ottenere gli eventi
  const { data: events = [], isLoading: isLoadingEvents } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });
  
  // Query per ottenere le categorie di servizi
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<any[]>({
    queryKey: ["/api/service-categories"],
  });
  
  // Query per ottenere le fonti di lead
  const { data: leadSources = [], isLoading: isLoadingLeadSources } = useQuery<any[]>({
    queryKey: ["/api/lead-sources"],
  });

  // Query per ottenere i collaboratori
  const { data: collaborators = [], isLoading: isLoadingCollaborators } = useQuery<any[]>({
    queryKey: ["/api/collaborators"],
  });

  // Variabili per i controlli selezionati
  const [assignPhotographers, setAssignPhotographers] = useState(false);
  
  // Form per il preventivo
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      title: "",
      clientId: undefined,
      eventId: undefined,
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      notes: "",
      eventType: "",
      workflow: "default",
      eventTime: "",
      eventEndTime: "",
      location: "",
      assignedCollaborators: [],
    },
  });

  // Form per il cliente
  const clientForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  // Estrai eventId dalla query string
  const fromEventId = new URLSearchParams(location.split("?")[1] || "").get("fromEventId");
  console.log("URL location:", location);
  console.log("fromEventId:", fromEventId);
  
  // Carica i dati dell'evento dal localStorage e dall'API come fallback
  useEffect(() => {
    // Prima prova a caricare i dati dal localStorage
    try {
      const savedEventData = localStorage.getItem('eventForQuote');
      if (savedEventData) {
        const eventData = JSON.parse(savedEventData);
        console.log("Dati evento recuperati da localStorage:", eventData);
        
        // Mappa completa e dettagliata dei campi evento → preventivo
        // Questa mappatura garantisce che tutti i campi pertinenti vengano trasferiti
        form.setValue("title", eventData.title || "");
        form.setValue("clientId", eventData.clientId);
        form.setValue("secondClientId", eventData.secondClientId);
        form.setValue("eventId", eventData.id);
        form.setValue("eventType", eventData.eventType || "");
        form.setValue("location", eventData.location || "");
        form.setValue("eventDate", eventData.date ? new Date(eventData.date) : undefined);
        form.setValue("notes", eventData.notes || "");
        form.setValue("categoryId", eventData.categoryId);
        form.setValue("leadSourceId", eventData.leadSourceId);
        form.setValue("status", eventData.status || "draft");
        
        // Titolo del preventivo più descrittivo basato sull'evento
        const titoloPreventivo = eventData.title 
          ? `Preventivo ${eventData.eventType ? eventData.eventType + ' - ' : ''}${eventData.title}` 
          : form.getValues("title");
        form.setValue("title", titoloPreventivo);
        
        // Imposta il timestamp delle ore se disponibile
        if (eventData.date) {
          const date = new Date(eventData.date);
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          form.setValue("eventTime", `${hours}:${minutes}`);
          
          // Se c'è una data di fine o durata, calcola l'orario di fine
          if (eventData.endDate) {
            const endDate = new Date(eventData.endDate);
            const endHours = String(endDate.getHours()).padStart(2, '0');
            const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
            form.setValue("eventEndTime", `${endHours}:${endMinutes}`);
          } else if (eventData.duration) {
            // Calcola orario di fine in base alla durata (in minuti)
            const endTime = new Date(date.getTime() + eventData.duration * 60000);
            const endHours = String(endTime.getHours()).padStart(2, '0');
            const endMinutes = String(endTime.getMinutes()).padStart(2, '0');
            form.setValue("eventEndTime", `${endHours}:${endMinutes}`);
          }
        }
        
        // Forza l'aggiornamento dei valori nel form
        Object.keys(form.getValues()).forEach(key => {
          form.trigger(key as any);
        });
        
        console.log("Valori impostati nel form:", form.getValues());
        
        // Rimuovi i dati dal localStorage dopo l'uso
        localStorage.removeItem('eventForQuote');
        return;
      }
    } catch (error) {
      console.error("Errore nel recupero dati da localStorage:", error);
    }
    
    // Fallback: prova a caricare i dati dall'API se disponibile l'ID nell'URL
    if (fromEventId) {
      const eventId = parseInt(fromEventId);
      if (!isNaN(eventId)) {
        fetchEventDataFromApi(eventId);
      }
    }
  }, [form]);
  
  // Funzione per recuperare i dati dell'evento dall'API (come fallback)
  const fetchEventDataFromApi = async (eventId: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) throw new Error('Errore nel recupero dati evento');
      const event = await response.json();
      console.log("Dati evento recuperati da API (fallback):", event);
      
      // Mappa completa e dettagliata dei campi evento → preventivo (come nella versione localStorage)
      form.setValue("title", event.title || "");
      form.setValue("clientId", event.clientId);
      form.setValue("secondClientId", event.secondClientId);
      form.setValue("eventId", event.id);
      form.setValue("eventType", event.eventType || "");
      form.setValue("location", event.location || "");
      form.setValue("eventDate", event.date ? new Date(event.date) : undefined);
      form.setValue("notes", event.notes || "");
      form.setValue("categoryId", event.categoryId);
      form.setValue("leadSourceId", event.leadSourceId);
      form.setValue("status", event.status || "draft");
      
      // Titolo del preventivo più descrittivo basato sull'evento
      const titoloPreventivo = event.title 
        ? `Preventivo ${event.eventType ? event.eventType + ' - ' : ''}${event.title}` 
        : form.getValues("title");
      form.setValue("title", titoloPreventivo);
      
      // Imposta il timestamp delle ore se disponibile
      if (event.date) {
        const date = new Date(event.date);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        form.setValue("eventTime", `${hours}:${minutes}`);
        
        // Se c'è una data di fine o durata, calcola l'orario di fine
        if (event.endDate) {
          const endDate = new Date(event.endDate);
          const endHours = String(endDate.getHours()).padStart(2, '0');
          const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
          form.setValue("eventEndTime", `${endHours}:${endMinutes}`);
        } else if (event.duration) {
          // Calcola orario di fine in base alla durata (in minuti)
          const endTime = new Date(date.getTime() + event.duration * 60000);
          const endHours = String(endTime.getHours()).padStart(2, '0');
          const endMinutes = String(endTime.getMinutes()).padStart(2, '0');
          form.setValue("eventEndTime", `${endHours}:${endMinutes}`);
        }
      }
      
      // Forza l'aggiornamento dei valori nel form
      Object.keys(form.getValues()).forEach(key => {
        form.trigger(key as any);
      });
      
      console.log("Valori impostati nel form da API:", form.getValues());
      
      return true;
    } catch (error) {
      console.error("Errore nel caricamento dati evento dall'API:", error);
      return false;
    }
  };

  // Filtraggio clienti basato sulla ricerca
  useEffect(() => {
    if (clients.length > 0 && clientSearchQuery) {
      const query = clientSearchQuery.toLowerCase();
      const filtered = clients.filter(
        (client: any) =>
          client.firstName.toLowerCase().includes(query) ||
          client.lastName.toLowerCase().includes(query) ||
          client.email.toLowerCase().includes(query) ||
          (client.phone && client.phone.includes(query))
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [clientSearchQuery, clients]);

  // Imposta il prezzo totale quando cambia subtotale, tasse o sconto
  useEffect(() => {
    const subtotal = form.watch("subtotal") || 0;
    const tax = form.watch("tax") || 0;
    const discount = form.watch("discount") || 0;
    
    const total = subtotal + (subtotal * tax / 100) - discount;
    form.setValue("total", total);
  }, [form.watch("subtotal"), form.watch("tax"), form.watch("discount")]);

  // Mutation per creare un nuovo cliente
  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return res.json();
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      clientForm.reset();
      setShowClientSuccess(true);
      // Dopo 3 secondi, nascondi il messaggio di successo e chiudi il dialog
      setTimeout(() => {
        setShowClientSuccess(false);
        setIsClientDialogOpen(false);
        // Imposta il cliente appena creato come cliente selezionato
        form.setValue("clientId", newClient.id);
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione del cliente",
        variant: "destructive",
      });
    },
  });

  // Mutation per creare un nuovo preventivo
  const createQuoteMutation = useMutation({
    mutationFn: async (data: QuoteFormValues) => {
      const res = await apiRequest("POST", "/api/quotes", data);
      return res.json();
    },
    onSuccess: (newQuote) => {
      toast({
        title: "Preventivo creato",
        description: "Il preventivo è stato creato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      
      // Reindirizza l'utente alla pagina di dettaglio del preventivo invece che alla lista
      // Questo è fondamentale per completare il flusso evento -> preventivo
      console.log("Preventivo creato con successo, ID:", newQuote.id);
      setLocation(`/quotes/detail/${newQuote.id}`);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione del preventivo",
        variant: "destructive",
      });
    },
  });

  // Gestisci il submit del form preventivo
  const onSubmit = (data: QuoteFormValues) => {
    createQuoteMutation.mutate(data);
  };

  // Gestisci il submit del form cliente
  const onClientSubmit = (data: ClientFormValues) => {
    createClientMutation.mutate(data);
  };

  return (
    <Layout>
      <div className="container py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-playfair font-bold">Nuovo Preventivo</h1>
          <p className="text-muted-foreground">Crea un nuovo preventivo per un cliente</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Preventivo</CardTitle>
                <CardDescription>Inserisci le informazioni di base del preventivo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titolo Preventivo</FormLabel>
                      <FormControl>
                        <Input placeholder="es. Servizio Matrimonio" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Cliente</FormLabel>
                          <div className="flex items-center space-x-2">
                            <div className="relative flex-1">
                              <Command className="border rounded-md">
                                <div className="flex items-center border-b px-3">
                                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                  <CommandInput 
                                    placeholder="Cerca cliente..." 
                                    value={clientSearchQuery}
                                    onValueChange={setClientSearchQuery}
                                    className="flex-1"
                                  />
                                </div>
                                <CommandList>
                                  {isLoadingClients ? (
                                    <div className="py-6 text-center text-sm">
                                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                                      Caricamento clienti...
                                    </div>
                                  ) : filteredClients.length === 0 ? (
                                    <p className="py-6 text-center text-sm">
                                      Nessun cliente trovato. Aggiungine uno nuovo.
                                    </p>
                                  ) : (
                                    <CommandGroup>
                                      {filteredClients.map((client: any) => (
                                        <CommandItem
                                          key={client.id}
                                          value={client.id.toString()}
                                          onSelect={() => {
                                            form.setValue("clientId", client.id);
                                          }}
                                          className="flex items-center justify-between"
                                        >
                                          <div className="flex items-center">
                                            <User className="mr-2 h-4 w-4" />
                                            <span>
                                              {client.firstName} {client.lastName}
                                            </span>
                                          </div>
                                          <div className="flex items-center text-xs text-muted-foreground">
                                            {client.email && (
                                              <div className="mr-4 flex items-center">
                                                <Mail className="mr-1 h-3 w-3" />
                                                {client.email}
                                              </div>
                                            )}
                                            {client.phone && (
                                              <div className="flex items-center">
                                                <Phone className="mr-1 h-3 w-3" />
                                                {client.phone}
                                              </div>
                                            )}
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  )}
                                </CommandList>
                              </Command>
                              <FormMessage />
                            </div>
                            <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="icon" type="button">
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Aggiungi nuovo cliente</DialogTitle>
                                  <DialogDescription>
                                    Inserisci i dati del nuovo cliente per aggiungerlo al sistema
                                  </DialogDescription>
                                </DialogHeader>
                                {showClientSuccess ? (
                                  <Alert className="bg-green-50 border-green-200">
                                    <AlertTitle>Cliente aggiunto con successo!</AlertTitle>
                                    <AlertDescription>
                                      Il cliente è stato creato e selezionato per questo preventivo.
                                    </AlertDescription>
                                  </Alert>
                                ) : (
                                  <Form {...clientForm}>
                                    <form onSubmit={clientForm.handleSubmit(onClientSubmit)} className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                          control={clientForm.control}
                                          name="firstName"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Nome</FormLabel>
                                              <FormControl>
                                                <Input placeholder="Mario" {...field} />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                        <FormField
                                          control={clientForm.control}
                                          name="lastName"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Cognome</FormLabel>
                                              <FormControl>
                                                <Input placeholder="Rossi" {...field} />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                      <FormField
                                        control={clientForm.control}
                                        name="email"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                              <Input type="email" placeholder="mario.rossi@example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={clientForm.control}
                                        name="phone"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Telefono</FormLabel>
                                            <FormControl>
                                              <Input placeholder="+39 123 456 7890" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={clientForm.control}
                                        name="address"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Indirizzo</FormLabel>
                                            <FormControl>
                                              <Input placeholder="Via Roma 123, Milano" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <DialogFooter>
                                        <Button type="submit" disabled={createClientMutation.isPending}>
                                          {createClientMutation.isPending ? (
                                            <>
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              Salvataggio...
                                            </>
                                          ) : (
                                            "Salva Cliente"
                                          )}
                                        </Button>
                                      </DialogFooter>
                                    </form>
                                  </Form>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="eventId"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Evento (opzionale)</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value !== "0" ? parseInt(value) : undefined)}
                          value={field.value?.toString() || "0"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona un evento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">Nessun evento</SelectItem>
                            {events.map((event: any) => (
                              <SelectItem key={event.id} value={event.id.toString()}>
                                {event.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="subtotal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subtotale (€)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IVA (%)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="22" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sconto (€)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="total"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Totale (€)</FormLabel>
                        <FormControl>
                          <Input type="number" readOnly className="bg-muted" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Inserisci qui eventuali note"
                          className="min-h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" type="button" onClick={() => setLocation("/quotes")}>
                  Annulla
                </Button>
                <Button type="submit" disabled={createQuoteMutation.isPending}>
                  {createQuoteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creazione preventivo...
                    </>
                  ) : (
                    "Crea Preventivo"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>
    </Layout>
  );
}