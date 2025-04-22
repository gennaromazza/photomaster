import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play, Volume2, VolumeX, Info } from "lucide-react";
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
  const [isMuted, setIsMuted] = useState(true);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  // Query per ottenere il video della galleria
  const { data: video, isLoading, isError } = useQuery({
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

  // Se non c'è un video o c'è un errore, non mostriamo nulla
  if (isLoading || isError || !video) {
    return null;
  }

  // Funzione per generare l'embed del video di YouTube
  const renderYouTubeEmbed = (videoId: string, autoplay: boolean = false) => {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? '1' : '0'}&mute=${isMuted ? '1' : '0'}&controls=0&modestbranding=1&loop=1&playlist=${videoId}`}
        className="absolute inset-0 w-full h-full"
        frameBorder="0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    );
  };

  // Funzione per generare l'embed del video di Vimeo
  const renderVimeoEmbed = (videoId: string, autoplay: boolean = false) => {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${videoId}?autoplay=${autoplay ? '1' : '0'}&muted=${isMuted ? '1' : '0'}&background=1&loop=1`}
        className="absolute inset-0 w-full h-full"
        frameBorder="0"
        allow="autoplay; fullscreen"
        allowFullScreen
      ></iframe>
    );
  };

  // Funzione per generare il tag video per URL diretti
  const renderVideo = (videoUrl: string | null, autoplay: boolean = false) => {
    if (!videoUrl) return null;
    
    return (
      <video
        src={videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay={autoplay}
        muted={isMuted}
        loop
        playsInline
      ></video>
    );
  };

  // Funzione per generare l'embed HTML personalizzato
  const renderCustomEmbed = (embedCode: string | null) => {
    if (!embedCode) return null;
    
    // Creiamo un div e inseriamo il codice embed
    return (
      <div 
        className="absolute inset-0 w-full h-full"
        dangerouslySetInnerHTML={{ __html: embedCode }}
      />
    );
  };

  // Render dell'anteprima del video in base al tipo
  const renderVideoPreview = () => {
    if (video.videoType === 'youtube' && video.videoId) {
      return renderYouTubeEmbed(video.videoId, isPlaying);
    } else if (video.videoType === 'vimeo' && video.videoId) {
      return renderVimeoEmbed(video.videoId, isPlaying);
    } else if (video.videoType === 'url' && video.videoUrl) {
      return renderVideo(video.videoUrl, isPlaying);
    } else if (video.videoType === 'embed' && video.embedCode) {
      return renderCustomEmbed(video.embedCode);
    }
    
    return null;
  };

  // Banner in stile Netflix
  return (
    <>
      <div className="relative w-full h-[70vh] overflow-hidden">
        {/* Overlay scuro gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent z-10"></div>
        
        {/* Video di sfondo */}
        <div className="absolute inset-0">
          {renderVideoPreview()}
        </div>
        
        {/* Contenuto in overlay */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 md:p-12">
          <div className="max-w-screen-xl mx-auto w-full">
            <div className="max-w-xl mb-8">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 font-serif">{galleryName}</h1>
              {description && (
                <p className="text-white/90 text-base md:text-lg">
                  {description}
                </p>
              )}
              
              <div className="flex flex-wrap gap-3 mt-6">
                <Button
                  size="lg"
                  className="font-semibold gap-2"
                  onClick={() => setShowVideoPlayer(true)}
                >
                  <Play className="h-5 w-5" fill="currentColor" />
                  Guarda il trailer
                </Button>
                
                <Button
                  size="lg"
                  variant="secondary"
                  className="font-semibold gap-2"
                  onClick={() => {
                    if (isPlaying) {
                      setIsPlaying(false);
                    } else {
                      setIsPlaying(true);
                    }
                  }}
                >
                  {isPlaying ? (
                    <>
                      <Info className="h-5 w-5" />
                      Pausa anteprima
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Play anteprima
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Controllo volume */}
        <Button
          variant="outline"
          size="icon"
          className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 border-white/20 text-white"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
      </div>
      
      {/* Dialog del video player */}
      {video && (
        <VideoPlayer
          video={video}
          isOpen={showVideoPlayer}
          onClose={() => setShowVideoPlayer(false)}
        />
      )}
    </>
  );
};

export default GalleryVideoBanner;