import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Plus, Video, Trash2, Eye, Edit2, Star } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { GalleryVideo } from '@/types/gallery';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import VideoPlayer from './video-player';
import GalleryVideoForm from './gallery-video-form';

interface GalleryVideoManagerProps {
  galleryId: number;
}

const GalleryVideoManager: React.FC<GalleryVideoManagerProps> = ({ galleryId }) => {
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<GalleryVideo | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const { toast } = useToast();

  // Query per caricare i video della galleria
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/gallery/galleries/${galleryId}/video`],
    queryFn: async () => {
      const response = await fetch(`/api/gallery/galleries/${galleryId}/video`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei video');
      }
      return await response.json();
    }
  });

  // Handler per impostare un video come in evidenza
  const handleSetFeatured = async (videoId: number) => {
    try {
      const response = await apiRequest(
        'PATCH',
        `/api/gallery/galleries/${galleryId}/videos/${videoId}/featured`
      );
      
      if (response.ok) {
        toast({
          title: 'Video impostato come in evidenza',
          description: 'Il video è stato impostato come video in evidenza della galleria.',
        });
        
        // Invalida la query per ricaricare i dati
        queryClient.invalidateQueries({
          queryKey: [`/api/gallery/galleries/${galleryId}/video`],
        });
      } else {
        throw new Error('Errore nell\'impostare il video come in evidenza');
      }
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante l\'impostazione del video come in evidenza.',
        variant: 'destructive',
      });
    }
  };

  // Handler per eliminare un video
  const handleDeleteVideo = async (videoId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo video?')) {
      return;
    }

    try {
      const response = await apiRequest(
        'DELETE',
        `/api/gallery/galleries/${galleryId}/video/${videoId}`
      );
      
      if (response.ok) {
        toast({
          title: 'Video eliminato',
          description: 'Il video è stato eliminato con successo.',
        });
        
        // Invalida la query per ricaricare i dati
        queryClient.invalidateQueries({
          queryKey: [`/api/gallery/galleries/${galleryId}/video`],
        });
      } else {
        throw new Error('Errore nell\'eliminazione del video');
      }
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante l\'eliminazione del video.',
        variant: 'destructive',
      });
    }
  };

  // Render durante il caricamento
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Render in caso di errore
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Errore nel caricamento dei video: {(error as Error).message}
      </div>
    );
  }

  const videos = data?.videos || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Video della galleria</h2>
        <Dialog open={isAddingVideo} onOpenChange={setIsAddingVideo}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi video
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-screen overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Aggiungi nuovo video</DialogTitle>
            </DialogHeader>
            <GalleryVideoForm 
              galleryId={galleryId} 
              onSuccess={() => setIsAddingVideo(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-10 border border-dashed rounded-lg">
          <Video className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-muted-foreground">
            Nessun video in questa galleria. Aggiungi un video per mostrarlo ai tuoi clienti.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video: GalleryVideo) => (
            <Card key={video.id} className={video.isFeatured ? 'border-2 border-primary' : ''}>
              <div 
                className="relative aspect-video overflow-hidden cursor-pointer" 
                onClick={() => {
                  setSelectedVideo(video);
                  setShowPlayer(true);
                }}
              >
                {video.thumbnailUrl ? (
                  <img 
                    src={video.thumbnailUrl} 
                    alt={video.title} 
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <Video className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Eye className="h-10 w-10 text-white" />
                </div>
                {video.isFeatured && (
                  <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                    <Star className="h-4 w-4" />
                  </div>
                )}
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg truncate">{video.title}</CardTitle>
                <CardDescription className="line-clamp-2 min-h-[40px]">
                  {video.description || 'Nessuna descrizione disponibile.'}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-between pt-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleSetFeatured(video.id)}
                  disabled={video.isFeatured}
                >
                  <Star className={`h-4 w-4 mr-2 ${video.isFeatured ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                  {video.isFeatured ? 'In evidenza' : 'Imposta come evidenza'}
                </Button>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVideo(video);
                      setIsEditingVideo(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVideo(video.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog per modificare video */}
      <Dialog 
        open={isEditingVideo} 
        onOpenChange={(open) => {
          setIsEditingVideo(open);
          if (!open) setSelectedVideo(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Modifica video</DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <GalleryVideoForm
              galleryId={galleryId}
              videoToEdit={selectedVideo}
              onSuccess={() => setIsEditingVideo(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Video Player */}
      {selectedVideo && (
        <VideoPlayer 
          video={selectedVideo} 
          isOpen={showPlayer} 
          onClose={() => {
            setShowPlayer(false);
            setSelectedVideo(null);
          }} 
        />
      )}
    </div>
  );
};

export default GalleryVideoManager;