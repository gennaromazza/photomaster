import { useState } from "react";
import { Heart, MessageCircle, Download, Share, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GalleryPhoto } from "@/types/gallery";

interface PhotoGridProps {
  photos: GalleryPhoto[];
  selectable?: boolean;
  onPhotoSelect?: (photoId: number, selected: boolean) => void;
  selectedPhotos?: number[];
  editable?: boolean;
  onPhotoEdit?: (photoId: number) => void;
  className?: string;
}

export function PhotoGrid({
  photos,
  selectable = false,
  onPhotoSelect,
  selectedPhotos = [],
  editable = false,
  onPhotoEdit,
  className = "",
}: PhotoGridProps) {
  const [hoveredPhoto, setHoveredPhoto] = useState<number | null>(null);

  const handlePhotoClick = (photoId: number) => {
    if (selectable && onPhotoSelect) {
      const isSelected = selectedPhotos.includes(photoId);
      onPhotoSelect(photoId, !isSelected);
    } else if (editable && onPhotoEdit) {
      onPhotoEdit(photoId);
    }
  };

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", className)}>
      {photos.map((photo) => {
        const isSelected = selectedPhotos.includes(photo.id);
        const isHovered = hoveredPhoto === photo.id;

        return (
          <div
            key={photo.id}
            className={cn(
              "group relative overflow-hidden rounded-lg aspect-square cursor-pointer transition-all duration-200",
              isSelected ? "ring-2 ring-primary ring-offset-2" : "",
              photo.orientation === "portrait" ? "row-span-2" : "",
              photo.isFeatured ? "col-span-2" : ""
            )}
            onMouseEnter={() => setHoveredPhoto(photo.id)}
            onMouseLeave={() => setHoveredPhoto(null)}
            onClick={() => handlePhotoClick(photo.id)}
          >
            <img
              src={photo.mediumPath || photo.thumbnailPath}
              alt={photo.title || "Foto"}
              className={cn(
                "w-full h-full object-cover transition-transform duration-300",
                isHovered ? "scale-105" : ""
              )}
            />

            {/* Overlay scuro al passaggio del mouse */}
            <div
              className={cn(
                "absolute inset-0 bg-black/50 opacity-0 transition-opacity duration-200",
                isHovered ? "opacity-100" : "",
                isSelected ? "opacity-50" : ""
              )}
            />

            {/* Badge per foto in evidenza */}
            {photo.isFeatured && (
              <Badge className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-600">
                <Star className="h-3 w-3 mr-1" /> In evidenza
              </Badge>
            )}

            {/* Controlli foto */}
            <div
              className={cn(
                "absolute inset-0 flex flex-col justify-between p-3 text-white opacity-0 transition-opacity duration-200",
                isHovered ? "opacity-100" : ""
              )}
            >
              <div className="flex justify-between items-start">
                <div className="text-sm font-medium line-clamp-2">{photo.title || "Senza titolo"}</div>

                {selectable && (
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full h-6 w-6",
                      isSelected ? "bg-primary" : "bg-black/50"
                    )}
                  >
                    {isSelected && <Check className="h-4 w-4 text-white" />}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-auto">
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/30 hover:bg-black/50">
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/30 hover:bg-black/50">
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/30 hover:bg-black/50">
                  <Share className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/30 hover:bg-black/50 ml-auto">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Indicatore di selezione sempre visibile */}
            {selectable && isSelected && (
              <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1 z-10">
                <Check className="h-4 w-4" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}