import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/layout";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ArrowLeft,
  CalendarIcon,
  Clock,
  Loader2,
  Search,
  UserPlus2,
  User,
  Church,
  Map,
  Save,
  Scroll,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { formatDate } from "@/lib/utils";

/**
 * Componente per la creazione o modifica di un preventivo (step 1: informazioni di base)
 * Responsabilità: 
 * - Gestire la creazione del preventivo (dati cliente, data evento, note)
 * - Passare al secondo step (ModuleManager) per la gestione dei moduli
 */
export default function NewQuotePage() {
  const [, setLocation] = useLocation();
  const [matched, params] = useRoute("/quotes/new-quote");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isSecondClientDialogOpen, setIsSecondClientDialogOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [secondClientSearch, setSecondClientSearch] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [quoteId, setQuoteId] = useState<number | null>(null);
  
  // Query per lista clienti
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });
  
  // Query per dati preventivo in caso di modifica
  const { data: quoteData } = useQuery<any>({
    queryKey: ["/api/quotes", quoteId],
    enabled: !!quoteId && editMode,
  });
  
  // Schema validazione
  const formSchema = z.object({
    title: z.string().min(1, "Il titolo è obbligatorio"),
    clientId: z.coerce.number().min(1, "Seleziona un cliente"),
    secondClientId: z.coerce.number().optional(),
    eventDate: z.date().optional(),
    eventType: z.string().optional(),
    location: z.string().optional(),
    isFullDay: z.boolean().default(false),
    eventTime: z.string().optional(),
    eventEndTime: z.string().optional(),
    ceremonyLocation: z.string().optional(),
    ceremonyTime: z.string().optional(),
    notes: z.string().optional(),
  });
  
  // Setup form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      clientId: 0,
      secondClientId: undefined,
      eventDate: undefined,
      eventType: "",
      location: "",
      isFullDay: false,
      eventTime: "",
      eventEndTime: "",
      ceremonyLocation: "",
      ceremonyTime: "",
      notes: "",
    },
  });
  
  // Controlla se siamo in modalità modifica leggendo il parametro dell'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get("edit");
    
    if (editId) {
      setEditMode(true);
      setQuoteId(parseInt(editId));
    }
  }, []);
  
  // Carica i dati del preventivo in caso di modifica
  useEffect(() => {
    if (quoteData && editMode) {
      form.reset({
        title: quoteData.title || "",
        clientId: quoteData.clientId || 0,
        secondClientId: quoteData.secondClientId || undefined,
        eventDate: quoteData.eventDate ? new Date(quoteData.eventDate) : undefined,
        eventType: quoteData.eventType || "",
        location: quoteData.location || "",
        isFullDay: quoteData.isFullDay || false,
        eventTime: quoteData.eventTime || "",
        eventEndTime: quoteData.eventEndTime || "",
        ceremonyLocation: quoteData.ceremonyLocation || "",
        ceremonyTime: quoteData.ceremonyTime || "",
        notes: quoteData.notes || "",
      });
    }
  }, [quoteData, editMode, form]);
  
  // Mutation per salvare il preventivo
  const saveQuoteMutation = useMutation({
    mutationFn: async (quoteData: any) => {
      const url = quoteId ? `/api/quotes/${quoteId}` : "/api/quotes";
      const method = quoteId ? "PUT" : "POST";
      const res = await apiRequest(method, url, quoteData);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: editMode ? "Preventivo aggiornato" : "Preventivo creato",
        description: editMode 
          ? "Il preventivo è stato aggiornato con successo" 
          : "Il preventivo è stato creato con successo. Ora puoi aggiungere moduli.",
      });
      
      // Redirect alla pagina di dettaglio del preventivo
      setLocation(`/quotes/detail/${data.id}`);
    },
    onError: (error) => {
      console.error("Errore salvataggio preventivo:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio del preventivo",
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });
  
  // Gestione submit form
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    
    // Preparo i dati da inviare
    const formattedValues = {
      ...values,
      status: editMode ? undefined : "draft", // Solo per nuovi preventivi
    };
    
    saveQuoteMutation.mutate(formattedValues);
  };
  
  // Funzioni di ricerca cliente
  const filteredClients = clients.filter((client) =>
    (`${client.firstName} ${client.lastName}`).toLowerCase().includes(clientSearch.toLowerCase())
  );
  
  const filteredSecondClients = clients.filter((client) =>
    (`${client.firstName} ${client.lastName}`).toLowerCase().includes(secondClientSearch.toLowerCase())
  );
  
  // Trova cliente per ID
  const findClientById = (id: number) => {
    return clients.find((client) => client.id === id);
  };
  
  // Etichette per i clienti visualizzati nei campi
  const getClientLabel = (id: number) => {
    const client = findClientById(id);
    return client ? `${client.firstName} ${client.lastName}` : "Seleziona cliente";
  };
  
  return (
    <Layout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button variant="outline" onClick={() => setLocation("/quotes")} className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Indietro
            </Button>
            <div>
              <h1 className="text-3xl font-playfair font-bold">
                {editMode ? "Modifica Preventivo" : "Nuovo Preventivo"}
              </h1>
              <p className="text-muted-foreground">
                {editMode 
                  ? "Modifica le informazioni del preventivo" 
                  : "Crea un nuovo preventivo, inserisci i dati principali e continua per aggiungere moduli"}
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Informazioni Generali</CardTitle>
                    <CardDescription>
                      Inserisci il titolo e le informazioni di base del preventivo
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titolo Preventivo</FormLabel>
                          <FormControl>
                            <Input placeholder="es. Matrimonio Rossi" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cliente principale */}
                      <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cliente</FormLabel>
                            <div className="relative">
                              <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-between"
                                    type="button"
                                  >
                                    {field.value
                                      ? getClientLabel(field.value)
                                      : "Seleziona cliente"}
                                    <User className="h-4 w-4 ml-2" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Seleziona Cliente</DialogTitle>
                                    <DialogDescription>
                                      Cerca e seleziona un cliente esistente
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="py-4">
                                    <div className="relative mb-4">
                                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                      <Input
                                        placeholder="Cerca cliente..."
                                        className="pl-8"
                                        value={clientSearch}
                                        onChange={(e) => setClientSearch(e.target.value)}
                                      />
                                    </div>
                                    
                                    <div className="max-h-[300px] overflow-y-auto">
                                      {filteredClients.length === 0 ? (
                                        <div className="text-center py-4 text-muted-foreground">
                                          Nessun cliente trovato.
                                        </div>
                                      ) : (
                                        <div className="space-y-1">
                                          {filteredClients.map((client) => (
                                            <div
                                              key={client.id}
                                              className="flex items-center p-2 hover:bg-secondary rounded-md cursor-pointer"
                                              onClick={() => {
                                                field.onChange(client.id);
                                                setIsClientDialogOpen(false);
                                              }}
                                            >
                                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-medium flex items-center justify-center mr-2">
                                                {client.firstName.charAt(0)}
                                                {client.lastName.charAt(0)}
                                              </div>
                                              <div>
                                                <div className="font-medium">
                                                  {client.firstName} {client.lastName}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  {client.email || client.phone || "Nessun contatto"}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button 
                                      variant="outline" 
                                      onClick={() => setIsClientDialogOpen(false)}
                                    >
                                      Annulla
                                    </Button>
                                    <Button 
                                      onClick={() => setLocation("/clients/new")}
                                    >
                                      <UserPlus2 className="mr-2 h-4 w-4" />
                                      Nuovo Cliente
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Secondo cliente (opzionale) */}
                      <FormField
                        control={form.control}
                        name="secondClientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secondo Cliente (opzionale)</FormLabel>
                            <div className="relative">
                              <Dialog
                                open={isSecondClientDialogOpen}
                                onOpenChange={setIsSecondClientDialogOpen}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-between"
                                    type="button"
                                  >
                                    {field.value
                                      ? getClientLabel(field.value)
                                      : "Seleziona secondo cliente"}
                                    <User className="h-4 w-4 ml-2" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Seleziona Secondo Cliente</DialogTitle>
                                    <DialogDescription>
                                      Cerca e seleziona un cliente esistente come partner
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="py-4">
                                    <div className="relative mb-4">
                                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                      <Input
                                        placeholder="Cerca cliente..."
                                        className="pl-8"
                                        value={secondClientSearch}
                                        onChange={(e) => setSecondClientSearch(e.target.value)}
                                      />
                                    </div>
                                    
                                    <div className="max-h-[300px] overflow-y-auto">
                                      {filteredSecondClients.length === 0 ? (
                                        <div className="text-center py-4 text-muted-foreground">
                                          Nessun cliente trovato.
                                        </div>
                                      ) : (
                                        <div className="space-y-1">
                                          {filteredSecondClients.map((client) => (
                                            <div
                                              key={client.id}
                                              className={`flex items-center p-2 hover:bg-secondary rounded-md cursor-pointer ${
                                                client.id === form.getValues("clientId")
                                                  ? "opacity-40 pointer-events-none"
                                                  : ""
                                              }`}
                                              onClick={() => {
                                                if (client.id !== form.getValues("clientId")) {
                                                  field.onChange(client.id);
                                                  setIsSecondClientDialogOpen(false);
                                                }
                                              }}
                                            >
                                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-medium flex items-center justify-center mr-2">
                                                {client.firstName.charAt(0)}
                                                {client.lastName.charAt(0)}
                                              </div>
                                              <div>
                                                <div className="font-medium">
                                                  {client.firstName} {client.lastName}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  {client.email || client.phone || "Nessun contatto"}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button 
                                      variant="outline" 
                                      onClick={() => {
                                        field.onChange(undefined);
                                        setIsSecondClientDialogOpen(false);
                                      }}
                                    >
                                      Rimuovi
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      onClick={() => setIsSecondClientDialogOpen(false)}
                                    >
                                      Chiudi
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Dettagli Evento</CardTitle>
                    <CardDescription>
                      Informazioni sull'evento, data, orario e location
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    className={`w-full pl-3 text-left font-normal ${
                                      !field.value ? "text-muted-foreground" : ""
                                    }`}
                                  >
                                    {field.value ? (
                                      <span>
                                        {formatDate(field.value, "d MMMM yyyy")}
                                      </span>
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
                                  locale={it}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
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
                            <FormControl>
                              <Input
                                placeholder="es. Matrimonio, Battesimo, ecc."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Map className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Indirizzo location dell'evento"
                                className="pl-8"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isFullDay"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 rounded-lg border">
                          <div className="space-y-0.5">
                            <FormLabel>Evento Tutto il Giorno</FormLabel>
                            <FormDescription>
                              Seleziona se l'evento dura tutto il giorno
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    {!form.watch("isFullDay") && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="eventTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Orario Inizio</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="time"
                                    className="pl-8"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="eventEndTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Orario Fine (opzionale)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="time"
                                    className="pl-8"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="ceremonyLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rito/Cerimonia (opzionale)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Church className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="es. Chiesa di San Pietro"
                                  className="pl-8"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Location della cerimonia o rito
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="ceremonyTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Orario Cerimonia (opzionale)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="time"
                                  className="pl-8"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Note</CardTitle>
                    <CardDescription>
                      Eventuali note o informazioni aggiuntive
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Scrivi qui eventuali note o dettagli aggiuntivi..."
                              rows={5}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                
                <div className="flex justify-between items-center mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/quotes")}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Annulla
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={isLoading || saveQuoteMutation.isPending}
                  >
                    {isLoading || saveQuoteMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvataggio...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {editMode ? "Aggiorna Preventivo" : "Salva e Continua"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
          
          <div className="lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Guida Rapida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">1. Informazioni di Base</h3>
                  <p className="text-sm text-muted-foreground">
                    Inserisci titolo e seleziona i clienti associati al preventivo.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">2. Dettagli Evento</h3>
                  <p className="text-sm text-muted-foreground">
                    Specifica tipo evento, data, orario e location.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">3. Moduli e Servizi</h3>
                  <p className="text-sm text-muted-foreground">
                    Dopo il salvataggio, potrai aggiungere moduli con servizi e prodotti.
                  </p>
                </div>
                
                <div className="relative mt-6 p-4 border border-dashed rounded-md">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <Scroll className="h-8 w-8 text-primary/50 mb-2" />
                    <h3 className="font-medium">Procedura completa</h3>
                    <p className="text-sm text-muted-foreground">
                      Dopo aver creato il preventivo, puoi configurare moduli fissi
                      o variabili, per poi condividere il tutto con il cliente.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/50 flex justify-center">
                <Button variant="ghost" onClick={() => window.open("/docs/quotes", "_blank")}>
                  Maggiori informazioni
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}