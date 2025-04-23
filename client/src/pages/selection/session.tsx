import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Image as ImageIcon, MessageSquare, Check, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { z } from 'zod';

type GallerySelectionSettings = {
  id: number;
  galleryId: number;
  isEnabled: boolean;
  instructions: string | null;
  minSelections: number;
  maxSelections: number;
  expiresAt: string | null;
  allowComments: boolean;
};

type SelectionSession = {
  id: number;
  galleryId: number;
  clientId: number | null;
  clientName: string;
  clientEmail: string;
  sessionKey: string;
  status: 'active' | 'completed' | 'expired';
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
};

type Photo = {
  id: number;
  galleryId: number;
  title: string | null;
  filename: string;
  url: string;
  thumbnailUrl: string;
  chapterId: number | null;
  chapter?: {
    id: number;
    title: string;
  };
  createdAt: string;
};

type Gallery = {
  id: number;
  name: string;
  description: string | null;
  coverImage: string | null;
  photos: Photo[];
};

type PhotoSelection = {
  id: number;
  photoId: number;
  sessionId: number;
  createdAt: string;
};

type Comment = {
  id: number;
  photoId: number;
  sessionId: number;
  content: string;
  userId: number | null;
  clientName: string | null;
  parentId: number | null;
  isRead: boolean;
  createdAt: string;
  user?: {
    fullName: string;
    username: string;
  };
};

export default function SelectionSessionPage() {
  const { toast } = useToast();
  const [location] = useLocation();
  
  // Estrai parametri dalla URL
  const [key, setKey] = useState('');
  const [galleryId, setGalleryId] = useState<number>(0);
  
  // Stati
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SelectionSession | null>(null);
  const [settings, setSettings] = useState<GallerySelectionSettings | null>(null);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [selections, setSelections] = useState<PhotoSelection[]>([]);
  const [remainingSelections, setRemainingSelections] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('gallery');
  const [commentPhotoId, setCommentPhotoId] = useState<number | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<Photo | null>(null);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [chapters, setChapters] = useState<Map<number, Photo[]>>(new Map());
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);
  const [photosByChapter, setPhotosByChapter] = useState<Photo[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estrai parametri dalla URL
  useEffect(() => {
    const pathParts = location.split('/');
    
    // URL format: /selection/session/:key/:galleryId
    if (pathParts.length >= 4) {
      setKey(pathParts[pathParts.length - 2]);
      
      const galleryIdFromUrl = parseInt(pathParts[pathParts.length - 1]);
      if (!isNaN(galleryIdFromUrl)) {
        setGalleryId(galleryIdFromUrl);
      } else {
        setError('ID galleria non valido');
      }
    } else {
      setError('URL non valido. Formato atteso: /selection/session/:key/:galleryId');
    }
  }, [location]);
  
  // Carica i dati di sessione, galleria e foto
  useEffect(() => {
    if (!key || !galleryId) return;
    
    const fetchSessionData = async () => {
      setIsLoading(true);
      try {
        // Carica dettagli sessione
        const sessionResponse = await apiRequest('GET', `/api/selection/sessions/key/${key}`);
        if (!sessionResponse.ok) throw new Error('Sessione non trovata');
        const sessionData = await sessionResponse.json();
        setSession(sessionData);
        
        // Carica impostazioni
        const settingsResponse = await apiRequest('GET', `/api/selection/settings/${galleryId}`);
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setSettings(settingsData);
        }
        
        // Carica galleria
        const galleryResponse = await apiRequest('GET', `/api/gallery/galleries/${galleryId}`);
        if (!galleryResponse.ok) throw new Error('Galleria non trovata');
        const galleryData = await galleryResponse.json();
        setGallery(galleryData);
        
        // Carica foto con capitoli
        const chaptersResponse = await apiRequest('GET', `/api/gallery/galleries/${galleryId}/chapters`);
        if (chaptersResponse.ok) {
          const chaptersData = await chaptersResponse.json();
          
          // Carica tutte le foto della galleria
          const photosResponse = await apiRequest('GET', `/api/gallery/galleries/${galleryId}/photos`);
          if (photosResponse.ok) {
            const photosData = await photosResponse.json();
            const photos = photosData.photos || [];
            
            // Organizza le foto per capitolo
            const chapterMap = new Map<number, Photo[]>();
            const uncategorized: Photo[] = [];
            
            // Inizializza la mappa con capitoli vuoti
            chaptersData.forEach((chapter: any) => {
              chapterMap.set(chapter.id, []);
            });
            
            // Assegna foto ai rispettivi capitoli
            photos.forEach((photo: Photo) => {
              if (photo.chapterId && chapterMap.has(photo.chapterId)) {
                const chapterPhotos = chapterMap.get(photo.chapterId) || [];
                
                // Aggiungi informazioni del capitolo alla foto
                const chapter = chaptersData.find((c: any) => c.id === photo.chapterId);
                if (chapter) {
                  photo.chapter = {
                    id: chapter.id,
                    title: chapter.title
                  };
                }
                
                chapterPhotos.push(photo);
                chapterMap.set(photo.chapterId, chapterPhotos);
              } else {
                uncategorized.push(photo);
              }
            });
            
            // Se ci sono foto senza capitolo, aggiungile come "Senza capitolo"
            if (uncategorized.length > 0) {
              chapterMap.set(0, uncategorized);
            }
            
            setChapters(chapterMap);
            
            // Imposta il capitolo attivo al primo disponibile o a 0 se non ce ne sono
            if (chapterMap.size > 0) {
              const firstChapterId = Array.from(chapterMap.keys())[0];
              setActiveChapterId(firstChapterId);
              setPhotosByChapter(chapterMap.get(firstChapterId) || []);
            }
          }
        }
        
        // Carica selezioni esistenti
        if (sessionData.id) {
          const selectionsResponse = await apiRequest('GET', `/api/selection/selections/session/${sessionData.id}`);
          if (selectionsResponse.ok) {
            const selectionsData = await selectionsResponse.json();
            setSelections(selectionsData);
            
            // Calcola rimanenti selezioni se ci sono limiti
            if (settings && settings.maxSelections > 0) {
              const remaining = settings.maxSelections - selectionsData.length;
              setRemainingSelections(remaining > 0 ? remaining : 0);
            }
          }
        }
      } catch (error: any) {
        console.error('Errore nel caricamento della sessione:', error);
        setError(error.message || 'Impossibile caricare la sessione di selezione.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSessionData();
  }, [key, galleryId, toast]);
  
  // Gestisce il cambio di capitolo
  const handleChapterChange = (chapterId: number) => {
    setActiveChapterId(chapterId);
    setPhotosByChapter(chapters.get(chapterId) || []);
  };
  
  // Verifica se una foto è selezionata
  const isPhotoSelected = (photoId: number) => {
    return selections.some(s => s.photoId === photoId);
  };
  
  // Gestisce la selezione di una foto
  const togglePhotoSelection = async (photoId: number) => {
    if (!session) return;
    
    try {
      const response = await apiRequest('POST', `/api/selection/photos/${photoId}`, {
        sessionId: session.id
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.action === 'added') {
          // Aggiungi alla lista di selezioni
          setSelections(prev => [...prev, { 
            id: result.id || Math.random(), // Usa un ID temporaneo se non restituito
            photoId, 
            sessionId: session.id,
            createdAt: new Date().toISOString()
          }]);
          
          // Aggiorna il contatore rimanente
          if (remainingSelections !== null) {
            setRemainingSelections(prev => Math.max(0, (prev || 0) - 1));
          }
        } else {
          // Rimuovi dalla lista di selezioni
          setSelections(prev => prev.filter(s => s.photoId !== photoId));
          
          // Aggiorna il contatore rimanente
          if (remainingSelections !== null && settings?.maxSelections) {
            setRemainingSelections(prev => (prev || 0) + 1);
          }
        }
      } else {
        const errorData = await response.json();
        toast({
          title: 'Errore',
          description: errorData.error || 'Errore nella selezione della foto',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Errore nella selezione della foto:', error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante la selezione della foto.',
        variant: 'destructive',
      });
    }
  };
  
  // Carica i commenti per una foto
  const loadComments = async (photoId: number) => {
    if (!session) return;
    
    setIsLoadingComments(true);
    try {
      const response = await apiRequest('GET', `/api/selection/comments/photo/${photoId}?sessionId=${session.id}`);
      if (response.ok) {
        const commentsData = await response.json();
        setComments(commentsData);
      }
    } catch (error) {
      console.error('Errore nel caricamento dei commenti:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };
  
  // Aggiungi un commento
  const addComment = async () => {
    if (!session || !commentPhotoId || !commentContent.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await apiRequest('POST', '/api/selection/comments', {
        photoId: commentPhotoId,
        sessionId: session.id,
        content: commentContent,
        clientName: session.clientName
      });
      
      if (response.ok) {
        const newComment = await response.json();
        setComments(prev => [...prev, newComment]);
        setCommentContent('');
        
        toast({
          title: 'Commento aggiunto',
          description: 'Il tuo commento è stato aggiunto con successo.',
        });
      }
    } catch (error) {
      console.error('Errore nell\'aggiunta del commento:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile aggiungere il commento.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Visualizza una foto nel dialogo
  const viewPhoto = (photo: Photo) => {
    setCurrentPhoto(photo);
    setShowPhotoDialog(true);
    
    // Carica i commenti per questa foto
    loadComments(photo.id);
    setCommentPhotoId(photo.id);
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-lg">Caricamento sessione di selezione...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Errore</CardTitle>
              <CardDescription>Si è verificato un errore</CardDescription>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => window.history.back()} className="w-full">
                Torna indietro
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
  
  if (!session || !gallery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Sessione non trovata</CardTitle>
              <CardDescription>
                La sessione di selezione richiesta non è disponibile o è scaduta.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => window.history.back()} className="w-full">
                Torna indietro
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
  
  if (session.status === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Sessione completata</CardTitle>
              <CardDescription>
                Questa sessione di selezione è stata completata.
                {session.completedAt && (
                  <span className="block mt-2">
                    Data completamento: {format(new Date(session.completedAt), 'dd/MM/yyyy', { locale: it })}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selections.length > 0 ? (
                <p>Hai selezionato {selections.length} foto in questa sessione.</p>
              ) : (
                <p>Non hai effettuato selezioni in questa sessione.</p>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={() => window.history.back()} className="w-full">
                Torna indietro
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 shadow-md sticky top-0 z-10">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{gallery.name}</h1>
              <p className="text-sm md:text-base opacity-90">Sessione di selezione per {session.clientName}</p>
            </div>
            
            <div className="flex items-center gap-2">
              {settings && settings.maxSelections && settings.maxSelections > 0 && (
                <Badge variant="outline" className="bg-primary-foreground text-primary">
                  {selections.length}/{settings.maxSelections} foto selezionate
                </Badge>
              )}
              
              <Badge variant={session.status === 'active' ? 'default' : 'destructive'}>
                {session.status === 'active' ? 'Sessione attiva' : 'Sessione scaduta'}
              </Badge>
            </div>
          </div>
        </div>
      </header>
      
      {/* Contenuto principale */}
      <main className="flex-grow container mx-auto p-4">
        {/* Istruzioni */}
        {settings?.instructions && (
          <Alert className="mb-6">
            <AlertDescription>
              {settings.instructions}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="gallery">
              <ImageIcon className="w-4 h-4 mr-2" />
              Galleria
            </TabsTrigger>
            <TabsTrigger value="selections">
              <Check className="w-4 h-4 mr-2" />
              Le mie selezioni ({selections.length})
            </TabsTrigger>
          </TabsList>
          
          {/* Tab Galleria */}
          <TabsContent value="gallery">
            {chapters.size > 0 && (
              <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  {Array.from(chapters.keys()).map(chapterId => (
                    <Button
                      key={chapterId}
                      variant={activeChapterId === chapterId ? "default" : "outline"}
                      onClick={() => handleChapterChange(chapterId)}
                      className="text-sm"
                    >
                      {chapterId === 0 ? "Senza capitolo" : (
                        chapters.get(chapterId)?.[0]?.chapter?.title || `Capitolo ${chapterId}`
                      )}
                    </Button>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {photosByChapter.map(photo => (
                    <Card key={photo.id} className={`overflow-hidden cursor-pointer ${isPhotoSelected(photo.id) ? 'ring-2 ring-primary' : ''}`}>
                      <div className="relative">
                        <img 
                          src={photo.thumbnailUrl} 
                          alt={photo.title || `Foto ${photo.id}`}
                          className="w-full h-40 object-cover"
                          onClick={() => viewPhoto(photo)}
                        />
                        <Button
                          variant={isPhotoSelected(photo.id) ? "default" : "outline"}
                          size="icon"
                          className="absolute top-2 right-2 size-8 bg-background/80 backdrop-blur-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePhotoSelection(photo.id);
                          }}
                        >
                          {isPhotoSelected(photo.id) ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                        
                        {settings?.allowComments && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute top-2 left-2 size-8 bg-background/80 backdrop-blur-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewPhoto(photo);
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <CardContent className="p-2">
                        <p className="text-xs truncate font-medium">
                          {photo.title || `Foto ${photo.id}`}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Tab Selezioni */}
          <TabsContent value="selections">
            {selections.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Non hai ancora effettuato alcuna selezione.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {selections.map(selection => {
                  // Trova la foto corrispondente
                  const photo = gallery.photos?.find(p => p.id === selection.photoId);
                  if (!photo) return null;
                  
                  return (
                    <Card key={selection.id} className="overflow-hidden cursor-pointer">
                      <div className="relative">
                        <img 
                          src={photo.thumbnailUrl} 
                          alt={photo.title || `Foto ${photo.id}`}
                          className="w-full h-40 object-cover"
                          onClick={() => viewPhoto(photo)}
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 size-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePhotoSelection(photo.id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardContent className="p-2">
                        <p className="text-xs truncate font-medium">
                          {photo.title || `Foto ${photo.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Selezionata: {format(new Date(selection.createdAt), 'dd/MM/yyyy', { locale: it })}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Modale visualizzazione foto */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>{currentPhoto?.title || 'Dettaglio foto'}</DialogTitle>
            <DialogDescription>
              {currentPhoto?.chapter?.title && (
                <Badge variant="outline" className="mr-2">
                  {currentPhoto.chapter.title}
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Immagine */}
            <div className="flex flex-col items-center">
              <div className="relative w-full">
                <img 
                  src={currentPhoto?.url || currentPhoto?.thumbnailUrl} 
                  alt={currentPhoto?.title || 'Foto'}
                  className="w-full h-auto rounded-md"
                />
              </div>
              
              <div className="mt-4 flex gap-2 w-full">
                <Button 
                  className="flex-1"
                  variant={isPhotoSelected(currentPhoto?.id || 0) ? 'default' : 'outline'}
                  onClick={() => currentPhoto && togglePhotoSelection(currentPhoto.id)}
                >
                  {isPhotoSelected(currentPhoto?.id || 0) ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Selezionata
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Seleziona
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Commenti */}
            {settings?.allowComments && (
              <div className="flex flex-col h-full">
                <h3 className="text-lg font-semibold mb-2">Commenti</h3>
                
                <ScrollArea className="flex-1 pr-4 mb-4 h-[300px]">
                  {isLoadingComments ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nessun commento per questa foto.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comments.map(comment => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {comment.clientName ? comment.clientName[0] : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-baseline justify-between">
                              <p className="font-medium">
                                {comment.clientName || (comment.user?.fullName || comment.user?.username || 'Utente')}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(comment.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                              </span>
                            </div>
                            <p className="mt-1">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                
                <Separator className="my-4" />
                
                <div>
                  <Label htmlFor="comment" className="mb-2 block">Aggiungi un commento</Label>
                  <Textarea 
                    id="comment"
                    placeholder="Scrivi un commento su questa foto..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    className="mb-2 resize-none"
                    rows={3}
                  />
                  <Button 
                    onClick={addComment}
                    disabled={!commentContent.trim() || isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4 mr-2" />
                    )}
                    Invia commento
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}