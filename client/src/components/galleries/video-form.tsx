import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GalleryVideo, GalleryChapter } from "@/types/gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Image as ImageIcon, Youtube, Video, Upload, Code, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Schema di validazione per il form
const videoFormSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio"),
  description: z.string().optional(),
  videoType: z.enum(["youtube", "vimeo", "url", "embed"]),
  videoId: z.string().optional(),
  videoUrl: z.string().optional(),
  embedCode: z.string().optional(),
  chapterId: z.union([z.string(), z.number(), z.null()]).optional(),
  isFeatured: z.boolean().default(false),
  isHidden: z.boolean().default(false),
});

type VideoFormData = z.infer<typeof videoFormSchema>;

interface VideoFormProps {
  galleryId: number;
  isOpen: boolean;
  onClose: () => void;
  videoToEdit?: GalleryVideo;
}

const VideoForm: React.FC<VideoFormProps> = ({
  galleryId,
  isOpen,
  onClose,
  videoToEdit,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    videoToEdit?.thumbnailPath || videoToEdit?.thumbnailUrl || null
  );
  
  // Query per ottenere i capitoli della galleria
  const { data: chapters } = useQuery({
    queryKey: ["/api/gallery/galleries", galleryId, "chapters"],
    queryFn: async () => {
      const response = await fetch(`/api/gallery/galleries/${galleryId}/chapters`);
      if (!response.ok) throw new Error("Errore nel caricamento dei capitoli");
      const data = await response.json();
      return data as GalleryChapter[];
    },
    enabled: isOpen, // Esegui solo quando il dialog è aperto
  });

  // Form setup
  const form = useForm<VideoFormData>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: {
      title: videoToEdit?.title || "",
      description: videoToEdit?.description || "",
      videoType: videoToEdit?.videoType || "youtube",
      videoId: videoToEdit?.videoId || "",
      videoUrl: videoToEdit?.videoUrl || "",
      embedCode: videoToEdit?.embedCode || "",
      chapterId: videoToEdit?.chapterId || null,
      isFeatured: videoToEdit?.isFeatured || false,
      isHidden: videoToEdit?.isHidden || false,
    },
  });

  // Reset form quando cambia il video da modificare
  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: videoToEdit?.title || "",
        description: videoToEdit?.description || "",
        videoType: videoToEdit?.videoType || "youtube",
        videoId: videoToEdit?.videoId || "",
        videoUrl: videoToEdit?.videoUrl || "",
        embedCode: videoToEdit?.embedCode || "",
        chapterId: videoToEdit?.chapterId || null,
        isFeatured: videoToEdit?.isFeatured || false,
        isHidden: videoToEdit?.isHidden || false,
      });
      
      setThumbnailPreview(
        videoToEdit?.thumbnailPath || videoToEdit?.thumbnailUrl || null
      );
      setThumbnailFile(null);
    }
  }, [videoToEdit, isOpen, form]);

  // Gestione del caricamento della thumbnail
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Mutation per l'aggiunta o l'aggiornamento del video
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const url = videoToEdit
        ? `/api/gallery/galleries/${galleryId}/videos/${videoToEdit.id}`
        : `/api/gallery/galleries/${galleryId}/videos`;
      
      const method = videoToEdit ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        body: data,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore nella gestione del video");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalida la query per aggiornare l'elenco dei video
      queryClient.invalidateQueries({
        queryKey: ["/api/gallery/galleries", galleryId, "videos"],
      });
      
      toast({
        title: videoToEdit ? "Video aggiornato" : "Video aggiunto",
        description: videoToEdit
          ? "Il video è stato aggiornato con successo"
          : "Il video è stato aggiunto alla galleria",
      });
      
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante l'operazione",
        variant: "destructive",
      });
    },
  });

  // Handler per l'invio del form
  const onSubmit = (values: VideoFormData) => {
    const formData = new FormData();
    
    // Aggiungi i campi del form al FormData
    formData.append("title", values.title);
    formData.append("videoType", values.videoType);
    formData.append("isFeatured", String(values.isFeatured));
    formData.append("isHidden", String(values.isHidden));
    
    // Aggiungi i campi opzionali solo se sono presenti
    if (values.description) formData.append("description", values.description);
    if (values.videoId) formData.append("videoId", values.videoId);
    if (values.videoUrl) formData.append("videoUrl", values.videoUrl);
    if (values.embedCode) formData.append("embedCode", values.embedCode);
    if (values.chapterId) formData.append("chapterId", String(values.chapterId));
    
    // Aggiungi la thumbnail se è stata caricata
    if (thumbnailFile) {
      formData.append("thumbnail", thumbnailFile);
    }
    
    // Invia i dati
    mutation.mutate(formData);
  };

  // Helper per mostrare i campi corretti in base al tipo di video
  const renderVideoTypeFields = () => {
    const videoType = form.watch("videoType");
    
    switch (videoType) {
      case "youtube":
        return (
          <FormField
            control={form.control}
            name="videoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID Video YouTube</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Es. dQw4w9WgXcQ"
                  />
                </FormControl>
                <FormDescription>
                  L'ID è la parte finale dell'URL, dopo v= (es. youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case "vimeo":
        return (
          <FormField
            control={form.control}
            name="videoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID Video Vimeo</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Es. 123456789"
                  />
                </FormControl>
                <FormDescription>
                  L'ID è il numero nell'URL (es. vimeo.com/<strong>123456789</strong>)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case "url":
        return (
          <FormField
            control={form.control}
            name="videoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL del video</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="https://..."
                  />
                </FormControl>
                <FormDescription>
                  URL diretto al file video (mp4, webm, ecc.)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case "embed":
        return (
          <FormField
            control={form.control}
            name="embedCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Codice di embed</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="<iframe src=...>"
                    rows={4}
                  />
                </FormControl>
                <FormDescription>
                  Incolla qui il codice HTML di incorporamento fornito dalla piattaforma
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{videoToEdit ? "Modifica video" : "Aggiungi video"}</DialogTitle>
          <DialogDescription>
            {videoToEdit
              ? "Modifica i dettagli del video esistente"
              : "Aggiungi un nuovo video alla galleria"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Titolo */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titolo</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Titolo del video" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrizione */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Breve descrizione del video..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona il tipo di video" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="youtube">
                        <div className="flex items-center">
                          <Youtube className="h-4 w-4 mr-2 text-red-600" />
                          YouTube
                        </div>
                      </SelectItem>
                      <SelectItem value="vimeo">
                        <div className="flex items-center">
                          <Video className="h-4 w-4 mr-2 text-blue-400" />
                          Vimeo
                        </div>
                      </SelectItem>
                      <SelectItem value="url">
                        <div className="flex items-center">
                          <Link2 className="h-4 w-4 mr-2 text-green-500" />
                          URL diretto
                        </div>
                      </SelectItem>
                      <SelectItem value="embed">
                        <div className="flex items-center">
                          <Code className="h-4 w-4 mr-2 text-purple-500" />
                          Codice embed
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campi specifici per tipo di video */}
            {renderVideoTypeFields()}

            {/* Capitolo */}
            <FormField
              control={form.control}
              name="chapterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capitolo (opzionale)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "null" ? null : Number(value))}
                    value={field.value === null ? "null" : String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un capitolo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="null">Nessun capitolo</SelectItem>
                      {chapters?.map((chapter) => (
                        <SelectItem key={chapter.id} value={String(chapter.id)}>
                          {chapter.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Associa il video a un capitolo specifico della galleria
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Thumbnail */}
            <div className="space-y-2">
              <Label>Thumbnail (opzionale)</Label>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {thumbnailPreview ? (
                  <div className="relative group">
                    <img
                      src={thumbnailPreview}
                      alt="Anteprima thumbnail"
                      className="w-40 h-24 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white rounded-full"
                      onClick={() => {
                        setThumbnailPreview(null);
                        setThumbnailFile(null);
                      }}
                    >
                      &times;
                    </Button>
                  </div>
                ) : (
                  <div className="w-40 h-24 flex items-center justify-center border-2 border-dashed rounded-md">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="mb-2"
                  />
                  <p className="text-sm text-muted-foreground">
                    Carica un'immagine di anteprima per il video. Per YouTube e Vimeo, se non carichi un'immagine, verrà utilizzata quella predefinita.
                  </p>
                </div>
              </div>
            </div>

            {/* Opzioni avanzate */}
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-0.5">
                      <FormLabel>Video in evidenza</FormLabel>
                      <FormDescription>
                        Mostra questo video nella sezione in evidenza
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
                  <FormItem className="flex flex-row items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-0.5">
                      <FormLabel>Nascondi video</FormLabel>
                      <FormDescription>
                        Non mostrare questo video nella galleria pubblica
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
              >
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {videoToEdit ? "Aggiorna" : "Aggiungi"} Video
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default VideoForm;