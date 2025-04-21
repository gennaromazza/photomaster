import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getCsrfToken } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { GalleryForm } from "@/components/galleries/gallery-form";
import type { GalleryFormValues } from "@/types/gallery";

export default function NewGalleryPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useAuth();

  // Query per ottenere gli eventi disponibili
  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const handleSubmit = async (data: GalleryFormValues) => {
    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("name", data.name);
      if (data.description) formData.append("description", data.description);
      formData.append("isPublic", String(data.isPublic));
      formData.append("isPasswordProtected", String(data.isPasswordProtected));

      if (data.isPasswordProtected && data.password) {
        formData.append("password", data.password);
      }

      if (data.eventId) {
        formData.append("eventId", String(data.eventId));
      }
      
      // Aggiungi il file dell'immagine di copertina se esiste
      if (data.coverImage) {
        formData.append("coverImage", data.coverImage);
        console.log("Aggiunto file di copertina:", data.coverImage.name);
      }

      console.log("Creazione galleria - dati:", {
        name: data.name,
        isPublic: data.isPublic,
        isPasswordProtected: data.isPasswordProtected,
        hasEventId: !!data.eventId,
        hasCoverImage: !!data.coverImage
      });
      
      // Ottieni il token CSRF prima della richiesta
      const csrfToken = await getCsrfToken();
      console.log("Token CSRF ottenuto:", csrfToken ? "Sì" : "No");
      
      // Prepara gli headers per la richiesta
      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
      
      // Usa il token JWT dall'hook useAuth
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log("Token JWT aggiunto dall'hook useAuth");
      } else {
        console.log("Nessun token JWT disponibile nell'hook useAuth");
      }
      
      // Usa fetch direttamente per maggiore controllo
      console.log("Invio richiesta con headers:", Object.keys(headers));
      const response = await fetch("/api/gallery/galleries", {
        method: "POST",
        headers,
        body: formData,
        credentials: "include", // Importante per inviare i cookie di sessione
      });
      
      console.log("Status risposta:", response.status, response.statusText);
      
      if (!response.ok) {
        let errorMessage = `Errore durante la creazione della galleria (${response.status})`;
        
        try {
          const errorData = await response.json();
          console.error("Dettagli errore:", errorData);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // Se la risposta non è JSON, utilizziamo il testo grezzo
          const errorText = await response.text();
          console.error("Dettagli errore:", errorText);
        }
        
        throw new Error(errorMessage);
      }

      const gallery = await response.json();

      toast({
        title: "Galleria creata",
        description: "La galleria è stata creata con successo",
      });

      setLocation(`/galleries/${gallery.id}`);
    } catch (error) {
      console.error("Errore nella creazione della galleria:", error);
      toast({
        title: "Errore",
        description: error instanceof Error 
          ? error.message 
          : "Si è verificato un errore durante la creazione della galleria",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/galleries")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Nuova Galleria</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crea una nuova galleria</CardTitle>
        </CardHeader>
        <CardContent>
          <GalleryForm
            events={events}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}