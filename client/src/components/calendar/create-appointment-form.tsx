import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, set } from "date-fns";
import { it } from "date-fns/locale";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, 
  FormDescription 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { insertEventSchema, Client, Collaborator, InsertEvent, Quote } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Clock, MapPin, Search, User, Mail, Phone } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

// Schema zod per il form di appuntamento
const formSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio"),
  description: z.string().optional(),
  appointmentType: z.enum(["meeting", "photoshoot", "consultation", "other"], {
    required_error: "Seleziona il tipo di appuntamento",
  }),
  clientId: z.number({
    required_error: "Il cliente è obbligatorio",
    invalid_type_error: "Seleziona un cliente",
  }).optional().nullable(),
  quoteId: z.number({
    invalid_type_error: "Seleziona un preventivo",
  }).optional().nullable(),
  date: z.date({
    required_error: "La data è obbligatoria",
    invalid_type_error: "Data non valida",
  }),
  time: z.string().min(1, "L'ora è obbligatoria"),
  duration: z.number().min(1, "La durata è obbligatoria"),
  location: z.string().optional(),
  notes: z.string().optional(),
  sendNotification: z.boolean().default(false),
  notificationType: z.enum(["email", "whatsapp"]).optional(),
  status: z.string().default("scheduled"),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateAppointmentFormProps {
  selectedDate: Date;
  clients: Client[];
  collaborators: Collaborator[];
  quotes?: Quote[];
  onSuccess?: () => void;
}

export function CreateAppointmentForm({ 
  selectedDate, 
  clients, 
  collaborators,
  quotes = [],
  onSuccess 
}: CreateAppointmentFormProps) {
  const { toast } = useToast();

  // Usa i preventivi forniti o caricali dal server
  const { data: fetchedQuotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
    enabled: quotes.length === 0, // Carica solo se non sono stati forniti
  });

  // Combina entrambe le fonti di preventivi
  const allQuotes = [...quotes, ...fetchedQuotes];

  // Solo preventivi approvati o firmati
  const approvedQuotes = allQuotes.filter(quote => 
    quote.status === "approved" || quote.status === "signed"
  );

  // Setup del form con valori predefiniti
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      appointmentType: "meeting",
      date: selectedDate,
      time: "10:00",
      duration: 60, // Durata predefinita di 60 minuti
      status: "scheduled",
      sendNotification: false,
    },
  });

  // Ottieni valori correnti del form
  const clientId = form.watch("clientId");
  const quoteId = form.watch("quoteId");
  const sendNotification = form.watch("sendNotification");
  const notificationType = form.watch("notificationType");

  // Se è selezionato un preventivo, aggiorna automaticamente il cliente
  const selectedQuote = quoteId 
    ? approvedQuotes.find(q => q.id === quoteId)
    : null;

  // Effetto per aggiornare il clientId quando cambia il preventivo selezionato
  useEffect(() => {
    if (selectedQuote && selectedQuote.clientId) {
      form.setValue("clientId", selectedQuote.clientId);
    }
  }, [quoteId, selectedQuote, form]);

  // Mutation per creare un nuovo evento
  const createEventMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Costruisci la data completa con l'ora
      let eventDate = data.date;
      if (data.time) {
        const [hours, minutes] = data.time.split(":").map(Number);
        eventDate = set(data.date, { hours, minutes, seconds: 0 });
      }

      // Calcola la data di fine in base alla durata
      const endDate = new Date(eventDate.getTime() + data.duration * 60000);

      // Costruisci i dati da inviare all'API
      const eventData: Partial<InsertEvent> & { 
        notificationType?: string; 
        sendNotification?: boolean;
      } = {
        title: data.title,
        description: data.description,
        eventType: "appointment", // Tipo fisso per appuntamenti
        clientId: data.clientId || 0, // Default necessario poiché clientId è richiesto
        quoteId: data.quoteId || undefined, // Rende nullo/undefined se non selezionato
        date: eventDate,
        endDate: endDate,
        duration: data.duration,
        location: data.location,
        status: data.status,
        notes: data.notes,
        // Questi campi verranno gestiti lato server
        sendNotification: data.sendNotification,
        notificationType: data.notificationType,
      };

      const res = await apiRequest("POST", "/api/events", eventData);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Errore durante la creazione dell'appuntamento");
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Appuntamento creato",
        description: sendNotification 
          ? `L'appuntamento è stato creato e una notifica è stata inviata via ${notificationType === "email" ? "email" : "WhatsApp"}`
          : "L'appuntamento è stato creato con successo",
      });

      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    createEventMutation.mutate(data);
  };

  const appointmentTypes = [
    { value: "meeting", label: "Incontro" },
    { value: "consultation", label: "Consulenza" },
    { value: "photoshoot", label: "Servizio Fotografico" },
    { value: "other", label: "Altro" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Dettagli</TabsTrigger>
            <TabsTrigger value="notification">Notifica</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titolo Appuntamento*</FormLabel>
                    <FormControl>
                      <Input placeholder="Incontro con cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appointmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo di Appuntamento*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona il tipo di appuntamento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {appointmentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="col-span-1 md:col-span-2">
                  <h3 className="text-sm font-medium mb-2">Associa a</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    Puoi associare l'appuntamento a un cliente o direttamente a un preventivo approvato
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Cliente</FormLabel>
                      <div className="relative">
                        <Command className="border rounded-md">
                          <div className="flex items-center border-b px-3">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <CommandInput placeholder="Cerca cliente..." />
                          </div>
                          <CommandList>
                            <CommandEmpty>Nessun cliente trovato</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="null"
                                onSelect={() => {
                                  if (quoteId) {
                                    form.setValue("quoteId", null);
                                  }
                                  field.onChange(null);
                                }}
                              >
                                Nessuno
                              </CommandItem>
                              {clients.map((client) => (
                                <CommandItem
                                  key={client.id}
                                  value={`${client.firstName} ${client.lastName}`.toLowerCase()}
                                  onSelect={() => {
                                    if (quoteId) {
                                      form.setValue("quoteId", null);
                                    }
                                    field.onChange(client.id);
                                  }}
                                >
                                  <div className="flex items-center">
                                    <User className="mr-2 h-4 w-4" />
                                    <span>{client.firstName} {client.lastName}</span>
                                  </div>
                                  <div className="ml-2 flex items-center text-xs text-muted-foreground">
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
                          </CommandList>
                        </Command>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quoteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preventivo</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))}
                        value={field.value?.toString() || "null"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona un preventivo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="null">Nessuno</SelectItem>
                          {approvedQuotes.map((quote) => {
                            // Trova il cliente associato
                            const client = clients.find(c => c.id === quote.clientId);
                            return (
                              <SelectItem 
                                key={quote.id} 
                                value={quote.id.toString()}
                              >
                                <div className="flex items-center">
                                  <span>{quote.title}</span>
                                  {quote.status === "approved" && (
                                    <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
                                  )}
                                  {quote.status === "signed" && (
                                    <CheckCircle2 className="ml-2 h-4 w-4 text-blue-500" />
                                  )}
                                </div>
                                {client && (
                                  <p className="text-xs text-gray-500">
                                    {client.firstName} {client.lastName}
                                  </p>
                                )}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data*</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: it })
                              ) : (
                                <span>Seleziona una data</span>
                              )}
                              <i className="ri-calendar-line ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
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
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ora*</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durata (minuti)*</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value))}
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
                    <FormLabel>Luogo</FormLabel>
                    <FormControl>
                      <Input placeholder="Indirizzo o nome del luogo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Dettagli dell'appuntamento" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="notification" className="space-y-4 py-4">
            <div className="flex flex-col space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h3 className="text-base font-medium">Notifica dell'appuntamento</h3>
                    <p className="text-sm text-gray-500">
                      Invia una notifica al cliente selezionato per informarlo dell'appuntamento
                    </p>

                    <FormField
                      control={form.control}
                      name="sendNotification"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Invia notifica
                            </FormLabel>
                            <FormDescription>
                              Notifica il cliente dell'appuntamento
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!clientId} // Disabilita se non c'è un cliente
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {sendNotification && (
                      <FormField
                        control={form.control}
                        name="notificationType"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Tipo di notifica</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="email" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Email
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="whatsapp" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    WhatsApp
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {clientId && sendNotification && (
                <div className="rounded-lg border p-4 bg-blue-50/50">
                  <h3 className="text-sm font-medium mb-2">Anteprima Notifica</h3>
                  <p className="text-xs text-gray-600 mb-4">
                    Ecco come apparirà la notifica al cliente
                  </p>

                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <h4 className="text-base font-medium mb-2">
                      {form.getValues("title") || "Nuovo appuntamento"}
                    </h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        <span>
                          {format(form.getValues("date"), "d MMMM yyyy", { locale: it })} alle {form.getValues("time")}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                        <span>
                          {form.getValues("location") || "Luogo da confermare"}
                        </span>
                      </div>
                      {form.getValues("description") && (
                        <p className="mt-2 italic">
                          "{form.getValues("description")}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!clientId && sendNotification && (
                <div className="rounded-lg border p-4 bg-yellow-50/50">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 text-yellow-500" />
                    <div>
                      <h3 className="text-sm font-medium mb-1">Nessun cliente selezionato</h3>
                      <p className="text-xs text-gray-600">
                        Per inviare una notifica, devi prima selezionare un cliente nella scheda Dettagli.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
          >
            Annulla
          </Button>
          <Button 
            type="submit" 
            disabled={createEventMutation.isPending}
          >
            {createEventMutation.isPending ? "Creazione..." : "Crea Appuntamento"}
          </Button>
        </div>
      </form>
    </Form>
  );
}