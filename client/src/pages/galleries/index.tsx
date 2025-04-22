import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Image as ImageIcon,
  Settings,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import { GalleryItem } from "@/types/gallery";

// Componente GalleryGrid
function GalleryGrid({ 
  galleries = [], 
  onDeleteClick 
}: { 
  galleries: GalleryItem[], 
  onDeleteClick: (galleryId: number) => void 
}) {
  const [location, setLocation] = useLocation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {galleries.map((gallery) => (
        <div
          key={gallery.id}
          className="group relative"
        >
          <div 
            className="cursor-pointer"
            onClick={() => setLocation(`/galleries/${gallery.id}`)}
          >
            <div className="overflow-hidden rounded-lg aspect-[4/3] bg-muted mb-3 relative">
              {gallery.coverImage ? (
                <img
                  src={`/uploads/galleries/${gallery.coverImage}`}
                  alt={gallery.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/assets/image-placeholder.svg";
                    target.onerror = null;
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <ImageIcon className="h-12 w-12 text-muted-foreground opacity-50" />
                </div>
              )}
              {!gallery.isPublic && (
                <div className="absolute top-2 right-2 bg-background/80 text-foreground px-2 py-1 rounded-md text-xs font-medium">
                  Privata
                </div>
              )}
            </div>
            <h3 className="font-medium text-lg truncate group-hover:text-primary transition-colors">
              {gallery.name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {new Date(gallery.createdAt).toLocaleDateString("it-IT", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          
          {/* Pulsante elimina */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 left-2 h-8 w-8 bg-background/80 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(gallery.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// Componente GalleryList
function GalleryList({ 
  galleries = [],
  onDeleteClick
}: { 
  galleries: GalleryItem[],
  onDeleteClick: (galleryId: number) => void
}) {
  const [location, setLocation] = useLocation();

  return (
    <div className="space-y-3">
      {galleries.map((gallery) => (
        <div
          key={gallery.id}
          className="flex items-center space-x-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors relative group"
        >
          <div 
            className="flex items-center space-x-4 flex-1 cursor-pointer"
            onClick={() => setLocation(`/galleries/${gallery.id}`)}
          >
            <div className="overflow-hidden rounded-md w-16 h-16 bg-muted flex-shrink-0">
              {gallery.coverImage ? (
                <img
                  src={`/uploads/galleries/${gallery.coverImage}`}
                  alt={gallery.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/assets/image-placeholder.svg";
                    target.onerror = null;
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground opacity-50" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{gallery.name}</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(gallery.createdAt).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {!gallery.isPublic && (
                <div className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-xs">
                  Privata
                </div>
              )}
              {gallery.viewCount > 0 && (
                <div className="text-sm text-muted-foreground">
                  {gallery.viewCount} visualizzazioni
                </div>
              )}
            </div>
          </div>

          {/* Pulsante elimina */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(gallery.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function GalleriesPage() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "views">("newest");
  const [filterStatus, setFilterStatus] = useState<"all" | "public" | "private">("all");
  const [deleteGalleryId, setDeleteGalleryId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Funzione per gestire il click sul pulsante elimina
  const handleDeleteClick = (galleryId: number) => {
    setDeleteGalleryId(galleryId);
    setDeleteDialogOpen(true);
  };
  
  // Funzione per gestire la conferma dell'eliminazione
  const handleDeleteConfirm = async () => {
    if (!deleteGalleryId) return;
    
    try {
      await apiRequest("DELETE", `/api/gallery/galleries/${deleteGalleryId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/galleries"] });
      
      toast({
        title: "Galleria eliminata",
        description: "La galleria è stata eliminata con successo",
      });
      
    } catch (error) {
      console.error("Errore nell'eliminazione della galleria:", error);
      toast({
        title: "Errore nell'eliminazione",
        description: "Si è verificato un errore durante l'eliminazione della galleria",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteGalleryId(null);
    }
  };

  // Query per ottenere l'elenco di tutte le gallerie
  const { data: galleries, isLoading } = useQuery({
    queryKey: ["/api/gallery/galleries"],
    queryFn: async () => {
      const response = await fetch("/api/gallery/galleries");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    }
  });

  // Filtro e ordinamento delle gallerie
  const filteredGalleries = galleries 
    ? (Array.isArray(galleries) ? galleries : [])
        .filter((gallery: GalleryItem) => {
          // Filtra per stato pubblico/privato
          if (filterStatus === "public" && !gallery.isPublic) return false;
          if (filterStatus === "private" && gallery.isPublic) return false;

          // Filtra per query di ricerca
          if (searchQuery) {
            return gallery.name.toLowerCase().includes(searchQuery.toLowerCase());
          }
          return true;
        })
        .sort((a: GalleryItem, b: GalleryItem) => {
          // Ordinamento
          switch (sortBy) {
            case "newest":
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case "oldest":
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case "name":
              return a.name.localeCompare(b.name);
            case "views":
              return b.viewCount - a.viewCount;
            default:
              return 0;
          }
        })
    : [];

  // Rendering condizionale durante il caricamento
  if (isLoading) {
    return (
      <div className="container py-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Gallerie</h1>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Skeleton className="h-10 flex-1" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/3] rounded-lg" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Gallerie</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setLocation("/galleries/admin")}
            className="flex items-center"
          >
            <Settings className="h-4 w-4 mr-2" />
            Amministrazione
          </Button>
          <Button onClick={() => setLocation("/galleries/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Galleria
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca gallerie..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ordina per" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Più recenti</SelectItem>
              <SelectItem value="oldest">Meno recenti</SelectItem>
              <SelectItem value="name">Nome</SelectItem>
              <SelectItem value="views">Visualizzazioni</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Filtri</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtra per stato</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={filterStatus === "all"}
                onCheckedChange={() => setFilterStatus("all")}
              >
                Tutte
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterStatus === "public"}
                onCheckedChange={() => setFilterStatus("public")}
              >
                Pubbliche
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterStatus === "private"}
                onCheckedChange={() => setFilterStatus("private")}
              >
                Private
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider>
            <Tabs
              value={viewMode}
              onValueChange={(value: string) => setViewMode(value as "grid" | "list")}
              className="inline-flex"
            >
              <TabsList className="p-0.5 h-10">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value="grid"
                      className="px-3 data-[state=active]:bg-background"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Visualizzazione griglia</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value="list"
                      className="px-3 data-[state=active]:bg-background"
                    >
                      <List className="h-4 w-4" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Visualizzazione lista</TooltipContent>
                </Tooltip>
              </TabsList>
            </Tabs>
          </TooltipProvider>
        </div>
      </div>

      {filteredGalleries.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-10 w-10" />}
          title={
            searchQuery
              ? "Nessun risultato trovato"
              : "Nessuna galleria disponibile"
          }
          description={
            searchQuery
              ? `Nessuna galleria corrisponde alla ricerca "${searchQuery}"`
              : "Inizia creando una nuova galleria per i tuoi clienti"
          }
          action={
            <Button onClick={() => setLocation("/galleries/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Crea nuova galleria
            </Button>
          }
        />
      ) : (
        <>
          {viewMode === "grid" ? (
            <GalleryGrid galleries={filteredGalleries} onDeleteClick={handleDeleteClick} />
          ) : (
            <GalleryList galleries={filteredGalleries} onDeleteClick={handleDeleteClick} />
          )}
        </>
      )}
      
      {/* Dialog di conferma eliminazione */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di voler eliminare questa galleria?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà permanentemente la galleria e tutte le sue foto.
              Non sarà possibile recuperare i dati in seguito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}