import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PhotoGrid } from "@/components/galleries/photo-grid";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useParams } from "wouter";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Loader2, Heart, MessageCircle, Download, Share2, 
  Lock, Mail, Camera, Calendar, Eye, Facebook, 
  Instagram, Play, Pause, ChevronLeft, ChevronRight, 
  X, ArrowUp, Music, Star 
} from "lucide-react";
import { Photo, GalleryChapter } from "@/types/gallery";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

// Costanti per paginazione
const ITEMS_PER_PAGE = 20;

/**
 * Pagina galleria pubblica
 * 
 * Rifattorizzata per:
 * - Utilizzare queryKey coerenti in React Query
 * - Separare i side-effect dalle funzioni di query
 * - Gestire correttamente la paginazione
 * - Migliorare la gestione dell'autenticazione
 * - Ottimizzare l'aggiornamento delle cache
 */
export default function PublicGalleryPage() {
  const { slug } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Stati principali
  const [page, setPage] = useState(1);
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeChapter, setActiveChapter] = useState<number | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([]);
  
  // Stati UI
  const [visitorInfo, setVisitorInfo] = useState<{ name: string; email: string } | null>(null);
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const [fullscreenView, setFullscreenView] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [slideshow, setSlideshow] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Query per ottenere dati galleria
  const {
    data: gallery,
    isLoading: galleryLoading,
    error: galleryError,
  } = useQuery({
    queryKey: [`/api/gallery/public/galleries/${slug}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/gallery/public/galleries/${slug}`);
      if (!res.ok) {
        throw new Error("Errore nel caricamento della galleria");
      }
      return await res.json();
    },
    enabled: !!slug,
  });

  // Query per ottenere foto
  const {
    data: photosData,
    isLoading: photosLoading,
    error: photosError,
    refetch: refetchPhotos,
  } = useQuery({
    // Formato coerente per query key
    queryKey: [`/api/gallery/galleries/${gallery?.id}/photos`, { page, chapter: activeChapter }],
    queryFn: async () => {
      const res = await apiRequest(
        "GET", 
        `/api/gallery/galleries/${gallery?.id}/photos?page=${page}&limit=${ITEMS_PER_PAGE}${activeChapter ? `&chapter=${activeChapter}` : ''}`
      );
      if (!res.ok) {
        throw new Error("Errore nel caricamento delle foto");
      }
      return await res.json();
    },
    enabled: !!gallery?.id && isAuthorized, // Abilitato solo se autorizzato
  });

  // Query per ottenere capitoli
  const {
    data: chapters = [],
    isLoading: isChaptersLoading,
  } = useQuery({
    queryKey: [`/api/gallery/galleries/${gallery?.id}/chapters`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/gallery/galleries/${gallery?.id}/chapters`);
      if (!res.ok) {
        throw new Error("Errore nel caricamento dei capitoli");
      }
      return await res.json();
    },
    enabled: !!gallery?.id && isAuthorized, // Abilitato solo se autorizzato
  });

  // Autenticazione con password
  const authenticateGallery = async () => {
    try {
      const response = await apiRequest("POST", `/api/gallery/public/galleries/${slug}/auth`, {
        password
      });
      
      if (!response.ok) {
        throw new Error("Password non valida");
      }

      // Imposta stato autorizzato e mostra feedback
      setIsAuthorized(true);
      toast({
        title: "Accesso effettuato",
        description: "Benvenuto nella galleria",
      });

      // Invalida tutte le query pertinenti
      if (gallery?.id) {
        queryClient.invalidateQueries({
          queryKey: [`/api/gallery/galleries/${gallery.id}/photos`]
        });
        
        queryClient.invalidateQueries({
          queryKey: [`/api/gallery/galleries/${gallery.id}/chapters`]
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Password non valida",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (chapters.length > 0 && activeChapter === null) {
      setActiveChapter(chapters[0].id);
    }
  }, [chapters, activeChapter]);

  useEffect(() => {
    if (activeChapter !== null && gallery) {
      refetchPhotos();
    }
  }, [activeChapter, gallery, refetchPhotos]);


  if (galleryLoading) {
    return <div>Caricamento...</div>;
  }

  if (galleryError) {
    return <div>Errore nel caricamento della galleria</div>;
  }

  if (!gallery) {
    return <div>Galleria non trovata</div>;
  }

  if (!isAuthorized && gallery.password) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6">
        <h1 className="text-2xl font-bold mb-4">Galleria protetta</h1>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Inserisci la password"
          className="mb-4"
        />
        <Button onClick={authenticateGallery}>Accedi</Button>
      </div>
    );
  }

  const photos = photosData?.photos ?? [];
  const pagination = photosData?.pagination;

  return (
    <div className="min-h-screen bg-background">
      {renderFullscreenView()}

      <div className="h-screen flex flex-col overflow-hidden">
        <div
          className="h-[50vh] lg:h-[70vh] bg-cover bg-center relative border-b border-muted"
          style={{
            backgroundImage: gallery.coverImage
              ? `url(/uploads/galleries/${gallery.coverImage})`
              : "linear-gradient(to right, hsl(var(--primary)/70%), hsl(var(--primary-foreground)/40%))"
          }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col justify-end p-8">
            <div className="max-w-screen-xl mx-auto w-full">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 font-serif">{gallery.name}</h1>
              {gallery.description && (
                <p className="text-white/90 max-w-2xl mb-5 leading-relaxed">{gallery.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-5 mb-6">
                <div className="flex items-center text-white/90">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="text-sm">
                    {gallery.createdAt && format(new Date(gallery.createdAt), "d MMMM yyyy", { locale: it })}
                  </span>
                </div>

                {gallery.viewCount > 0 && (
                  <div className="flex items-center text-white/90">
                    <Eye className="h-4 w-4 mr-2" />
                    <span className="text-sm">{gallery.viewCount} visualizzazioni</span>
                  </div>
                )}

                {gallery.event && (
                  <Badge variant="outline" className="text-white border-white/30 bg-white/10">
                    <Camera className="h-3 w-3 mr-1" />
                    {gallery.event.title}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-white border-white/30 bg-white/10 hover:bg-white/20"
                        onClick={() => handleShare('facebook')}
                      >
                        <Facebook className="h-4 w-4 mr-2" />
                        Condividi
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Condividi su Facebook</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-white border-white/30 bg-white/10 hover:bg-white/20"
                        onClick={() => handleShare('email')}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Invia
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Invia per email</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-white border-white/30 bg-white/10 hover:bg-white/20"
                        onClick={() => handleShare('copy')}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Copia link
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copia il link negli appunti</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea
          className="flex-1 overflow-auto"
          ref={contentRef}
        >
          <div className="max-w-screen-xl mx-auto w-full p-4 md:p-8">

            {photos.length > 0 && photos.some(p => p.isFeatured) && (
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-primary/10 text-primary rounded-full p-2">
                    <Star className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold">Foto in evidenza</h2>
                </div>
                <div className="bg-muted/30 p-6 rounded-2xl border border-muted">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {photos.filter(p => p.isFeatured).map((featuredPhoto) => (
                      <div
                        key={featuredPhoto.id}
                        className="relative group overflow-hidden rounded-xl shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px]"
                        onClick={() => {
                          const photoIndex = photos.findIndex(p => p.id === featuredPhoto.id);
                          if (photoIndex !== -1) {
                            setCurrentPhotoIndex(photoIndex);
                            setFullscreenView(true);
                          }
                        }}
                      >
                        <div className="relative aspect-square">
                          <img
                            src={featuredPhoto.largeUrl || featuredPhoto.url || `/uploads/galleries/large/${featuredPhoto.filename}`}
                            alt={featuredPhoto.title || "Foto in evidenza"}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/assets/image-placeholder.svg";
                              target.onerror = null;
                            }}
                          />

                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                            <Star className="absolute top-4 right-4 h-5 w-5 text-yellow-400 drop-shadow-md" />

                            {featuredPhoto.title && (
                              <h3 className="text-lg font-bold text-white">{featuredPhoto.title}</h3>
                            )}
                            {featuredPhoto.description && (
                              <p className="text-sm text-white/90 mt-1 line-clamp-2">{featuredPhoto.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="absolute top-3 left-3 bg-yellow-500/90 text-white rounded-full px-3 py-1 text-xs font-medium shadow-md flex items-center">
                          <Star className="h-3 w-3 mr-1" />
                          In evidenza
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {chapters.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Capitoli</h2>
                <Tabs
                  defaultValue={String(activeChapter || chapters[0]?.id)}
                  value={String(activeChapter || chapters[0]?.id)}
                  onValueChange={(value) => {
                    setActiveChapter(Number(value));
                  }}
                >
                  <div className="border-b mb-4 overflow-x-auto">
                    <TabsList className="mb-0 flex-nowrap">
                      {chapters.map((chapter: GalleryChapter) => (
                        <TabsTrigger
                          key={chapter.id}
                          value={String(chapter.id)}
                          className={`whitespace-nowrap ${
                            activeChapter === chapter.id ? 'bg-primary/20 font-medium' : ''
                          }`}
                        >
                          {chapter.title}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {chapters.map((chapter: GalleryChapter) => (
                    <TabsContent key={chapter.id} value={String(chapter.id)}>
                      <div className="mb-6 bg-muted/30 rounded-lg p-6 border border-muted">
                        <h3 className="text-xl font-semibold mb-2">{chapter.title}</h3>
                        {chapter.description && (
                          <p className="text-muted-foreground">
                            {chapter.description}
                          </p>
                        )}
                        {chapter.coverImage && (
                          <div className="mt-4 rounded-md overflow-hidden shadow-md">
                            <img
                              src={chapter.coverImage}
                              alt={`Copertina: ${chapter.title}`}
                              className="w-full h-40 object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}

            <div className="mb-16">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary rounded-full p-2">
                    <Camera className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold">
                    Galleria Fotografica
                    {activeChapter && (
                      <>
                        <span className="mx-2 text-muted-foreground">›</span>
                        <span className="text-primary">
                          {chapters.find(c => c.id === activeChapter)?.title || 'Capitolo'}
                        </span>
                      </>
                    )}
                  </h2>
                </div>

                {gallery.downloadEnabled && photos.length > 0 && (
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() => window.open(`/api/gallery/galleries/${gallery.id}/download-all`, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                            <span className="hidden md:inline">Scarica tutte</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Scarica tutte le foto</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {activeChapter && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                              onClick={() => window.open(`/api/gallery/galleries/${gallery.id}/download-all?chapter=${activeChapter}`, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                              <span className="hidden md:inline">Scarica capitolo</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Scarica solo foto di questo capitolo</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}
              </div>

              {photosLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-xl" />
                  ))}
                </div>
              ) : photos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
                  <div className="flex flex-col items-center justify-center p-8">
                    <Camera className="h-12 w-12 text-muted-foreground/40 mb-4" />
                    {activeChapter ? (
                      <>
                        <span className="block text-lg font-medium">
                          Nessuna foto in {chapters.find(c => c.id === activeChapter)?.title || 'questo capitolo'}
                        </span>
                        <p className="text-sm text-muted-foreground mt-2">
                          Questo capitolo non contiene ancora fotografie.
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => setActiveChapter(null)}
                        >
                          Visualizza tutte le foto
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="block text-lg font-medium">Nessuna foto in questa galleria</span>
                        <p className="text-sm text-muted-foreground mt-2">
                          Le foto verranno aggiunte presto, torna a controllare più tardi.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-background rounded-xl p-1">
                  <div className="bg-muted/20 rounded-lg border p-4 md:p-6">
                    <PhotoGrid
                      photos={photos}
                      onPhotoClick={(photo, index) => {
                        setCurrentPhotoIndex(index);
                        setFullscreenView(true);
                      }}
                      onPhotoSelect={gallery.selectionEnabled ? handlePhotoSelect : undefined}
                      selectedPhotos={selectedPhotos}
                    />

                    {pagination && pagination.totalPages > 1 && (
                      <Pagination
                        className="mt-8"
                        currentPage={page}
                        totalPages={pagination.totalPages}
                        onPageChange={setPage}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {gallery.notificationsEnabled && (
              <div className="mt-16 border-t pt-12">
                <div className="max-w-xl mx-auto text-center">
                  <h3 className="text-xl font-bold mb-4">Ricevi aggiornamenti</h3>
                  <p className="text-muted-foreground mb-6">
                    Inserisci la tua email per ricevere una notifica quando vengono aggiunte nuove foto a questa galleria.
                  </p>

                  <form onSubmit={handleSubscribe} className="flex gap-2">
                    <input
                      type="email"
                      value={subscribeEmail}
                      onChange={(e) => setSubscribeEmail(e.target.value)}
                      placeholder="La tua email"
                      className="flex-1 px-4 py-2 border rounded-md"
                      required
                    />
                    <Button type="submit" disabled={subscribing}>
                      {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Iscriviti"}
                    </Button>
                  </form>
                </div>
              </div>
            )}

            <footer className="mt-20 mb-8 border-t pt-8 text-center text-muted-foreground text-sm">
              <p className="mb-1">© {new Date().getFullYear()} {gallery.studio || "ImageStudio"}</p>
              <p>Tutte le immagini sono protette da copyright e non possono essere utilizzate senza permesso.</p>
            </footer>
          </div>
        </ScrollArea>

        {showBackToTop && (
          <Button
            size="icon"
            variant="outline"
            className="fixed right-4 bottom-4 z-40 bg-background/50 backdrop-blur-sm hover:bg-background/80"
            onClick={scrollToTop}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}

        {gallery.selectionEnabled && selectedPhotos.length > 0 && (
          <PhotoSelectionManager
            count={selectedPhotos.length}
            onSave={handleSaveSelections}
          />
        )}

        {showVisitorForm && (
          <VisitorInfoForm
            open={showVisitorForm}
            onOpenChange={setShowVisitorForm}
            onSubmit={handleVisitorInfoSubmit}
            defaultValues={visitorInfo || undefined}
          />
        )}
      </div>
    </div>
  );
}

const handlePhotoSelect = (photoId: number, selected: boolean) => {
    setSelectedPhotos(prev =>
        selected
            ? [...prev, photoId]
            : prev.filter(id => id !== photoId)
    );

    if (selected && selectedPhotos.length === 0 && !visitorInfo) {
        setShowVisitorForm(true);
    }
};

const handleSaveSelections = async () => {
    if (!gallery?.id || selectedPhotos.length === 0) {
        return;
    }

    if (!visitorInfo) {
        setShowVisitorForm(true);
        return;
    }

    try {
        const response = await apiRequest("POST", `/api/gallery/galleries/selections/batch`, {
            galleryId: gallery.id,
            photoIds: selectedPhotos,
            clientName: visitorInfo.name,
            clientEmail: visitorInfo.email,
            sessionId: Math.random().toString(36).substring(2),
            selectionType: "favorite"
        });

        if (response.ok) {
            setSelectedPhotos([]);
            return await response.json();
        } else {
            throw new Error("Errore nel salvataggio delle selezioni");
        }
    } catch (error) {
        console.error("[Gallery] Errore nel salvataggio delle selezioni:", error);
        throw error;
    }
};

const handleShare = async (platform: string) => {
    if (!gallery) {
        return;
    }

    const url = window.location.href;
    const title = gallery.name;

    try {
        if (platform === 'facebook') {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        } else if (platform === 'email') {
            window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Guarda questa galleria: ${url}`)}`, '_blank');
        } else if (platform === 'copy') {
            await navigator.clipboard.writeText(url);
            toast({
                title: "Link copiato",
                description: "Il link alla galleria è stato copiato negli appunti"
            });
        }

        await apiRequest("POST", `/api/gallery/share`, {
            galleryId: gallery.id,
            platform,
            tagged: false
        });
    } catch (error) {
        console.error("[Gallery] Errore nella condivisione:", error);
    }
};

const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gallery || !subscribeEmail) {
        return;
    }

    setSubscribing(true);

    try {
        const res = await apiRequest("POST", `/api/gallery/subscribe`, {
            galleryId: gallery.id,
            email: subscribeEmail,
            name: visitorInfo?.name || ""
        });

        if (res.ok) {
            toast({
                title: "Iscrizione completata",
                description: "Riceverai notifiche quando verranno aggiunte nuove foto"
            });
            setSubscribeEmail("");
        } else {
            const error = await res.json();
            throw new Error(error.error || "Errore durante l'iscrizione");
        }
    } catch (error) {
        toast({
            title: "Errore",
            description: error instanceof Error ? error.message : "Si è verificato un errore",
            variant: "destructive"
        });
    } finally {
        setSubscribing(false);
    }
};

const renderFullscreenView = () => {
    if (!fullscreenView || photos.length === 0) return null;

    const photo = photos[currentPhotoIndex];
    if (!photo) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="p-2 md:p-4 flex justify-between items-center text-white bg-black/80">
                <div className="flex items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFullscreenView(false)}
                        className="text-white hover:bg-white/20"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                    <span className="ml-2 md:ml-4 text-sm md:text-base">{currentPhotoIndex + 1} / {photos.length}</span>
                </div>

                <div className="flex items-center space-x-1 md:space-x-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSlideshow(!slideshow)}
                        className="text-white hover:bg-white/20 h-8 w-8 md:h-10 md:w-10"
                    >
                        {slideshow ? <Pause className="h-4 w-4 md:h-5 md:w-5" /> : <Play className="h-4 w-4 md:h-5 md:w-5" />}
                    </Button>

                    {gallery?.downloadEnabled && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-white hover:bg-white/20 h-8 w-8 md:h-10 md:w-10"
                                        onClick={() => window.open(`/api/gallery/photos/${photo.id}/download`, '_blank')}
                                    >
                                        <Download className="h-4 w-4 md:h-5 md:w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Scarica foto</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    {gallery?.selectionEnabled && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20 h-8 w-8 md:h-10 md:w-10"
                            onClick={() => handlePhotoSelect(photo.id, !selectedPhotos.includes(photo.id))}
                        >
                            <Heart
                                className={`h-4 w-4 md:h-5 md:w-5 ${selectedPhotos.includes(photo.id) ? 'fill-red-500' : ''}`}
                            />
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                <img
                    src={photo.largeUrl || photo.url || `/uploads/galleries/large/${photo.filename}`}
                    alt={photo.title || "Foto"}
                    className="max-h-full max-w-full object-contain select-none transition-transform duration-500 ease-in-out"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!photo.filename || target.src.includes(`/uploads/galleries/medium/${photo.filename}`)) {
                            target.src = "/assets/image-placeholder.svg";
                            target.onerror = null;
                        } else if (photo.filename) {
                            target.src = `/uploads/galleries/medium/${photo.filename}`;
                        }
                    }}
                />

                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-white bg-black/30 hover:bg-black/50 h-8 w-8 md:h-12 md:w-12 rounded-full"
                    onClick={() => setCurrentPhotoIndex(prevIndex => prevIndex === 0 ? photos.length - 1 : prevIndex - 1)}
                >
                    <ChevronLeft className="h-5 w-5 md:h-8 md:w-8" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-white bg-black/30 hover:bg-black/50 h-8 w-8 md:h-12 md:w-12 rounded-full"
                    onClick={() => setCurrentPhotoIndex(prevIndex => prevIndex === photos.length - 1 ? 0 : prevIndex + 1)}
                >
                    <ChevronRight className="h-5 w-5 md:h-8 md:w-8" />
                </Button>
            </div>

            {photo.title || photo.description ? (
                <div className="p-2 md:p-4 bg-black/80 text-white">
                    {photo.title && <h3 className="text-base md:text-lg font-semibold">{photo.title}</h3>}
                    {photo.description && <p className="text-sm md:text-base text-white/80">{photo.description}</p>}
                </div>
            ) : null}

            <div className="hidden md:flex overflow-x-auto bg-black/90 h-16 p-2 gap-2">
                {photos.map((p, idx) => (
                    <div
                        key={p.id}
                        className={`h-full aspect-square flex-shrink-0 cursor-pointer border-2 transition-all
                ${idx === currentPhotoIndex ? 'border-primary' : 'border-transparent hover:border-white/50'}`}
                        onClick={() => setCurrentPhotoIndex(idx)}
                    >
                        <img
                            src={p.thumbnailUrl || `/uploads/galleries/thumbnails/${p.filename}`}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/assets/image-placeholder.svg";
                                target.onerror = null;
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

const scrollToTop = () => {
    if (contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

const handleVisitorInfoSubmit = (data: { name: string; email: string }) => {
    setVisitorInfo(data);
    setShowVisitorForm(false);
    return Promise.resolve();
};