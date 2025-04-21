import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  LayoutGrid,
  List,
  Settings as SettingsIcon,
  Upload,
  Image as ImageIcon,
  BookOpen,
  Edit,
  Loader2,
  Share,
  QrCode,
  MoveVertical
} from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GallerySettings } from "@/components/galleries/gallery-settings";
import { PhotoUploader } from "@/components/galleries/photo-uploader";
import { ChapterList } from "@/components/galleries/chapter-list";
import { PhotoGrid } from "@/components/galleries/photo-grid";
import { PhotoChapterManager } from "@/components/galleries/photo-chapter-manager";

export default function GalleryPage() {
  const [, params] = useRoute("/galleries/:id");
  const [location, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState("photos");
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  
  const galleryId = params?.id ? parseInt(params.id) : 0;
  
  // Query per ottenere i dettagli della galleria
  const { data: gallery, isLoading: isLoadingGallery, error: galleryError } = useQuery({
    queryKey: [`/api/gallery/galleries/${galleryId}`],
    enabled: !!galleryId,
  });
  
  // Query per ottenere i capitoli della galleria
  const { data: chaptersData, isLoading: isLoadingChapters } = useQuery({
    queryKey: [`/api/gallery/galleries/${galleryId}/chapters`],
    enabled: !!galleryId,
  });
  
  // Ordina i capitoli per sortOrder
  const chapters = chaptersData ? [...chaptersData].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  
  // Query per ottenere le foto della galleria, filtrate per capitolo se necessario
  const { data: photosData, isLoading: isLoadingPhotos, refetch: refetchPhotos } = useQuery({
    queryKey: [
      `/api/gallery/galleries/${galleryId}/photos`, 
      { chapter: selectedChapterId }
    ],
    enabled: !!galleryId,
  });

  // Query per ottenere gli eventi disponibili
  const { data: events } = useQuery({
    queryKey: ["/api/events"],
  });
  
  const photos = photosData?.photos || [];
  
  // Callback per la selezione del capitolo
  const handleChapterSelect = (chapterId: number) => {
    setSelectedChapterId(chapterId);
    setSelectedTab("photos");
  };
  
  // Callback per il completamento dell'upload
  const handleUploadComplete = () => {
    refetchPhotos();
  };
  
  // Visualizzazioni condizionali in base allo stato di caricamento e agli errori
  if (isLoadingGallery) {
    return (
      <div className="container py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[500px] col-span-2" />
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    );
  }
  
  if (galleryError || !gallery) {
    return (
      <div className="container py-6 max-w-7xl mx-auto">
        <EmptyState
          icon={<ImageIcon className="h-10 w-10" />}
          title="Errore nel caricamento della galleria"
          description="Si è verificato un errore durante il caricamento della galleria. Riprova più tardi."
          action={
            <Button onClick={() => setLocation("/galleries")}>
              Torna alle gallerie
            </Button>
          }
        />
      </div>
    );
  }
  
  return (
    <div className="container py-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/galleries")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight line-clamp-1">
              {gallery.name}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`/public/galleries/${gallery.slug}`, "_blank")}
            >
              <Share className="h-4 w-4 mr-2" />
              Condividi
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`/api/gallery/galleries/${gallery.id}/qr`, "_blank")}
            >
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </Button>
            
            <Button 
              size="sm"
              onClick={() => setLocation(`/galleries/${gallery.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifica galleria
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Colonna sinistra: Capitoli */}
          <div className="md:col-span-3">
            <ChapterList
              chapters={chapters || []}
              galleryId={gallery.id}
              onChapterSelect={handleChapterSelect}
              selectedChapterId={selectedChapterId}
              canEdit={true}
            />
          </div>
          
          {/* Colonna destra: Contenuto principale */}
          <div className="md:col-span-9">
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="photos">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Foto
                </TabsTrigger>
                <TabsTrigger value="upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Carica
                </TabsTrigger>
                <TabsTrigger value="organize">
                  <MoveVertical className="h-4 w-4 mr-2" />
                  Organizza
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Impostazioni
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="photos" className="mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-xl">
                      <LayoutGrid className="h-5 w-5 mr-2" />
                      {selectedChapterId 
                        ? `Foto: ${chapters?.find(c => c.id === selectedChapterId)?.title || 'Capitolo'}`
                        : 'Tutte le foto'}
                    </CardTitle>
                    <CardDescription>
                      {selectedChapterId 
                        ? `Visualizzazione delle foto del capitolo selezionato`
                        : `Visualizzazione di tutte le foto della galleria`}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    {isLoadingPhotos ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                          <Skeleton key={i} className="aspect-square rounded-lg" />
                        ))}
                      </div>
                    ) : photos.length === 0 ? (
                      <EmptyState
                        icon={<ImageIcon className="h-10 w-10" />}
                        title="Nessuna foto trovata"
                        description={
                          selectedChapterId
                            ? "Non ci sono foto in questo capitolo. Carica alcune foto per iniziare."
                            : "Non ci sono foto in questa galleria. Carica alcune foto per iniziare."
                        }
                        action={
                          <Button onClick={() => setSelectedTab("upload")}>
                            <Upload className="h-4 w-4 mr-2" />
                            Carica foto
                          </Button>
                        }
                      />
                    ) : (
                      <PhotoGrid
                        photos={photos}
                        editable={true}
                        onPhotoEdit={(photoId) => {
                          setLocation(`/galleries/${gallery.id}/photos/${photoId}`);
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="upload" className="mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-xl">
                      <Upload className="h-5 w-5 mr-2" />
                      Carica Foto
                    </CardTitle>
                    <CardDescription>
                      Carica nuove foto in questa galleria
                      {selectedChapterId && chapters?.find(c => c.id === selectedChapterId)?.title && 
                        ` nel capitolo "${chapters?.find(c => c.id === selectedChapterId)?.title}"`}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <PhotoUploader
                      galleryId={gallery.id}
                      chapterId={selectedChapterId}
                      onUploadComplete={handleUploadComplete}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="organize" className="mt-0">
                <PhotoChapterManager
                  galleryId={gallery.id}
                />
              </TabsContent>
              
              <TabsContent value="settings" className="mt-0">
                <GallerySettings
                  gallery={gallery}
                  events={events || []}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}