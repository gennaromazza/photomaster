import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, getDaysLeftText } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Task, Event } from "@shared/schema";

const TasksPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });
  
  const toggleTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest("PUT", `/api/tasks/${taskId}/toggle`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task aggiornato",
        description: "Lo stato del task è stato aggiornato con successo.",
      });
    }
  });
  
  const handleToggleTask = (taskId: number) => {
    toggleTaskMutation.mutate(taskId);
  };
  
  const getEventTitle = (eventId: number | null) => {
    if (!eventId) return null;
    const event = events.find(e => e.id === eventId);
    return event ? event.title : null;
  };
  
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || 
                        (statusFilter === "completed" && task.completed) ||
                        (statusFilter === "pending" && !task.completed);
    
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });
  
  const priorityOptions = [
    { value: "all", label: "Tutte le priorità" },
    { value: "high", label: "Alta" },
    { value: "medium", label: "Media" },
    { value: "low", label: "Bassa" },
  ];
  
  const statusOptions = [
    { value: "all", label: "Tutti gli stati" },
    { value: "pending", label: "Da completare" },
    { value: "completed", label: "Completati" },
  ];
  
  return (
    <div className="lg:px-8 px-4 mt-6 lg:mt-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-gray-900">Task</h1>
          <p className="mt-1 text-gray-500">Gestisci le attività da completare</p>
        </div>
        <div className="mt-4 lg:mt-0 flex space-x-3">
          <Link href="/tasks/new">
            <Button className="inline-flex items-center">
              <i className="ri-add-line mr-2"></i>
              Nuovo Task
            </Button>
          </Link>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Tutti i Task</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Cerca task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            
            <div className="flex gap-4">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32 sm:w-40">
                  <SelectValue placeholder="Priorità" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 sm:w-40">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-pulse text-gray-500">Caricamento task...</div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-4xl text-gray-300 mb-2">
                <i className="ri-task-line"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nessun task trovato</h3>
              {searchQuery || statusFilter !== "all" || priorityFilter !== "all" ? (
                <p className="text-gray-500">Prova a modificare i filtri di ricerca</p>
              ) : (
                <div className="mt-3">
                  <Link href="/tasks/new">
                    <Button variant="outline">
                      <i className="ri-add-line mr-2"></i>
                      Aggiungi il primo task
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const eventTitle = getEventTitle(task.eventId);
                
                return (
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
                            <Link href={`/tasks/${task.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                <i className="ri-more-2-fill"></i>
                              </Button>
                            </Link>
                          </div>
                        </div>
                        {task.description && (
                          <p className={`mt-1 text-sm ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                            {task.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {task.dueDate && (
                            <div className="flex items-center text-xs text-gray-500">
                              <i className="ri-time-line mr-1"></i>
                              <span>Scadenza: {getDaysLeftText(task.dueDate)}</span>
                            </div>
                          )}
                          {eventTitle && (
                            <div className="flex items-center text-xs text-gray-500">
                              <i className="ri-calendar-line mr-1"></i>
                              <span>Evento: {eventTitle}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TasksPage;
