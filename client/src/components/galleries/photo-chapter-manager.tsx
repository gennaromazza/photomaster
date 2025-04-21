import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CameraIcon, Folder, MoveIcon, SaveIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Photo, GalleryChapter } from "@/types/gallery";
import { Badge } from "@/components/ui/badge";

interface PhotoChapterManagerProps {
  galleryId: number;
}

interface ChapterData {
  id: number | null;
  title: string;
  photos: Photo[];
}

export function PhotoChapterManager({ galleryId }: PhotoChapterManagerProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [photosByChapter, setPhotosByChapter] = useState<ChapterData[]>([]);
  const [needsSaving, setNeedsSaving] = useState(false);

  // Ottieni tutti i capitoli
  const { data: chapters, isLoading: isLoadingChapters } = useQuery({
    queryKey: [`/api/gallery/galleries/${galleryId}/chapters`],
    enabled: !!galleryId,
  });

  // Ottieni tutte le foto
  const { data: photosData, isLoading: isLoadingPhotos } = useQuery({
    queryKey: [`/api/gallery/galleries/${galleryId}/photos`],
    enabled: !!galleryId,
  });

  // Aggiorna capitolo di una foto
  const updatePhotoMutation = useMutation({
    mutationFn: async (data: { photoId: number, chapterId: number | null }) => {
      return await apiRequest("PUT", `/api/gallery/photos/${data.photoId}`, {
        chapterId: data.chapterId
      });
    },
    onError: (error: any) => {
      console.error("Errore nell'aggiornamento del capitolo della foto:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento della foto",
        variant: "destructive",
      });
    }
  });

  // Organizza foto per capitolo
  useEffect(() => {
    if (chapters && photosData?.photos) {
      const data: ChapterData[] = [
        // Capitolo "Senza capitolo" per le foto non assegnate
        { 
          id: null, 
          title: "Senza capitolo", 
          photos: []
        }
      ];
      
      // Aggiungi tutti i capitoli esistenti
      if (Array.isArray(chapters)) {
        chapters.forEach((chapter: GalleryChapter) => {
          data.push({
            id: chapter.id,
            title: chapter.title,
            photos: []
          });
        });
      }
      
      // Distribuisci le foto nei capitoli
      if (photosData && Array.isArray(photosData.photos)) {
        photosData.photos.forEach((photo: Photo) => {
          const chapterIndex = data.findIndex(c => c.id === photo.chapterId);
          if (chapterIndex !== -1) {
            data[chapterIndex].photos.push(photo);
          } else {
            // Assegna al capitolo "Senza capitolo" se non ha capitolo o se il capitolo non esiste
            data[0].photos.push(photo);
          }
        });
      }
      
      setPhotosByChapter(data);
    }
  }, [chapters, photosData]);

  // Gestisce la fine di un'operazione di drag
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    
    // Se la foto è stata trascinata in un contenitore diverso (cambia capitolo)
    if (source.droppableId !== destination.droppableId) {
      const sourceChapterIndex = photosByChapter.findIndex(
        c => c.id === (source.droppableId === "null" ? null : parseInt(source.droppableId))
      );
      const destChapterIndex = photosByChapter.findIndex(
        c => c.id === (destination.droppableId === "null" ? null : parseInt(destination.droppableId))
      );
      
      if (sourceChapterIndex !== -1 && destChapterIndex !== -1) {
        const newPhotosByChapter = [...photosByChapter];
        const photoToMove = newPhotosByChapter[sourceChapterIndex].photos[source.index];
        
        // Rimuovi la foto dal capitolo di origine
        newPhotosByChapter[sourceChapterIndex].photos.splice(source.index, 1);
        
        // Aggiungi la foto al capitolo di destinazione
        newPhotosByChapter[destChapterIndex].photos.splice(destination.index, 0, photoToMove);
        
        setPhotosByChapter(newPhotosByChapter);
        setNeedsSaving(true);
      }
    } 
    // Se la foto è stata riordinata all'interno dello stesso capitolo
    else if (source.index !== destination.index) {
      const chapterIndex = photosByChapter.findIndex(
        c => c.id === (source.droppableId === "null" ? null : parseInt(source.droppableId))
      );
      
      if (chapterIndex !== -1) {
        const newPhotosByChapter = [...photosByChapter];
        const [movedPhoto] = newPhotosByChapter[chapterIndex].photos.splice(source.index, 1);
        newPhotosByChapter[chapterIndex].photos.splice(destination.index, 0, movedPhoto);
        
        setPhotosByChapter(newPhotosByChapter);
        // Per ora non segniamo come "necessita salvataggio" per il riordino interno
        // Ma qui potremmo aggiungere la logica per salvare anche l'ordine
      }
    }
  };

  // Salva le modifiche ai capitoli delle foto
  const saveChanges = async () => {
    setIsSaving(true);
    
    try {
      const promises = [];
      let modificheEffettuate = 0;
      
      // Per ogni capitolo, verifica le foto che hanno cambiato capitolo
      for (const chapter of photosByChapter) {
        for (const photo of chapter.photos) {
          // Se il capitolo è cambiato
          if (photo.chapterId !== chapter.id) {
            console.log(`Aggiornamento foto ${photo.id}: da capitolo ${photo.chapterId} a capitolo ${chapter.id}`);
            
            promises.push(
              updatePhotoMutation.mutateAsync({
                photoId: photo.id,
                chapterId: chapter.id
              }).then(() => {
                modificheEffettuate++;
              })
            );
          }
        }
      }
      
      // Aspetta che tutte le operazioni siano completate
      await Promise.all(promises);
      
      // Invalida le query per aggiornare i dati
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/gallery/galleries/${galleryId}/photos`] 
      });
      
      // Forza il rifetch dei dati dopo un breve ritardo
      setTimeout(() => {
        queryClient.refetchQueries({ 
          queryKey: [`/api/gallery/galleries/${galleryId}/photos`] 
        });
      }, 300);
      
      toast({
        title: "Modifiche salvate",
        description: `${modificheEffettuate} foto ${modificheEffettuate === 1 ? 'è stata spostata' : 'sono state spostate'} con successo`,
      });
      
      setNeedsSaving(false);
    } catch (error) {
      console.error("Errore nel salvataggio delle modifiche:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio delle modifiche",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingChapters || isLoadingPhotos) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-7 w-1/3" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <MoveIcon className="h-5 w-5" />
            Organizza foto nei capitoli
          </CardTitle>
          <Button 
            onClick={saveChanges} 
            disabled={!needsSaving || isSaving}
            className={`${needsSaving ? 'animate-pulse bg-primary' : ''}`}
          >
            <SaveIcon className="h-4 w-4 mr-2" />
            {isSaving ? "Salvataggio..." : "Salva modifiche"}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          Trascina le foto per spostarle tra i vari capitoli. Le modifiche saranno effettive dopo aver cliccato su "Salva modifiche".
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/30 p-2 mb-4 border rounded-sm text-xs text-muted-foreground flex items-center">
          <span className="mr-2">💡</span>
          <p>Consiglio: Trascina le foto tra i vari capitoli per organizzarle. Le miniature con sfondo colorato sono state spostate e devono essere salvate.</p>
        </div>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-4">
            {photosByChapter.map((chapter) => (
              <div key={chapter.id === null ? 'no-chapter' : chapter.id} className="border rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-muted p-3 font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    {chapter.title}
                    <Badge variant="outline" className="ml-1">
                      {chapter.photos.length} foto
                    </Badge>
                  </div>
                  {chapter.photos.some(photo => photo.chapterId !== chapter.id) && (
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                      Modifiche non salvate
                    </Badge>
                  )}
                </div>
                <Droppable droppableId={chapter.id === null ? "null" : String(chapter.id)} direction="horizontal">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="p-3 min-h-[100px] bg-background/50"
                    >
                      {chapter.photos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-24 text-muted-foreground text-sm border border-dashed rounded-md">
                          <CameraIcon className="h-5 w-5 mb-1" />
                          Trascina qui le foto per aggiungerle a questo capitolo
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="flex justify-between items-center py-1 px-2 text-xs text-muted-foreground">
                            <span>{chapter.photos.length} foto in questo capitolo</span>
                            <span className="text-xs italic">Scorri per vedere tutte le foto</span>
                          </div>
                          <ScrollArea className="h-full max-h-[200px]">
                            <div className="flex flex-wrap gap-1 p-1">
                              {chapter.photos.map((photo, index) => (
                                <Draggable
                                  key={photo.id}
                                  draggableId={String(photo.id)}
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`relative w-16 h-16 md:w-20 md:h-20 border rounded-md overflow-hidden ${
                                        snapshot.isDragging ? "ring-2 ring-primary" : ""
                                      } transition-all hover:scale-105 hover:shadow-md`}
                                      style={{
                                        ...provided.draggableProps.style,
                                      }}
                                      title={photo.title || `Foto ${index + 1}`}
                                    >
                                      <img
                                        src={photo.thumbnailUrl}
                                        alt={photo.title || `Foto ${index + 1}`}
                                        className="object-cover w-full h-full"
                                        loading="lazy"
                                      />
                                      {photo.chapterId !== chapter.id && (
                                        <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center backdrop-blur-[1px]">
                                          <div className="relative">
                                            <span className="text-[10px] text-white font-medium bg-amber-600 px-1.5 py-0.5 rounded-sm shadow-sm">
                                              Spostata
                                            </span>
                                            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-amber-600"></div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}