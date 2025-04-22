import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { GalleryVideo } from "@/types/gallery";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Schema per la validazione del form
const videoFormSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio"),
  description: z.string().optional(),
  videoType: z.enum(["youtube", "vimeo", "url", "embed"]),
  videoId: z.string().optional(),
  videoUrl: z.string().optional(),
  embedCode: z.string().optional(),
  thumbnailUrl: z.string().optional(),
}).refine(data => {
  // Verifica che i campi appropriati siano compilati in base al tipo di video
  if (data.videoType === "youtube" || data.videoType === "vimeo") {
    return !!data.videoId;
  } else if (data.videoType === "url") {
    return !!data.videoUrl;
  } else if (data.videoType === "embed") {
    return !!data.embedCode;
  }
  return false;
}, {
  message: "Inserisci le informazioni richieste per il tipo di video selezionato",
  path: ["videoType"],
});

type VideoFormValues = z.infer<typeof videoFormSchema>;

interface GalleryVideoFormProps {
  galleryId: number;
  isOpen: boolean;
  onClose: () => void;
  existingVideo?: GalleryVideo | null;
}

const GalleryVideoForm: React.FC<GalleryVideoFormProps> = ({
  galleryId,
  isOpen,
  onClose,
  existingVideo
}) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Inizializza il form con i valori predefiniti o esistenti
  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: {
      title: existingVideo?.title || "",
      description: existingVideo?.description || "",
      videoType: (existingVideo?.videoType as any) || "youtube",
      videoId: existingVideo?.videoId || "",
      videoUrl: existingVideo?.videoUrl || "",
      embedCode: existingVideo?.embedCode || "",
      thumbnailUrl: existingVideo?.thumbnailUrl || ""
    }
  });
  
  // Resetta il form quando cambiano i dati esistenti o si apre/chiude il modal
  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: existingVideo?.title || "",
        description: existingVideo?.description || "",
        videoType: (existingVideo?.videoType as any) || "youtube",
        videoId: existingVideo?.videoId || "",
        videoUrl: existingVideo?.videoUrl || "",
        embedCode: existingVideo?.embedCode || "",
        thumbnailUrl: existingVideo?.thumbnailUrl || ""
      });
    }
  }, [existingVideo, isOpen, form]);
  
  // Mutation per salvare il video
  const saveVideoMutation = useMutation({
    mutationFn: async (formData: VideoFormValues) => {
      // Determina se è un aggiornamento o una creazione
      const isUpdate = !!existingVideo;
      const method = isUpdate ? "PUT" : "POST";
      
      // Invia la richiesta API
      const response = await apiRequest(
        method, 
        `/api/gallery/galleries/${galleryId}/video`, 
        formData
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore durante il salvataggio del video: ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Mostra messaggio di successo
      toast({
        title: existingVideo ? "Video aggiornato" : "Video aggiunto",
        description: existingVideo 
          ? "Il video è stato aggiornato con successo."
          : "Il video è stato aggiunto con successo alla galleria.",
      });
      
      // Invalida la query per ricaricare i dati
      queryClient.invalidateQueries({ queryKey: [`/api/gallery/galleries/${galleryId}/video`] });
      
      // Chiudi il form
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante il salvataggio del video",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });
  
  // Gestisce l'invio del form
  const onSubmit = (data: VideoFormValues) => {
    setIsSubmitting(true);
    saveVideoMutation.mutate(data);
  };
  
  // Ottiene il tipo di video corrente
  const currentVideoType = form.watch("videoType");
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{existingVideo ? "Modifica video" : "Aggiungi un nuovo video"}</DialogTitle>
          <DialogDescription>
            {existingVideo 
              ? "Modifica le informazioni del video trailer."
              : "Aggiungi un nuovo video trailer alla galleria."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo di video */}
            <FormField
              control={form.control}
              name="videoType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo di video</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona il tipo di video" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="vimeo">Vimeo</SelectItem>
                      <SelectItem value="url">URL diretto</SelectItem>
                      <SelectItem value="embed">Codice embed personalizzato</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Seleziona la fonte del video trailer.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Titolo del video */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titolo</FormLabel>
                  <FormControl>
                    <Input placeholder="Inserisci il titolo del video" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Descrizione del video */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Inserisci una breve descrizione del video" 
                      {...field} 
                      disabled={isSubmitting}
                      rows={3} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Campi specifici per tipo di video */}
            {currentVideoType === "youtube" && (
              <FormField
                control={form.control}
                name="videoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID YouTube</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. dQw4w9WgXcQ" 
                        {...field} 
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Inserisci l'ID del video YouTube (parte finale dell'URL dopo v=).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {currentVideoType === "vimeo" && (
              <FormField
                control={form.control}
                name="videoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Vimeo</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. 123456789" 
                        {...field} 
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Inserisci l'ID numerico del video Vimeo.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {currentVideoType === "url" && (
              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL del video</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/video.mp4" 
                        {...field} 
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Inserisci l'URL diretto al file video (mp4, webm, etc.).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {currentVideoType === "embed" && (
              <FormField
                control={form.control}
                name="embedCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice embed</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="<iframe src='...'></iframe>" 
                        {...field} 
                        disabled={isSubmitting}
                        rows={4}
                      />
                    </FormControl>
                    <FormDescription>
                      Inserisci il codice HTML di incorporamento del video.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Thumbnail URL */}
            <FormField
              control={form.control}
              name="thumbnailUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL anteprima (opzionale)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://example.com/thumbnail.jpg" 
                      {...field} 
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Inserisci l'URL di un'immagine di anteprima personalizzata.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button variant="outline" disabled={isSubmitting}>
                  Annulla
                </Button>
              </DialogClose>
              
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvataggio...
                  </>
                ) : existingVideo ? (
                  "Aggiorna video"
                ) : (
                  "Aggiungi video"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default GalleryVideoForm;