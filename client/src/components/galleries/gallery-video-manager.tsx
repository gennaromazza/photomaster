import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Film, Pencil, Plus, Trash2, Play, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { GalleryVideo } from "@/types/gallery";
import GalleryVideoForm from "./gallery-video-form";
import VideoPlayer from "./video-player";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

interface GalleryVideoManagerProps {
  galleryId: number;
}

const GalleryVideoManager: React.FC<GalleryVideoManagerProps> = ({ galleryId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  // Query per ottenere il video della galleria
  const { 
    data: video, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: [`/api/gallery/galleries/${galleryId}/video`],
    queryFn: async () => {
      const response = await fetch(`/api/gallery/galleries/${galleryId}/video`);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Nessun video trovato, non è un errore
        }
        throw new Error("Errore nel caricamento del video");
      }
      return await response.json() as GalleryVideo;
    }
  });

  // Mutation per eliminare il video
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "DELETE", 
        `/api/gallery/galleries/${galleryId}/video`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore durante l'eliminazione del video");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Video eliminato",
        description: "Il video è stato rimosso dalla galleria con successo",
      });
      
      // Invalida le query per aggiornare i dati
      queryClient.invalidateQueries({
        queryKey: [`/api/gallery/galleries/${galleryId}/video`],
      });
      
      queryClient.invalidateQueries({
        queryKey: [`/api/gallery/galleries/${galleryId}`],
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'eliminazione del video",
        variant: "destructive",
      });
    },
  });

  // Handler per l'eliminazione del video
  const handleDeleteVideo = () => {
    deleteMutation.mutate();
  };

  // Rendering del tipo di video
  const renderVideoTypeBadge = (type: string) => {
    switch (type) {
      case "youtube":
        return "YouTube";
      case "vimeo":
        return "Vimeo";
      case "url":
        return "URL diretto";
      case "embed":
        return "Codice embed";
      default:
        return type;
    }
  };

  // Anteprima del video
  const renderVideoPreview = () => {
    if (!video) return null;

    let thumbnailUrl = video.thumbnailUrl || "";
    
    // Se non c'è una thumbnail, usa un'immagine di default in base al tipo
    if (!thumbnailUrl) {
      if (video.videoType === "youtube" && video.videoId) {
        thumbnailUrl = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
      } else if (video.videoType === "vimeo" && video.videoId) {
        // Vimeo non ha un'API diretta per le thumbnail, quindi usiamo un'immagine generica
        thumbnailUrl = ""; // Qui potresti usare un'immagine default per Vimeo
      }
    }

    return (
      <div className="relative bg-black rounded-md overflow-hidden" style={{ aspectRatio: "16/9" }}>
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={video.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Film className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Button 
            variant="outline"
            size="lg"
            className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 hover:text-white"
            onClick={() => setShowPlayer(true)}
          >
            <Play className="mr-2 h-5 w-5" />
            Guarda
          </Button>
        </div>
      </div>
    );
  };

  // Contenuto principale
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }

    if (isError) {
      return (
        <div className="text-center py-12">
          <Film className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Errore</h3>
          <p className="mt-2 text-muted-foreground">
            Si è verificato un errore durante il caricamento del video.
            <br />
            <Button 
              variant="link" 
              onClick={() => queryClient.invalidateQueries({
                queryKey: [`/api/gallery/galleries/${galleryId}/video`],
              })}
            >
              Riprova
            </Button>
          </p>
        </div>
      );
    }

    if (!video) {
      return (
        <div className="text-center py-12">
          <Film className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Nessun video</h3>
          <p className="mt-2 text-muted-foreground">
            Non è stato ancora aggiunto alcun video a questa galleria.
          </p>
          <Button 
            variant="default" 
            className="mt-4"
            onClick={() => setShowForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi video
          </Button>
        </div>
      );
    }

    // Video trovato, mostriamo i dettagli
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-semibold">{video.title}</h3>
            {video.description && (
              <p className="text-muted-foreground mt-1">{video.description}</p>
            )}
            <div className="mt-2">
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                {renderVideoTypeBadge(video.videoType)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPlayer(true)}
            >
              <Play className="h-4 w-4 mr-2" />
              Guarda
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Modifica
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Vuoi davvero eliminare questo video?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Questa azione non può essere annullata. Il video verrà rimosso definitivamente dalla galleria.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteVideo}>
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        
        <Separator />
        
        {/* Anteprima del video */}
        {renderVideoPreview()}
        
        {/* Informazioni aggiuntive */}
        {video.videoType === "youtube" && video.videoId && (
          <div className="text-sm text-muted-foreground">
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 h-auto" 
              onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, "_blank")}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Visualizza su YouTube
            </Button>
          </div>
        )}
        
        {video.videoType === "vimeo" && video.videoId && (
          <div className="text-sm text-muted-foreground">
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 h-auto" 
              onClick={() => window.open(`https://vimeo.com/${video.videoId}`, "_blank")}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Visualizza su Vimeo
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-xl">
          <Film className="h-5 w-5 mr-2" />
          Video della galleria
        </CardTitle>
        <CardDescription>
          Gestisci il video promozionale da mostrare nella parte superiore della galleria
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {renderContent()}
      </CardContent>
      
      {/* Form per aggiungere/modificare il video */}
      <GalleryVideoForm
        galleryId={galleryId}
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        existingVideo={video || undefined}
      />
      
      {/* Player video */}
      {video && (
        <VideoPlayer
          video={video}
          isOpen={showPlayer}
          onClose={() => setShowPlayer(false)}
        />
      )}
    </Card>
  );
};

export default GalleryVideoManager;