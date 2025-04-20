import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  const { slug } = useParams();
  const [activeChapter, setActiveChapter] = useState<number | null>(null);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([]);
  const [visitorInfo, setVisitorInfo] = useState<{ name: string; email: string } | null>(null);
  const [showVisitorForm, setShowVisitorForm] = useState(false);

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
    
    if (selected && selectedPhotos.length === 0 && !visitorInfo) {
      setShowVisitorForm(true);
    }
  };
  
  // Gestione del form visitatore
  const handleVisitorInfoSubmit = (data: { name: string; email: string }) => {
    setVisitorInfo(data);
    setShowVisitorForm(false);
    return Promise.resolve();
  };
  
  // Salvataggio delle selezioni
  const handleSaveSelections = async () => {
    if (!gallery?.id || selectedPhotos.length === 0) return;
    
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
        sessionId: Math.random().toString(36).substring(2), // Semplice ID di sessione per demo
        selectionType: "favorite"
      });
      
      if (response.ok) {
        // Resetta le selezioni dopo il salvataggio
        setSelectedPhotos([]);
        return await response.json();
      } else {
        throw new Error("Errore nel salvataggio delle selezioni");
      }
    } catch (error) {
      console.error("Errore nel salvataggio delle selezioni:", error);
      throw error;
    }
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

  // Stati per la visualizzazione a schermo intero
  const [fullscreenView, setFullscreenView] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [slideshow, setSlideshow] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);

  // Monitoraggio dello scroll per mostrare/nascondere il pulsante "Torna su"
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        setShowBackToTop(contentRef.current.scrollTop > 300);
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Gestione del slideshow
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (slideshow && fullscreenView) {
      interval = setInterval(() => {
        setCurrentPhotoIndex(prevIndex => 
          prevIndex === photos.length - 1 ? 0 : prevIndex + 1
        );
      }, 5000);
    }
    
    return () => clearInterval(interval);
  }, [slideshow, fullscreenView, photos.length]);

  // Gestione della navigazione con tastiera in modalità fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fullscreenView) return;
      
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
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenView, photos.length]);

  // Funzione per condividere la galleria
  const handleShare = async (platform: string) => {
    if (!gallery) return;
    
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
      await apiRequest("POST", `/api/gallery/share`, {
        galleryId: gallery.id,
        platform,
        tagged: false
      });
    } catch (error) {
      console.error("Errore nella condivisione:", error);
    }
  };

  // Funzione per iscriversi agli aggiornamenti
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gallery || !subscribeEmail) return;
    
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

  // Rendering della visualizzazione a schermo intero
  const renderFullscreenView = () => {
    if (!fullscreenView || photos.length === 0) return null;
    
    const photo = photos[currentPhotoIndex];
    
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Barra superiore */}
        <div className="p-4 flex justify-between items-center text-white bg-black/80">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setFullscreenView(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
            <span className="ml-4">{currentPhotoIndex + 1} / {photos.length}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSlideshow(!slideshow)}
              className="text-white hover:bg-white/20"
            >
              {slideshow ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            
            {gallery.selectionEnabled && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => handlePhotoSelect(photo.id, !selectedPhotos.includes(photo.id))}
              >
                <Heart 
                  className={`h-5 w-5 ${selectedPhotos.includes(photo.id) ? 'fill-red-500' : ''}`}
                />
              </Button>
            )}
          </div>
        </div>
        
        {/* Contenuto foto */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          <img 
            src={photo.url} 
            alt={photo.title || "Foto"} 
            className="max-h-full max-w-full object-contain select-none transition-transform duration-500 ease-in-out"
          />
          
          {/* Navigazione */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/30 hover:bg-black/50 h-12 w-12 rounded-full"
            onClick={() => setCurrentPhotoIndex(prevIndex => prevIndex === 0 ? photos.length - 1 : prevIndex - 1)}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/30 hover:bg-black/50 h-12 w-12 rounded-full"
            onClick={() => setCurrentPhotoIndex(prevIndex => prevIndex === photos.length - 1 ? 0 : prevIndex + 1)}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </div>
        
        {/* Info foto */}
        {photo.title || photo.caption ? (
          <div className="p-4 bg-black/80 text-white">
            {photo.title && <h3 className="text-lg font-semibold">{photo.title}</h3>}
            {photo.caption && <p className="text-white/80">{photo.caption}</p>}
          </div>
        ) : null}
      </div>
    );
  };

  // Funzione per tornare in cima alla pagina
  const scrollToTop = () => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
              ? `url(${gallery.coverImage})` 
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
                    {format(new Date(gallery.createdAt), "d MMMM yyyy", { locale: it })}
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
        <ScrollArea className="flex-1" ref={contentRef}>
          <div className="max-w-screen-xl mx-auto px-4 py-8">
            {/* Capitoli della galleria (se presenti) */}
            {chapters.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center mb-6">
                  <h2 className="text-2xl font-bold font-serif">La storia in capitoli</h2>
                  <div className="ml-4 flex-1 h-px bg-muted"></div>
                </div>
                
                <Tabs 
                  value={activeChapter?.toString() || "all"} 
                  onValueChange={(value) => {
                    if (value === "all") {
                      setActiveChapter(null);
                    } else {
                      setActiveChapter(Number(value));
                    }
                  }}
                  className="w-full"
                >
                  <div className="mb-6 overflow-x-auto">
                    <TabsList className="mb-4 inline-flex h-auto p-1 w-auto">
                      <TabsTrigger 
                        value="all" 
                        className="px-4 py-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        Tutte le foto
                      </TabsTrigger>
                      {chapters.map((chapter: GalleryChapter) => (
                        <TabsTrigger 
                          key={chapter.id} 
                          value={chapter.id.toString()}
                          className="px-4 py-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          {chapter.title}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  <TabsContent value="all">
                    <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-muted">
                      <p className="text-muted-foreground italic">
                        Visualizzazione di tutte le foto della galleria
                      </p>
                    </div>
                  </TabsContent>

                  {chapters.map((chapter: GalleryChapter) => (
                    <TabsContent key={chapter.id} value={chapter.id.toString()}>
                      {chapter.description && (
                        <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-muted">
                          <h3 className="font-medium mb-2">{chapter.title}</h3>
                          <p className="text-muted-foreground">
                            {chapter.description}
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
                <Separator className="my-6" />
              </div>
            )}

            {/* Form raccolta dati visitatore */}
            {showVisitorForm && (
              <div className="mb-8">
                <VisitorInfoForm 
                  onSubmit={handleVisitorInfoSubmit}
                  title="I tuoi dati"
                  description="Per salvare le tue selezioni, abbiamo bisogno di alcune informazioni."
                />
              </div>
            )}
            
            {/* Manager delle selezioni */}
            {gallery.selectionEnabled && selectedPhotos.length > 0 && (
              <div className="mb-8 sticky top-0 z-10">
                <PhotoSelectionManager
                  galleryId={gallery.id}
                  selectedPhotos={selectedPhotos}
                  onClearSelection={() => setSelectedPhotos([])}
                  visitorInfo={visitorInfo}
                  onSaveSelections={handleSaveSelections}
                />
              </div>
            )}

            {/* Griglia di foto */}
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <h2 className="text-2xl font-bold font-serif">Galleria fotografica</h2>
                <div className="ml-4 flex-1 h-px bg-muted"></div>
              </div>
              
              {isPhotosLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p>Caricamento foto in corso...</p>
                </div>
              ) : photos.length > 0 ? (
                <div className="space-y-6">
                  {/* Controlli galleria */}
                  <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                    <div className="text-sm text-muted-foreground">
                      {pagination.total} foto{activeChapter ? " in questo capitolo" : ""}
                    </div>
                    
                    <div className="flex gap-2">
                      {gallery.selectionEnabled && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center"
                          onClick={() => {
                            if (selectedPhotos.length > 0) {
                              setSelectedPhotos([]);
                            } else if (!visitorInfo) {
                              setShowVisitorForm(true);
                            }
                          }}
                        >
                          <Heart className={`h-4 w-4 mr-2 ${selectedPhotos.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                          {selectedPhotos.length > 0 
                            ? `${selectedPhotos.length} selezionate` 
                            : "Seleziona preferite"}
                        </Button>
                      )}
                      
                      {photos.length > 0 && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => {
                            setCurrentPhotoIndex(0);
                            setFullscreenView(true);
                          }}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Slideshow
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Rendering griglia foto */}
                  <PhotoGrid 
                    photos={photos} 
                    selectable={gallery.selectionEnabled} 
                    onPhotoSelect={handlePhotoSelect}
                    selectedPhotos={selectedPhotos}
                    onPhotoClick={(index) => {
                      setCurrentPhotoIndex(index);
                      setFullscreenView(true);
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed rounded-lg">
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nessuna foto disponibile in questa galleria.
                  </p>
                </div>
              )}

              {/* Paginazione (se necessario) */}
              {pagination && pagination.pages > 1 && (
                <div className="flex justify-center mt-8">
                  <div className="flex gap-1">
                    {Array.from({ length: pagination.pages }, (_, i) => (
                      <Button 
                        key={i} 
                        variant={pagination.page === i + 1 ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        disabled={pagination.page === i + 1}
                      >
                        {i + 1}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Sezione iscrizione */}
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <h2 className="text-2xl font-bold font-serif">Resta aggiornato</h2>
                <div className="ml-4 flex-1 h-px bg-muted"></div>
              </div>
              
              <Card className="border border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mail className="h-5 w-5 mr-2" />
                    Ricevi aggiornamenti
                  </CardTitle>
                  <CardDescription>
                    Iscriviti per ricevere notifiche quando vengono aggiunte nuove foto a questa galleria
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      placeholder="La tua email"
                      value={subscribeEmail}
                      onChange={(e) => setSubscribeEmail(e.target.value)}
                      required
                      className="flex-1 px-3 py-2 border rounded-md"
                    />
                    <Button type="submit" disabled={subscribing}>
                      {subscribing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Iscriviti
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
            
            {/* Footer */}
            <footer className="mt-12 border-t pt-6 pb-12">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="mb-6 md:mb-0">
                  <h3 className="text-lg font-bold mb-1">ImageStudio</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Fotografia di matrimoni ed eventi speciali. Catturiamo i momenti più preziosi con uno stile unico e raffinato.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Facebook className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Seguici su Facebook</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Instagram className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Seguici su Instagram</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Mail className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Contattaci</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground mt-8">
                &copy; {new Date().getFullYear()} ImageStudio. Tutti i diritti riservati.
              </div>
            </footer>
          </div>
          
          {/* Pulsante torna su */}
          {showBackToTop && (
            <Button
              className="fixed bottom-6 right-6 h-10 w-10 rounded-full shadow-lg"
              onClick={scrollToTop}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}