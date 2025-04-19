import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GalleryForm } from "@/components/galleries/gallery-form";
import type { GalleryFormValues } from "@/types/gallery";

export default function NewGalleryPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query per ottenere gli eventi disponibili
  const { data: events = [] } = useQuery({
    queryKey: ["/api/events"],
  });

  const handleSubmit = async (data: GalleryFormValues) => {
    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("name", data.name);
      if (data.description) formData.append("description", data.description);
      formData.append("isPublic", String(data.isPublic));

      if (data.isPasswordProtected && data.password) {
        formData.append("password", data.password);
      }

      if (data.eventId) {
        formData.append("eventId", String(data.eventId));
      }

      // Ottieni il token CSRF
      const csrfResponse = await fetch('/api/csrf-token');
      const csrfData = await csrfResponse.json();

      const response = await fetch("/api/gallery/galleries", {
        method: "POST",
        headers: {
          'X-CSRF-Token': csrfData.csrfToken
        },
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("Errore durante la creazione della galleria");
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
        description: "Si è verificato un errore durante la creazione della galleria",
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