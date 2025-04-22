import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GalleryVideo } from "@/types/gallery";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Schema di validazione per il form
const videoFormSchema = z.object({
  galleryId: z.number(),
  title: z.string().min(1, "Il titolo è obbligatorio"),
  description: z.string().optional(),
  videoType: z.enum(["youtube", "vimeo", "url", "embed"], {
    errorMap: () => ({ message: "Tipo di video non valido" })
  }),
  videoId: z.string().optional(),
  videoUrl: z.string().optional(),
  embedCode: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isHidden: z.boolean().default(false),
  // Campi opzionali che verranno ignorati nell'invio al server se non valorizzati
  chapterId: z.number().optional().nullable(),
  sortOrder: z.number().default(0),
}).refine(data => {
  // Validazione condizionale in base al tipo di video
  if (data.videoType === 'youtube' || data.videoType === 'vimeo') {
    return !!data.videoId; // Richiedi videoId per youtube e vimeo
  } else if (data.videoType === 'url') {
    return !!data.videoUrl; // Richiedi videoUrl per URL diretti
  } else if (data.videoType === 'embed') {
    return !!data.embedCode; // Richiedi embedCode per embed personalizzati
  }
  return true;
}, {
  message: "Devi fornire le informazioni richieste per il tipo di video selezionato",
  path: ["videoId"]
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
  const isEditing = !!existingVideo;
  
  // Inizializzazione del form
  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: {
      galleryId,
      title: "",
      description: "",
      videoType: "youtube",
      videoId: "",
      videoUrl: "",
      embedCode: "",
      thumbnailUrl: "",
      isFeatured: false,
      isHidden: false,
      chapterId: null,
      sortOrder: 0,
    },
  });
  
  // Aggiornamento dei valori del form quando si modifica un video esistente
  useEffect(() => {
    if (existingVideo) {
      form.reset({
        galleryId,
        title: existingVideo.title || "",
        description: existingVideo.description || "",
        videoType: existingVideo.videoType as any,
        videoId: existingVideo.videoId || "",
        videoUrl: existingVideo.videoUrl || "",
        embedCode: existingVideo.embedCode || "",
        thumbnailUrl: existingVideo.thumbnailUrl || "",
        isFeatured: existingVideo.isFeatured || false,
        isHidden: existingVideo.isHidden || false,
        chapterId: existingVideo.chapterId || null,
        sortOrder: existingVideo.sortOrder || 0,
      });
    } else {
      form.reset({
        galleryId,
        title: "",
        description: "",
        videoType: "youtube",
        videoId: "",
        videoUrl: "",
        embedCode: "",
        thumbnailUrl: "",
        isFeatured: false,
        isHidden: false,
        chapterId: null,
        sortOrder: 0,
      });
    }
  }, [existingVideo, galleryId, form]);
  
  // Mutation per aggiunta/modifica video
  const videoMutation = useMutation({
    mutationFn: async (data: VideoFormValues) => {
      // Endpoint e metodo differenti per creazione vs modifica
      const endpoint = isEditing
        ? `/api/gallery/galleries/${galleryId}/video/${existingVideo?.id}`
        : `/api/gallery/galleries/${galleryId}/video`;
      
      const method = isEditing ? "PATCH" : "POST";
      
      const response = await apiRequest(method, endpoint, data);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore durante il salvataggio del video: ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Notifica di successo
      toast({
        title: isEditing ? "Video aggiornato" : "Video aggiunto",
        description: isEditing
          ? "Il video è stato aggiornato con successo"
          : "Il video è stato aggiunto alla galleria con successo",
      });
      
      // Invalida la query per ricaricare i dati
      queryClient.invalidateQueries({ queryKey: [`/api/gallery/galleries/${galleryId}/video`] });
      
      // Chiudi il form e resetta lo stato
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante il salvataggio del video",
        variant: "destructive",
      });
    }
  });
  
  // Handler per la submission del form
  const onSubmit = (values: VideoFormValues) => {
    videoMutation.mutate(values);
  };
  
  // Determina quali campi mostrare in base al tipo di video selezionato
  const videoType = form.watch("videoType");
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifica video" : "Aggiungi nuovo video"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica le informazioni del video esistente nella galleria"
              : "Aggiungi un nuovo video trailer alla tua galleria fotografica"
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titolo del video *</FormLabel>
                  <FormControl>
                    <Input placeholder="Inserisci un titolo" {...field} />
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
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Inserisci una descrizione (opzionale)"
                      className="resize-y min-h-[80px]"
                      {...field}
                      value={field.value || ""}
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
                  <FormLabel>Tipo di video *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
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
                    {videoType === "youtube" && "Inserisci solo l'ID del video YouTube (es. dQw4w9WgXcQ, non l'URL completo)"}
                    {videoType === "vimeo" && "Inserisci solo l'ID del video Vimeo (es. 123456789, non l'URL completo)"}
                    {videoType === "url" && "Inserisci l'URL completo di un file video (MP4, WebM, ecc.)"}
                    {videoType === "embed" && "Incolla il codice di incorporamento completo del video"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Campo per YouTube/Vimeo ID */}
            {(videoType === "youtube" || videoType === "vimeo") && (
              <FormField
                control={form.control}
                name="videoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Video *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={videoType === "youtube" ? "Es. dQw4w9WgXcQ" : "Es. 123456789"} 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Campo per URL diretto */}
            {videoType === "url" && (
              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL del video *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/video.mp4" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Campo per codice embed */}
            {videoType === "embed" && (
              <FormField
                control={form.control}
                name="embedCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice di incorporamento *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="<iframe src=..." 
                        className="font-mono text-sm resize-y min-h-[100px]"
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* URL immagine anteprima opzionale */}
            <FormField
              control={form.control}
              name="thumbnailUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL immagine anteprima (opzionale)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://example.com/thumbnail.jpg" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Lascia vuoto per usare l'anteprima predefinita del servizio video
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Opzioni aggiuntive */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Video in evidenza</FormLabel>
                      <FormDescription>
                        Mostra questo video come trailer principale
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isHidden"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Nascondi video</FormLabel>
                      <FormDescription>
                        Il video sarà nascosto nella galleria
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="pt-4">
              <Button variant="outline" type="button" onClick={onClose} disabled={videoMutation.isPending}>
                Annulla
              </Button>
              <Button type="submit" disabled={videoMutation.isPending}>
                {videoMutation.isPending ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    {isEditing ? "Aggiornamento..." : "Salvataggio..."}
                  </>
                ) : (
                  isEditing ? "Aggiorna video" : "Salva video"
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