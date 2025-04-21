import { useState } from "react";
import { 
  Heart, 
  MessageCircle, 
  MoreHorizontal, 
  Download, 
  Edit, 
  Trash2,
  Check,
  Star,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Photo } from "@/types/gallery";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PhotoGridProps {
  photos: Photo[];
  onPhotoSelect?: (photoId: number, selected: boolean) => void;
  selectedPhotos?: number[];
  selectable?: boolean;
  editable?: boolean;
  onPhotoEdit?: (photoId: number) => void;
  onPhotoClick?: (index: number) => void;
  galleryId?: number;
  chapterId?: number | null;
}

export function PhotoGrid({
  photos,
  onPhotoSelect,
  selectedPhotos = [],
  selectable = false,
  editable = false,
  onPhotoEdit,
  onPhotoClick,
  galleryId,
  chapterId,
}: PhotoGridProps) {
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleCheckboxChange = (photoId: number, checked: boolean) => {
    if (onPhotoSelect) {
      onPhotoSelect(photoId, checked);
    }
  };

  const handleDeletePhoto = async () => {
    if (!photoToDelete || !galleryId) return;

    setIsDeleting(true);

    try {
      await apiRequest("DELETE", `/api/gallery/photos/${photoToDelete.id}`);

      // Invalida la cache per ricaricare le foto
      queryClient.invalidateQueries({ 
        queryKey: [
          `/api/gallery/galleries/${galleryId}/photos`, 
          { chapter: chapterId }
        ] 
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

  const toggleFeatured = async (photo: Photo) => {
    if (!galleryId) return;

    try {
      await apiRequest("PUT", `/api/gallery/galleries/${galleryId}/photos/${photo.id}`, {
        isFeatured: !photo.isFeatured
      });

      // Invalida la cache per ricaricare le foto
      queryClient.invalidateQueries({ 
        queryKey: [
          `/api/gallery/galleries/${galleryId}/photos`, 
          { chapter: chapterId }
        ] 
      });

      toast({
        title: photo.isFeatured ? "Foto rimossa dai preferiti" : "Foto aggiunta ai preferiti",
        description: photo.isFeatured 
          ? "La foto non sarà più mostrata nella selezione preferiti" 
          : "La foto verrà ora mostrata nella selezione preferiti",
      });
    } catch (error) {
      console.error("Errore durante l'aggiornamento della foto:", error);

      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento della foto",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {photos.map((photo, index) => (
          <Card 
            key={photo.id} 
            className="overflow-hidden group relative cursor-pointer rounded-xl transition-all duration-300 hover:translate-y-[-2px] hover:shadow-xl bg-white dark:bg-gray-800/50"
            onClick={() => onPhotoClick && onPhotoClick(index)}
          >
            <div className="aspect-square overflow-hidden relative">
              <img
                src={photo.thumbnailUrl}
                alt={photo.title || "Foto"}
                className="object-cover h-full w-full transition-all duration-300 group-hover:scale-105"
              />

              {photo.isFeatured && (
                <Badge className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-600">
                  <Star className="h-3 w-3 mr-1 fill-white" />
                  In Evidenza
                </Badge>
              )}

              {/* Layer scuro con opzioni durante l'hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                <div className="flex justify-between items-start">
                  {selectable && (
                    <Checkbox
                      checked={selectedPhotos.includes(photo.id)}
                      onCheckedChange={(checked) => {
                        handleCheckboxChange(photo.id, checked === true);
                        // Previeni la propagazione per evitare l'attivazione del click sulla Card
                        if (typeof event !== 'undefined' && event.stopPropagation) {
                          event.stopPropagation();
                        }
                      }}
                      className="h-5 w-5 border-white data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}

                  {editable && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white hover:bg-white/20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {onPhotoEdit && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onPhotoEdit(photo.id);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifica info
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          toggleFeatured(photo);
                        }}>
                          <Star className={`mr-2 h-4 w-4 ${photo.isFeatured ? 'fill-amber-500' : ''}`} />
                          {photo.isFeatured ? "Rimuovi da In Evidenza" : "Aggiungi a In Evidenza"}
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          window.open(photo.url, "_blank");
                        }}>
                          <Download className="mr-2 h-4 w-4" />
                          Visualizza originale
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoToDelete(photo);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="text-white">
                  {photo.title && (
                    <p className="font-medium line-clamp-2">{photo.title}</p>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-3 text-sm">
                      {photo.likeCount > 0 && (
                        <div className="flex items-center">
                          <Heart className="h-4 w-4 mr-1" />
                          {photo.likeCount}
                        </div>
                      )}

                      {photo.commentCount > 0 && (
                        <div className="flex items-center">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          {photo.commentCount}
                        </div>
                      )}
                    </div>

                    {onPhotoClick && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 rounded-full bg-white/20 hover:bg-white/40 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPhotoClick(index);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
              <img 
                src={photoToDelete.url} 
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
}