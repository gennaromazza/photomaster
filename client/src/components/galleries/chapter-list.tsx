import { useState } from "react";
import { useLocation } from "wouter";
import {
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Images,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GalleryChapter } from "@/types/gallery";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ChapterListProps {
  chapters: GalleryChapter[];
  galleryId: number;
  onChapterSelect?: (chapterId: number) => void;
  selectedChapterId?: number | null;
  canEdit?: boolean;
  className?: string;
}

export function ChapterList({
  chapters,
  galleryId,
  onChapterSelect,
  selectedChapterId,
  canEdit = false,
  className = "",
}: ChapterListProps) {
  const [location, setLocation] = useLocation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<GalleryChapter | null>(null);
  const { toast } = useToast();

  const handleChapterClick = (chapterId: number) => {
    if (onChapterSelect) {
      onChapterSelect(chapterId);
    }
  };

  const handleDeleteClick = (chapter: GalleryChapter) => {
    setChapterToDelete(chapter);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!chapterToDelete) return;

    try {
      await apiRequest("DELETE", `/api/gallery/chapters/${chapterToDelete.id}`);
      
      queryClient.invalidateQueries({ 
        queryKey: [`/api/gallery/galleries/${galleryId}/chapters`] 
      });
      
      toast({
        title: "Capitolo eliminato",
        description: "Il capitolo è stato eliminato con successo",
      });
      
      setDeleteDialogOpen(false);
      setChapterToDelete(null);
    } catch (error) {
      console.error("Errore nell'eliminazione del capitolo:", error);
      
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione del capitolo",
        variant: "destructive",
      });
    }
  };

  const moveChapter = async (chapterId: number, direction: "up" | "down") => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    const currentIndex = chapters.findIndex(c => c.id === chapterId);
    let targetIndex: number;

    if (direction === "up" && currentIndex > 0) {
      targetIndex = currentIndex - 1;
    } else if (direction === "down" && currentIndex < chapters.length - 1) {
      targetIndex = currentIndex + 1;
    } else {
      return; // Non è possibile spostare
    }

    const targetChapter = chapters[targetIndex];

    try {
      // Scambia l'ordine dei capitoli
      await Promise.all([
        apiRequest("PUT", `/api/gallery/chapters/${chapter.id}`, {
          sortOrder: targetChapter.sortOrder
        }),
        apiRequest("PUT", `/api/gallery/chapters/${targetChapter.id}`, {
          sortOrder: chapter.sortOrder
        })
      ]);

      queryClient.invalidateQueries({ 
        queryKey: [`/api/gallery/galleries/${galleryId}/chapters`] 
      });

      toast({
        title: "Ordine aggiornato",
        description: "L'ordine dei capitoli è stato aggiornato",
      });
    } catch (error) {
      console.error("Errore nello spostamento del capitolo:", error);
      
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante lo spostamento del capitolo",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className={className}>
        <CardHeader className="py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Capitoli della Galleria</CardTitle>
          
          {canEdit && (
            <Button 
              size="sm" 
              onClick={() => setLocation(`/galleries/${galleryId}/chapters/new`)}
            >
              <Plus className="h-4 w-4 mr-1" /> Nuovo Capitolo
            </Button>
          )}
        </CardHeader>
        
        <CardContent className="py-0">
          {chapters.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Images className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Nessun capitolo presente</p>
              {canEdit && (
                <Button 
                  variant="link" 
                  onClick={() => setLocation(`/galleries/${galleryId}/chapters/new`)}
                  className="mt-2"
                >
                  Crea il primo capitolo
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {chapters.map((chapter, index) => (
                <div key={chapter.id}>
                  <div
                    className={`flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors cursor-pointer ${
                      selectedChapterId === chapter.id ? "bg-muted" : ""
                    }`}
                    onClick={() => handleChapterClick(chapter.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <h3 className="font-medium truncate">{chapter.title}</h3>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {/* Qui potrebbe andare il conteggio delle foto, se disponibile */}
                          {chapter.photoCount || 0} foto
                        </Badge>
                      </div>
                      {chapter.description && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {chapter.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/galleries/${galleryId}/chapters/${chapter.id}`);
                            }}>
                              <Edit className="mr-2 h-4 w-4" /> Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              moveChapter(chapter.id, "up");
                            }} disabled={index === 0}>
                              <ArrowUp className="mr-2 h-4 w-4" /> Sposta su
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              moveChapter(chapter.id, "down");
                            }} disabled={index === chapters.length - 1}>
                              <ArrowDown className="mr-2 h-4 w-4" /> Sposta giù
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(chapter);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChapterClick(chapter.id);
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {index < chapters.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare il capitolo "{chapterToDelete?.title}"?
              Tutte le foto associate saranno riportate alla galleria principale.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}