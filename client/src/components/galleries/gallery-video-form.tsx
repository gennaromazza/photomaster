import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { GalleryVideo } from '@/types/gallery';

// Schema di validazione per il form
const formSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio"),
  description: z.string().optional(),
  videoUrl: z.string().min(1, "L'URL del video è obbligatorio"),
  videoType: z.enum(["youtube", "vimeo", "direct"]),
  thumbnailUrl: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isFeatured: z.boolean().optional(),
});

interface GalleryVideoFormProps {
  galleryId: number;
  videoToEdit?: GalleryVideo | null;
  onSuccess: () => void;
}

const GalleryVideoForm: React.FC<GalleryVideoFormProps> = ({ 
  galleryId, 
  videoToEdit = null, 
  onSuccess 
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inizializza il form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: videoToEdit?.title || '',
      description: videoToEdit?.description || '',
      videoUrl: videoToEdit?.videoUrl || '',
      videoType: (videoToEdit?.videoType as "youtube" | "vimeo" | "direct") || 'youtube',
      thumbnailUrl: videoToEdit?.thumbnailUrl || '',
      sortOrder: videoToEdit?.sortOrder || 0,
      isFeatured: videoToEdit?.isFeatured || false,
    },
  });

  // Gestione dell'invio del form
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      // Determina automaticamente il tipo di video se non specificato
      if (!data.videoType) {
        if (data.videoUrl.includes('youtube.com') || data.videoUrl.includes('youtu.be')) {
          data.videoType = 'youtube';
        } else if (data.videoUrl.includes('vimeo.com')) {
          data.videoType = 'vimeo';
        } else {
          data.videoType = 'direct';
        }
      }
      
      // Genera automaticamente una miniatura per YouTube se non specificata
      if (!data.thumbnailUrl && data.videoType === 'youtube') {
        let videoId = '';
        
        if (data.videoUrl.includes('youtube.com/watch')) {
          const url = new URL(data.videoUrl);
          videoId = url.searchParams.get('v') || '';
        } else if (data.videoUrl.includes('youtu.be')) {
          const parts = data.videoUrl.split('/');
          videoId = parts[parts.length - 1].split('?')[0];
        }
        
        if (videoId) {
          // Usa la miniatura in alta qualità di YouTube
          data.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
      }
      
      // Genera automaticamente una miniatura per Vimeo se non specificata
      if (!data.thumbnailUrl && data.videoType === 'vimeo') {
        const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/;
        const match = data.videoUrl.match(vimeoRegex);
        const videoId = match?.[1] || '';
        
        if (videoId) {
          try {
            // Nota: questo è solo un esempio e potrebbe richiedere l'API Vimeo
            // Per un'implementazione completa, si dovrebbe utilizzare l'API Vimeo
            // Ma per semplicità, utilizziamo un pattern comune per le miniature Vimeo
            data.thumbnailUrl = `https://vumbnail.com/${videoId}.jpg`;
          } catch (error) {
            console.error('Errore nel generare la miniatura Vimeo:', error);
          }
        }
      }
      
      let response;
      
      if (videoToEdit) {
        // Aggiornamento di un video esistente
        response = await apiRequest(
          'PATCH',
          `/api/gallery/galleries/${galleryId}/video/${videoToEdit.id}`,
          data
        );
      } else {
        // Creazione di un nuovo video
        response = await apiRequest(
          'POST',
          `/api/gallery/galleries/${galleryId}/video`,
          {
            ...data,
            galleryId,
          }
        );
      }
      
      if (response.ok) {
        toast({
          title: videoToEdit ? 'Video aggiornato' : 'Video aggiunto',
          description: videoToEdit 
            ? 'Il video è stato aggiornato con successo'
            : 'Il video è stato aggiunto alla galleria',
        });
        
        // Invalida la query per ricaricare i dati
        queryClient.invalidateQueries({
          queryKey: [`/api/gallery/galleries/${galleryId}/video`],
        });
        
        onSuccess();
      } else {
        throw new Error('Errore nella richiesta');
      }
    } catch (error) {
      console.error('Errore nell\'invio del form:', error);
      toast({
        title: 'Errore',
        description: `Si è verificato un errore durante il ${videoToEdit ? 'aggiornamento' : 'caricamento'} del video.`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funzione per rilevare automaticamente il tipo di video dall'URL
  const autoDetectVideoType = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      form.setValue('videoType', 'youtube');
    } else if (url.includes('vimeo.com')) {
      form.setValue('videoType', 'vimeo');
    } else if (url.match(/\.(mp4|webm|ogg)$/i)) {
      form.setValue('videoType', 'direct');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titolo</FormLabel>
              <FormControl>
                <Input placeholder="Inserisci il titolo del video" {...field} />
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
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="videoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL del video</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://www.youtube.com/watch?v=..." 
                    {...field} 
                    onChange={(e) => {
                      field.onChange(e);
                      autoDetectVideoType(e.target.value);
                    }}
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
                    <SelectItem value="direct">URL Diretto (MP4, WebM)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="thumbnailUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL anteprima (thumbnail)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://example.com/thumbnail.jpg (opzionale, generato automaticamente per YouTube/Vimeo)" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="sortOrder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ordine di visualizzazione</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="isFeatured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-x-3 space-y-0 rounded-md border p-4 mt-8">
                <div className="space-y-1 leading-none">
                  <FormLabel>Video in evidenza</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Mostra questo video nella banner della galleria
                  </p>
                </div>
                <FormControl>
                  <input 
                    type="checkbox" 
                    className="form-checkbox h-5 w-5 text-primary" 
                    checked={field.value || false}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Annulla
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <LoadingSpinner className="mr-2" size="xs" />
                {videoToEdit ? 'Aggiornamento...' : 'Caricamento...'}
              </>
            ) : (
              videoToEdit ? 'Aggiorna video' : 'Aggiungi video'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default GalleryVideoForm;