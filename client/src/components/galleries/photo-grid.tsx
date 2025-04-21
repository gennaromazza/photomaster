import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Photo } from "@/types/gallery";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Eye, Star, DownloadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

// Tipo che rappresenta una foto normalizzata con tutte le URL opzionali popolate
type NormalizedPhoto = Photo & {
  url: string;
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
  webpUrl: string;
};

interface PhotoGridProps {
  photos: Photo[];
  galleryId: number;
  chapterId?: number | null;
  onPhotoClick?: (photo: NormalizedPhoto, index: number) => void;
  selectable?: boolean;
  selectedPhotos?: number[];
  onPhotoSelect?: (photoId: number, selected: boolean) => void;
  onPhotoEdit?: (photoId: number) => void;
  editable?: boolean;
}

/**
 * Componente che mostra una griglia di foto con varie funzionalità:
 * - Visualizzazione a griglia responsive
 * - Selezione di foto (per gallerie pubbliche)
 * - Modifica/eliminazione di foto (per amministratori)
 * - Gestione "in evidenza"
 * 
 * Rifattorizzato per:
 * - Normalizzare le URL delle immagini
 * - Usare ImageWithFallback per il caricamento affidabile
 * - Uniformare le query key per React Query
 * - Correggere problemi di propagazione eventi
 * - Migliorare le tipizzazioni
 */
export function PhotoGrid({
  photos,
  galleryId,
  chapterId,
  onPhotoClick,
  selectable = false,
  selectedPhotos = [],
  onPhotoSelect,
  onPhotoEdit,
  editable = false,
}: PhotoGridProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState<number | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<NormalizedPhoto | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Normalizza le URL delle foto
  const normalizedPhotos: NormalizedPhoto[] = photos.map((photo) => ({
    ...photo,
    url: photo.path || "",
    thumbnailUrl: photo.thumbnailPath || "",
    mediumUrl: photo.mediumPath || "",
    largeUrl: photo.largePath || "",
    webpUrl: photo.webpPath || "",
  }));

  // Cambia lo stato "in evidenza" di una foto
  const toggleFeatured = async (photo: NormalizedPhoto, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita la propagazione al container
    
    try {
      setLoading(photo.id);
      await apiRequest("PUT", `/api/gallery/photos/${photo.id}`, {
        isFeatured: !photo.isFeatured,
      });

      // Invalida solo le query rilevanti con formato chiave coerente
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

  // Gestisce la selezione di una foto
  const handlePhotoSelect = (photoId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Previene la propagazione al container Card
    
    if (onPhotoSelect) {
      onPhotoSelect(photoId, !selectedPhotos.includes(photoId));
    }
  };

  // Gestisce l'eliminazione di una foto
  const handleDeletePhoto = async () => {
    if (!photoToDelete || !galleryId) return;

    setIsDeleting(true);

    try {
      await apiRequest("DELETE", `/api/gallery/photos/${photoToDelete.id}`);

      // Invalida la cache con formato query key coerente
      queryClient.invalidateQueries({
        queryKey: [`/api/gallery/galleries/${galleryId}/photos`, { chapter: chapterId }],
      });

      toast({
        title: "Foto eliminata",
        description: "La foto è stata eliminata con successo",
      });

      setDeleteDialogOpen(false);
    } catch (error) {
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
        {normalizedPhotos.map((photo, index) => (
          <Card key={photo.id} className="overflow-hidden group relative">
            <CardContent className="p-0">
              <div className="relative aspect-square">
                {/* Immagine con fallback a più livelli */}
                <ImageWithFallback
                  src={photo.thumbnailUrl}
                  mediumSrc={photo.mediumUrl}
                  fallbackSrc="/assets/image-placeholder.svg"
                  alt={photo.title || "Foto"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />

                {/* Badge per foto in evidenza */}
                {photo.isFeatured && (
                  <div className="absolute top-2 left-2 bg-amber-500/90 text-white rounded-full px-2 py-0.5 text-xs font-medium shadow-md flex items-center">
                    <Star className="h-3 w-3 mr-1 fill-white" />
                    In Evidenza
                  </div>
                )}

                {/* Interfaccia con azioni su hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-2 p-2">
                  {/* Titolo della foto (se presente) */}
                  {photo.title && (
                    <p className="text-white font-medium text-sm text-center mb-2 line-clamp-2">
                      {photo.title}
                    </p>
                  )}
                  
                  {/* Pulsanti di azione */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {/* Pulsante visualizza */}
                    {onPhotoClick && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPhotoClick(photo, index);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Visualizza
                      </Button>
                    )}

                    {/* Pulsante preferiti */}
                    {editable && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => toggleFeatured(photo, e)}
                        disabled={loading === photo.id}
                      >
                        <Star className={`w-4 h-4 ${photo.isFeatured ? "fill-yellow-400" : ""}`} />
                        {photo.isFeatured ? "Rimuovi" : "In evidenza"}
                      </Button>
                    )}
                    
                    {/* Checkbox selezione per visitatori */}
                    {selectable && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={(e) => handlePhotoSelect(photo.id, e)}
                        className="flex items-center gap-1"
                      >
                        <Checkbox 
                          checked={selectedPhotos.includes(photo.id)} 
                          onCheckedChange={(checked) => {
                            if (onPhotoSelect) {
                              onPhotoSelect(photo.id, checked === true);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        Seleziona
                      </Button>
                    )}
                    
                    {/* Menu avanzato per amministratori */}
                    {editable && onPhotoEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-white hover:bg-white/20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            if (onPhotoEdit) onPhotoEdit(photo.id);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifica info
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/api/gallery/photos/${photo.id}/download`, "_blank");
                          }}>
                            <DownloadCloud className="mr-2 h-4 w-4" />
                            Scarica
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoToDelete(photo);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog di conferma eliminazione */}
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
                src={photoToDelete.mediumUrl}
                mediumSrc={photoToDelete.thumbnailUrl}
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
}