import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, MessageSquare, XCircle, Filter, Image, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import CommentSystem from './CommentSystem';

type Photo = {
  id: number;
  galleryId: number;
  filename: string;
  title: string | null;
  description: string | null;
  width: number;
  height: number;
  size: number;
  thumbnailUrl: string;
  originalUrl: string;
  chapterId: number | null;
  createdAt: string;
};

type GalleryChapter = {
  id: number;
  galleryId: number;
  title: string;
  description: string | null;
  order: number;
  coverPhoto: string | null;
};

type SelectionSession = {
  id: number;
  galleryId: number;
  clientName: string;
  clientEmail: string;
  status: 'active' | 'completed' | 'expired';
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
};

type GallerySelectionSettings = {
  id: number;
  galleryId: number;
  isEnabled: boolean;
  instructions: string | null;
  minSelections: number;
  maxSelections: number;
  expiresAt: string | null;
};

type PhotoSelection = {
  id: number;
  sessionId: number;
  photoId: number;
  notes: string | null;
  createdAt: string;
};

type Gallery = {
  id: number;
  name: string;
  description: string | null;
  coverPhotoUrl: string | null;
};

type SelectionInterfaceProps = {
  sessionKey: string;
  galleryId: number;
};

export default function SelectionInterface({ sessionKey, galleryId }: SelectionInterfaceProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [chapters, setChapters] = useState<GalleryChapter[]>([]);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [session, setSession] = useState<SelectionSession | null>(null);
  const [settings, setSettings] = useState<GallerySelectionSettings | null>(null);
  const [selections, setSelections] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [commentPhotoId, setCommentPhotoId] = useState<number | null>(null);
  const [commentsCount, setCommentsCount] = useState<Record<number, number>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Carica la sessione
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await apiRequest('GET', `/api/selection/sessions/key/${sessionKey}`);
        if (!response.ok) {
          throw new Error('Sessione non trovata o scaduta');
        }
        const data = await response.json();
        setSession(data);
      } catch (error: any) {
        console.error('Errore nel caricamento della sessione:', error);
        setErrorMessage('Sessione non trovata o scaduta. Contatta lo studio fotografico.');
      }
    };

    fetchSession();
  }, [sessionKey]);

  // Carica le impostazioni di selezione
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiRequest('GET', `/api/selection/settings/${galleryId}`);
        if (!response.ok) {
          throw new Error('Impostazioni non trovate');
        }
        const data = await response.json();
        setSettings(data);
      } catch (error: any) {
        console.error('Errore nel caricamento delle impostazioni:', error);
      }
    };

    fetchSettings();
  }, [galleryId]);

  // Carica la galleria, i capitoli e le foto
  useEffect(() => {
    const fetchGalleryData = async () => {
      setIsLoading(true);
      try {
        // Carica i dettagli della galleria
        const galleryResponse = await apiRequest('GET', `/api/gallery/galleries/${galleryId}`);
        if (!galleryResponse.ok) {
          throw new Error('Galleria non trovata');
        }
        setGallery(await galleryResponse.json());

        // Carica i capitoli
        const chaptersResponse = await apiRequest('GET', `/api/gallery/galleries/${galleryId}/chapters`);
        if (chaptersResponse.ok) {
          const chaptersData = await chaptersResponse.json();
          setChapters(chaptersData);
        }

        // Carica le foto
        const photosResponse = await apiRequest('GET', `/api/gallery/galleries/${galleryId}/photos`);
        if (!photosResponse.ok) {
          throw new Error('Impossibile caricare le foto');
        }
        const photosData = await photosResponse.json();
        setPhotos(photosData.photos || []);
      } catch (error: any) {
        console.error('Errore nel caricamento dei dati della galleria:', error);
        setErrorMessage('Impossibile caricare i dati della galleria. Riprova più tardi.');
      } finally {
        setIsLoading(false);
      }
    };

    if (galleryId) {
      fetchGalleryData();
    }
  }, [galleryId]);

  // Carica le selezioni attuali
  useEffect(() => {
    const fetchSelections = async () => {
      if (!session) return;

      try {
        const response = await apiRequest('GET', `/api/selection/sessions/${session.id}/selections`);
        if (response.ok) {
          const selections = await response.json();
          setSelections(selections.map((s: PhotoSelection) => s.photoId));
        }
      } catch (error: any) {
        console.error('Errore nel caricamento delle selezioni:', error);
      }
    };

    fetchSelections();
  }, [session]);

  // Carica i conteggi dei commenti
  useEffect(() => {
    const fetchCommentsCount = async () => {
      if (!session) return;

      try {
        const response = await apiRequest('GET', `/api/selection/sessions/${session.id}/photos/comment-counts`);
        if (response.ok) {
          const counts = await response.json();
          const countsMap: Record<number, number> = {};
          counts.forEach((item: { photoId: number; count: number }) => {
            countsMap[item.photoId] = item.count;
          });
          setCommentsCount(countsMap);
        }
      } catch (error: any) {
        console.error('Errore nel caricamento del conteggio commenti:', error);
      }
    };

    fetchCommentsCount();
  }, [session]);

  // Filtra le foto in base al capitolo selezionato
  const filteredPhotos = activeTab === 'all' 
    ? photos 
    : activeTab === 'unassigned' 
      ? photos.filter(photo => !photo.chapterId) 
      : photos.filter(photo => photo.chapterId === parseInt(activeTab));

  // Filtra le foto già selezionate
  const selectedPhotos = photos.filter(photo => selections.includes(photo.id));

  // Gestisce il toggle della selezione di una foto
  const toggleSelection = async (photoId: number) => {
    if (!session || session.status !== 'active') {
      toast({
        title: 'Sessione non attiva',
        description: 'Questa sessione non è più attiva.',
        variant: 'destructive',
      });
      return;
    }

    // Verifica se stiamo aggiungendo (anziché rimuovendo)
    const isAdding = !selections.includes(photoId);

    // Verifica se abbiamo raggiunto il limite massimo
    if (isAdding && settings?.maxSelections && selections.length >= settings.maxSelections) {
      toast({
        title: 'Limite raggiunto',
        description: `Hai raggiunto il limite massimo di ${settings.maxSelections} foto selezionate.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await apiRequest('POST', `/api/selection/photos/${photoId}`, {
        sessionId: session.id
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.action === 'added') {
          setSelections(prev => [...prev, photoId]);
          toast({
            title: 'Foto selezionata',
            description: 'La foto è stata aggiunta alla tua selezione.',
          });
        } else {
          setSelections(prev => prev.filter(id => id !== photoId));
          toast({
            title: 'Foto rimossa',
            description: 'La foto è stata rimossa dalla tua selezione.',
          });
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Errore sconosciuto');
      }
    } catch (error: any) {
      console.error('Errore nella selezione della foto:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile aggiornare la selezione. Riprova più tardi.',
        variant: 'destructive',
      });
    }
  };

  // Completa la sessione di selezione
  const completeSession = async () => {
    if (!session || session.status !== 'active') return;

    // Verifica che sia stato selezionato il numero minimo di foto
    if (settings && settings.minSelections > 0 && selections.length < settings.minSelections) {
      toast({
        title: 'Selezione incompleta',
        description: `Devi selezionare almeno ${settings.minSelections} foto per completare la selezione.`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest('POST', `/api/selection/sessions/${session.id}/complete`);

      if (response.ok) {
        const updatedSession = await response.json();
        setSession(updatedSession);
        toast({
          title: 'Selezione completata',
          description: 'La tua selezione è stata inviata con successo!',
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Errore sconosciuto');
      }
    } catch (error: any) {
      console.error('Errore nel completamento della sessione:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile completare la selezione. Riprova più tardi.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gestisce gli errori di caricamento
  if (errorMessage) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Mostra il loader durante il caricamento
  if (isLoading || !session) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">
            {gallery?.name || 'Selezione foto'}
          </CardTitle>
          <CardDescription>
            Ciao {session.clientName}, benvenuto/a nella selezione foto.
            {settings?.instructions && (
              <div className="mt-2 p-3 bg-secondary rounded-md text-secondary-foreground">
                {settings.instructions}
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                {session.status === 'active' ? 'Sessione attiva' : session.status === 'completed' ? 'Completata' : 'Scaduta'}
              </Badge>
              {settings && (
                <div className="mt-2 text-sm">
                  {settings.minSelections > 0 && (
                    <p>Minimo: {settings.minSelections} foto</p>
                  )}
                  {settings.maxSelections > 0 && (
                    <p>Massimo: {settings.maxSelections} foto</p>
                  )}
                  <p>Selezionate: {selections.length} foto</p>
                </div>
              )}
            </div>
            {session.status === 'active' && (
              <Button 
                onClick={completeSession} 
                disabled={isSubmitting || (settings?.minSelections || 0) > selections.length}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Completa selezione
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium">Foto</h2>
          <TabsList>
            <TabsTrigger value="all">Tutte</TabsTrigger>
            <TabsTrigger value="selected">Selezionate ({selections.length})</TabsTrigger>
            {chapters.map(chapter => (
              <TabsTrigger key={chapter.id} value={String(chapter.id)}>
                {chapter.title}
              </TabsTrigger>
            ))}
            <TabsTrigger value="unassigned">Non assegnate</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-0">
          <PhotoGrid 
            photos={photos} 
            selections={selections} 
            commentsCount={commentsCount}
            onSelect={toggleSelection} 
            onComment={setCommentPhotoId} 
            isSelectionActive={session.status === 'active'} 
          />
        </TabsContent>

        <TabsContent value="selected" className="mt-0">
          {selectedPhotos.length === 0 ? (
            <div className="text-center py-12 bg-secondary/20 rounded-md">
              <p>Nessuna foto selezionata</p>
            </div>
          ) : (
            <PhotoGrid 
              photos={selectedPhotos} 
              selections={selections} 
              commentsCount={commentsCount}
              onSelect={toggleSelection} 
              onComment={setCommentPhotoId} 
              isSelectionActive={session.status === 'active'} 
            />
          )}
        </TabsContent>

        {chapters.map(chapter => (
          <TabsContent key={chapter.id} value={String(chapter.id)} className="mt-0">
            <PhotoGrid 
              photos={filteredPhotos} 
              selections={selections} 
              commentsCount={commentsCount}
              onSelect={toggleSelection} 
              onComment={setCommentPhotoId} 
              isSelectionActive={session.status === 'active'} 
            />
          </TabsContent>
        ))}

        <TabsContent value="unassigned" className="mt-0">
          <PhotoGrid 
            photos={filteredPhotos} 
            selections={selections} 
            commentsCount={commentsCount}
            onSelect={toggleSelection} 
            onComment={setCommentPhotoId} 
            isSelectionActive={session.status === 'active'} 
          />
        </TabsContent>
      </Tabs>

      {commentPhotoId !== null && session && (
        <CommentDialog 
          photoId={commentPhotoId} 
          sessionId={session.id}
          clientName={session.clientName}
          isActive={session.status === 'active'}
          onClose={() => setCommentPhotoId(null)}
        />
      )}
    </div>
  );
}

// Componente griglia foto
type PhotoGridProps = {
  photos: Photo[];
  selections: number[];
  commentsCount: Record<number, number>;
  onSelect: (photoId: number) => void;
  onComment: (photoId: number) => void;
  isSelectionActive: boolean;
};

function PhotoGrid({ photos, selections, commentsCount, onSelect, onComment, isSelectionActive }: PhotoGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map(photo => (
        <PhotoCard 
          key={photo.id} 
          photo={photo} 
          isSelected={selections.includes(photo.id)}
          commentsCount={commentsCount[photo.id] || 0}
          onSelect={() => onSelect(photo.id)}
          onComment={() => onComment(photo.id)}
          isSelectionActive={isSelectionActive}
        />
      ))}
    </div>
  );
}

// Componente carta foto
type PhotoCardProps = {
  photo: Photo;
  isSelected: boolean;
  commentsCount: number;
  onSelect: () => void;
  onComment: () => void;
  isSelectionActive: boolean;
};

function PhotoCard({ photo, isSelected, commentsCount, onSelect, onComment, isSelectionActive }: PhotoCardProps) {
  const [fullImage, setFullImage] = useState(false);

  return (
    <Card className={`overflow-hidden transition-shadow ${isSelected ? 'ring-2 ring-primary shadow-lg' : ''}`}>
      <div className="relative aspect-square overflow-hidden">
        <img
          src={photo.thumbnailUrl}
          alt={photo.title || `Foto ${photo.id}`}
          className="object-cover w-full h-full transition-transform hover:scale-105 cursor-pointer"
          onClick={() => setFullImage(true)}
        />
        
        <div className="absolute top-2 right-2 flex gap-1">
          {commentsCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {commentsCount}
            </Badge>
          )}
          {isSelected && (
            <Badge variant="primary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
            </Badge>
          )}
        </div>
      </div>
      
      <CardContent className="p-3">
        <div className="flex justify-between items-center">
          <div className="text-sm truncate max-w-[70%]">
            {photo.title || `Foto ${photo.id}`}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onComment}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            {isSelectionActive && (
              <Button
                variant={isSelected ? "destructive" : "default"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onSelect}
              >
                {isSelected ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {fullImage && (
        <Dialog open={fullImage} onOpenChange={setFullImage}>
          <DialogContent className="max-w-4xl w-[90vw]">
            <DialogHeader>
              <DialogTitle>{photo.title || `Foto ${photo.id}`}</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <img
                src={photo.originalUrl}
                alt={photo.title || `Foto ${photo.id}`}
                className="object-contain max-h-[70vh] w-full"
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                {isSelectionActive && (
                  <Button
                    variant={isSelected ? "destructive" : "default"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect();
                    }}
                  >
                    {isSelected ? "Rimuovi" : "Seleziona"}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullImage(false);
                    onComment();
                  }}
                >
                  Commenta
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

// Componente dialogo commenti
type CommentDialogProps = {
  photoId: number;
  sessionId: number;
  clientName: string;
  isActive: boolean;
  onClose: () => void;
};

function CommentDialog({ photoId, sessionId, clientName, isActive, onClose }: CommentDialogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carica i dettagli della foto
  useEffect(() => {
    const fetchPhoto = async () => {
      setIsLoading(true);
      try {
        const response = await apiRequest('GET', `/api/gallery/photos/${photoId}`);
        if (response.ok) {
          const data = await response.json();
          setPhoto(data);
        }
      } catch (error) {
        console.error('Errore nel caricamento della foto:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhoto();
  }, [photoId]);

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-[90vw]">
        <DialogHeader>
          <DialogTitle>Commenti</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative overflow-hidden rounded-md">
            {isLoading || !photo ? (
              <div className="flex justify-center items-center h-64 bg-secondary/20">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <img
                src={photo.originalUrl}
                alt={photo.title || `Foto ${photo.id}`}
                className="object-contain w-full max-h-[50vh]"
              />
            )}
          </div>
          
          <div className="h-full">
            <CommentSystem
              photoId={photoId}
              sessionId={sessionId}
              clientName={clientName}
              isActive={isActive}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}