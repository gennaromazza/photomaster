import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getDaysLeftText } from "@/lib/utils";
import { Task } from "@shared/schema";

const TaskSection = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/uncompleted"],
  });
  
  const toggleTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest("PUT", `/api/tasks/${taskId}/toggle`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/uncompleted"] });
      toast({
        title: "Task completato",
        description: "Il task è stato contrassegnato come completato.",
        duration: 3000,
      });
    }
  });
  
  const handleToggleTask = (taskId: number) => {
    toggleTaskMutation.mutate(taskId);
  };
  
  return (
    <Card className="overflow-hidden mb-8">
      <CardHeader className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display font-medium">Task da Completare</CardTitle>
          <Link href="/tasks/new">
            <Button variant="ghost" size="icon" className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500">
              <i className="ri-add-line"></i>
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-pulse text-gray-500">Caricamento task...</div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex justify-center p-4">
              <p className="text-gray-500">Nessun task da completare</p>
            </div>
          ) : (
            tasks.slice(0, 4).map((task) => (
              <div 
                key={task.id} 
                className="p-3 bg-gray-50 rounded-md"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <Checkbox 
                      checked={task.completed}
                      onCheckedChange={() => handleToggleTask(task.id)}
                    />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className={`text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {task.title}
                    </p>
                    {task.dueDate && (
                      <div className="flex items-center mt-1">
                        <i className="ri-timer-line text-xs text-gray-400 mr-1.5"></i>
                        <span className="text-xs text-gray-500">
                          Scadenza: {getDaysLeftText(task.dueDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {tasks.length > 4 && (
            <Link href="/tasks">
              <Button variant="ghost" className="w-full text-sm text-primary hover:text-primary-dark mt-2">
                Vedi tutti i task ({tasks.length})
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskSection;
