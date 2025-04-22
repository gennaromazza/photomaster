import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import PhotoSelector from '../shared/PhotoSelector';
import CommentSystem from './CommentSystem';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Heart,
  Camera,
  Clock,
  CheckCircle2,
  MessageSquare,
  Loader2,
  Info,
  Search,
  ImageIcon,
  X,
  ChevronLeft,
  CheckIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Tipi di base
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('photos');
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<number[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [showWarning, setShowWarning] = useState(false);

  // Carica la sessione
  const { data: session, isLoading: isLoadingSession } = useQuery<SelectionSession>({
    queryKey: [`/api/selection/sessions/key/${sessionKey}`],
    enabled: !!sessionKey,
  });

  // Carica le impostazioni di selezione
  const { data: settings, isLoading: isLoadingSettings } = useQuery<GallerySelectionSettings>({
    queryKey: [`/api/selection/settings/${galleryId}`],
    enabled: !!galleryId,
  });

  // Carica la galleria
  const { data: gallery, isLoading: isLoadingGallery } = useQuery<Gallery>({
    queryKey: [`/api/gallery/galleries/${galleryId}`],
    enabled: !!galleryId,
  });

  // Carica i capitoli della galleria
  const { data: chapters, isLoading: isLoadingChapters } = useQuery<GalleryChapter[]>({
    queryKey: [`/api/gallery/galleries/${galleryId}/chapters`],
    enabled: !!galleryId,
  });

  // Carica le foto della galleria
  const { data: photosData, isLoading: isLoadingPhotos } = useQuery<{ photos: Photo[] }>({
    queryKey: [`/api/gallery/galleries/${galleryId}/photos`, { chapterId: selectedChapterId }],
    enabled: !!galleryId,
  });

  // Carica le selezioni correnti
  const { data: selections, isLoading: isLoadingSelections } = useQuery<PhotoSelection[]>({
    queryKey: [`/api/selection/sessions/${session?.id}/selections`],
    enabled: !!session?.id,
  });

  // Carica i commenti (solo quando necessario)
  const { data: photoComments } = useQuery<{ photoId: number; count: number }[]>({
    queryKey: [`/api/selection/sessions/${session?.id}/photos/comment-counts`],
    enabled: !!session?.id && activeTab === 'photos',
  });

  // Aggiorna lo stato delle foto selezionate quando i dati vengono caricati
  useEffect(() => {
    if (selections) {
      setSelectedPhotoIds(selections.map(s => s.photoId));
    }
  }, [selections]);

  // Controlla se la sessione è scaduta 
  useEffect(() => {
    if (settings?.expiresAt && new Date(settings.expiresAt) < new Date()) {
      toast({
        title: 'Sessione scaduta',
        description: 'Questa sessione di selezione è scaduta e non è più possibile effettuare modifiche.',
        variant: 'destructive',
      });
    }
  }, [settings, toast]);

  // Mutation per completare la sessione
  const completeSessionMutation = useMutation({
    mutationFn: async (notes: string) => {
      const response = await apiRequest('POST', `/api/selection/sessions/${session?.id}/complete`, {
        notes
      });
      
      if (!response.ok) {
        throw new Error('Errore durante il completamento della sessione');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Selezione completata',
        description: 'Grazie! Le tue selezioni sono state salvate con successo.',
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/selection/sessions/key/${sessionKey}`] });
      setShowCompletionDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Errore durante il completamento: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Filtra le foto in base alla ricerca e al capitolo selezionato
  const filteredPhotos = photosData?.photos.filter(photo => {
    // Filtra per capitolo se selezionato
    if (selectedChapterId !== null && photo.chapterId !== selectedChapterId) {
      return false;
    }
    
    // Filtra per termine di ricerca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        photo.filename.toLowerCase().includes(query) ||
        (photo.title && photo.title.toLowerCase().includes(query)) ||
        (photo.description && photo.description.toLowerCase().includes(query))
      );
    }
    
    return true;
  }) || [];

  // Funzione per gestire la selezione/deselezione di una foto
  const handleTogglePhotoSelection = (photoId: number, isSelected: boolean) => {
    if (isSelected) {
      setSelectedPhotoIds(prev => [...prev, photoId]);
    } else {
      setSelectedPhotoIds(prev => prev.filter(id => id !== photoId));
    }
  };

  // Funzione per gestire l'apertura dei commenti su una foto
  const handleShowComments = (photo: Photo) => {
    setSelectedPhoto(photo);
    setActiveTab('comments');
  };

  // Funzione per verificare se ci sono commenti per una foto
  const hasComments = (photoId: number) => {
    return photoComments?.some(pc => pc.photoId === photoId && pc.count > 0) || false;
  };

  // Funzione per gestire il completamento della sessione
  const handleCompleteSession = () => {
    // Controlla se abbiamo raggiunto il minimo di selezioni richieste
    if (settings?.minSelections && selectedPhotoIds.length < settings.minSelections) {
      setShowWarning(true);
      return;
    }
    
    setShowCompletionDialog(true);
  };

  // Funzione per confermare il completamento
  const confirmCompletion = () => {
    completeSessionMutation.mutate(completionNotes);
  };

  // Verifica se la sessione è completata o scaduta
  const isSessionActive = session?.status === 'active';
  const isSessionCompleted = session?.status === 'completed';
  const isSessionExpired = session?.status === 'expired' || 
    (settings?.expiresAt && new Date(settings.expiresAt) < new Date());

  // Stato di caricamento generale
  const isLoading = isLoadingSession || isLoadingSettings || isLoadingGallery || 
    isLoadingChapters || isLoadingPhotos || isLoadingSelections;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Caricamento in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Intestazione */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{gallery?.name}</h1>
        <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
          <span className="flex items-center">
            <Camera className="h-4 w-4 mr-1" />
            {filteredPhotos.length} foto disponibili
          </span>
          <span className="hidden sm:flex items-center">
            <Heart className="h-4 w-4 mr-1" />
            {selectedPhotoIds.length} foto selezionate
          </span>
          {settings?.maxSelections > 0 && (
            <Badge variant="outline" className="ml-1">
              Max: {settings.maxSelections}
            </Badge>
          )}
          <span className="hidden sm:flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Iniziata il {format(new Date(session?.startedAt || new Date()), "d MMMM", { locale: it })}
          </span>
          <Badge 
            variant={isSessionCompleted ? "success" : isSessionExpired ? "destructive" : "default"}
            className="ml-auto"
          >
            {isSessionCompleted ? "Completata" : isSessionExpired ? "Scaduta" : "Attiva"}
          </Badge>
        </div>
      </div>
      
      {/* Avviso di sessione non attiva */}
      {!isSessionActive && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>
            {isSessionCompleted ? "Selezione completata" : "Sessione scaduta"}
          </AlertTitle>
          <AlertDescription>
            {isSessionCompleted 
              ? "Hai già completato questa selezione. Non è più possibile effettuare modifiche."
              : "Questa sessione di selezione è scaduta. Non è più possibile effettuare modifiche."}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Istruzioni */}
      {settings?.instructions && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Istruzioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              {settings.instructions}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Tabs principali */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="photos" onClick={() => setSelectedPhoto(null)}>
              Foto
            </TabsTrigger>
            <TabsTrigger value="selections">
              Selezioni
              <Badge variant="secondary" className="ml-2">
                {selectedPhotoIds.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="comments" 
              disabled={!selectedPhoto}
              className={!selectedPhoto ? "opacity-50 cursor-not-allowed" : ""}
            >
              {selectedPhoto ? `Commenti: ${selectedPhoto.filename}` : "Commenti"}
            </TabsTrigger>
          </TabsList>
          
          {isSessionActive && (
            <Button 
              onClick={handleCompleteSession}
              disabled={completeSessionMutation.isPending}
              className="hidden sm:flex"
            >
              {completeSessionMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Completa Selezione
            </Button>
          )}
        </div>
        
        {/* Contenuto Tab Foto */}
        <TabsContent value="photos" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca foto..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {chapters && chapters.length > 0 && (
              <div className="flex-1">
                <div className="flex gap-2 items-center overflow-x-auto pb-2">
                  <Button
                    variant={selectedChapterId === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedChapterId(null)}
                    className="whitespace-nowrap"
                  >
                    Tutte le foto
                  </Button>
                  
                  {chapters.map(chapter => (
                    <Button
                      key={chapter.id}
                      variant={selectedChapterId === chapter.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedChapterId(chapter.id)}
                      className="whitespace-nowrap"
                    >
                      {chapter.title}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {filteredPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              {searchQuery ? (
                <>
                  <h3 className="font-medium">Nessuna foto trovata</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    La ricerca "{searchQuery}" non ha prodotto risultati
                  </p>
                </>
              ) : selectedChapterId !== null ? (
                <>
                  <h3 className="font-medium">Nessuna foto in questo capitolo</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Seleziona un altro capitolo per visualizzare le foto
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-medium">Nessuna foto disponibile</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Non ci sono foto in questa galleria
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredPhotos.map(photo => (
                <PhotoSelector
                  key={photo.id}
                  photo={photo}
                  sessionId={session?.id || 0}
                  isSelected={selectedPhotoIds.includes(photo.id)}
                  maxSelections={settings?.maxSelections || 0}
                  isDisabled={!isSessionActive || 
                    (settings?.maxSelections ? selectedPhotoIds.length >= settings.maxSelections && !selectedPhotoIds.includes(photo.id) : false)}
                  hasComments={hasComments(photo.id)}
                  onToggleSelect={handleTogglePhotoSelection}
                  onShowComments={() => handleShowComments(photo)}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Contenuto Tab Selezioni */}
        <TabsContent value="selections">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Le tue selezioni</CardTitle>
              <CardDescription>
                Hai selezionato {selectedPhotoIds.length} foto
                {settings?.minSelections > 0 && (
                  <> (minimo richiesto: {settings.minSelections})</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedPhotoIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <Heart className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-muted-foreground mt-2">
                    Non hai ancora selezionato nessuna foto
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vai alla scheda "Foto" per iniziare a selezionare
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {photosData?.photos
                    .filter(photo => selectedPhotoIds.includes(photo.id))
                    .map(photo => (
                      <PhotoSelector
                        key={photo.id}
                        photo={photo}
                        sessionId={session?.id || 0}
                        isSelected={true}
                        isDisabled={!isSessionActive}
                        hasComments={hasComments(photo.id)}
                        onToggleSelect={handleTogglePhotoSelection}
                        onShowComments={() => handleShowComments(photo)}
                      />
                    ))}
                </div>
              )}
            </CardContent>
            {isSessionActive && (
              <CardFooter className="flex justify-between">
                <div>
                  {settings?.minSelections > 0 && selectedPhotoIds.length < settings.minSelections && (
                    <p className="text-sm text-amber-600">
                      Devi selezionare almeno {settings.minSelections} foto
                    </p>
                  )}
                </div>
                <Button 
                  onClick={handleCompleteSession}
                  disabled={completeSessionMutation.isPending}
                >
                  {completeSessionMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Completa Selezione
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
        
        {/* Contenuto Tab Commenti */}
        <TabsContent value="comments">
          {selectedPhoto ? (
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedPhoto(null);
                    setActiveTab('photos');
                  }}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-lg flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Commenti
                  </CardTitle>
                  <CardDescription>
                    {selectedPhoto.title || selectedPhoto.filename}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <div className="rounded-md overflow-hidden bg-muted mb-4">
                      <img 
                        src={selectedPhoto.thumbnailUrl} 
                        alt={selectedPhoto.title || selectedPhoto.filename}
                        className="w-full h-auto"
                      />
                    </div>
                    
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        {format(new Date(selectedPhoto.createdAt), "d MMMM yyyy", { locale: it })}
                      </span>
                      <Badge variant={selectedPhotoIds.includes(selectedPhoto.id) ? "default" : "outline"}>
                        {selectedPhotoIds.includes(selectedPhoto.id) ? (
                          <span className="flex items-center">
                            <CheckIcon className="mr-1 h-3 w-3" />
                            Selezionata
                          </span>
                        ) : "Non selezionata"}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="md:w-2/3">
                    <CommentSystem 
                      photoId={selectedPhoto.id}
                      sessionId={session?.id || 0}
                      clientName={session?.clientName}
                      isActive={isSessionActive}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Seleziona una foto per visualizzare o aggiungere commenti
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Footer con bottone di completamento (mobile) */}
      {isSessionActive && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t sm:hidden">
          <Button 
            onClick={handleCompleteSession}
            disabled={completeSessionMutation.isPending}
            className="w-full"
          >
            {completeSessionMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Completa Selezione ({selectedPhotoIds.length})
          </Button>
        </div>
      )}
      
      {/* Dialog di avviso per selezioni insufficienti */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attenzione</DialogTitle>
            <DialogDescription>
              Devi selezionare almeno {settings?.minSelections} foto per completare la selezione.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4 flex justify-end">
            <Button onClick={() => setShowWarning(false)}>Ho capito</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog di completamento */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completa la tua selezione</DialogTitle>
            <DialogDescription>
              Hai selezionato {selectedPhotoIds.length} foto. 
              Una volta completata, non sarà più possibile modificare le tue selezioni.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="notes">Note aggiuntive (opzionale)</Label>
              <Textarea
                id="notes"
                placeholder="Aggiungi eventuali note o richieste"
                value={completionNotes}
                onChange={e => setCompletionNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCompletionDialog(false)}
            >
              Annulla
            </Button>
            <Button 
              onClick={confirmCompletion}
              disabled={completeSessionMutation.isPending}
            >
              {completeSessionMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Conferma e Invia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}