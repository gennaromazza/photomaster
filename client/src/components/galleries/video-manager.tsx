import React, { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Film, Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import VideoList from "./video-list";
import VideoForm from "./video-form";
import VideoPlayer from "./video-player";
import { GalleryVideo, GalleryChapter } from "@/types/gallery";
import LoadingSpinner from "../ui/loading-spinner";

interface VideoManagerProps {
  galleryId: number;
}

const VideoManager: React.FC<VideoManagerProps> = ({ galleryId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [isAddVideoOpen, setIsAddVideoOpen] = useState(false);
  const [videoToEdit, setVideoToEdit] = useState<GalleryVideo | undefined>(undefined);
  const [videoToPlay, setVideoToPlay] = useState<GalleryVideo | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(0);

  // Query per ottenere i capitoli
  const { data: chapters, isLoading: isLoadingChapters } = useQuery({
    queryKey: ["/api/gallery/galleries", galleryId, "chapters"],
    queryFn: async () => {
      const response = await fetch(`/api/gallery/galleries/${galleryId}/chapters`);
      if (!response.ok) throw new Error("Errore nel caricamento dei capitoli");
      return await response.json() as GalleryChapter[];
    },
  });

  // Query per ottenere i video
  const { data: videos, isLoading: isLoadingVideos, error: videosError } = useQuery({
    queryKey: ["/api/gallery/galleries", galleryId, "videos", { chapterId: selectedChapter }],
    queryFn: async () => {
      const url = new URL(`/api/gallery/galleries/${galleryId}/videos`, window.location.origin);
      
      if (selectedChapter !== null) {
        url.searchParams.append("chapterId", selectedChapter.toString());
      }
      
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Errore nel caricamento dei video");
      const data = await response.json();
      return data.videos as GalleryVideo[];
    },
  });

  // Mutation per eliminare un video
  const deleteMutation = useMutation({
    mutationFn: async (videoId: number) => {
      const response = await fetch(`/api/gallery/galleries/${galleryId}/videos/${videoId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore nell'eliminazione del video");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Video eliminato",
        description: "Il video è stato eliminato con successo",
      });
      
      // Invalida la query per aggiornare l'elenco dei video
      queryClient.invalidateQueries({
        queryKey: ["/api/gallery/galleries", galleryId, "videos"],
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante l'eliminazione",
        variant: "destructive",
      });
    },
  });

  // Handler per l'eliminazione di un video
  const handleDeleteVideo = (videoId: number) => {
    if (confirm("Sei sicuro di voler eliminare questo video?")) {
      deleteMutation.mutate(videoId);
    }
  };

  // Handler per la riproduzione di un video
  const handlePlayVideo = (video: GalleryVideo) => {
    setVideoToPlay(video);
    
    // Trova l'indice del video corrente nell'array
    if (videos) {
      const index = videos.findIndex(v => v.id === video.id);
      if (index !== -1) {
        setCurrentVideoIndex(index);
      }
    }
  };

  // Handler per passare al video precedente
  const handlePreviousVideo = () => {
    if (!videos || videos.length === 0) return;
    
    const newIndex = (currentVideoIndex - 1 + videos.length) % videos.length;
    setCurrentVideoIndex(newIndex);
    setVideoToPlay(videos[newIndex]);
  };

  // Handler per passare al video successivo
  const handleNextVideo = () => {
    if (!videos || videos.length === 0) return;
    
    const newIndex = (currentVideoIndex + 1) % videos.length;
    setCurrentVideoIndex(newIndex);
    setVideoToPlay(videos[newIndex]);
  };

  // Rendering
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Video della galleria</h2>
          <p className="text-muted-foreground">
            Gestisci tutti i video nella tua galleria
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries({
              queryKey: ["/api/gallery/galleries", galleryId, "videos"],
            })}
            disabled={isLoadingVideos}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingVideos ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
          <Button onClick={() => setIsAddVideoOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi Video
          </Button>
        </div>
      </div>

      <Separator />

      {isLoadingChapters ? (
        <LoadingSpinner message="Caricamento capitoli..." />
      ) : chapters && chapters.length > 0 ? (
        <Tabs 
          defaultValue="all" 
          value={selectedChapter === null ? "all" : selectedChapter.toString()}
          onValueChange={(value) => setSelectedChapter(value === "all" ? null : Number(value))}
          className="space-y-4"
        >
          <div className="flex justify-between items-center">
            <TabsList className="h-auto p-1 flex-wrap">
              <TabsTrigger value="all" className="h-9 px-4">
                Tutti i video
              </TabsTrigger>
              {chapters.map((chapter) => (
                <TabsTrigger 
                  key={chapter.id} 
                  value={chapter.id.toString()} 
                  className="h-9 px-4"
                >
                  {chapter.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="all" className="space-y-4">
            <VideoList
              galleryId={galleryId}
              onEdit={setVideoToEdit}
              onDelete={handleDeleteVideo}
              onSelect={handlePlayVideo}
            />
          </TabsContent>

          {chapters.map((chapter) => (
            <TabsContent key={chapter.id} value={chapter.id.toString()} className="space-y-4">
              <div className="mb-4">
                <h3 className="text-xl font-semibold">{chapter.title}</h3>
                {chapter.description && (
                  <p className="text-muted-foreground">{chapter.description}</p>
                )}
              </div>
              <VideoList
                galleryId={galleryId}
                chapterId={chapter.id}
                onEdit={setVideoToEdit}
                onDelete={handleDeleteVideo}
                onSelect={handlePlayVideo}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="space-y-4">
          {chapters && chapters.length === 0 ? (
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Nessun capitolo</AlertTitle>
              <AlertDescription>
                Non sono presenti capitoli in questa galleria. I video saranno mostrati nella galleria principale.
              </AlertDescription>
            </Alert>
          ) : null}
          
          <VideoList
            galleryId={galleryId}
            onEdit={setVideoToEdit}
            onDelete={handleDeleteVideo}
            onSelect={handlePlayVideo}
          />
        </div>
      )}

      {/* Dialog per aggiungere/modificare video */}
      <VideoForm
        galleryId={galleryId}
        isOpen={isAddVideoOpen || !!videoToEdit}
        onClose={() => {
          setIsAddVideoOpen(false);
          setVideoToEdit(undefined);
        }}
        videoToEdit={videoToEdit}
      />

      {/* Player video */}
      <VideoPlayer
        video={videoToPlay}
        isOpen={!!videoToPlay}
        onClose={() => setVideoToPlay(null)}
        onPrevious={handlePreviousVideo}
        onNext={handleNextVideo}
        hasPreviousVideo={!!videos && videos.length > 1}
        hasNextVideo={!!videos && videos.length > 1}
      />
    </div>
  );
};

export default VideoManager;