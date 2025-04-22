import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play, Info, Volume2, VolumeX } from "lucide-react";
import { GalleryVideo } from "@/types/gallery";
import VideoPlayer from "./video-player";

interface GalleryVideoBannerProps {
  galleryId: number;
  galleryName: string;
  description?: string | null;
}

const GalleryVideoBanner: React.FC<GalleryVideoBannerProps> = ({
  galleryId,
  galleryName,
  description
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  
  // Query per ottenere il video trailer della galleria
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
        console.error("Errore nel caricamento del video:", error);
        throw error;
      }
    }
  });
  
  // Se non c'è video o c'è un errore, non mostrare nulla
  if (isLoading || isError || !video) {
    return null;
  }
  
  // Generiamo l'URL di anteprima in base al tipo di video
  const getThumbnailUrl = () => {
    if (video.thumbnailPath) return video.thumbnailPath;
    if (video.thumbnailUrl) return video.thumbnailUrl;
    
    // Generare URL di anteprima per YouTube o Vimeo se non specificato
    if (video.videoType === "youtube" && video.videoId) {
      return `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`;
    }
    
    if (video.videoType === "vimeo" && video.videoId) {
      // Vimeo richiede un'API per ottenere le thumbnail, quindi usiamo un fallback generico
      return `/assets/video-placeholder.jpg`;
    }
    
    // Fallback per altri tipi di video
    return `/assets/video-placeholder.jpg`;
  };
  
  return (
    <>
      {/* Video Banner in stile Netflix/Prime */}
      <div className="relative w-full h-[50vh] md:h-[70vh] overflow-hidden">
        {/* Immagine di sfondo/thumbnail */}
        <div className="absolute inset-0">
          <img 
            src={getThumbnailUrl()}
            alt={video.title || "Video Trailer"}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay scuro con gradiente */}
          <div 
            className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20"
          />
        </div>
        
        {/* Contenuto testuale */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-3 text-white drop-shadow-md">
            {galleryName}
          </h2>
          
          {description && (
            <p className="text-white/90 max-w-2xl mb-8 text-lg">
              {description}
            </p>
          )}
          
          <div className="flex gap-4">
            <Button 
              onClick={() => setShowPlayer(true)} 
              size="lg"
              className="gap-2 bg-white text-black hover:bg-white/90"
            >
              <Play className="h-5 w-5" />
              Guarda il trailer
            </Button>
            
            <Button 
              onClick={() => setIsMuted(!isMuted)}
              variant="outline" 
              size="icon"
              className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Modal per il video player */}
      {video && (
        <VideoPlayer 
          video={video}
          isOpen={showPlayer}
          onClose={() => setShowPlayer(false)}
        />
      )}
    </>
  );
};

export default GalleryVideoBanner;