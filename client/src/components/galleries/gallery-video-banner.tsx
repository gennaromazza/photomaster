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
    <div className="relative w-full mb-8 overflow-hidden">
      {/* Banner con anteprima video */}
      <div className="relative aspect-video overflow-hidden rounded-lg shadow-md">
        {/* Thumbnail del video */}
        {getThumbnailUrl(featuredVideo) ? (
          <img 
            src={getThumbnailUrl(featuredVideo)} 
            alt={featuredVideo.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-slate-200 flex items-center justify-center">
            <Video className="h-16 w-16 text-slate-400" />
          </div>
        )}
        
        {/* Overlay scuro con info video */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6">
          <h3 className="text-white text-xl md:text-2xl font-semibold mb-2">{featuredVideo.title}</h3>
          {featuredVideo.description && (
            <p className="text-white/80 text-sm md:text-base line-clamp-2 mb-4">{featuredVideo.description}</p>
          )}
          
          {/* Pulsante per riprodurre il video */}
          <Button 
            variant="outline"
            size="lg"
            className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-white/20 self-start flex items-center"
            onClick={() => openVideoPlayer(featuredVideo)}
          >
            <Play className="h-5 w-5 mr-2 fill-current" />
            Guarda il video
          </Button>
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