import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowUpDown, 
  Loader2, 
  Download, 
  MessageSquare, 
  Heart,
  Calendar,
  User,
  Mail,
  InfoIcon
} from 'lucide-react';

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

type PhotoSelection = {
  id: number;
  sessionId: number;
  photoId: number;
  notes: string | null;
  createdAt: string;
  photo: Photo;
};

type Comment = {
  id: number;
  photoId: number;
  sessionId: number;
  userId: number | null;
  clientName: string | null;
  content: string;
  isRead: boolean;
  createdAt: string;
  photo: Photo;
  user?: {
    id: number;
    username: string;
    fullName: string;
  };
};

type Session = {
  id: number;
  galleryId: number;
  clientId: number | null;
  sessionKey: string;
  clientName: string;
  clientEmail: string;
  status: 'active' | 'completed' | 'expired';
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
};

type SelectionsDashboardProps = {
  sessionId: number;
};

export default function SelectionsDashboard({ sessionId }: SelectionsDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('selections');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoSelection | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [currentComment, setCurrentComment] = useState<Comment | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportQuality, setExportQuality] = useState('medium');

  // Carica la sessione
  const { data: session, isLoading: isLoadingSession } = useQuery<Session>({
    queryKey: [`/api/selection/sessions/${sessionId}`],
    enabled: !!sessionId,
  });

  // Carica le selezioni per questa sessione
  const { data: selections, isLoading: isLoadingSelections } = useQuery<PhotoSelection[]>({
    queryKey: [`/api/selection/sessions/${sessionId}/selections`],
    enabled: !!sessionId,
  });

  // Carica i commenti per questa sessione
  const { data: comments, isLoading: isLoadingComments } = useQuery<Comment[]>({
    queryKey: [`/api/selection/sessions/${sessionId}/comments`],
    enabled: !!sessionId && activeTab === 'comments',
  });

  // Mutation per rispondere a un commento
  const replyMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: number; content: string }) => {
      const response = await apiRequest('POST', `/api/comments/${commentId}/reply`, {
        content,
      });
      
      if (!response.ok) {
        throw new Error('Errore durante l'invio della risposta');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Risposta inviata',
        description: 'La tua risposta è stata inviata con successo',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/selection/sessions/${sessionId}/comments`] });
      setReplyContent('');
      setCommentDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Errore durante l'invio della risposta: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation per segnare un commento come letto
  const markAsReadMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const response = await apiRequest('PUT', `/api/comments/${commentId}/read`);
      
      if (!response.ok) {
        throw new Error('Errore durante l\'aggiornamento dello stato del commento');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/selection/sessions/${sessionId}/comments`] });
    }
  });

  // Mutation per esportare le selezioni
  const exportMutation = useMutation({
    mutationFn: async (params: { format: string; quality: string }) => {
      const queryParams = new URLSearchParams({
        format: params.format,
        quality: params.quality
      }).toString();
      
      const response = await apiRequest('GET', `/api/selection/sessions/${sessionId}/export?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Errore durante l\'esportazione delle selezioni');
      }
      
      return await response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `selezioni_${sessionId}_${format(new Date(), 'yyyyMMdd')}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setExportDialogOpen(false);
      toast({
        title: 'Esportazione completata',
        description: 'Le selezioni sono state esportate con successo',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Errore durante l'esportazione: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Gestione commenti e risposte
  const handleOpenCommentDialog = (comment: Comment) => {
    setCurrentComment(comment);
    setCommentDialogOpen(true);
    
    // Se il commento non è stato letto, segnalo come letto
    if (!comment.isRead) {
      markAsReadMutation.mutate(comment.id);
    }
  };

  const submitReply = () => {
    if (!currentComment || !replyContent.trim()) return;
    
    replyMutation.mutate({
      commentId: currentComment.id,
      content: replyContent
    });
  };

  // Gestione esportazione
  const handleExport = () => {
    exportMutation.mutate({
      format: exportFormat,
      quality: exportQuality
    });
  };

  // Rendering condizionale per lo stato di caricamento
  if (isLoadingSession || (isLoadingSelections && activeTab === 'selections') || (isLoadingComments && activeTab === 'comments')) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Se non c'è una sessione valida
  if (!session) {
    return (
      <Alert variant="destructive">
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Impossibile caricare i dettagli della sessione. La sessione potrebbe non esistere o essere stata eliminata.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Dettagli Sessione</CardTitle>
          <CardDescription>
            Informazioni sulla sessione di selezione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm font-medium">Cliente:</span>
              </div>
              <p className="text-sm">{session.clientName}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm font-medium">Email:</span>
              </div>
              <p className="text-sm">{session.clientEmail}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm font-medium">Data:</span>
              </div>
              <p className="text-sm">
                {format(new Date(session.startedAt), "d MMMM yyyy", { locale: it })}
              </p>
            </div>
          </div>
          
          {session.notes && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <h4 className="text-sm font-medium mb-1">Note del cliente:</h4>
              <p className="text-sm">{session.notes}</p>
            </div>
          )}
          
          <div className="flex justify-end mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setExportDialogOpen(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Esporta Selezioni
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Tabs 
        defaultValue="selections" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="selections">
            Foto Selezionate
            {selections && selections.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selections.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="comments">
            Commenti
            {comments && comments.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {comments.filter(c => !c.isRead).length > 0 ? (
                  <span className="text-primary">{comments.length}</span>
                ) : (
                  comments.length
                )}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="selections">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Foto Selezionate</CardTitle>
              <CardDescription>
                Elenco delle foto selezionate dal cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selections?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <Heart className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-muted-foreground mt-2">
                    Il cliente non ha ancora selezionato nessuna foto
                  </h3>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {selections?.map(selection => (
                      <div
                        key={selection.id}
                        className="group relative rounded-md overflow-hidden border border-border"
                      >
                        <div className="aspect-square overflow-hidden bg-muted">
                          <img
                            src={selection.photo.thumbnailUrl}
                            alt={selection.photo.title || `Foto ${selection.photo.id}`}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <div className="w-full">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Heart className="h-4 w-4 text-white fill-white mr-1" />
                                <span className="text-xs text-white">
                                  {format(new Date(selection.createdAt), "d MMM", { locale: it })}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-white hover:text-white hover:bg-black/20"
                                  onClick={() => window.open(selection.photo.originalUrl, "_blank")}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {selection.notes && (
                              <div className="mt-1 p-2 bg-black/40 rounded text-xs text-white">
                                {selection.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Commenti</CardTitle>
              <CardDescription>
                Commenti e feedback del cliente sulle foto
              </CardDescription>
            </CardHeader>
            <CardContent>
              {comments?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <MessageSquare className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-muted-foreground mt-2">
                    Non ci sono commenti per questa sessione
                  </h3>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {comments?.map(comment => (
                      <div
                        key={comment.id}
                        className={`flex gap-4 p-4 rounded-lg border ${!comment.isRead ? 'bg-blue-50 border-blue-200' : 'bg-background'}`}
                        onClick={() => handleOpenCommentDialog(comment)}
                      >
                        <div className="flex-shrink-0 w-16 h-16 bg-muted rounded-md overflow-hidden">
                          <img
                            src={comment.photo.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-medium">
                                {comment.clientName || 'Cliente'}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(comment.createdAt), "d MMMM yyyy, HH:mm", { locale: it })}
                              </p>
                            </div>
                            {!comment.isRead && (
                              <Badge variant="default" className="text-xs">Nuovo</Badge>
                            )}
                          </div>
                          <p className="mt-2 text-sm">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Dialogo per rispondere ai commenti */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rispondi al Commento</DialogTitle>
            <DialogDescription>
              Rispondi al commento del cliente per questa foto
            </DialogDescription>
          </DialogHeader>
          
          {currentComment && (
            <>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-24 h-24 bg-muted rounded-md overflow-hidden">
                  <img
                    src={currentComment.photo.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="mb-4">
                    <p className="text-sm font-medium">
                      {currentComment.clientName || 'Cliente'}:
                    </p>
                    <div className="p-3 bg-muted rounded-md mt-1">
                      <p className="text-sm">{currentComment.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(currentComment.createdAt), "d MMMM yyyy, HH:mm", { locale: it })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reply">La tua risposta:</Label>
                    <Textarea
                      id="reply"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Scrivi una risposta..."
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setCommentDialogOpen(false)}
                >
                  Annulla
                </Button>
                <Button 
                  onClick={submitReply}
                  disabled={!replyContent.trim() || replyMutation.isPending}
                >
                  {replyMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Invia Risposta
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Dialogo per esportare le selezioni */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Esporta Selezioni</DialogTitle>
            <DialogDescription>
              Esporta le foto selezionate dal cliente in vari formati
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Formato di esportazione</Label>
              <div className="flex space-x-2">
                <Button
                  variant={exportFormat === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('csv')}
                  className="flex-1"
                >
                  CSV
                </Button>
                <Button
                  variant={exportFormat === 'zip' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('zip')}
                  className="flex-1"
                >
                  ZIP (Archivio)
                </Button>
              </div>
            </div>
            
            {exportFormat === 'zip' && (
              <div className="space-y-2">
                <Label>Qualità immagini</Label>
                <div className="flex space-x-2">
                  <Button
                    variant={exportQuality === 'original' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExportQuality('original')}
                    className="flex-1"
                  >
                    Originali
                  </Button>
                  <Button
                    variant={exportQuality === 'medium' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExportQuality('medium')}
                    className="flex-1"
                  >
                    Media
                  </Button>
                  <Button
                    variant={exportQuality === 'thumbnail' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExportQuality('thumbnail')}
                    className="flex-1"
                  >
                    Miniature
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setExportDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleExport}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Esporta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}