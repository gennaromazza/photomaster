import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChapterForm } from "@/components/galleries/chapter-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InsertGalleryChapter } from "@/types/gallery";

export default function NewChapterPage() {
  const [, params] = useRoute("/galleries/:id/chapters/new");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const galleryId = params?.id ? parseInt(params.id) : 0;
  
  const createChapterMutation = useMutation({
    mutationFn: async (data: InsertGalleryChapter) => {
      return await apiRequest("POST", "/api/gallery/chapters", data);
    },
    onSuccess: () => {
      // Invalida la query dei capitoli per aggiornare l'elenco
      queryClient.invalidateQueries({ 
        queryKey: [`/api/gallery/galleries/${galleryId}/chapters`] 
      });
      
      toast({
        title: "Capitolo creato",
        description: "Il nuovo capitolo è stato creato con successo",
      });
      
      // Torna alla pagina della galleria
      setLocation(`/galleries/${galleryId}`);
    },
    onError: (error: any) => {
      console.error("Errore nella creazione del capitolo:", error);
      
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la creazione del capitolo",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });
  
  const handleSubmit = (data: any) => {
    setIsSubmitting(true);
    
    // Assicurati che galleryId sia incluso nei dati del capitolo
    const chapterData = {
      ...data,
      galleryId,
      isPublic: true,
      slug: "", // Lo slug verrà generato dal server
    };
    
    createChapterMutation.mutate(chapterData);
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
          <CardTitle className="text-2xl">Crea nuovo capitolo</CardTitle>
        </CardHeader>
        
        <CardContent>
          <ChapterForm 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting}
          />
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
              disabled={isSubmitting} 
              onClick={() => {
                // Trova il pulsante nascosto nel form e fai clic su di esso
                const submitButton = document.querySelector<HTMLButtonElement>("form button[type='submit']");
                if (submitButton) {
                  submitButton.click();
                }
              }}
            >
              {isSubmitting ? (
                <>Creazione in corso...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salva capitolo
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}