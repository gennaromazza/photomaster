import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { GalleryVideo } from "@/types/gallery";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const videoFormSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio"),
  description: z.string().optional(),
  videoType: z.enum(["youtube", "vimeo", "url", "embed"]),
  videoId: z.string().optional(),
  videoUrl: z.string().optional(),
  embedCode: z.string().optional(),
}).refine(data => {
  // Validazioni condizionali in base al tipo di video
  if (data.videoType === "youtube" || data.videoType === "vimeo") {
    return !!data.videoId;
  } else if (data.videoType === "url") {
    return !!data.videoUrl;
  } else if (data.videoType === "embed") {
    return !!data.embedCode;
  }
  return false;
}, {
  message: "Per favore, inserisci le informazioni richieste per il tipo di video selezionato",
  path: ["videoId"],
});

type VideoFormData = z.infer<typeof videoFormSchema>;

interface GalleryVideoFormProps {
  galleryId: number;
  isOpen: boolean;
  onClose: () => void;
  existingVideo?: GalleryVideo;
}

const GalleryVideoForm: React.FC<GalleryVideoFormProps> = ({
  galleryId,
  isOpen,
  onClose,
  existingVideo,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inizializza il form
  const form = useForm<VideoFormData>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: existingVideo ? {
      title: existingVideo.title,
      description: existingVideo.description || "",
      videoType: existingVideo.videoType,
      videoId: existingVideo.videoId || "",
      videoUrl: existingVideo.videoUrl || "",
      embedCode: existingVideo.embedCode || "",
    } : {
      title: "",
      description: "",
      videoType: "youtube",
      videoId: "",
      videoUrl: "",
      embedCode: "",
    },
  });

  // Mutation per salvare il video
  const saveMutation = useMutation({
    mutationFn: async (data: VideoFormData) => {
      const url = existingVideo
        ? `/api/gallery/galleries/${galleryId}/video`
        : `/api/gallery/galleries/${galleryId}/video`;
      
      const method = existingVideo ? "PUT" : "POST";
      
      const response = await apiRequest(method, url, data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore durante il salvataggio del video");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: existingVideo ? "Video aggiornato" : "Video aggiunto",
        description: existingVideo 
          ? "Il video della galleria è stato aggiornato con successo"
          : "Il video è stato aggiunto alla galleria con successo",
      });
      
      // Invalida le query per aggiornare i dati
      queryClient.invalidateQueries({
        queryKey: [`/api/gallery/galleries/${galleryId}/video`],
      });
      
      queryClient.invalidateQueries({
        queryKey: [`/api/gallery/galleries/${galleryId}`],
      });
      
      // Chiudi il form
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante il salvataggio",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Submit handler
  const onSubmit = (data: VideoFormData) => {
    setIsSubmitting(true);
    saveMutation.mutate(data);
  };

  // Rendering condizionale dei campi in base al tipo di video
  const renderVideoTypeFields = () => {
    const videoType = form.watch("videoType");
    
    if (videoType === "youtube" || videoType === "vimeo") {
      return (
        <FormField
          control={form.control}
          name="videoId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {videoType === "youtube" ? "YouTube Video ID" : "Vimeo Video ID"}
              </FormLabel>
              <FormControl>
                <Input placeholder={videoType === "youtube" ? "es. dQw4w9WgXcQ" : "es. 76979871"} {...field} />
              </FormControl>
              <FormDescription>
                {videoType === "youtube" 
                  ? "L'ID del video si trova nell'URL di YouTube dopo 'v='"
                  : "L'ID del video Vimeo si trova nell'URL dopo vimeo.com/"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    } else if (videoType === "url") {
      return (
        <FormField
          control={form.control}
          name="videoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL del video</FormLabel>
              <FormControl>
                <Input placeholder="https://esempio.com/video.mp4" {...field} />
              </FormControl>
              <FormDescription>
                Inserisci l'URL diretto del file video (MP4, WebM, ecc.)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    } else if (videoType === "embed") {
      return (
        <FormField
          control={form.control}
          name="embedCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Codice di incorporamento</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="<iframe src='...'></iframe>" 
                  {...field} 
                  className="min-h-[120px]"
                />
              </FormControl>
              <FormDescription>
                Inserisci il codice di incorporamento HTML fornito dalla piattaforma video
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }
    
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {existingVideo ? "Modifica video della galleria" : "Aggiungi video alla galleria"}
          </DialogTitle>
          <DialogDescription>
            {existingVideo 
              ? "Modifica il video che verrà mostrato nella parte superiore della galleria" 
              : "Aggiungi un video promozionale da mostrare nella parte superiore della galleria"}
          </DialogDescription>
        </DialogHeader>
      
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titolo</FormLabel>
                  <FormControl>
                    <Input placeholder="Inserisci un titolo per il video" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Aggiungi una breve descrizione del video"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="videoType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo di video</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
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
                      <SelectItem value="embed">Codice embed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Seleziona la fonte del video da inserire nella galleria
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {renderVideoTypeFields()}
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Annulla
              </Button>
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