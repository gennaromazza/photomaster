import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, ArrowLeft, FileText, LayoutDashboard, Save } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Definisci lo schema per la creazione di un preventivo
const quoteFormSchema = z.object({
  title: z.string()
    .min(3, { message: "Il titolo deve contenere almeno 3 caratteri" })
    .max(100, { message: "Il titolo non può superare i 100 caratteri" }),
  notes: z.string().optional(),
  clientId: z.string().min(1, { message: "Seleziona un cliente" }),
});

// Definisci lo schema per la creazione di un evento
const eventFormSchema = z.object({
  title: z.string()
    .min(3, { message: "Il titolo deve contenere almeno 3 caratteri" })
    .max(100, { message: "Il titolo non può superare i 100 caratteri" }),
  description: z.string().optional(),
  clientId: z.string().min(1, { message: "Seleziona un cliente" }),
  date: z.date({
    required_error: "Seleziona una data per l'evento",
  }),
  eventType: z.string().min(1, { message: "Seleziona un tipo di evento" }),
  location: z.string().optional(),
});

// Tipo per la creazione di un nuovo preventivo 
type QuoteFormValues = z.infer<typeof quoteFormSchema>;

// Tipo per la creazione di un nuovo evento
type EventFormValues = z.infer<typeof eventFormSchema>;

export default function NewJobPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [jobType, setJobType] = useState<"quote" | "event">("quote");
  
  // Ottieni i client per il form
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/clients"],
  });
  
  // Definisci il form per la creazione di un preventivo
  const quoteForm = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      title: "",
      notes: "",
      clientId: "",
    },
  });
  
  // Definisci il form per la creazione di un evento
  const eventForm = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      clientId: "",
      eventType: "",
      location: "",
    },
  });
  
  // Mutation per creare un preventivo
  const createQuoteMutation = useMutation({
    mutationFn: async (values: QuoteFormValues) => {
      const res = await apiRequest("POST", "/api/quotes", {
        ...values,
        clientId: Number(values.clientId),
        status: "draft"
      });
      
      if (!res.ok) {
        throw new Error("Impossibile creare il preventivo");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      
      toast({
        title: "Preventivo creato",
        description: "Il preventivo è stato creato con successo.",
      });
      
      navigate(`/jobs/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation per creare un evento
  const createEventMutation = useMutation({
    mutationFn: async (values: EventFormValues) => {
      const res = await apiRequest("POST", "/api/events", {
        ...values,
        clientId: Number(values.clientId),
        status: "scheduled"
      });
      
      if (!res.ok) {
        throw new Error("Impossibile creare l'evento");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      
      toast({
        title: "Evento creato",
        description: "L'evento è stato creato con successo.",
      });
      
      navigate(`/jobs/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Gestisce l'invio del form per i preventivi
  const onQuoteSubmit = (values: QuoteFormValues) => {
    createQuoteMutation.mutate(values);
  };
  
  // Gestisce l'invio del form per gli eventi
  const onEventSubmit = (values: EventFormValues) => {
    createEventMutation.mutate(values);
  };
  
  // Tipi di evento predefiniti
  const eventTypes = [
    { value: "wedding", label: "Matrimonio" },
    { value: "portrait", label: "Ritratto" },
    { value: "family", label: "Famiglia" },
    { value: "event", label: "Evento generico" },
    { value: "corporate", label: "Corporate" },
    { value: "other", label: "Altro" },
  ];
  
  return (
    <div className="container py-6">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/jobs")} 
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna alla lista
        </Button>
        <h1 className="text-3xl font-bold">Crea Nuovo Lavoro</h1>
        <p className="text-muted-foreground">
          Crea un nuovo preventivo o evento per gestire il tuo lavoro
        </p>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Tipo di Lavoro</CardTitle>
          <CardDescription>
            Scegli il tipo di lavoro che desideri creare
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="quote" 
            value={jobType} 
            onValueChange={(value) => setJobType(value as "quote" | "event")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 md:w-96">
              <TabsTrigger value="quote" className="flex items-center justify-center gap-2">
                <FileText className="h-4 w-4" />
                Preventivo
              </TabsTrigger>
              <TabsTrigger value="event" className="flex items-center justify-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Evento
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>
      
      {isLoadingClients ? (
        <div className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {jobType === "quote" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Nuovo Preventivo
                </CardTitle>
                <CardDescription>
                  Compila i dati per creare un nuovo preventivo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...quoteForm}>
                  <form onSubmit={quoteForm.handleSubmit(onQuoteSubmit)} className="space-y-6">
                    <FormField
                      control={quoteForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titolo</FormLabel>
                          <FormControl>
                            <Input placeholder="Inserisci un titolo per il preventivo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={quoteForm.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cliente</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona un cliente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients.map((client: any) => (
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
                      control={quoteForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Note</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Inserisci eventuali note o dettagli aggiuntivi" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/jobs")}
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
                            Creazione in corso...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Crea Preventivo
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Nuovo Evento
                </CardTitle>
                <CardDescription>
                  Compila i dati per creare un nuovo evento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...eventForm}>
                  <form onSubmit={eventForm.handleSubmit(onEventSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={eventForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Titolo</FormLabel>
                            <FormControl>
                              <Input placeholder="Inserisci un titolo per l'evento" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={eventForm.control}
                        name="eventType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo di Evento</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona il tipo di evento" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {eventTypes.map((type) => (
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
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={eventForm.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cliente</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona un cliente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clients.map((client: any) => (
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
                        control={eventForm.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Data Evento</FormLabel>
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
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date < new Date(new Date().setHours(0, 0, 0, 0))
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={eventForm.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Luogo</FormLabel>
                          <FormControl>
                            <Input placeholder="Inserisci il luogo dell'evento" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={eventForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrizione</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Inserisci una descrizione dell'evento" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/jobs")}
                      >
                        Annulla
                      </Button>
                      <Button 
                        type="submit"
                        disabled={createEventMutation.isPending}
                      >
                        {createEventMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creazione in corso...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Crea Evento
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}