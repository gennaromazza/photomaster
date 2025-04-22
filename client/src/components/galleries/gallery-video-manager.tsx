import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, PlaySquare, FileVideo, Trash2, Edit, Plus, Video } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { GalleryVideo } from "@/types/gallery";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import LoadingSpinner from "@/components/ui/loading-spinner";
import GalleryVideoForm from "./gallery-video-form";

interface GalleryVideoManagerProps {
  galleryId: number;
}

const GalleryVideoManager: React.FC<GalleryVideoManagerProps> = ({ galleryId }) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<GalleryVideo | null>(null);

  // Query per ottenere i video della galleria
  const { data: video, isLoading, isError } = useQuery({
    queryKey: [`/api/gallery/galleries/${galleryId}/video`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/gallery/galleries/${galleryId}/video`);
        if (response.status === 404) {
          // Nessun video trovato, ma non è un errore
          return null;
        }
        if (!response.ok) {
          throw new Error("Errore nel caricamento del video");
        }
        return await response.json() as GalleryVideo;
      } catch (error) {
        console.error("Errore nel caricamento dei video:", error);
        throw error;
      }
    }
  });

  // Mutation per eliminare un video
  const deleteVideoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/gallery/galleries/${galleryId}/video`);
      if (!response.ok) {
        throw new Error("Errore nell'eliminazione del video");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Video eliminato",
        description: "Il video è stato eliminato con successo.",
      });
      // Aggiorna i dati dopo l'eliminazione
      queryClient.invalidateQueries({ queryKey: [`/api/gallery/galleries/${galleryId}/video`] });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'eliminazione del video",
        variant: "destructive",
      });
    },
  });

  // Handler per l'eliminazione di un video
  const handleDeleteVideo = () => {
    if (confirm("Sei sicuro di voler eliminare questo video?")) {
      deleteVideoMutation.mutate();
    }
  };

  // Handler per l'apertura della form di modifica
  const handleEditVideo = (video: GalleryVideo) => {
    setEditingVideo(video);
    setIsModalOpen(true);
  };

  // Handler per l'apertura della form di creazione
  const handleAddVideo = () => {
    setEditingVideo(null);
    setIsModalOpen(true);
  };

  // Handler per la chiusura della form
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVideo(null);
  };

  // Funzione per determinare il tipo di video in italiano
  const getVideoTypeName = (type: string) => {
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

  // Render dello stato di caricamento
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner size="lg" message="Caricamento video..." />
      </div>
    );
  }

  // Render dello stato di errore
  if (isError) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Errore</AlertTitle>
        <AlertDescription>
          Si è verificato un errore durante il caricamento dei video.
          Ricarica la pagina o contatta l'amministratore.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header della sezione */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-1">Video Trailer</h2>
          <p className="text-muted-foreground">
            Gestisci il video trailer della galleria che sarà mostrato in cima alla pagina pubblica.
          </p>
        </div>
        
        <Button onClick={handleAddVideo} className="gap-2">
          <Plus className="h-4 w-4" />
          {video ? "Aggiorna Video" : "Aggiungi Video"}
        </Button>
      </div>
      
      <Separator />
      
      {/* Contenuto principale */}
      {!video ? (
        <Card>
          <CardHeader>
            <CardTitle>Nessun video disponibile</CardTitle>
            <CardDescription>
              Aggiungi un video per mostrare un trailer nella galleria.
              Il video sarà visualizzato in formato banner nella parte superiore della galleria condivisa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/50 rounded-lg border border-dashed border-muted-foreground/50">
              <FileVideo className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nessun video trailer</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Aggiungi un video YouTube, Vimeo o carica un file video per creare un trailer accattivante per la tua galleria.
              </p>
              <Button onClick={handleAddVideo} className="gap-2">
                <Plus className="h-4 w-4" />
                Aggiungi Video
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{video.title || "Video Trailer"}</CardTitle>
                <CardDescription>
                  {video.description || "Nessuna descrizione disponibile"}
                </CardDescription>
              </div>
              <Badge className="ml-2">{getVideoTypeName(video.videoType)}</Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {/* Anteprima video */}
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {video.thumbnailPath ? (
                  <div className="relative h-full">
                    <img 
                      src={video.thumbnailPath} 
                      alt={video.title || "Anteprima video"} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <PlaySquare className="h-16 w-16 text-white/90" />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center bg-primary/10">
                    <Video className="h-16 w-16 text-primary/50" />
                  </div>
                )}
              </div>
              
              {/* Dettagli video */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Tipo di video</h4>
                  <p className="text-sm text-muted-foreground">
                    {getVideoTypeName(video.videoType)}
                    {video.videoType === "youtube" && video.videoId && (
                      <> (ID: {video.videoId})</>
                    )}
                    {video.videoType === "vimeo" && video.videoId && (
                      <> (ID: {video.videoId})</>
                    )}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Aggiunto</h4>
                  <p className="text-sm text-muted-foreground">
                    {video.addedAt && formatDistanceToNow(new Date(video.addedAt), { addSuffix: true, locale: it })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="justify-between border-t pt-4">
            <Button variant="outline" onClick={() => handleEditVideo(video)}>
              <Edit className="h-4 w-4 mr-2" />
              Modifica
            </Button>
            
            <Button variant="destructive" onClick={handleDeleteVideo}>
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Modal per l'aggiunta/modifica */}
      <GalleryVideoForm
        galleryId={galleryId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        existingVideo={editingVideo}
      />
    </div>
  );
};

export default GalleryVideoManager;