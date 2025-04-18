import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import {
  Image,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryClient } from "@/lib/queryClient";
import EmptyState from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GalleryGrid } from "@/components/galleries/gallery-grid";
import { GalleryListTable } from "@/components/galleries/gallery-list-table";
import { GallerySkeleton } from "@/components/galleries/gallery-skeleton";
import { GalleryItem } from "@/types/gallery";

export default function GalleriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [location, setLocation] = useLocation();
  
  const { data: galleries, isLoading, error } = useQuery<GalleryItem[]>({
    queryKey: ["/api/gallery/galleries"],
    staleTime: 1000 * 60 * 5, // 5 minuti
  });

  // Filtrare le gallerie in base alla ricerca
  const filteredGalleries = galleries?.filter(gallery =>
    gallery.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gallery.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gallery.event?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtra le gallerie per tab
  const publicGalleries = galleries?.filter(gallery => gallery.isPublic);
  const privateGalleries = galleries?.filter(gallery => !gallery.isPublic);
  const passwordProtectedGalleries = galleries?.filter(gallery => gallery.password);

  // Renderizza i contenuti in base allo stato di caricamento
  const renderGalleryContent = (galleriesToRender?: GalleryItem[]) => {
    if (isLoading) {
      return <GallerySkeleton view={viewMode} />;
    }
    
    if (error) {
      return (
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
      );
    }
    
    if (!galleriesToRender || galleriesToRender.length === 0) {
      return (
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
      );
    }
    
    return viewMode === "grid" 
      ? <GalleryGrid galleries={galleriesToRender} /> 
      : <GalleryListTable galleries={galleriesToRender} />;
  };

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
              {renderGalleryContent(filteredGalleries)}
            </TabsContent>
            
            <TabsContent value="public" className="mt-4">
              {renderGalleryContent(publicGalleries?.filter(gallery => 
                gallery.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                gallery.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                gallery.event?.title.toLowerCase().includes(searchQuery.toLowerCase())
              ))}
            </TabsContent>
            
            <TabsContent value="private" className="mt-4">
              {renderGalleryContent(privateGalleries?.filter(gallery => 
                gallery.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                gallery.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                gallery.event?.title.toLowerCase().includes(searchQuery.toLowerCase())
              ))}
            </TabsContent>
            
            <TabsContent value="password" className="mt-4">
              {renderGalleryContent(passwordProtectedGalleries?.filter(gallery => 
                gallery.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                gallery.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                gallery.event?.title.toLowerCase().includes(searchQuery.toLowerCase())
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}