import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChapterForm } from "@/components/galleries/chapter-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditChapterPage() {
  const [, params] = useRoute("/galleries/:id/chapters/:chapterId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const galleryId = params?.id ? parseInt(params.id) : 0;
  const chapterId = params?.chapterId ? parseInt(params.chapterId) : 0;
  
  // Ottieni i dettagli del capitolo
  const { data: chapter, isLoading } = useQuery({
    queryKey: [`/api/gallery/chapters/${chapterId}`],
    enabled: !!chapterId,
  });
  
  const updateChapterMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PUT", `/api/gallery/chapters/${chapterId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/gallery/galleries/${galleryId}/chapters`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/gallery/chapters/${chapterId}`] 
      });
      
      toast({
        title: "Capitolo aggiornato",
        description: "Il capitolo è stato aggiornato con successo",
      });
      
      setLocation(`/galleries/${galleryId}`);
    },
    onError: (error: any) => {
      console.error("Errore nell'aggiornamento del capitolo:", error);
      
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento del capitolo",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });
  
  const handleSubmit = (data: any) => {
    setIsSubmitting(true);
    updateChapterMutation.mutate(data);
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setLocation(`/galleries/${galleryId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla galleria
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">
            {isLoading ? <Skeleton className="h-8 w-1/3" /> : `Modifica capitolo: ${chapter?.title}`}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <ChapterForm 
              onSubmit={handleSubmit} 
              isSubmitting={isSubmitting}
              defaultValues={chapter}
            />
          )}
        </CardContent>
        
        <CardFooter className="border-t px-6 py-4">
          <div className="flex justify-between w-full">
            <Button 
              variant="outline" 
              onClick={() => setLocation(`/galleries/${galleryId}`)}
            >
              Annulla
            </Button>
            
            <Button 
              disabled={isLoading || isSubmitting} 
              onClick={() => {
                const submitButton = document.querySelector<HTMLButtonElement>("form button[type='submit']");
                if (submitButton) {
                  submitButton.click();
                }
              }}
            >
              {isSubmitting ? (
                <>Aggiornamento in corso...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salva modifiche
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}