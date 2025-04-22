import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Camera, Folder, Move, Save, CheckSquare, Square, X, FolderInput } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Photo, GalleryChapter } from "@/types/gallery";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

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
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [isMovingBatch, setIsMovingBatch] = useState(false);
  const [targetChapterId, setTargetChapterId] = useState<string>('');

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
    mutationFn: async (data: { 
      photoId: number, 
      chapterId?: number | null,
      sortOrder?: number 
    }) => {
      return await apiRequest("PUT", `/api/gallery/photos/${data.photoId}`, {
        ...(data.chapterId !== undefined && { chapterId: data.chapterId }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder })
      });
    },
    onError: (error: any) => {
      console.error("Errore nell'aggiornamento della foto:", error);
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
        
        // Salviamo l'indice originale come proprietà per poter salvare il riordino
        const updatedPhoto = { 
          ...movedPhoto, 
          originalSortOrder: movedPhoto.sortOrder,
          sortOrder: destination.index 
        };
        
        newPhotosByChapter[chapterIndex].photos.splice(destination.index, 0, updatedPhoto);
        
        setPhotosByChapter(newPhotosByChapter);
        // Abilita il salvataggio anche per il riordino interno
        setNeedsSaving(true);
      }
    }
  };

  // Gestisce la selezione/deselezione di una foto
  const togglePhotoSelection = (photoId: number) => {
    if (selectedPhotos.includes(photoId)) {
      setSelectedPhotos(selectedPhotos.filter(id => id !== photoId));
    } else {
      setSelectedPhotos([...selectedPhotos, photoId]);
    }
  };

  // Gestisce l'attivazione/disattivazione della modalità selezione
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) {
      // Deseleziona tutte le foto quando si esce dalla modalità selezione
      setSelectedPhotos([]);
    }
  };

  // Deseleziona tutte le foto
  const deselectAll = () => {
    setSelectedPhotos([]);
  };

  // Gestisce il movimento batch di foto selezionate in un capitolo specifico
  const moveSelectedPhotos = async () => {
    if (selectedPhotos.length === 0 || !targetChapterId) return;
    
    const destinationChapterId = targetChapterId === 'null' ? null : Number(targetChapterId);
    
    setIsMovingBatch(true);
    
    try {
      const promises = [];
      
      // Per ogni foto selezionata, aggiorna il capitolo
      for (const photoId of selectedPhotos) {
        promises.push(
          updatePhotoMutation.mutateAsync({
            photoId,
            chapterId: destinationChapterId
          })
        );
      }
      
      // Attendi il completamento di tutte le operazioni
      await Promise.all(promises);
      
      // Aggiorna i dati - forziamo il refetch per assicurarci che i dati siano aggiornati
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/gallery/galleries/${galleryId}/photos`] 
      });
      
      // Aggiorno anche manualmente lo stato locale
      if (photosByChapter && photosByChapter.length > 0) {
        const newPhotosByChapter = [...photosByChapter];
        
        // Trova l'indice del capitolo di destinazione
        const destinationChapterIndex = newPhotosByChapter.findIndex(
          c => c.id === destinationChapterId
        );
        
        if (destinationChapterIndex !== -1) {
          // Per ogni foto selezionata...
          selectedPhotos.forEach(selectedPhotoId => {
            // Trova la foto e il capitolo di origine
            let foundPhoto: Photo | null = null;
            let sourceChapterIndex = -1;
            
            // Cerca la foto tra tutti i capitoli
            for (let i = 0; i < newPhotosByChapter.length; i++) {
              const photoIndex = newPhotosByChapter[i].photos.findIndex(p => p.id === selectedPhotoId);
              if (photoIndex !== -1) {
                sourceChapterIndex = i;
                foundPhoto = { ...newPhotosByChapter[i].photos[photoIndex] };
                // Rimuovi la foto dal capitolo di origine
                newPhotosByChapter[i].photos.splice(photoIndex, 1);
                break;
              }
            }
            
            // Se ho trovato la foto, aggiungila al capitolo di destinazione
            if (foundPhoto && destinationChapterIndex !== -1) {
              // Aggiorna l'ID del capitolo della foto
              foundPhoto.chapterId = destinationChapterId;
              // Aggiungi la foto al capitolo di destinazione
              newPhotosByChapter[destinationChapterIndex].photos.push(foundPhoto);
            }
          });
          
          // Aggiorna lo stato
          setPhotosByChapter(newPhotosByChapter);
        }
      }
      
      // Forza un refetch per essere sicuri che i dati siano aggiornati
      await queryClient.refetchQueries({ 
        queryKey: [`/api/gallery/galleries/${galleryId}/photos`] 
      });
      
      // Feedback all'utente
      toast({
        title: "Foto spostate",
        description: `${selectedPhotos.length} foto ${selectedPhotos.length === 1 ? 'spostata' : 'spostate'} nel capitolo selezionato`,
      });
      
      // Reset della selezione e del target
      setSelectedPhotos([]);
      setTargetChapterId('');
      setNeedsSaving(false); // Non c'è più bisogno di salvare dato che è stato tutto fatto
      setIsMovingBatch(false);
      
    } catch (error) {
      console.error("Errore nello spostamento batch delle foto:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante lo spostamento delle foto",
        variant: "destructive",
      });
      setIsMovingBatch(false);
    }
  };

  // Salva le modifiche ai capitoli e all'ordinamento delle foto
  const saveChanges = async () => {
    setIsSaving(true);
    
    try {
      const promises = [];
      let spostamentiCapitolo = 0;
      let riordiniInterni = 0;
      
      // Per ogni capitolo, verifica le foto che sono state modificate
      for (const chapter of photosByChapter) {
        // Verifica le foto con sortOrder che devono essere aggiornate
        chapter.photos.forEach((photo, currentIndex) => {
          // Diverse casistiche da gestire:
          
          // 1. Foto che ha cambiato capitolo
          if (photo.chapterId !== chapter.id) {
            console.log(`Aggiornamento foto ${photo.id}: da capitolo ${photo.chapterId} a capitolo ${chapter.id}`);
            
            promises.push(
              updatePhotoMutation.mutateAsync({
                photoId: photo.id,
                chapterId: chapter.id,
                sortOrder: currentIndex
              }).then(() => {
                spostamentiCapitolo++;
              })
            );
          } 
          // 2. Foto che è stata riordinata all'interno dello stesso capitolo
          else if ('originalSortOrder' in photo && photo.originalSortOrder !== undefined && 
                  photo.sortOrder !== photo.originalSortOrder) {
            console.log(`Riordinamento foto ${photo.id}: da posizione ${photo.originalSortOrder} a posizione ${currentIndex}`);
            
            promises.push(
              updatePhotoMutation.mutateAsync({
                photoId: photo.id,
                sortOrder: currentIndex
              }).then(() => {
                riordiniInterni++;
              })
            );
          }
        });
      }
      
      // Aspetta che tutte le operazioni siano completate
      await Promise.all(promises);
      
      // Invalida le query per aggiornare i dati
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/gallery/galleries/${galleryId}/photos`] 
      });
      
      // Non è necessario forzare un refetch dopo invalidateQueries, poiché React Query lo fa automaticamente
      
      let messaggio = "";
      if (spostamentiCapitolo > 0 && riordiniInterni > 0) {
        messaggio = `${spostamentiCapitolo} foto ${spostamentiCapitolo === 1 ? 'spostata' : 'spostate'} tra capitoli e ${riordiniInterni} foto ${riordiniInterni === 1 ? 'riordinata' : 'riordinate'}`;
      } else if (spostamentiCapitolo > 0) {
        messaggio = `${spostamentiCapitolo} foto ${spostamentiCapitolo === 1 ? 'spostata' : 'spostate'} tra capitoli`;
      } else if (riordiniInterni > 0) {
        messaggio = `${riordiniInterni} foto ${riordiniInterni === 1 ? 'riordinata' : 'riordinate'} con successo`;
      } else {
        messaggio = "Nessuna modifica effettuata";
      }
      
      toast({
        title: "Modifiche salvate",
        description: messaggio,
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

  const [, setLocation] = useLocation();
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Move className="h-5 w-5" />
            Organizza foto nei capitoli
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              size="sm" 
              onClick={() => setLocation(`/galleries/${galleryId}/chapters/new`)}
              className="mr-2"
            >
              <FolderInput className="h-4 w-4 mr-1" /> Nuovo Capitolo
            </Button>
            <Button 
              onClick={toggleSelectMode} 
              variant={selectMode ? "secondary" : "outline"}
              className="text-xs"
            >
              {selectMode ? (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Annulla selezione
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Selezione multipla
                </>
              )}
            </Button>
            <Button 
              onClick={saveChanges} 
              disabled={!needsSaving || isSaving}
              className={`${needsSaving ? 'animate-pulse bg-primary' : ''}`}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvataggio..." : "Salva modifiche"}
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground mt-2">
          {selectMode 
            ? "Seleziona più foto cliccando su di esse, poi utilizza gli strumenti in basso per spostarle in blocco." 
            : "Trascina le foto per spostarle tra i vari capitoli. Le modifiche saranno effettive dopo aver cliccato su 'Salva modifiche'."}
        </div>
        
        {selectMode && selectedPhotos.length > 0 && (
          <div className="mt-4 p-3 border rounded-md bg-muted/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedPhotos.length} foto selezionate</Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={deselectAll}
                  className="h-8 text-xs"
                >
                  Deseleziona tutte
                </Button>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm whitespace-nowrap">Sposta in:</span>
                <Select
                  value={targetChapterId}
                  onValueChange={setTargetChapterId}
                >
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue placeholder="Seleziona capitolo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Nessun capitolo</SelectItem>
                    {photosByChapter
                      .filter(chapter => chapter.id !== null)
                      .map(chapter => (
                        <SelectItem key={chapter.id} value={String(chapter.id)}>
                          {chapter.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                
                <Button 
                  size="sm"
                  className="h-8" 
                  onClick={moveSelectedPhotos}
                  disabled={!targetChapterId || isMovingBatch}
                >
                  <FolderInput className="h-3.5 w-3.5 mr-1" />
                  {isMovingBatch ? "Spostamento..." : "Sposta foto"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="bg-muted/30 p-2 mb-4 border rounded-sm text-xs text-muted-foreground">
          <div className="flex items-center mb-1">
            <span className="mr-2">💡</span>
            <p><strong>Trascina le foto</strong> per organizzarle tra i capitoli o riordinarle all'interno dello stesso capitolo.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pl-6">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-amber-500 mr-1"></div>
              <span>Sfondo ambra: foto spostata in un altro capitolo</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
              <span>Sfondo blu: foto riordinata nello stesso capitolo</span>
            </div>
          </div>
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
                          <Camera className="h-5 w-5 mb-1" />
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
                              {chapter.photos.map((photo, index) => 
                                selectMode ? (
                                  // Modalità selezione - mostro foto selezionabili con checkbox
                                  <div 
                                    key={photo.id} 
                                    onClick={() => togglePhotoSelection(photo.id)}
                                    className={`relative w-16 h-16 md:w-20 md:h-20 border rounded-md overflow-hidden 
                                      cursor-pointer transition-all hover:scale-105 hover:shadow-md
                                      ${selectedPhotos.includes(photo.id) ? 'ring-2 ring-primary border-primary' : ''}`}
                                    title={photo.title || `Foto ${index + 1}`}
                                  >
                                    <img
                                      src={photo.thumbnailUrl}
                                      alt={photo.title || `Foto ${index + 1}`}
                                      className="object-cover w-full h-full"
                                      loading="lazy"
                                    />
                                    
                                    {/* Indicatore di selezione */}
                                    <div className="absolute top-1 right-1">
                                      {selectedPhotos.includes(photo.id) ? (
                                        <div className="bg-primary text-white rounded-full p-0.5 shadow-sm">
                                          <CheckSquare className="h-3.5 w-3.5" />
                                        </div>
                                      ) : (
                                        <div className="bg-background/70 backdrop-blur-[1px] rounded-full p-0.5 shadow-sm">
                                          <Square className="h-3.5 w-3.5" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  // Modalità drag-and-drop normale
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
                                        {photo.chapterId !== chapter.id ? (
                                          <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center backdrop-blur-[1px]">
                                            <div className="relative">
                                              <span className="text-[10px] text-white font-medium bg-amber-600 px-1.5 py-0.5 rounded-sm shadow-sm">
                                                Spostata
                                              </span>
                                              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-amber-600"></div>
                                            </div>
                                          </div>
                                        ) : 'originalSortOrder' in photo && photo.originalSortOrder !== undefined && 
                                            photo.sortOrder !== photo.originalSortOrder ? (
                                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center backdrop-blur-[1px]">
                                            <div className="relative">
                                              <span className="text-[10px] text-white font-medium bg-blue-600 px-1.5 py-0.5 rounded-sm shadow-sm">
                                                Riordinata
                                              </span>
                                              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-600"></div>
                                            </div>
                                          </div>
                                        ) : null}
                                      </div>
                                    )}
                                  </Draggable>
                                )
                              )}
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