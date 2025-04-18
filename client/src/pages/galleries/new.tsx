import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, SaveIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { GalleryForm } from "@/components/galleries/gallery-form";
import { GalleryFormValues } from "@/types/gallery";

export default function NewGalleryPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Query per ottenere gli eventi disponibili
  const { data: events } = useQuery({
    queryKey: ["/api/events"],
    staleTime: 1000 * 60 * 5, // 5 minuti
  });

  const createGalleryMutation = useMutation({
    mutationFn: async (data: GalleryFormValues) => {
      // Filtra i dati prima di inviarli
      const galleryData = {
        name: data.name,
        description: data.description || null,
        eventId: data.eventId || null,
        password: data.isPasswordProtected ? data.password : null,
        isPublic: data.isPublic
      };
      
      const response = await apiRequest("POST", "/api/gallery/galleries", galleryData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Galleria creata",
        description: "La galleria è stata creata con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/galleries"] });
      setLocation(`/galleries/${data.id}/edit`);
    },
    onError: (error) => {
      console.error("Errore nella creazione della galleria:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione della galleria",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: GalleryFormValues) => {
    createGalleryMutation.mutate(data);
  };

  return (
    <div className="container py-6 max-w-3xl mx-auto">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/galleries")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Crea Nuova Galleria</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Galleria</CardTitle>
            <CardDescription>
              Inserisci le informazioni di base per la tua nuova galleria fotografica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GalleryForm 
              events={events} 
              onSubmit={handleSubmit}
              isSubmitting={createGalleryMutation.isPending}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setLocation("/galleries")}>
              Annulla
            </Button>
            <Button 
              type="submit" 
              disabled={createGalleryMutation.isPending}
              onClick={() => document.querySelector('form')?.requestSubmit()}
            >
              {createGalleryMutation.isPending ? (
                <>Creazione in corso...</>
              ) : (
                <>
                  <SaveIcon className="mr-2 h-4 w-4" /> Crea Galleria
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}