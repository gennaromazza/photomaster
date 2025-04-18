import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Eye,
  Image,
  Edit,
  Trash2,
  Plus,
  Search,
  Camera,
  Link as LinkIcon,
  Share,
  QrCode,
  SlidersHorizontal,
  Calendar,
  MoreHorizontal
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import EmptyState from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface Gallery {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  eventId: number | null;
  status: string;
  password: string | null;
  coverImage: string | null;
  isPublic: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  event?: {
    id: number;
    title: string;
    date: string;
  };
}

function GalleryCard({ gallery }: { gallery: Gallery }) {
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

export default function GalleriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [location, setLocation] = useLocation();
  
  const { data: galleries, isLoading, error } = useQuery<Gallery[]>({
    queryKey: ["/api/gallery/galleries"],
    staleTime: 1000 * 60 * 5, // 5 minuti
  });

  // Filtrare le gallerie in base alla ricerca
  const filteredGalleries = galleries?.filter(gallery =>
    gallery.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gallery.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gallery.event?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container py-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Gallerie Fotografiche</h1>
          
          <Button onClick={() => setLocation("/galleries/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Galleria
          </Button>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cerca gallerie..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className="h-9 w-9"
              >
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="h-2 w-2 rounded-sm bg-current"></div>
                  <div className="h-2 w-2 rounded-sm bg-current"></div>
                  <div className="h-2 w-2 rounded-sm bg-current"></div>
                  <div className="h-2 w-2 rounded-sm bg-current"></div>
                </div>
              </Button>
              
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="h-9 w-9"
              >
                <div className="flex flex-col gap-0.5 items-start">
                  <div className="h-1 w-5 rounded-sm bg-current"></div>
                  <div className="h-1 w-5 rounded-sm bg-current"></div>
                  <div className="h-1 w-5 rounded-sm bg-current"></div>
                </div>
              </Button>
              
              <Button variant="outline" size="icon" className="h-9 w-9">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Tutte</TabsTrigger>
              <TabsTrigger value="public">Pubbliche</TabsTrigger>
              <TabsTrigger value="private">Private</TabsTrigger>
              <TabsTrigger value="password">Protette</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              {isLoading ? (
                viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <Skeleton className="h-48 w-full" />
                        <CardHeader className="p-4 pb-0">
                          <Skeleton className="h-6 w-2/3" />
                          <Skeleton className="h-4 w-1/2 mt-2" />
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                          <Skeleton className="h-4 w-full mt-2" />
                          <Skeleton className="h-4 w-3/4 mt-1" />
                          
                          <div className="mt-3 flex gap-4">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        </CardContent>
                        <CardFooter className="p-4 pt-0 flex justify-between">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-20" />
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
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
                        {[...Array(5)].map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                )
              ) : error ? (
                <EmptyState
                  icon={<Image className="h-10 w-10" />}
                  title="Errore nel caricamento delle gallerie"
                  description="Si è verificato un errore durante il caricamento delle gallerie. Riprova più tardi."
                  action={
                    <Button 
                      onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/gallery/galleries"] })}
                    >
                      Riprova
                    </Button>
                  }
                />
              ) : filteredGalleries?.length === 0 ? (
                <EmptyState
                  icon={<Image className="h-10 w-10" />}
                  title={searchQuery ? "Nessuna galleria trovata" : "Nessuna galleria disponibile"}
                  description={
                    searchQuery
                      ? "Nessuna galleria corrisponde ai criteri di ricerca. Prova a modificare i filtri."
                      : "Inizia a creare la tua prima galleria fotografica."
                  }
                  action={
                    <Button onClick={() => setLocation("/galleries/new")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nuova Galleria
                    </Button>
                  }
                />
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGalleries?.map((gallery) => (
                    <GalleryCard key={gallery.id} gallery={gallery} />
                  ))}
                </div>
              ) : (
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
                      {filteredGalleries?.map((gallery) => (
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
                                onClick={() => {
                                  // Implementazione dell'eliminazione...
                                }}
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
              )}
            </TabsContent>
            
            {/* Altre tabs con filtri specifici */}
            <TabsContent value="public" className="mt-4">
              {/* Contenuto simile al tab "all" ma filtrato per gallerie pubbliche */}
            </TabsContent>
            
            <TabsContent value="private" className="mt-4">
              {/* Contenuto simile al tab "all" ma filtrato per gallerie private */}
            </TabsContent>
            
            <TabsContent value="password" className="mt-4">
              {/* Contenuto simile al tab "all" ma filtrato per gallerie protette da password */}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}