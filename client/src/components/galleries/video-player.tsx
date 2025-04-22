import React, { useState, useRef, useEffect } from "react";
import { GalleryVideo } from "@/types/gallery";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface VideoPlayerProps {
  video: GalleryVideo | null;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasNextVideo?: boolean;
  hasPreviousVideo?: boolean;
}

// Funzione per creare il componente embed per i video YouTube
const YouTubeEmbed = ({ videoId }: { videoId: string }) => {
  return (
    <iframe
      className="absolute top-0 left-0 w-full h-full"
      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
      title="YouTube video player"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    ></iframe>
  );
};

// Funzione per creare il componente embed per i video Vimeo
const VimeoEmbed = ({ videoId }: { videoId: string }) => {
  return (
    <iframe
      className="absolute top-0 left-0 w-full h-full"
      src={`https://player.vimeo.com/video/${videoId}?autoplay=1`}
      title="Vimeo video player"
      frameBorder="0"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
    ></iframe>
  );
};

// Funzione per creare il componente per i video con URL diretto
const DirectVideoPlayer = ({ url }: { url: string }) => {
  return (
    <video
      className="absolute top-0 left-0 w-full h-full"
      controls
      autoPlay
      controlsList="nodownload"
    >
      <source src={url} type="video/mp4" />
      Il tuo browser non supporta la riproduzione video.
    </video>
  );
};

// Componente per mostrare codice embed arbitrario
const EmbedCodeRenderer = ({ embedCode }: { embedCode: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && embedCode) {
      containerRef.current.innerHTML = embedCode;
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [embedCode]);

  return (
    <div 
      ref={containerRef} 
      className="absolute top-0 left-0 w-full h-full flex items-center justify-center"
    />
  );
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  hasNextVideo = false,
  hasPreviousVideo = false,
}) => {
  // Gestisce il rendering del player in base al tipo di video
  const renderVideoPlayer = () => {
    if (!video) return null;

    switch (video.videoType) {
      case "youtube":
        return video.videoId ? (
          <YouTubeEmbed videoId={video.videoId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-red-500">ID YouTube mancante</p>
          </div>
        );

      case "vimeo":
        return video.videoId ? (
          <VimeoEmbed videoId={video.videoId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-red-500">ID Vimeo mancante</p>
          </div>
        );

      case "url":
        return video.videoUrl ? (
          <DirectVideoPlayer url={video.videoUrl} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-red-500">URL del video mancante</p>
          </div>
        );

      case "embed":
        return video.embedCode ? (
          <EmbedCodeRenderer embedCode={video.embedCode} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-red-500">Codice di embed mancante</p>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-muted-foreground">Formato video non supportato</p>
          </div>
        );
    }
  };

  if (!video) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-w-[95vw] p-0 bg-black/90 border-neutral-800 overflow-hidden" closeButtonProps={{ className: 'hidden' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 text-white">
          <h2 className="text-lg font-semibold truncate max-w-[70%]">{video.title}</h2>
          
          <div className="flex items-center gap-2">
            {video.videoType === "url" && video.videoUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
                onClick={() => window.open(video.videoUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Apri video
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Video container */}
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          {renderVideoPlayer()}
          
          {/* Controlli di navigazione */}
          {onPrevious && hasPreviousVideo && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full h-10 w-10"
              onClick={(e) => {
                e.stopPropagation();
                onPrevious();
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          
          {onNext && hasNextVideo && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full h-10 w-10"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>
        
        {/* Footer con descrizione */}
        {video.description && (
          <div className="p-4 text-white/90 text-sm">
            <p>{video.description}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayer;