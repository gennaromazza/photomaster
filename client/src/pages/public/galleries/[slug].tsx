import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoGrid } from "@/components/galleries/photo-grid";
import { Loader2, Heart, MessageCircle, Download, Share2, Lock } from "lucide-react";
import { Photo, GalleryChapter } from "@/types/gallery";
import { apiRequest } from "@/lib/queryClient";

export default function PublicGalleryPage() {
  const { slug } = useParams();
  const [activeChapter, setActiveChapter] = useState<number | null>(null);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([]);

  // Query per ottenere i dettagli della galleria
  const { data: gallery, isLoading: isGalleryLoading, error: galleryError } = useQuery({
    queryKey: [`/api/gallery/public/galleries/${slug}`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/gallery/public/galleries/${slug}`);
        
        if (res.status === 401) {
          setIsPasswordProtected(true);
          return null;
        }
        
        if (!res.ok) {
          throw new Error("Errore nel caricamento della galleria");
        }
        
        return await res.json();
      } catch (error) {
        console.error("Errore nel caricamento della galleria:", error);
        throw error;
      }
    },
    retry: false,
    enabled: !isPasswordProtected || isAuthorized
  });

  // Query per ottenere i capitoli della galleria
  const { data: chapters = [], isLoading: isChaptersLoading } = useQuery({
    queryKey: [`/api/gallery/galleries/${gallery?.id}/chapters`],
    enabled: !!gallery?.id && isAuthorized,
  });

  // Query per ottenere le foto della galleria
  const { data: photosData, isLoading: isPhotosLoading } = useQuery({
    queryKey: [`/api/gallery/galleries/${gallery?.id}/photos`, { chapter: activeChapter }],
    enabled: !!gallery?.id && isAuthorized,
  });
  
  const photos: Photo[] = photosData?.photos || [];
  const pagination = photosData?.pagination || { total: 0, page: 1, limit: 50, pages: 0 };

  // Se non ci sono capitoli attivi ma esistono capitoli, imposta il primo come attivo
  useEffect(() => {
    if (chapters.length > 0 && activeChapter === null) {
      setActiveChapter(chapters[0].id);
    }
  }, [chapters, activeChapter]);

  // Gestione dell'autenticazione con password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await apiRequest("POST", `/api/gallery/public/galleries/${slug}/authenticate`, { password });
      
      if (res.ok) {
        setIsAuthorized(true);
      } else {
        alert("Password non valida");
      }
    } catch (error) {
      console.error("Errore nell'autenticazione:", error);
      alert("Si è verificato un errore durante l'autenticazione");
    }
  };

  // Gestione della selezione delle foto
  const handlePhotoSelect = (photoId: number, selected: boolean) => {
    setSelectedPhotos(prev => 
      selected 
        ? [...prev, photoId] 
        : prev.filter(id => id !== photoId)
    );
  };

  // Se la galleria richiede una password e l'utente non è autorizzato
  if (isPasswordProtected && !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/20">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="mr-2 h-5 w-5" />
              Galleria protetta
            </CardTitle>
            <CardDescription>
              Questa galleria è protetta da password. Inserisci la password per accedere.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Accedi
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-between text-xs text-muted-foreground">
            <p>© ImageStudio</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Stato di caricamento
  if (isGalleryLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4">Caricamento galleria...</p>
      </div>
    );
  }

  // Stato di errore
  if (galleryError || !gallery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Galleria non trovata</h1>
          <p className="mb-6">
            La galleria che stai cercando non esiste o non è più disponibile.
          </p>
          <Button onClick={() => window.history.back()}>
            Torna indietro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header della galleria */}
      <div 
        className="h-80 bg-cover bg-center relative"
        style={{ 
          backgroundImage: gallery.coverImage 
            ? `url(${gallery.coverImage})` 
            : "linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary-foreground)))"
        }}
      >
        <div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-8">
          <div className="max-w-screen-xl mx-auto w-full">
            <h1 className="text-4xl font-bold text-white mb-2">{gallery.name}</h1>
            {gallery.description && (
              <p className="text-white/90 max-w-2xl mb-4">{gallery.description}</p>
            )}
            <div className="flex items-center space-x-4">
              <div className="text-white/80 text-sm">
                {new Date(gallery.createdAt).toLocaleDateString()}
              </div>
              {gallery.viewCount > 0 && (
                <div className="text-white/80 text-sm">
                  {gallery.viewCount} visualizzazioni
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Capitoli della galleria (se presenti) */}
        {chapters.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Capitoli</h2>
            <Tabs 
              value={activeChapter?.toString()} 
              onValueChange={(value) => setActiveChapter(Number(value))}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="all">Tutte le foto</TabsTrigger>
                {chapters.map((chapter: GalleryChapter) => (
                  <TabsTrigger key={chapter.id} value={chapter.id.toString()}>
                    {chapter.title}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="all">
                <div className="mb-4">
                  <p className="text-muted-foreground">
                    Visualizzazione di tutte le foto della galleria.
                  </p>
                </div>
              </TabsContent>

              {chapters.map((chapter: GalleryChapter) => (
                <TabsContent key={chapter.id} value={chapter.id.toString()}>
                  <div className="mb-4">
                    {chapter.description && (
                      <p className="text-muted-foreground">
                        {chapter.description}
                      </p>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
            <Separator className="my-6" />
          </div>
        )}

        {/* Foto selezionate (se presenti) */}
        {selectedPhotos.length > 0 && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Foto selezionate: {selectedPhotos.length}</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedPhotos([])}
                >
                  Cancella selezione
                </Button>
                {gallery.selectionEnabled && (
                  <Button size="sm">
                    Salva selezione
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Griglia di foto */}
        {isPhotosLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : photos.length > 0 ? (
          <PhotoGrid 
            photos={photos} 
            selectable={gallery.selectionEnabled} 
            onPhotoSelect={handlePhotoSelect}
            selectedPhotos={selectedPhotos}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nessuna foto disponibile in questa galleria.
            </p>
          </div>
        )}

        {/* Paginazione (da implementare se necessario) */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center mt-8">
            {/* Componente di paginazione qui */}
          </div>
        )}
      </div>
    </div>
  );
}