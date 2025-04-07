import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parse, set } from "date-fns";
import { it } from "date-fns/locale";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { insertEventSchema, Client, Collaborator, InsertEvent } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from "@/components/ui/tabs";

// Schema zod esteso per il form
const formSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio"),
  description: z.string().optional(),
  eventType: z.string().min(1, "Il tipo di evento è obbligatorio"),
  clientId: z.number({
    required_error: "Il cliente è obbligatorio",
    invalid_type_error: "Seleziona un cliente",
  }),
  secondClientId: z.number().optional().nullable(),
  categoryId: z.number().optional().nullable(),
  leadSourceId: z.number().optional().nullable(),
  date: z.date({
    required_error: "La data è obbligatoria",
    invalid_type_error: "Data non valida",
  }),
  time: z.string().optional(),
  endDate: z.date().optional().nullable(),
  endTime: z.string().optional(),
  duration: z.number().optional().nullable(),
  location: z.string().optional(),
  status: z.string().default("upcoming"),
  notes: z.string().optional(),
  coverImage: z.string().optional(),
  collaborators: z.array(
    z.object({
      id: z.number(),
      role: z.string(),
      selected: z.boolean().default(false),
    })
  ).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateEventFormProps {
  selectedDate: Date;
  clients: Client[];
  collaborators: Collaborator[];
  onSuccess?: () => void;
}

export function CreateEventForm({ 
  selectedDate, 
  clients, 
  collaborators,
  onSuccess 
}: CreateEventFormProps) {
  const { toast } = useToast();
  
  // Setup del form con valori predefiniti
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      eventType: "wedding",
      date: selectedDate,
      time: "10:00",
      status: "upcoming",
      collaborators: collaborators.map(collaborator => ({
        id: collaborator.id,
        role: collaborator.role,
        selected: false,
      })),
    },
  });
  
  // Mutation per creare un nuovo evento
  const createEventMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Costruisci la data completa con l'ora
      let eventDate = data.date;
      if (data.time) {
        const [hours, minutes] = data.time.split(":").map(Number);
        eventDate = set(data.date, { hours, minutes, seconds: 0 });
      }
      
      let endDate = data.endDate || null;
      if (endDate && data.endTime) {
        const [hours, minutes] = data.endTime.split(":").map(Number);
        endDate = set(endDate, { hours, minutes, seconds: 0 });
      }

      // Estrai i collaboratori selezionati
      const selectedCollaborators = data.collaborators?.filter(c => c.selected) || [];
      
      // Costruisci i dati da inviare all'API
      const eventData: Partial<InsertEvent> & { collaborators?: { id: number, role: string }[] } = {
        title: data.title,
        description: data.description,
        eventType: data.eventType,
        clientId: data.clientId,
        secondClientId: data.secondClientId,
        categoryId: data.categoryId,
        leadSourceId: data.leadSourceId,
        date: eventDate,
        endDate: endDate || undefined,
        duration: data.duration,
        location: data.location,
        status: data.status,
        notes: data.notes,
        coverImage: data.coverImage,
        collaborators: selectedCollaborators.map(c => ({ id: c.id, role: c.role })),
      };
      
      const res = await apiRequest("POST", "/api/events", eventData);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Errore durante la creazione dell'evento");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Evento creato",
        description: "L'evento è stato creato con successo",
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
  
  const eventTypes = [
    { value: "wedding", label: "Matrimonio" },
    { value: "portrait", label: "Ritratto" },
    { value: "fashion", label: "Moda" },
    { value: "event", label: "Evento" },
    { value: "other", label: "Altro" },
  ];
  
  const statusTypes = [
    { value: "upcoming", label: "Prossimo" },
    { value: "in-progress", label: "In Corso" },
    { value: "completed", label: "Completato" },
    { value: "cancelled", label: "Annullato" },
  ];
  
  return (
    <Tabs defaultValue="details">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="details">Dettagli Evento</TabsTrigger>
        <TabsTrigger value="collaborators">Collaboratori</TabsTrigger>
      </TabsList>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <TabsContent value="details" className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titolo Evento*</FormLabel>
                    <FormControl>
                      <Input placeholder="Matrimonio Bianchi" {...field} />
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
                    <FormLabel>Tipo di Evento*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente*</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
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
                name="secondClientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondo Cliente</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un cliente (opzionale)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Nessuno</SelectItem>
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
              
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <FormLabel>Ora</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data Fine (opzionale)</FormLabel>
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
                            selected={field.value || undefined}
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
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ora Fine (opzionale)</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
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
                      <Input placeholder="Indirizzo dell'evento" {...field} />
                    </FormControl>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona lo stato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusTypes.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
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
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Dettagli dell'evento..."
                        className="min-h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="collaborators">
            <div className="py-4">
              <h3 className="text-sm font-medium mb-3">Seleziona i collaboratori da assegnare a questo evento:</h3>
              
              <div className="space-y-2 mb-4">
                <ScrollArea className="h-60 rounded-md border p-4">
                  {collaborators.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      Nessun collaboratore disponibile
                    </div>
                  ) : (
                    collaborators.map((collaborator, index) => (
                      <Card key={collaborator.id} className="p-3 mb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FormField
                              control={form.control}
                              name={`collaborators.${index}.selected`}
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div>
                                    <div className="font-medium">
                                      {collaborator.firstName} {collaborator.lastName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {collaborator.role}
                                    </div>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={form.control}
                            name={`collaborators.${index}.role`}
                            render={({ field }) => (
                              <FormItem className="flex-1 max-w-[180px]">
                                <FormControl>
                                  <Input 
                                    placeholder="Ruolo per questo evento" 
                                    {...field} 
                                    disabled={!form.watch(`collaborators.${index}.selected`)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </Card>
                    ))
                  )}
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button type="button" variant="outline" onClick={onSuccess}>
              Annulla
            </Button>
            <Button 
              type="submit" 
              disabled={createEventMutation.isPending}
            >
              {createEventMutation.isPending ? (
                <span className="flex items-center">
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                  Creazione...
                </span>
              ) : "Crea Evento"}
            </Button>
          </div>
        </form>
      </Form>
    </Tabs>
  );
}