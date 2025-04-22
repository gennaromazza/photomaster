import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { GalleryVideo } from "@/types/gallery";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Film, Plus, Trash2, Edit, Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import { toast } from "@/hooks/use-toast";
import GalleryVideoForm from "./gallery-video-form";
import VideoPlayer from "./video-player";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GalleryVideoManagerProps {
  galleryId: number;
}

const GalleryVideoManager: React.FC<GalleryVideoManagerProps> = ({ galleryId }) => {
  const queryClient = useQueryClient();
  const [isVideoFormOpen, setIsVideoFormOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<GalleryVideo | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  
  // Query per ottenere i video della galleria
  const { data: videos, isLoading, isError } = useQuery({
    queryKey: [`/api/gallery/galleries/${galleryId}/video`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/gallery/galleries/${galleryId}/video`);
        if (!response.ok) {
          throw new Error("Errore nel caricamento del video");
        }
        return await response.json() as GalleryVideo[];
      } catch (error) {
        console.error("Errore nel caricamento dei video:", error);
        throw error;
      }
    }
  });
  
  // Mutation per eliminare un video
  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/gallery/galleries/${galleryId}/video/${videoId}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore durante l'eliminazione del video: ${errorText}`);
      }
      
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Video eliminato",
        description: "Il video è stato eliminato con successo dalla galleria."
      });
      
      // Invalida la query per ricaricare i dati
      queryClient.invalidateQueries({ queryKey: [`/api/gallery/galleries/${galleryId}/video`] });
      
      // Chiudi il dialog di conferma
      setShowDeleteConfirm(false);
      setSelectedVideo(null);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'eliminazione del video",
        variant: "destructive",
      });
    }
  });
  
  // Handler per l'apertura del form di creazione nuovo video
  const handleAddVideo = () => {
    setSelectedVideo(null);
    setIsVideoFormOpen(true);
  };
  
  // Handler per l'apertura del form di modifica di un video esistente
  const handleEditVideo = (video: GalleryVideo) => {
    setSelectedVideo(video);
    setIsVideoFormOpen(true);
  };
  
  // Handler per l'apertura del dialogo di conferma eliminazione
  const handleDeleteClick = (video: GalleryVideo) => {
    setSelectedVideo(video);
    setShowDeleteConfirm(true);
  };
  
  // Handler per la conferma dell'eliminazione
  const handleConfirmDelete = () => {
    if (selectedVideo) {
      deleteVideoMutation.mutate(selectedVideo.id);
    }
  };
  
  // Funzione per ottenere una miniatura basata sul tipo di video
  const getVideoThumbnail = (video: GalleryVideo): string => {
    if (video.thumbnailPath) return video.thumbnailPath;
    if (video.thumbnailUrl) return video.thumbnailUrl;
    
    if (video.videoType === "youtube" && video.videoId) {
      return `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`;
    }
    
    // Fallback per altri tipi di video
    return "/assets/video-placeholder.jpg";
  };
  
  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-xl">
            <Film className="h-5 w-5 mr-2" />
            Video della galleria
          </CardTitle>
          <CardDescription>
            Gestisci i video trailer della galleria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<AlertTriangle className="h-10 w-10 text-destructive" />}
            title="Errore nel caricamento dei video"
            description="Si è verificato un errore durante il caricamento dei video. Riprova più tardi."
            action={
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/gallery/galleries/${galleryId}/video`] })}
              >
                Riprova
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="flex items-center text-xl">
                <Film className="h-5 w-5 mr-2" />
                Video Trailer
              </CardTitle>
              <CardDescription>
                Aggiungi e gestisci video trailer per la tua galleria
              </CardDescription>
            </div>
            
            <Button onClick={handleAddVideo} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Video
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[200px] w-full rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ) : !videos || videos.length === 0 ? (
            <EmptyState
              icon={<Film className="h-10 w-10" />}
              title="Nessun video"
              description="Non ci sono ancora video trailer per questa galleria. Aggiungi un video per migliorare l'esperienza visiva."
              action={
                <Button onClick={handleAddVideo}>
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Video
                </Button>
              }
            />
          ) : (
            <div className="space-y-6">
              {videos.map((video) => (
                <div 
                  key={video.id}
                  className="group rounded-lg border bg-card text-card-foreground overflow-hidden transition-all hover:shadow-md"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Thumbnail del video */}
                    <div className="relative aspect-video overflow-hidden bg-muted cursor-pointer" onClick={() => {
                      setSelectedVideo(video);
                      setShowPlayer(true);
                    }}>
                      <img 
                        src={getVideoThumbnail(video)}
                        alt={`Thumbnail di ${video.title}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="rounded-full bg-white/80 p-3">
                          <Play className="h-8 w-8 text-black" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Informazioni sul video */}
                    <div className="p-4 md:col-span-2 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{video.title}</h3>
                        {video.description && (
                          <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
                            {video.description}
                          </p>
                        )}
                        <div className="flex items-center text-xs text-muted-foreground mb-3">
                          <span className="capitalize px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {video.videoType}
                          </span>
                          {video.isFeatured && (
                            <span className="ml-2 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500">
                              In evidenza
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedVideo(video);
                            setShowPlayer(true);
                          }}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Guarda
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditVideo(video)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Modifica
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(video)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Elimina
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Form per l'aggiunta/modifica dei video */}
      <GalleryVideoForm
        galleryId={galleryId}
        isOpen={isVideoFormOpen}
        onClose={() => setIsVideoFormOpen(false)}
        existingVideo={selectedVideo}
      />
      
      {/* Dialogo per la conferma di eliminazione */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di voler eliminare questo video?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. Il video "{selectedVideo?.title}" verrà rimosso permanentemente dalla galleria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteVideoMutation.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={deleteVideoMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteVideoMutation.isPending ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  Eliminazione...
                </>
              ) : (
                "Elimina"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Player per la visualizzazione del video */}
      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          isOpen={showPlayer}
          onClose={() => setShowPlayer(false)}
        />
      )}
    </>
  );
};

export default GalleryVideoManager;