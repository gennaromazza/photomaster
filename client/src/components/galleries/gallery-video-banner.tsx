import React, { useState } from 'react';
import { GalleryVideo } from '@/types/gallery';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VideoPlayer from './video-player';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useQuery } from '@tanstack/react-query';

interface GalleryVideoBannerProps {
  galleryId: number;
}

const GalleryVideoBanner: React.FC<GalleryVideoBannerProps> = ({ galleryId }) => {
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<GalleryVideo | null>(null);
  
  // Query per ottenere i video della galleria
  const { data, isLoading, isError } = useQuery({
    queryKey: [`/api/gallery/galleries/${galleryId}/video`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/gallery/galleries/${galleryId}/video`);
        if (!response.ok) {
          throw new Error("Errore nel caricamento dei video");
        }
        return await response.json();
      } catch (error) {
        console.error("Errore nel caricamento dei video:", error);
        throw error;
      }
    }
  });
  
  // Trova il video in evidenza
  const featuredVideo = data?.videos?.find((video: GalleryVideo) => video.isFeatured);
  
  // Se non c'è un video in evidenza, prende il primo video disponibile
  const mainVideo = featuredVideo || (data?.videos && data.videos.length > 0 ? data.videos[0] : null);
  
  // Funzione per ottenere l'URL o path della thumbnail
  const getThumbnailUrl = (video: GalleryVideo): string => {
    if (video.thumbnailUrl) return video.thumbnailUrl;
    if (video.thumbnailPath) return video.thumbnailPath;
    
    if (video.videoType === "youtube" && video.videoId) {
      return `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`;
    }
    
    return '/assets/video-placeholder.jpg';
  };
  
  // Apre il player video
  const openVideoPlayer = (video: GalleryVideo) => {
    setSelectedVideo(video);
    setIsPlayerOpen(true);
  };
  
  // Se è in caricamento, mostra un loader
  if (isLoading) {
    return (
      <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  // Se c'è un errore, non mostra nulla
  if (isError || !data || !data.videos || data.videos.length === 0) {
    return null;
  }
  
  // Se c'è un video da mostrare
  if (mainVideo) {
    return (
      <>
        <div className="w-full aspect-video relative rounded-lg overflow-hidden group cursor-pointer mb-8 shadow-lg" onClick={() => openVideoPlayer(mainVideo)}>
          {/* Thumbnail */}
          <img 
            src={getThumbnailUrl(mainVideo)} 
            alt={mainVideo.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Overlay scuro */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20 flex flex-col items-center justify-center">
            {/* Pulsante play centrale */}
            <div className="rounded-full bg-white/20 p-5 backdrop-blur-sm transition-all duration-300 group-hover:bg-primary group-hover:scale-110">
              <Play className="h-10 w-10 text-white" />
            </div>
            
            {/* Titolo e descrizione */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <h3 className="text-2xl font-bold mb-2">{mainVideo.title}</h3>
              {mainVideo.description && (
                <p className="text-sm text-white/80 line-clamp-2">{mainVideo.description}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Player Video */}
        {selectedVideo && (
          <VideoPlayer 
            video={selectedVideo} 
            isOpen={isPlayerOpen} 
            onClose={() => setIsPlayerOpen(false)} 
          />
        )}
      </>
    );
  }
  
  // Fallback in caso non ci siano video
  return null;
};

export default GalleryVideoBanner;