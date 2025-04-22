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
  onPhotoClick?: (photo: Photo, index: number) => void;
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-fr gap-3 md:gap-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className={`relative group cursor-pointer rounded-lg overflow-hidden bg-muted shadow-sm hover:shadow-md transition-all duration-300 
              border-2 ${selectedPhotos.includes(photo.id) ? 'border-primary' : 'border-transparent hover:border-muted-foreground/20'}
              ${index % 5 === 0 ? 'col-span-2 row-span-2' : ''}
            `}
            style={{
              aspectRatio: index % 5 === 0 ? '1' : Math.random() > 0.5 ? '3/4' : '4/3'
            }}
            onClick={() => onPhotoClick && onPhotoClick(photo, index)}
          >
            {/* Immagine con effetto hover */}
            <img
              src={photo.thumbnailUrl || `/uploads/galleries/thumbnails/${photo.filename}`}
              alt={photo.title || "Foto"}
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                // Preveniamo loop infiniti controllando se abbiamo già provato il fallback
                const target = e.target as HTMLImageElement;
                // Se l'URL corrente è già il fallback o non abbiamo un filename, mostra un placeholder
                if (!photo.filename || target.src.includes(`/uploads/galleries/thumbnails/${photo.filename}`)) {
                  // Fallback a un'immagine placeholder per evitare loop di errori
                  target.src = "/assets/image-placeholder.svg";
                  target.onerror = null; // Disabilita ulteriori eventi di errore
                  console.log("Utilizzato placeholder per immagine mancante");
                } else if (photo.filename) {
                  // Prima volta che proviamo il fallback
                  console.log("Tentativo fallback thumbnail:", photo.filename);
                  target.src = `/uploads/galleries/thumbnails/${photo.filename}`;
                }
              }}
            />

            {photo.isFeatured && (
              <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded-md font-medium">
                <Star className="h-3 w-3 mr-1 fill-white inline-block" />
                <span className="align-middle">In Evidenza</span>
              </div>
            )}

            {/* Overlay gradiente per dare profondità visiva */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
              <div className="flex justify-between items-start">
                {selectable && (
                  <Checkbox
                    checked={selectedPhotos.includes(photo.id)}
                    onCheckedChange={(checked) => {
                      handleCheckboxChange(photo.id, checked === true);
                      // Previeni la propagazione per evitare l'attivazione del click sul div parent
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
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizza originale
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem disabled className="opacity-100 cursor-default">
                        <Download className="mr-2 h-4 w-4" />
                        Scarica immagine
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/api/gallery/photos/${photo.id}/download?quality=original`, "_blank");
                      }} className="pl-8">
                        Qualità originale
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/api/gallery/photos/${photo.id}/download?quality=large`, "_blank");
                      }} className="pl-8">
                        Qualità alta
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/api/gallery/photos/${photo.id}/download?quality=medium`, "_blank");
                      }} className="pl-8">
                        Qualità media
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
                    {/* Utilizziamo l'operatore di coalescenza nullish (??) per fornire un valore predefinito di 0 */}
                    {(photo.likeCount ?? 0) > 0 && (
                      <div className="flex items-center">
                        <Heart className="h-4 w-4 mr-1" />
                        {photo.likeCount}
                      </div>
                    )}

                    {(photo.commentCount ?? 0) > 0 && (
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
                        onPhotoClick(photo, index);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent aria-describedby="delete-dialog-description">
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription id="delete-dialog-description">
              Sei sicuro di voler eliminare questa foto? Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 flex justify-center">
            {photoToDelete && (
              <img 
                src={photoToDelete.url || `/uploads/galleries/medium/${photoToDelete.filename}`} 
                alt="Foto da eliminare" 
                className="max-h-48 object-contain rounded-md"
                onError={(e) => {
                  // Preveniamo loop infiniti
                  const target = e.target as HTMLImageElement;
                  // Se l'URL corrente è già il fallback o non abbiamo un filename, mostra un placeholder
                  if (!photoToDelete.filename || target.src.includes(`/uploads/galleries/medium/${photoToDelete.filename}`)) {
                    // Fallback a un'immagine placeholder
                    target.src = "/assets/image-placeholder.svg";
                    target.onerror = null; // Disabilita ulteriori eventi di errore
                    console.log("Utilizzato placeholder per immagine mancante in dialogo");
                  } else if (photoToDelete.filename) {
                    // Prima volta che proviamo il fallback
                    console.log("Tentativo fallback medium:", photoToDelete.filename);
                    target.src = `/uploads/galleries/medium/${photoToDelete.filename}`;
                  }
                }}
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