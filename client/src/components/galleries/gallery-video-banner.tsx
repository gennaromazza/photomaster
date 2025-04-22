import React, { useState } from 'react';
import { Video, Play } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import VideoPlayer from './video-player';
import { GalleryVideo } from '@/types/gallery';

interface GalleryVideoBannerProps {
  galleryId: number;
  galleryName?: string;
  description?: string;
}

const GalleryVideoBanner: React.FC<GalleryVideoBannerProps> = ({ 
  galleryId,
  galleryName,
  description
}) => {
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  
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
  
  // Trova il video in evidenza (featured)
  const featuredVideo = data?.videos?.find((video: GalleryVideo) => video.isFeatured);
  
  // Se non ci sono video o nessun video è impostato come in evidenza, non mostrare il banner
  if (!featuredVideo) return null;
  
  // Funzione per ottenere l'URL della thumbnail
  const getThumbnailUrl = (video: GalleryVideo): string => {
    if (video.thumbnailUrl) return video.thumbnailUrl;
    
    // Se non c'è una thumbnail e il video è di YouTube, genera una thumbnail dal video ID
    if (video.videoType === 'youtube' && video.videoUrl) {
      let videoId = '';
      
      if (video.videoUrl.includes('youtube.com/watch')) {
        const url = new URL(video.videoUrl);
        videoId = url.searchParams.get('v') || '';
      } else if (video.videoUrl.includes('youtu.be')) {
        const parts = video.videoUrl.split('/');
        videoId = parts[parts.length - 1].split('?')[0];
      }
      
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }
    
    // Fallback: placeholder
    return '';
  };
  
  // Gestisce l'apertura del player video
  const openVideoPlayer = (video: GalleryVideo) => {
    setIsPlayerOpen(true);
  };
  
  return (
    <div className="relative w-full mb-12 overflow-hidden max-w-screen-xl mx-auto">
      {/* Titolo sezione video */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center">
          <span className="bg-primary/10 text-primary rounded-full p-2 mr-3">
            <Video className="h-5 w-5" />
          </span>
          Video dell'Evento
        </h2>
      </div>
      
      {/* Banner con anteprima video in stile Netflix */}
      <div className="relative aspect-video overflow-hidden rounded-lg shadow-xl border border-muted-foreground/10 transition-all duration-500 hover:shadow-2xl transform hover:-translate-y-1">
        {/* Thumbnail del video con effetto hover */}
        <div className="group relative w-full h-full cursor-pointer"
            onClick={() => openVideoPlayer(featuredVideo)}>
          {getThumbnailUrl(featuredVideo) ? (
            <img 
              src={getThumbnailUrl(featuredVideo)} 
              alt={featuredVideo.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Video className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
          
          {/* Badge "Trailer" in alto a sinistra */}
          <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-md font-semibold text-sm uppercase tracking-wider shadow-lg">
            Trailer
          </div>
          
          {/* Overlay scuro con info video */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-4 md:p-6 lg:p-8">
            {/* Titolo stile Netflix/Prime */}
            <div className="mb-4">
              <h3 className="text-white text-xl md:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">{featuredVideo.title}</h3>
              {featuredVideo.description && (
                <p className="text-white/90 text-sm md:text-base lg:text-lg line-clamp-2 mb-4 max-w-3xl drop-shadow-md">{featuredVideo.description}</p>
              )}
            </div>
            
            {/* Pulsante per riprodurre il video */}
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="default"
                size="lg"
                className="bg-white text-black hover:bg-white/90 self-start flex items-center shadow-lg transition-transform duration-300 transform group-hover:scale-105"
                onClick={() => openVideoPlayer(featuredVideo)}
              >
                <Play className="h-5 w-5 mr-2 fill-current" />
                Riproduci
              </Button>
              
              {/* Etichetta informativa che incoraggia a vedere a schermo intero */}
              <div className="flex items-center text-white/80 text-sm md:text-base bg-black/40 px-3 py-2 rounded-md backdrop-blur-sm">
                <span className="hidden md:inline mr-2">Consigliata visione</span>
                <span className="font-semibold">a schermo intero</span>
              </div>
            </div>
          </div>
          
          {/* Icona play centrale con animazione */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                        bg-white/20 backdrop-blur-sm rounded-full p-4 md:p-8 
                        opacity-0 group-hover:opacity-100 transition-opacity duration-300 
                        shadow-2xl border border-white/30
                        animate-pulse-slow">
            <Play className="h-6 w-6 md:h-10 md:w-10 text-white fill-white" />
          </div>
        </div>
      </div>
      
      {/* Player del video */}
      {featuredVideo && (
        <VideoPlayer 
          video={featuredVideo} 
          isOpen={isPlayerOpen} 
          onClose={() => setIsPlayerOpen(false)} 
        />
      )}
    </div>
  );
};

export default GalleryVideoBanner;