import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Photo } from "@/types/gallery";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Eye, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Trash2, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


interface PhotoGridProps {
  photos: Photo[];
  galleryId: number;
  chapterId?: number | null;
  onPhotoClick?: (photo: Photo) => void;
  selectable?: boolean;
  selectedPhotos?: number[];
  onPhotoSelect?: (photoId: number, selected: boolean) => void;
  onPhotoEdit?: (photoId: number) => void;

}

export const PhotoGrid = ({
  photos,
  galleryId,
  chapterId,
  onPhotoClick,
  selectable = false,
  selectedPhotos = [],
  onPhotoSelect,
  onPhotoEdit,
}: PhotoGridProps) => {
  if (!photos?.length) {
    return null;
  }
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<number | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  // Normalize photo URLs
  const normalizedPhotos = photos.map((photo) => ({
    ...photo,
    url: photo.path,
    thumbnailUrl: photo.thumbnailPath,
    mediumUrl: photo.mediumPath,
    largeUrl: photo.largePath,
    webpUrl: photo.webpPath,
  }));

  const toggleFeatured = async (photo: Photo) => {
    try {
      setLoading(photo.id);
      await apiRequest("PUT", `/api/gallery/photos/${photo.id}`, {
        isFeatured: !photo.isFeatured,
      });

      // Invalidate only relevant queries
      await queryClient.invalidateQueries({
        queryKey: [`/api/gallery/galleries/${galleryId}/photos`, { chapter: chapterId }],
      });

      toast({
        title: photo.isFeatured ? "Rimossa dai preferiti" : "Aggiunta ai preferiti",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato preferito",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handlePhotoSelect = (photoId: number) => {
    if (onPhotoSelect) {
      onPhotoSelect(photoId, !selectedPhotos.includes(photoId));
    }
  };

  const handleDeletePhoto = async () => {
    if (!photoToDelete || !galleryId) return;

    setIsDeleting(true);

    try {
      await apiRequest("DELETE", `/api/gallery/photos/${photoToDelete.id}`);

      // Invalida la cache per ricaricare le foto
      queryClient.invalidateQueries({
        queryKey: [`/api/gallery/galleries/${galleryId}/photos`, { chapter: chapterId }],
      });

      toast({
        title: "Foto eliminata",
        description: "La foto è stata eliminata con successo",
      });

      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Errore durante l'eliminazione della foto:", error);

      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione della foto",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setPhotoToDelete(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {normalizedPhotos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden group relative">
            <CardContent className="p-0">
              <div className="relative aspect-square">
                <ImageWithFallback
                  src={photo.thumbnailUrl || ""}
                  mediumSrc={photo.mediumUrl || ""}
                  fallbackSrc="/assets/image-placeholder.svg"
                  alt={photo.title || "Photo"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onPhotoClick?.(photo)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Visualizza
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleFeatured(photo)}
                    disabled={loading === photo.id}
                  >
                    <Star className={`w-4 h-4 ${photo.isFeatured ? "fill-yellow-400" : ""}`} />
                    {photo.isFeatured ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                  </Button>
                  {selectable && (
                    <Button variant="secondary" size="icon" onClick={() => handlePhotoSelect(photo.id)}>
                      <Checkbox checked={selectedPhotos.includes(photo.id)} />
                    </Button>
                  )}
                  {onPhotoEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white hover:bg-white/20"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onPhotoEdit(photo.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifica info
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setPhotoToDelete(photo);
                          setDeleteDialogOpen(true);
                        }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questa foto? Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 flex justify-center">
            {photoToDelete && (
              <ImageWithFallback
                src={photoToDelete.mediumUrl || ""}
                fallbackSrc="/assets/image-placeholder.svg"
                alt="Foto da eliminare"
                className="max-h-48 object-contain rounded-md"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePhoto}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminazione..." : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};