import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { GalleryVideo } from '@/types/gallery';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoPlayerProps {
  video: GalleryVideo;
  isOpen: boolean;
  onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, isOpen, onClose }) => {
  // Funzione per ottenere l'URL dell'embed partendo dall'URL del video
  const getVideoEmbedUrl = (video: GalleryVideo): string => {
    const { videoUrl, videoType } = video;
    
    if (!videoUrl) return '';
    
    // YouTube
    if (videoType === 'youtube' || videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      let videoId = '';
      
      if (videoUrl.includes('youtube.com/watch')) {
        const url = new URL(videoUrl);
        videoId = url.searchParams.get('v') || '';
      } else if (videoUrl.includes('youtu.be')) {
        const parts = videoUrl.split('/');
        videoId = parts[parts.length - 1].split('?')[0];
      }
      
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      }
    }
    
    // Vimeo
    if (videoType === 'vimeo' || videoUrl.includes('vimeo.com')) {
      const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/;
      const match = videoUrl.match(vimeoRegex);
      const videoId = match?.[1] || '';
      
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
      }
    }
    
    // Per tutti gli altri tipi (URL diretto)
    if (videoType === 'direct' || videoUrl.match(/\.(mp4|webm|ogg)$/i)) {
      return videoUrl;
    }
    
    return videoUrl; // Fallback all'URL originale
  };

  const embedUrl = getVideoEmbedUrl(video);
  const isDirectVideo = video.videoUrl?.match(/\.(mp4|webm|ogg)$/i);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl" aria-describedby="video-player-description">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-semibold">{video.title}</DialogTitle>
          <p id="video-player-description" className="sr-only">
            Player video per {video.title}
          </p>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        
        <div className="mt-4">
          {/* Player container con aspect ratio 16:9 */}
          <div className="relative w-full pb-[56.25%]">
            {isDirectVideo ? (
              <video 
                className="absolute top-0 left-0 w-full h-full" 
                controls 
                autoPlay
                src={embedUrl}
              />
            ) : (
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={embedUrl}
                title={video.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
          
          {/* Descrizione del video */}
          {video.description && (
            <div className="mt-4 text-sm text-muted-foreground">
              <p>{video.description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayer;