import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ExternalLink, Pencil, Trash2, Youtube, Video, Film, Code } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GalleryVideo } from "@/types/gallery";

interface VideoListProps {
  galleryId: number;
  onEdit?: (video: GalleryVideo) => void;
  onDelete?: (videoId: number) => void;
  onSelect?: (video: GalleryVideo) => void;
  readOnly?: boolean;
  chapterId?: number | null;
}

// Funzione per ottenere l'icona corretta in base al tipo di video
const getVideoTypeIcon = (videoType: string) => {
  switch (videoType) {
    case "youtube":
      return <Youtube className="h-5 w-5 text-red-600" />;
    case "vimeo":
      return <Video className="h-5 w-5 text-blue-400" />;
    case "url":
      return <ExternalLink className="h-5 w-5 text-green-500" />;
    case "embed":
      return <Code className="h-5 w-5 text-purple-500" />;
    default:
      return <Film className="h-5 w-5 text-primary" />;
  }
};

// Funzione per ottenere la label del tipo di video
const getVideoTypeLabel = (videoType: string) => {
  switch (videoType) {
    case "youtube":
      return "YouTube";
    case "vimeo":
      return "Vimeo";
    case "url":
      return "URL Video";
    case "embed":
      return "Codice Embed";
    default:
      return "Video";
  }
};

const VideoList: React.FC<VideoListProps> = ({
  galleryId,
  onEdit,
  onDelete,
  onSelect,
  readOnly = false,
  chapterId,
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/gallery/galleries", galleryId, "videos", { chapterId }],
    queryFn: async () => {
      const url = new URL(`/api/gallery/galleries/${galleryId}/videos`, window.location.origin);
      
      if (chapterId !== undefined) {
        url.searchParams.append("chapterId", String(chapterId));
      }
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error("Errore nel caricamento dei video");
      }
      
      const responseData = await response.json();
      return responseData.videos as GalleryVideo[];
    },
  });

  // Se è in caricamento, mostra uno skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Video</h3>
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="p-4">
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Skeleton className="h-32 w-full rounded-md" />
            </CardContent>
            <CardFooter className="flex justify-between p-4 pt-0">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  // Se c'è un errore
  if (error) {
    return (
      <div className="rounded-lg border p-4 text-center text-red-500">
        <p>Errore nel caricamento dei video.</p>
        <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Errore sconosciuto"}</p>
      </div>
    );
  }

  // Se non ci sono video
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Film className="mx-auto h-10 w-10 text-muted-foreground opacity-50" />
        <h3 className="mt-4 text-lg font-medium">Nessun video</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {chapterId 
            ? "Non ci sono video in questo capitolo." 
            : "Questa galleria non contiene ancora video."
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">
          Video {chapterId ? "del capitolo" : "della galleria"}
        </h3>
        <div className="text-sm text-muted-foreground">
          {data.length} {data.length === 1 ? "video" : "video"}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((video) => (
          <Card 
            key={video.id} 
            className="overflow-hidden group hover:shadow-md transition-shadow duration-200 cursor-pointer"
            onClick={() => onSelect ? onSelect(video) : null}
          >
            <div className="relative aspect-video overflow-hidden">
              {/* Thumbnail con overlay al passaggio del mouse */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                <Button variant="ghost" className="text-white">
                  <ChevronRight className="mr-1 h-5 w-5" />
                  Riproduci
                </Button>
              </div>
              
              {/* Thumbnail */}
              {(video.thumbnailPath || video.thumbnailUrl) ? (
                <img
                  src={video.thumbnailPath || video.thumbnailUrl || ''}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback per thumbnail non caricabili
                    e.currentTarget.src = "/assets/placeholder-video.jpg";
                  }}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Film className="h-12 w-12 text-muted-foreground opacity-50" />
                </div>
              )}
              
              {/* Badge per il tipo di video */}
              <Badge 
                variant="secondary" 
                className="absolute top-2 left-2 flex items-center gap-1"
              >
                {getVideoTypeIcon(video.videoType)}
                <span>{getVideoTypeLabel(video.videoType)}</span>
              </Badge>
              
              {/* Badge per video in evidenza */}
              {video.isFeatured && (
                <Badge 
                  variant="default" 
                  className="absolute top-2 right-2 bg-amber-500 text-white"
                >
                  In evidenza
                </Badge>
              )}
            </div>
            
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-base">{video.title}</CardTitle>
              {video.description && (
                <CardDescription className="line-clamp-2 text-sm mt-1">
                  {video.description}
                </CardDescription>
              )}
            </CardHeader>
            
            {!readOnly && (
              <CardFooter className="p-3 pt-2 flex justify-end gap-2">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(video);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Modifica
                  </Button>
                )}
                
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(video.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Elimina
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default VideoList;