import React, { useRef, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogClose, 
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { GalleryVideo } from "@/types/gallery";

interface VideoPlayerProps {
  video: GalleryVideo;
  isOpen: boolean;
  onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  video, 
  isOpen, 
  onClose 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Effetto per gestire il caricamento e scaricamento del player
  useEffect(() => {
    // Cleanup del video quando si chiude il modale
    return () => {
      if (iframeRef.current) {
        iframeRef.current.src = "";
      }
    };
  }, [isOpen]);
  
  // Genera l'URL di embed corretto in base al tipo di video
  const getVideoEmbedUrl = () => {
    switch (video.videoType) {
      case "youtube":
        return `https://www.youtube.com/embed/${video.videoId}?autoplay=1&modestbranding=1&rel=0`;
      case "vimeo":
        return `https://player.vimeo.com/video/${video.videoId}?autoplay=1&title=0&byline=0&portrait=0`;
      case "url":
        return video.videoUrl || "";
      default:
        return "";
    }
  };
  
  // Renderizza il contenuto del video in base al tipo
  const renderVideoContent = () => {
    switch (video.videoType) {
      case "youtube":
      case "vimeo":
        return (
          <iframe
            ref={iframeRef}
            src={getVideoEmbedUrl()}
            className="w-full h-full aspect-video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      case "url":
        return (
          <video 
            className="w-full h-full" 
            controls 
            autoPlay
          >
            <source src={video.videoUrl || ""} type="video/mp4" />
            Il tuo browser non supporta la riproduzione di video.
          </video>
        );
      case "embed":
        return (
          <div 
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: video.embedCode || "" }}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p>Formato video non supportato</p>
          </div>
        );
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{video.title}</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        
        <div className="relative flex-1 overflow-hidden bg-black">
          {renderVideoContent()}
        </div>
        
        {video.description && (
          <div className="p-4 bg-muted/20">
            <p className="text-sm text-muted-foreground">{video.description}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayer;