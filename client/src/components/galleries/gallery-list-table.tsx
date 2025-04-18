import { useState } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Eye,
  Image,
  Edit,
  Trash2,
  Share,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GalleryItem } from "@/types/gallery";

interface GalleryListTableProps {
  galleries: GalleryItem[];
}

export function GalleryListTable({ galleries }: GalleryListTableProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteGalleryId, setDeleteGalleryId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const galleryToDelete = galleries.find(g => g.id === deleteGalleryId);

  const handleDeleteClick = (galleryId: number) => {
    setDeleteGalleryId(galleryId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteGalleryId) return;
    
    try {
      await apiRequest("DELETE", `/api/gallery/galleries/${deleteGalleryId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/galleries"] });
      toast({
        title: "Galleria eliminata",
        description: "La galleria è stata eliminata con successo",
      });
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Errore nell'eliminazione della galleria:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione della galleria",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Visualizzazioni</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {galleries.map((gallery) => (
              <TableRow key={gallery.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-md overflow-hidden mr-2 bg-muted">
                      <img
                        src={gallery.coverImage || "/assets/gallery-placeholder.jpg"}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="truncate max-w-[200px]">{gallery.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {gallery.event?.title || <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>
                  <Badge variant={gallery.isPublic ? "default" : "secondary"}>
                    {gallery.isPublic ? "Pubblica" : "Privata"}
                  </Badge>
                  {gallery.password && (
                    <Badge variant="outline" className="ml-1">
                      Protetta
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{gallery.viewCount}</TableCell>
                <TableCell>
                  {format(new Date(gallery.createdAt), "dd/MM/yyyy", { locale: it })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                      <Link to={`/galleries/${gallery.id}/view`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                      <Link to={`/galleries/${gallery.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                      <Link to={`/galleries/${gallery.id}/photos`}>
                        <Image className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                      <Link to={`/galleries/${gallery.id}/share`}>
                        <Share className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteClick(gallery.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare la galleria "{galleryToDelete?.name}"?
              Questa azione non può essere annullata e tutte le foto associate verranno eliminate.
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