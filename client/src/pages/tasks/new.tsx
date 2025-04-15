import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getQueryParams } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertTaskSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Event } from "@shared/schema";

// Estendo lo schema per validazione
const newTaskSchema = insertTaskSchema.extend({
  dueDate: z.date().nullable().optional(),
});

type NewTaskFormValues = z.infer<typeof newTaskSchema>;

const NewTaskPage = () => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  
  // Recupera gli eventi per la selezione
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });
  
  // Ottieni eventId dai parametri di query, se presente
  const params = getQueryParams();
  const eventIdFromQuery = params.eventId ? parseInt(params.eventId) : undefined;
  
  // Trova l'evento corrispondente per mostrare info aggiuntive
  const selectedEvent = eventIdFromQuery && events 
    ? events.find(e => e.id === eventIdFromQuery) 
    : undefined;
  
  const form = useForm<NewTaskFormValues>({
    resolver: zodResolver(newTaskSchema),
    defaultValues: {
      title: "",
      description: selectedEvent ? `Attività per evento: ${selectedEvent.title}` : "",
      dueDate: selectedEvent?.date ? new Date(selectedEvent.date) : null,
      eventId: eventIdFromQuery,
      status: "pending",
      completed: false,
      priority: "medium",
    },
  });
  
  const createTask = useMutation({
    mutationFn: async (data: NewTaskFormValues) => {
      // Formatta i dati per l'API
      const payload = {
        ...data,
        // Converti la data se presente
        dueDate: data.dueDate ? data.dueDate.toISOString() : null,
      };
      
      const response = await apiRequest("POST", "/api/tasks", payload);
      return response.json();
    },
    onSuccess: (data) => {
      // Invalida le query per aggiornare i dati
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/uncompleted"] });
      
      // Se la task è stata creata da un evento, invalida anche quella query
      if (eventIdFromQuery) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks/event", eventIdFromQuery] });
      }
      
      toast({
        title: "Task creato",
        description: "Il task è stato creato con successo",
      });
      
      // Torna alla pagina appropriata in base alla provenienza
      if (eventIdFromQuery) {
        navigate(`/events/${eventIdFromQuery}`);
      } else {
        navigate("/tasks");
      }
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: NewTaskFormValues) => {
    createTask.mutate(data);
  };
  
  return (
    <div className="lg:px-8 px-4 mt-6 lg:mt-8">
      <div className="flex items-center mb-8">
        <Button 
          variant="ghost" 
          className="mr-4 p-0 hover:bg-transparent"
          onClick={() => eventIdFromQuery ? navigate(`/events/${eventIdFromQuery}`) : navigate("/tasks")}
        >
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-gray-900">Nuovo Task</h1>
          <p className="mt-1 text-gray-500">
            {eventIdFromQuery && selectedEvent 
              ? `Crea una nuova attività per l'evento "${selectedEvent.title}"` 
              : "Crea una nuova attività da completare"}
          </p>
        </div>
      </div>
      
      <Card className="mb-8 max-w-3xl">
        <CardHeader className="pb-3">
          <CardTitle>Dettagli Task</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titolo</FormLabel>
                    <FormControl>
                      <Input placeholder="Inserisci il titolo del task" {...field} />
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
                        placeholder="Descrivi l'attività da completare"
                        className="min-h-[100px]"
                        value={field.value || ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data di scadenza</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : null;
                            field.onChange(date);
                          }}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priorità</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona la priorità" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="medium">Media</SelectItem>
                          <SelectItem value="low">Bassa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="eventId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evento associato</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                      value={field.value?.toString() || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un evento (opzionale)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nessun evento</SelectItem>
                        {events.map((event) => (
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
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => eventIdFromQuery ? navigate(`/events/${eventIdFromQuery}`) : navigate("/tasks")}
                >
                  Annulla
                </Button>
                <Button 
                  type="submit"
                  disabled={createTask.isPending}
                >
                  {createTask.isPending ? "Salvataggio..." : "Salva Task"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewTaskPage;