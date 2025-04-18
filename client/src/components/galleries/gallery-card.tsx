import { useState } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Eye,
  Image,
  Edit,
  Trash2,
  Camera,
  QrCode,
  Calendar,
  MoreHorizontal,
  Share
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { GalleryItem } from "@/types/gallery";

interface GalleryCardProps {
  gallery: GalleryItem;
}

export function GalleryCard({ gallery }: GalleryCardProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const dateCreated = new Date(gallery.createdAt);
  const formattedDate = format(dateCreated, "dd MMMM yyyy", { locale: it });

  const coverImage = gallery.coverImage || "/assets/gallery-placeholder.jpg";

  const handleDelete = async () => {
    try {
      await apiRequest("DELETE", `/api/gallery/galleries/${gallery.id}`);
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
    <Card className="overflow-hidden flex flex-col h-full">
      <div className="relative h-48 overflow-hidden bg-muted">
        <img
          src={coverImage}
          alt={gallery.name}
          className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <Badge variant={gallery.isPublic ? "default" : "secondary"}>
            {gallery.isPublic ? "Pubblica" : "Privata"}
          </Badge>
          {gallery.password && (
            <Badge variant="outline" className="bg-background/80">
              Protetta
            </Badge>
          )}
        </div>
      </div>
      
      <CardHeader className="p-4 pb-0">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl truncate">{gallery.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Azioni</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.open(`/galleries/${gallery.id}/view`, "_blank")}>
                <Eye className="mr-2 h-4 w-4" /> Visualizza
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation(`/galleries/${gallery.id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" /> Modifica
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(`/api/gallery/galleries/${gallery.id}/qr`, "_blank")}>
                <QrCode className="mr-2 h-4 w-4" /> Genera QR Code
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {gallery.event ? (
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {gallery.event.title}
            </div>
          ) : (
            <div className="flex items-center">
              <Camera className="h-3 w-3 mr-1" />
              Galleria indipendente
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2 flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {gallery.description || "Nessuna descrizione"}
        </p>
        
        <div className="mt-3 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{gallery.viewCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Image className="h-3 w-3" />
            <span>-</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex justify-between items-center text-xs text-muted-foreground">
        <span>Creata il {formattedDate}</span>
        
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
            <Link to={`/galleries/${gallery.id}/photos`}>
              <Image className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
            <Link to={`/galleries/${gallery.id}/edit`}>
              <Edit className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
            <Link to={`/galleries/${gallery.id}/share`}>
              <Share className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardFooter>
      
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare la galleria "{gallery.name}"?
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
    </Card>
  );
}