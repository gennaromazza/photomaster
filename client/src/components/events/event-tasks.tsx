import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Task } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { getDaysLeftText } from "@/lib/utils";
import { Plus, ClipboardList } from "lucide-react";

interface EventTasksProps {
  eventId: number;
}

const EventTasks = ({ eventId }: EventTasksProps) => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  
  // Recupera le task dell'evento
  const { 
    data: tasks = [], 
    isLoading,
    refetch
  } = useQuery<Task[]>({
    queryKey: ["/api/tasks/event", eventId],
    queryFn: () => {
      return fetch(`/api/tasks/event/${eventId}`).then(res => {
        if (!res.ok) throw new Error("Errore nel caricamento delle attività");
        return res.json();
      });
    }
  });
  
  // Mutation per completare/annullare una task
  const toggleTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest("PUT", `/api/tasks/${taskId}/toggle`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/uncompleted"] });
      
      toast({
        title: "Task aggiornato",
        description: "Lo stato del task è stato aggiornato con successo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const handleToggleTask = (taskId: number) => {
    toggleTaskMutation.mutate(taskId);
  };
  
  const createNewTask = () => {
    // Naviga alla pagina di creazione di un nuovo task 
    // con l'eventId preimpostato come parametro di query
    navigate(`/tasks/new?eventId=${eventId}`);
  };
  
  // Se sta caricando, mostra loader
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // Se non ci sono task
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="text-4xl text-gray-300 mb-2">
          <ClipboardList className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Nessuna attività</h3>
        <p className="text-gray-500 mb-4">
          Non ci sono attività associate a questo evento
        </p>
        <Button 
          variant="outline"
          onClick={createNewTask}
        >
          <Plus className="h-4 w-4 mr-2" />
          Crea nuova attività
        </Button>
      </div>
    );
  }
  
  // Altrimenti, mostra la lista delle task
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium">Attività</h3>
        <Button 
          size="sm"
          onClick={createNewTask}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuova Attività
        </Button>
      </div>
      
      <div className="space-y-3">
        {tasks.map((task) => (
          <div 
            key={task.id} 
            className={`p-4 border rounded-lg ${task.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-primary hover:shadow-sm'} transition-all`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <Checkbox 
                  checked={task.completed}
                  onCheckedChange={() => handleToggleTask(task.id)}
                />
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className={`font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {task.title}
                  </h3>
                  <div className="flex items-center">
                    <Badge variant={
                      task.priority === "high" ? "red" : 
                      task.priority === "medium" ? "amber" : "blue"
                    } className="mr-2">
                      {task.priority === "high" ? "Alta" : 
                       task.priority === "medium" ? "Media" : "Bassa"}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2"
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <i className="ri-more-2-fill"></i>
                    </Button>
                  </div>
                </div>
                {task.description && (
                  <p className={`mt-1 text-sm ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                    {task.description}
                  </p>
                )}
                {task.dueDate && (
                  <div className="flex items-center text-xs text-gray-500 mt-2">
                    <i className="ri-time-line mr-1"></i>
                    <span>Scadenza: {new Date(task.dueDate).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventTasks;