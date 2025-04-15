import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CheckCircle, Circle, PlusCircle, Tag, Calendar, Clock, AlertCircle } from "lucide-react";

interface EventTasksProps {
  eventId: number;
  className?: string;
}

export default function EventTasks({ eventId, className }: EventTasksProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Definisce l'interfaccia per le attività
  interface Task {
    id: number;
    title: string;
    description?: string;
    dueDate?: string;
    completed: boolean;
    priority?: string;
    estimatedHours?: number;
    assignedTo?: number;
    assignedToName?: string;
    eventId?: number;
  }
  
  // Carica le attività associate all'evento
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { eventId }],
    enabled: !!eventId,
  });

  // Mutazione per modificare lo stato di un'attività
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      
      if (!res.ok) {
        throw new Error("Errore durante l'aggiornamento dell'attività");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Attività aggiornata",
        description: "Lo stato dell'attività è stato modificato con successo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Gestisce il cambiamento dello stato di un'attività
  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    updateTaskMutation.mutate({ id, completed: !currentStatus });
  };

  // Formatta la data
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/D";
    return format(new Date(dateString), "d MMM yyyy", { locale: it });
  };

  // Restituisce il colore della priorità
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "alta":
        return "destructive";
      case "media":
        return "amber"; // Cambio da orange a amber per compatibilità con il sistema di Badge
      case "bassa":
        return "green";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Attività</CardTitle>
          <CardDescription>Caricamento attività in corso...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Attività</CardTitle>
            <CardDescription>Attività associate all'evento</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/tasks/new?eventId=${eventId}`)}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Nuova Attività
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="mb-1">Nessuna attività associata a questo evento</p>
            <p className="text-sm">Crea una nuova attività per iniziare a pianificare</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task: Task) => (
              <div key={task.id} className="border rounded-lg p-4 relative hover:border-primary/50 transition-colors">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleStatus(task.id, task.completed)}
                    className="flex-shrink-0 mt-1"
                  >
                    {task.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 
                        className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                      >
                        {task.title}
                      </h4>
                      {task.priority && (
                        <Badge variant={getPriorityColor(task.priority)}>
                          <Tag className="h-3 w-3 mr-1" />
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                    
                    {task.description && (
                      <p className={`text-sm mb-2 ${task.completed ? 'text-muted-foreground/70 line-through' : 'text-muted-foreground'}`}>
                        {task.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {task.dueDate && (
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>Scadenza: {formatDate(task.dueDate)}</span>
                        </div>
                      )}
                      {task.estimatedHours && (
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>Tempo stimato: {task.estimatedHours} ore</span>
                        </div>
                      )}
                      {task.assignedTo && (
                        <div className="flex items-center">
                          <span>Assegnato a: {task.assignedToName || task.assignedTo}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <Button 
          variant="link" 
          size="sm" 
          className="ml-auto"
          onClick={() => navigate("/tasks")}
        >
          Vedi tutte le attività
        </Button>
      </CardFooter>
    </Card>
  );
}