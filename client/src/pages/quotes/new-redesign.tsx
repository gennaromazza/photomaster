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
import { 
  Command, 
  CommandInput, 
  CommandList, 
  CommandItem, 
  CommandGroup, 
  CommandEmpty 
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronsUpDown } from "lucide-react";
import cn from 'classnames';

// Estensione dello schema di validazione per il preventivo
const quoteFormSchema = insertQuoteSchema.extend({
  title: z.string().min(1, "Il titolo è obbligatorio"),
  clientId: z.coerce.number().min(1, "Seleziona un cliente"),
  secondClientId: z.coerce.number().optional(),
  notes: z.string().optional(),
  eventId: z.coerce.number().optional(),
  eventDate: z.date().optional(),
  isFullDay: z.boolean().optional().default(false),
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
  const [, setLocation] = useLocation();
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isSecondClientDialogOpen, setIsSecondClientDialogOpen] = useState(false);
  const [mainClientSearch, setMainClientSearch] = useState("");
  const [secondClientSearch, setSecondClientSearch] = useState("");
  const [showClientSuccess, setShowClientSuccess] = useState(false);
  const [showSecondClientSuccess, setShowSecondClientSuccess] = useState(false);
  const [filteredMainClients, setFilteredMainClients] = useState<any[]>([]);
  const [filteredSecondClients, setFilteredSecondClients] = useState<any[]>([]);

  // Variabili per i controlli selezionati
  const [assignPhotographers, setAssignPhotographers] = useState(false);

  // Query per ottenere i clienti
  const { data: clients = [], isLoading: isLoadingClients } = useQuery<any[]>({
    queryKey: ["/api/clients"],
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

  // Form per il preventivo
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      title: "",
      clientId: undefined,
      secondClientId: undefined,
      eventId: undefined,
      notes: "",
      eventType: "",
      workflow: "default",
      eventTime: "",
      eventEndTime: "",
      location: "",
      isFullDay: false,
      assignedCollaborators: [],
    },
  });

  // Form per il cliente principale
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

  // Form per il secondo cliente
  const secondClientForm = useForm<ClientFormValues>({
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

  // Filtraggio clienti principali basato sulla ricerca
  useEffect(() => {
    if (clients.length > 0 && mainClientSearch) {
      const query = mainClientSearch.toLowerCase();
      const filtered = clients.filter(
        (client: any) =>
          client.firstName.toLowerCase().includes(query) ||
          client.lastName.toLowerCase().includes(query) ||
          client.email.toLowerCase().includes(query) ||
          (client.phone && client.phone.includes(query))
      );
      setFilteredMainClients(filtered);
    } else {
      setFilteredMainClients(clients);
    }
  }, [mainClientSearch, clients]);

  // Filtraggio clienti secondari basato sulla ricerca
  useEffect(() => {
    if (clients.length > 0 && secondClientSearch) {
      const query = secondClientSearch.toLowerCase();
      const filtered = clients.filter(
        (client: any) =>
          client.firstName.toLowerCase().includes(query) ||
          client.lastName.toLowerCase().includes(query) ||
          client.email.toLowerCase().includes(query) ||
          (client.phone && client.phone.includes(query))
      );
      setFilteredSecondClients(filtered);
    } else {
      setFilteredSecondClients(clients);
    }
  }, [secondClientSearch, clients]);

  // Gestione dello stato per l'opzione "Evento tutto il giorno"
  const [isFullDayEvent, setIsFullDayEvent] = useState(false);

  // Disabilita o abilita i campi di orario in base all'opzione "tutto il giorno"
  useEffect(() => {
    if (isFullDayEvent) {
      form.setValue("eventTime", "");
      form.setValue("eventEndTime", "");
    }
    form.setValue("isFullDay", isFullDayEvent);
  }, [isFullDayEvent, form]);

  // Mutation per creare un nuovo cliente principale
  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return res.json();
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      clientForm.reset();
      setShowClientSuccess(true);
      // Dopo 2 secondi, nascondi il messaggio di successo e chiudi il dialog
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

  // Mutation per creare un nuovo secondo cliente
  const createSecondClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return res.json();
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      secondClientForm.reset();
      setShowSecondClientSuccess(true);
      // Dopo 2 secondi, nascondi il messaggio di successo e chiudi il dialog
      setTimeout(() => {
        setShowSecondClientSuccess(false);
        setIsSecondClientDialogOpen(false);
        // Imposta il cliente appena creato come secondo cliente
        form.setValue("secondClientId", newClient.id);
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione del secondo cliente",
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
      // Reindirizza alla pagina di dettaglio del preventivo appena creato
      setLocation(`/quotes/${newQuote.id}`);
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

  // Gestisci il submit del form cliente principale
  const onClientSubmit = (data: ClientFormValues) => {
    createClientMutation.mutate(data);
  };

  // Gestisci il submit del form secondo cliente
  const onSecondClientSubmit = (data: ClientFormValues) => {
    createSecondClientMutation.mutate(data);
  };

  // Gestione della selezione dei clienti
  const handleClientSelect = (clientId: number, isSecondClient = false) => {
    if (isSecondClient) {
      form.setValue("secondClientId", clientId);
      setSecondClientSearch("");
    } else {
      form.setValue("clientId", clientId);
      setMainClientSearch("");
    }
  };

  return (
    <Layout>
      <div className="container py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-playfair font-bold">Nuovo Preventivo</h1>
            <p className="text-muted-foreground">Crea un nuovo preventivo per un cliente</p>
          </div>
          <Button 
            onClick={form.handleSubmit(onSubmit)}
            disabled={createQuoteMutation.isPending}
          >
            {createQuoteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creazione...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salva Preventivo
              </>
            )}
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* CARD PRINCIPALE */}
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Cliente e Preventivo</CardTitle>
                <CardDescription>Inserisci le informazioni di base del preventivo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Titolo preventivo */}
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

                {/* Selezione cliente principale e secondario */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Cliente Principale</FormLabel>
                          <div className="flex items-center space-x-2">
                            <div className="relative flex-1">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "w-full justify-between",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        clients.find((client) => client.id === field.value)
                                          ? `${clients.find((client) => client.id === field.value)?.firstName} ${
                                              clients.find((client) => client.id === field.value)?.lastName
                                            }`
                                          : "Seleziona un cliente"
                                      ) : (
                                        "Seleziona un cliente"
                                      )}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Cerca cliente..." />
                                    <CommandEmpty>Nessun cliente trovato</CommandEmpty>
                                    <CommandGroup>
                                      {clients.map((client) => (
                                        <CommandItem
                                          key={client.id}
                                          value={`${client.firstName} ${client.lastName}`}
                                          onSelect={() => {
                                            form.setValue("clientId", client.id);
                                          }}
                                        >
                                          {client.firstName} {client.lastName}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </Command>
                                </PopoverContent>
                              </Popover>
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

                  {/* Secondo cliente */}
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="secondClientId"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Secondo Cliente (opzionale)</FormLabel>
                          <div className="flex items-center space-x-2">
                            <div className="relative flex-1">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "w-full justify-between",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        clients.find((client) => client.id === field.value)
                                          ? `${clients.find((client) => client.id === field.value)?.firstName} ${
                                              clients.find((client) => client.id === field.value)?.lastName
                                            }`
                                          : "Seleziona un cliente"
                                      ) : (
                                        "Seleziona un cliente"
                                      )}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Cerca secondo cliente..." />
                                    <CommandEmpty>Nessun cliente trovato</CommandEmpty>
                                    <CommandGroup>
                                      {clients.map((client) => (
                                        <CommandItem
                                          key={client.id}
                                          value={`${client.firstName} ${client.lastName}`}
                                          onSelect={() => {
                                            form.setValue("secondClientId", client.id);
                                          }}
                                        >
                                          {client.firstName} {client.lastName}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </div>
                            <Dialog open={isSecondClientDialogOpen} onOpenChange={(open) => {
                                setIsSecondClientDialogOpen(open);
                                if (!open) {
                                  secondClientForm.reset();
                                  setShowSecondClientSuccess(false);
                                }
                              }}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="icon" type="button">
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Aggiungi secondo cliente</DialogTitle>
                                  <DialogDescription>
                                    Inserisci i dati del secondo cliente per aggiungerlo al sistema
                                  </DialogDescription>
                                </DialogHeader>
                                {showSecondClientSuccess ? (
                                  <Alert className="bg-green-50 border-green-200">
                                    <AlertTitle>Cliente aggiunto con successo!</AlertTitle>
                                    <AlertDescription>
                                      Il secondo cliente è stato creato e selezionato per questo preventivo.
                                    </AlertDescription>
                                  </Alert>
                                ) : (
                                  <Form {...secondClientForm}>
                                    <form onSubmit={secondClientForm.handleSubmit(onSecondClientSubmit)} className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                          control={secondClientForm.control}
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
                                          control={secondClientForm.control}
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
                                        control={secondClientForm.control}
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
                                        control={secondClientForm.control}
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
                                      <DialogFooter>
                                        <Button type="submit" disabled={createSecondClientMutation.isPending}>
                                          {createSecondClientMutation.isPending ? (
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
                </div>

                {/* Informazioni tipo lavoro */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <FormField
                    control={form.control}
                    name="workflow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Workflow</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona workflow" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="wedding">Wedding</SelectItem>
                            <SelectItem value="portrait">Ritratti</SelectItem>
                            <SelectItem value="event">Eventi</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="leadSourceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provenienza</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value !== "0" ? parseInt(value) : undefined)}
                          value={field.value?.toString() || "0"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona provenienza" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">Seleziona</SelectItem>
                            {leadSources.map((source: any) => (
                              <SelectItem key={source.id} value={source.id.toString()}>
                                {source.name}
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
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo Lavoro</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value !== "0" ? parseInt(value) : undefined)}
                          value={field.value?.toString() || "0"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona tipo lavoro" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">Seleziona</SelectItem>
                            {categories.map((category: any) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="eventId"
                    render={({ field }) => (
                      <FormItem>
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

                <Separator className="my-4" />

                {/* Date e orari */}
                <h3 className="text-lg font-medium mb-2">Data e Orari Evento</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="eventDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data Evento</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: it })
                                ) : (
                                  <span>Seleziona data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              locale={it}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Opzione "Tutto il giorno" */}
                  <div className="flex items-end pb-2">
                    <FormField
                      control={form.control}
                      name="isFullDay"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-start space-x-3 space-y-0">
                          <FormControl>
                            <Switch
                              checked={isFullDayEvent}
                              onCheckedChange={(checked) => {
                                setIsFullDayEvent(checked);
                                field.onChange(checked);
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Evento tutto il giorno</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className={isFullDayEvent ? "opacity-50" : ""}>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="eventTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Orario Inizio</FormLabel>
                            <div className="flex items-center">
                              <FormControl>
                                <Input 
                                  type="time" 
                                  {...field} 
                                  disabled={isFullDayEvent}
                                />
                              </FormControl>
                              <Clock className="ml-2 h-4 w-4 text-muted-foreground" />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="eventEndTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Orario Fine</FormLabel>
                            <div className="flex items-center">
                              <FormControl>
                                <Input 
                                  type="time" 
                                  {...field} 
                                  disabled={isFullDayEvent}
                                />
                              </FormControl>
                              <Clock className="ml-2 h-4 w-4 text-muted-foreground" />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <div className="flex items-center">
                        <FormControl>
                          <Input placeholder="Indirizzo location" {...field} />
                        </FormControl>
                        <MapPin className="ml-2 h-4 w-4 text-muted-foreground" />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator className="my-4" />

                {/* Opzioni assistenti */}
                <div className="flex items-center space-x-2 mt-4 mb-2">
                  <Switch 
                    id="assign-photographers" 
                    checked={assignPhotographers}
                    onCheckedChange={setAssignPhotographers}
                  />
                  <label htmlFor="assign-photographers" className="text-sm font-medium">
                    Assegna fotografi, videografi, assistenti
                  </label>
                </div>

                {assignPhotographers && (
                  <div className="bg-muted/30 p-4 rounded-md">
                    <h3 className="text-sm font-medium mb-2">Seleziona collaboratori</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {collaborators.map((collaborator: any) => (
                        <div key={collaborator.id} className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id={`collaborator-${collaborator.id}`}
                            className="rounded border-gray-300"
                            onChange={(e) => {
                              const currentCollaborators = form.getValues("assignedCollaborators") || [];
                              if (e.target.checked) {
                                form.setValue("assignedCollaborators", [...currentCollaborators, collaborator.id]);
                              } else {
                                form.setValue("assignedCollaborators", 
                                  currentCollaborators.filter((id: number) => id !== collaborator.id)
                                );
                              }
                            }}
                          />
                          <label htmlFor={`collaborator-${collaborator.id}`} className="text-sm">
                            {collaborator.firstName} {collaborator.lastName} ({collaborator.role})
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator className="my-4" />

                {/* Note di lavoro */}
                <h3 className="text-lg font-medium mb-2">Note di Lavoro</h3>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Inserisci qui eventuali note o richieste specifiche del cliente"
                          className="min-h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Rimossa la sezione "Dati Preventivo" come richiesto */}
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  variant="outline" 
                  type="button" 
                  className="mr-2"
                  onClick={() => setLocation("/quotes")}
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={createQuoteMutation.isPending}
                >
                  {createQuoteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creazione...
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