import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Maximize, Minimize, X } from "lucide-react";
import { GalleryVideo } from "@/types/gallery";

interface VideoPlayerProps {
  video: GalleryVideo;
  isOpen: boolean;
  onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, isOpen, onClose }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  // Gestione del fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      // Attiva il fullscreen
      if (playerRef.current?.requestFullscreen) {
        playerRef.current.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(err => console.error(`Errore nel fullscreen: ${err.message}`));
      }
    } else {
      // Disattiva il fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(err => console.error(`Errore nella chiusura del fullscreen: ${err.message}`));
      }
    }
  };

  // Ascolta i cambiamenti del fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Funzione per generare l'embed del video di YouTube
  const renderYouTubeEmbed = (videoId: string) => {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${isMuted ? '1' : '0'}&controls=1&modestbranding=1&rel=0`}
        className="w-full h-full"
        style={{ aspectRatio: "16/9" }}
        frameBorder="0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    );
  };

  // Funzione per generare l'embed del video di Vimeo
  const renderVimeoEmbed = (videoId: string) => {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${videoId}?autoplay=1&muted=${isMuted ? '1' : '0'}&controls=1`}
        className="w-full h-full"
        style={{ aspectRatio: "16/9" }}
        frameBorder="0"
        allow="autoplay; fullscreen"
        allowFullScreen
      ></iframe>
    );
  };

  // Funzione per generare il tag video per URL diretti
  const renderVideo = (videoUrl: string | null) => {
    if (!videoUrl) return null;
    
    return (
      <video
        src={videoUrl}
        className="w-full h-full"
        style={{ aspectRatio: "16/9" }}
        autoPlay
        controls
        muted={isMuted}
        playsInline
      ></video>
    );
  };

  // Funzione per generare l'embed HTML personalizzato
  const renderCustomEmbed = (embedCode: string | null) => {
    if (!embedCode) return null;
    
    return (
      <div 
        className="w-full h-full"
        style={{ aspectRatio: "16/9" }}
        dangerouslySetInnerHTML={{ __html: embedCode }}
      />
    );
  };

  // Render del video in base al tipo
  const renderVideoPlayer = () => {
    if (video.videoType === 'youtube' && video.videoId) {
      return renderYouTubeEmbed(video.videoId);
    } else if (video.videoType === 'vimeo' && video.videoId) {
      return renderVimeoEmbed(video.videoId);
    } else if (video.videoType === 'url' && video.videoUrl) {
      return renderVideo(video.videoUrl);
    } else if (video.videoType === 'embed' && video.embedCode) {
      return renderCustomEmbed(video.embedCode);
    }
    
    return <div className="p-4 text-center">Nessun video disponibile</div>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-screen-lg p-0 overflow-hidden bg-black text-white">
        <div className="relative" ref={playerRef}>
          {/* Controlli video */}
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-white/10 text-white"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-white/10 text-white"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-white/10 text-white"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Player video */}
          <div className="aspect-video">
            {renderVideoPlayer()}
          </div>
        </div>
        
        {/* Titolo e descrizione */}
        {(video.title || video.description) && (
          <div className="p-4">
            {video.title && <DialogTitle className="text-xl">{video.title}</DialogTitle>}
            {video.description && <DialogDescription className="text-gray-300">{video.description}</DialogDescription>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayer;