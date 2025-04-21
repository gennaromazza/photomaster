import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PhotoGrid } from "@/components/galleries/photo-grid";
import { PhotoSelectionManager } from "@/components/galleries/photo-selection-manager";
import { VisitorInfoForm } from "@/components/galleries/visitor-info-form";
import { 
  Loader2, 
  Heart, 
  MessageCircle, 
  Download, 
  Share2, 
  Lock, 
  Mail, 
  Camera, 
  Calendar, 
  Eye, 
  Facebook, 
  Instagram, 
  Play, 
  Pause,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUp,
  Music
} from "lucide-react";
import { Photo, GalleryChapter } from "@/types/gallery";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function PublicGalleryPage() {
  console.log("[Gallery] Componente rendering iniziato");
  const { slug } = useParams();
  const { toast } = useToast();

  // Stati per la pagina
  const [activeChapter, setActiveChapter] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([]);
  const [visitorInfo, setVisitorInfo] = useState<{ name: string; email: string } | null>(null);
  const [showVisitorForm, setShowVisitorForm] = useState(false);

  // Stati per la visualizzazione a schermo intero
  const [fullscreenView, setFullscreenView] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [slideshow, setSlideshow] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Query per ottenere i dettagli della galleria
  const { 
    data: gallery, 
    isLoading: isGalleryLoading, 
    error: galleryError 
  } = useQuery({
    queryKey: [`/api/gallery/public/galleries/${slug}`],
    queryFn: async () => {
      console.log("[Gallery] Fetching gallery data for slug:", slug);
      try {
        const res = await apiRequest("GET", `/api/gallery/public/galleries/${slug}`);

        if (res.status === 401) {
          console.log("[Gallery] Gallery richiede password");
          return null;
        }

        if (!res.ok) {
          throw new Error("Errore nel caricamento della galleria");
        }

        const data = await res.json();
        setIsAuthorized(true);
        console.log("[Gallery] Gallery data loaded:", data ? data.id : null);
        return data;
      } catch (error) {
        console.error("[Gallery] Errore nel caricamento della galleria:", error);
        throw error;
      }
    },
    retry: false,
    enabled: true
  });

  // Query per ottenere i capitoli della galleria
  const { 
    data: chaptersData = [], 
    isLoading: isChaptersLoading 
  } = useQuery({
    queryKey: [`/api/gallery/galleries/${gallery?.id}/chapters`],
    queryFn: async () => {
      console.log("[Gallery] Fetching chapters for gallery:", gallery?.id);
      const res = await apiRequest("GET", `/api/gallery/galleries/${gallery?.id}/chapters`);
      if (!res.ok) {
        throw new Error("Errore nel caricamento dei capitoli");
      }
      const data = await res.json();
      console.log("[Gallery] Chapters loaded:", data?.length);
      return data;
    },
    enabled: !!gallery?.id && (!gallery?.password || isAuthorized),
  });
  
  // Ordina i capitoli per sortOrder
  const chapters = chaptersData ? [...chaptersData].sort((a, b) => a.sortOrder - b.sortOrder) : [];

  // Query per ottenere le foto della galleria
  const { 
    data: photosData, 
    isLoading: isLoadingPhotos,
    refetch: refetchPhotos
  } = useQuery({
    queryKey: [`/api/gallery/galleries/${gallery?.id}/photos`, { chapter: activeChapter }],
    queryFn: async () => {
      console.log("[Gallery] Fetching photos for gallery:", gallery?.id, "chapter:", activeChapter);
      // Crea l'URL per la richiesta, usando il parametro chapter solo se è impostato un capitolo attivo
      const url = activeChapter !== null
        ? `/api/gallery/galleries/${gallery?.id}/photos?chapter=${activeChapter}` 
        : `/api/gallery/galleries/${gallery?.id}/photos`;

      console.log("[Gallery] Request URL:", url);
      const res = await apiRequest("GET", url);
      if (!res.ok) {
        throw new Error("Errore nel caricamento delle foto");
      }
      const data = await res.json();
      console.log("[Gallery] Photos loaded:", data?.photos?.length);
      return data;
    },
    enabled: !!gallery?.id && (!gallery?.password || isAuthorized),
  });

  console.log("[Gallery] Photos data:", photosData);
  const photos = photosData?.photos ?? [];
  const pagination = photosData?.pagination || { total: 0, page: 1, limit: 50, pages: 0 };
  
  // Variabile derivata per la protezione con password
  const isPasswordProtected = !!gallery?.password;

  // useEffect per i capitoli: imposta il primo capitolo come attivo se non c'è nessun capitolo attivo
  useEffect(() => {
    console.log("[Gallery] useEffect [chapters, activeChapter]", {chapters: chapters.length, activeChapter});
    if (chapters.length > 0 && activeChapter === null) {
      console.log("[Gallery] Setting first chapter as active:", chapters[0].id);
      setActiveChapter(chapters[0].id);
    }
  }, [chapters, activeChapter]);
  
  // useEffect per ricaricare le foto quando cambia il capitolo attivo
  useEffect(() => {
    if (activeChapter !== null && gallery) {
      console.log("[Gallery] Chapter changed, refetching photos for chapter:", activeChapter);
      refetchPhotos();
    }
  }, [activeChapter, gallery, refetchPhotos]);

  // useEffect per lo scroll: monitoraggio dello scroll per mostrare/nascondere il pulsante "Torna su"
  useEffect(() => {
    console.log("[Gallery] useEffect [] - scroll setup");
    const handleScroll = () => {
      if (contentRef.current) {
        const shouldShow = contentRef.current.scrollTop > 300;
        setShowBackToTop(shouldShow);
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      console.log("[Gallery] Adding scroll listener");
      contentElement.addEventListener('scroll', handleScroll);
      return () => {
        console.log("[Gallery] Removing scroll listener");
        contentElement.removeEventListener('scroll', handleScroll);
      };
    }
    return undefined;
  }, []);

  // useEffect per slideshow: gestione del slideshow
  useEffect(() => {
    console.log("[Gallery] useEffect [slideshow, fullscreenView, photos.length]", 
      {slideshow, fullscreenView, photosLength: photos.length});
    let interval: NodeJS.Timeout;

    if (slideshow && fullscreenView && photos.length > 0) {
      console.log("[Gallery] Starting slideshow interval");
      interval = setInterval(() => {
        setCurrentPhotoIndex(prevIndex => 
          prevIndex === photos.length - 1 ? 0 : prevIndex + 1
        );
      }, 5000);
    }

    return () => {
      if (interval) {
        console.log("[Gallery] Clearing slideshow interval");
        clearInterval(interval);
      }
    };
  }, [slideshow, fullscreenView, photos.length]);

  // useEffect per tastiera: gestione della navigazione con tastiera in modalità fullscreen
  useEffect(() => {
    console.log("[Gallery] useEffect [fullscreenView, photos.length] - keyboard", 
      {fullscreenView, photosLength: photos.length});

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fullscreenView) return;

      console.log("[Gallery] Keyboard event in fullscreen:", e.key);

      if (e.key === 'Escape') {
        setFullscreenView(false);
        setSlideshow(false);
      } else if (e.key === 'ArrowRight') {
        setCurrentPhotoIndex(prevIndex => 
          prevIndex === photos.length - 1 ? 0 : prevIndex + 1
        );
      } else if (e.key === 'ArrowLeft') {
        setCurrentPhotoIndex(prevIndex => 
          prevIndex === 0 ? photos.length - 1 : prevIndex - 1
        );
      } else if (e.key === ' ') {
        e.preventDefault();
        setSlideshow(prev => !prev);
      }
    };

    console.log("[Gallery] Adding keyboard listener");
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      console.log("[Gallery] Removing keyboard listener");
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fullscreenView, photos.length]);

  // Gestione dell'autenticazione con password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Gallery] Attempting password auth for gallery:", slug);

    try {
      // Mostra messaggio di caricamento durante l'autenticazione
      toast({
        title: "Verifica password...",
        description: "Attendere mentre controlliamo le credenziali"
      });

      const res = await apiRequest("POST", `/api/gallery/public/galleries/${slug}/authenticate`, { password });

      if (res.ok) {
        console.log("[Gallery] Password auth successful");
        toast({
          title: "Accesso riuscito",
          description: "Benvenuto nella galleria protetta",
          variant: "default"
        });
        
        // Impostiamo lo stato di autenticazione prima di ricaricare i dati
        setIsAuthorized(true);
        
        // Aggiungiamo un piccolo timeout per assicurarci che lo stato si sia aggiornato
        // prima di ricaricare i dati
        setTimeout(() => {
          // Invalida e ricarica i dati della galleria dopo l'autenticazione
          // invece di ricaricare la pagina intera
          queryClient.invalidateQueries({
            queryKey: [`/api/gallery/public/galleries/${slug}`]
          });
          
          // Dopo che l'utente è autenticato, possiamo abilitare le query per capitoli e foto
          if (gallery?.id) {
            queryClient.invalidateQueries({
              queryKey: [`/api/gallery/galleries/${gallery.id}/chapters`]
            });
            
            queryClient.invalidateQueries({
              queryKey: [`/api/gallery/galleries/${gallery.id}/photos`]
            });
          }
        }, 300);
      } else {
        console.log("[Gallery] Password auth failed");
        toast({
          title: "Accesso negato",
          description: "La password inserita non è corretta",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("[Gallery] Errore nell'autenticazione:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'autenticazione",
        variant: "destructive"
      });
    }
  };

  // Gestione della selezione delle foto
  const handlePhotoSelect = (photoId: number, selected: boolean) => {
    console.log("[Gallery] Photo selection toggle:", {photoId, selected});
    setSelectedPhotos(prev => 
      selected 
        ? [...prev, photoId] 
        : prev.filter(id => id !== photoId)
    );

    if (selected && selectedPhotos.length === 0 && !visitorInfo) {
      console.log("[Gallery] First selection, showing visitor form");
      setShowVisitorForm(true);
    }
  };

  // Gestione del form visitatore
  const handleVisitorInfoSubmit = (data: { name: string; email: string }) => {
    console.log("[Gallery] Visitor info submitted:", data);
    setVisitorInfo(data);
    setShowVisitorForm(false);
    return Promise.resolve();
  };

  // Salvataggio delle selezioni
  const handleSaveSelections = async () => {
    if (!gallery?.id || selectedPhotos.length === 0) {
      console.log("[Gallery] Cannot save selections: no gallery or no selections");
      return;
    }

    if (!visitorInfo) {
      console.log("[Gallery] No visitor info, showing form");
      setShowVisitorForm(true);
      return;
    }

    console.log("[Gallery] Saving selections:", {
      galleryId: gallery.id,
      photoCount: selectedPhotos.length,
      visitorInfo
    });

    try {
      const response = await apiRequest("POST", `/api/gallery/galleries/selections/batch`, {
        galleryId: gallery.id,
        photoIds: selectedPhotos,
        clientName: visitorInfo.name,
        clientEmail: visitorInfo.email,
        sessionId: Math.random().toString(36).substring(2), // Semplice ID di sessione per demo
        selectionType: "favorite"
      });

      if (response.ok) {
        console.log("[Gallery] Selections saved successfully");
        // Resetta le selezioni dopo il salvataggio
        setSelectedPhotos([]);
        return await response.json();
      } else {
        console.log("[Gallery] Error saving selections, response not OK");
        throw new Error("Errore nel salvataggio delle selezioni");
      }
    } catch (error) {
      console.error("[Gallery] Errore nel salvataggio delle selezioni:", error);
      throw error;
    }
  };

  // Funzione per condividere la galleria
  const handleShare = async (platform: string) => {
    if (!gallery) {
      console.log("[Gallery] Cannot share: no gallery data");
      return;
    }

    console.log("[Gallery] Sharing gallery on platform:", platform);
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

      // Traccia la condivisione
      console.log("[Gallery] Tracking share event");
      await apiRequest("POST", `/api/gallery/share`, {
        galleryId: gallery.id,
        platform,
        tagged: false
      });
    } catch (error) {
      console.error("[Gallery] Errore nella condivisione:", error);
    }
  };

  // Funzione per iscriversi agli aggiornamenti
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gallery || !subscribeEmail) {
      console.log("[Gallery] Cannot subscribe: missing gallery or email");
      return;
    }

    console.log("[Gallery] Subscribing to gallery updates:", {
      galleryId: gallery.id,
      email: subscribeEmail
    });

    setSubscribing(true);

    try {
      const res = await apiRequest("POST", `/api/gallery/subscribe`, {
        galleryId: gallery.id,
        email: subscribeEmail,
        name: visitorInfo?.name || ""
      });

      if (res.ok) {
        console.log("[Gallery] Subscription successful");
        toast({
          title: "Iscrizione completata",
          description: "Riceverai notifiche quando verranno aggiunte nuove foto"
        });
        setSubscribeEmail("");
      } else {
        const error = await res.json();
        console.log("[Gallery] Subscription failed:", error);
        throw new Error(error.error || "Errore durante l'iscrizione");
      }
    } catch (error) {
      console.error("[Gallery] Errore nell'iscrizione:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Si è verificato un errore",
        variant: "destructive"
      });
    } finally {
      setSubscribing(false);
    }
  };

  // Rendering della lightbox a schermo intero
  const renderFullscreenView = () => {
    if (!fullscreenView || photos.length === 0) return null;

    const photo = photos[currentPhotoIndex];
    if (!photo) {
      console.log("[Gallery] No photo found for index:", currentPhotoIndex);
      return null;
    }
    
    console.log("[Gallery] Rendering fullscreen view for photo:", photo.id);

    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Barra superiore */}
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

        {/* Contenuto foto */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          <img 
            src={photo.largeUrl || photo.url || `/uploads/galleries/large/${photo.filename}`} 
            alt={photo.title || "Foto"} 
            className="max-h-full max-w-full object-contain select-none transition-transform duration-500 ease-in-out"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              // Preveniamo loop infiniti controllando se abbiamo già provato il fallback
              if (!photo.filename || target.src.includes(`/uploads/galleries/medium/${photo.filename}`)) {
                // Fallback a un'immagine placeholder per evitare loop di errori
                console.log("Utilizzato placeholder per immagine fullscreen");
                target.src = "/assets/image-placeholder.svg";
                target.onerror = null; // Disabilita ulteriori eventi di errore
              } else if (photo.filename) {
                // Prima volta che proviamo il fallback a medium
                console.log("Tentativo fallback medium per fullscreen:", photo.filename);
                target.src = `/uploads/galleries/medium/${photo.filename}`;
              }
            }}
          />

          {/* Navigazione */}
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

        {/* Info foto */}
        {photo.title || photo.description ? (
          <div className="p-2 md:p-4 bg-black/80 text-white">
            {photo.title && <h3 className="text-base md:text-lg font-semibold">{photo.title}</h3>}
            {photo.description && <p className="text-sm md:text-base text-white/80">{photo.description}</p>}
          </div>
        ) : null}

        {/* Miniature delle foto in basso */}
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

  // Funzione per tornare in cima alla pagina
  const scrollToTop = () => {
    console.log("[Gallery] Scrolling to top");
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Se la galleria richiede una password e l'utente non è autorizzato
  if (gallery?.password && !isAuthorized) {
    console.log("[Gallery] Rendering password protected view");
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
    console.log("[Gallery] Rendering loading state");
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4">Caricamento galleria...</p>
      </div>
    );
  }

  // Stato di errore
  if (galleryError || !gallery) {
    console.log("[Gallery] Rendering error state:", galleryError);
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

  // Rendering principale della galleria
  console.log("[Gallery] Rendering main gallery view");
  return (
    <div className="min-h-screen bg-background">
      {/* Visualizzazione a schermo intero */}
      {renderFullscreenView()}

      {/* Contenuto principale */}
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header della galleria */}
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

        {/* Contenuto scrollabile */}
        <ScrollArea 
          className="flex-1 overflow-auto"
          ref={contentRef}
        >
          <div className="max-w-screen-xl mx-auto w-full p-4 md:p-8">
            {/* La copertina è stata rimossa poiché già presente nell'header */}
            
            {/* Foto in evidenza dalla galleria */}
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
            
            {/* Capitoli / Sezioni */}
            {chapters.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Capitoli</h2>
                <Tabs 
                  defaultValue={String(activeChapter || chapters[0]?.id)}
                  value={String(activeChapter || chapters[0]?.id)}
                  onValueChange={(value) => {
                    console.log("[Gallery] Tab value changed to:", value);
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

            {/* Sezione foto */}
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
                
                {/* Pulsanti per scaricare le foto */}
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
              
              {isLoadingPhotos ? (
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
                    {/* Raggruppa le foto per capitolo */}
                    {(() => {
                      // Funzione per raggruppare le foto per capitolo
                      const groupPhotosByChapter = () => {
                        // Creiamo un Map per mantenere l'ordinamento
                        const grouped = new Map<string, Photo[]>();
                        
                        // Aggiungiamo una chiave speciale per le foto senza capitolo
                        grouped.set("Senza capitolo", []);
                        
                        // Aggiungiamo una entry per ogni capitolo
                        chapters.forEach(chapter => {
                          grouped.set(chapter.title, []);
                        });
                        
                        // Distribuiamo le foto nei relativi capitoli
                        photos.forEach(photo => {
                          if (photo.chapterId) {
                            // Troviamo il titolo del capitolo corrispondente
                            const chapter = chapters.find(c => c.id === photo.chapterId);
                            if (chapter) {
                              const photos = grouped.get(chapter.title) || [];
                              photos.push(photo);
                              grouped.set(chapter.title, photos);
                            } else {
                              // Se il capitolo non esiste più, mettiamo la foto tra quelle senza capitolo
                              const uncategorized = grouped.get("Senza capitolo") || [];
                              uncategorized.push(photo);
                              grouped.set("Senza capitolo", uncategorized);
                            }
                          } else {
                            // Foto senza capitolo
                            const uncategorized = grouped.get("Senza capitolo") || [];
                            uncategorized.push(photo);
                            grouped.set("Senza capitolo", uncategorized);
                          }
                        });
                        
                        // Rimuoviamo i capitoli senza foto
                        Array.from(grouped.keys()).forEach(key => {
                          if (grouped.get(key)?.length === 0) {
                            grouped.delete(key);
                          }
                        });
                        
                        return Array.from(grouped.entries());
                      };
                      
                      const groupedPhotos = groupPhotosByChapter();
                      
                      return (
                        <>
                          {groupedPhotos.map(([chapterTitle, chapterPhotos]) => (
                            <div key={chapterTitle} className="mb-10">
                              <h3 className="text-xl font-semibold mb-4 py-2 px-4 bg-muted/50 rounded-lg">
                                {chapterTitle}
                              </h3>
                              <PhotoGrid 
                                photos={chapterPhotos} 
                                onPhotoClick={(photo, index) => {
                                  // Troviamo l'indice globale della foto nell'array completo
                                  const globalIndex = photos.findIndex(p => p.id === photo.id);
                                  setCurrentPhotoIndex(globalIndex !== -1 ? globalIndex : index);
                                  setFullscreenView(true);
                                }}
                                onPhotoSelect={gallery.selectionEnabled ? handlePhotoSelect : undefined}
                                selectedPhotos={selectedPhotos}
                              />
                            </div>
                          ))}
                        </>
                      );
                    })()}

                    {/* Paginazione */}
                    {pagination.pages > 1 && (
                      <div className="flex justify-center items-center mt-8 space-x-1">
                        {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            variant={page === pagination.page ? "default" : "outline"}
                            size="sm"
                            className="w-10 h-10"
                            // onClick={() => setPage(page)}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sezione sottoscrizione */}
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

            {/* Footer */}
            <footer className="mt-20 mb-8 border-t pt-8 text-center text-muted-foreground text-sm">
              <p className="mb-1">© {new Date().getFullYear()} {gallery.studio || "ImageStudio"}</p>
              <p>Tutte le immagini sono protette da copyright e non possono essere utilizzate senza permesso.</p>
            </footer>
          </div>
        </ScrollArea>

        {/* Pulsante torna su */}
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

        {/* Gestione selezioni foto */}
        {gallery.selectionEnabled && selectedPhotos.length > 0 && (
          <PhotoSelectionManager 
            count={selectedPhotos.length}
            onSave={handleSaveSelections}
          />
        )}

        {/* Form informazioni visitatore */}
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