import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { 
  Loader2, 
  Plus, 
  Copy, 
  ExternalLink, 
  Download, 
  MoreHorizontal,
  MessageSquare,
  Image,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Schema per la nuova sessione
const sessionSchema = z.object({
  clientName: z.string().min(1, 'Il nome del cliente è richiesto'),
  clientEmail: z.string().email('Email non valida'),
  clientId: z.number().optional().nullable()
});

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
  _count?: {
    selections: number;
    comments: number;
  };
};

type PhotoSelection = {
  id: number;
  sessionId: number;
  photoId: number;
  notes: string | null;
  createdAt: string;
  photo: any; // Tipo semplificato per brevità
};

type SessionsListProps = {
  galleryId: number;
  galleryName: string;
  onViewSelections: (session: SelectionSession, selections: PhotoSelection[]) => void;
};

export default function SessionsList({ galleryId, galleryName, onViewSelections }: SessionsListProps) {
  const [sessions, setSessions] = useState<SelectionSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewSession, setIsNewSession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewingComments, setIsViewingComments] = useState(false);
  const [currentSession, setCurrentSession] = useState<SelectionSession | null>(null);
  const [comments, setComments] = useState<any[]>([]); // Tipo semplificato per brevità
  
  const { toast } = useToast();
  
  // Form per la nuova sessione
  const form = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      clientName: '',
      clientEmail: '',
      clientId: null
    }
  });

  // Carica le sessioni
  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('GET', `/api/selection/sessions/gallery/${galleryId}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      } else {
        throw new Error('Errore nel caricamento delle sessioni');
      }
    } catch (error: any) {
      console.error('Errore nel caricamento delle sessioni:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile caricare le sessioni.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [galleryId]);

  // Gestisce l'invio del form per la nuova sessione
  const handleSubmit = async (values: z.infer<typeof sessionSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest('POST', '/api/selection/sessions', {
        ...values,
        galleryId
      });
      
      if (response.ok) {
        const newSession = await response.json();
        setSessions(prev => [newSession, ...prev]);
        setIsNewSession(false);
        form.reset();
        
        toast({
          title: 'Sessione creata',
          description: 'La sessione di selezione è stata creata con successo.',
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore sconosciuto');
      }
    } catch (error: any) {
      console.error('Errore nella creazione della sessione:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Si è verificato un errore durante la creazione della sessione.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Visualizza i dettagli di una sessione
  const viewSession = async (session: SelectionSession) => {
    try {
      const response = await apiRequest('GET', `/api/selection/selections/session/${session.id}`);
      if (response.ok) {
        const selections = await response.json();
        onViewSelections(session, selections);
      } else {
        throw new Error('Errore nel caricamento delle selezioni');
      }
    } catch (error: any) {
      console.error('Errore nel caricamento delle selezioni:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile caricare le selezioni.',
        variant: 'destructive',
      });
    }
  };

  // Visualizza i commenti di una sessione
  const viewComments = async (session: SelectionSession) => {
    setCurrentSession(session);
    setIsViewingComments(true);
    
    try {
      const response = await apiRequest('GET', `/api/selection/comments/session/${session.id}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      } else {
        throw new Error('Errore nel caricamento dei commenti');
      }
    } catch (error: any) {
      console.error('Errore nel caricamento dei commenti:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile caricare i commenti.',
        variant: 'destructive',
      });
    }
  };

  // Elimina una sessione
  const deleteSession = async (session: SelectionSession) => {
    if (!confirm(`Sei sicuro di voler eliminare la sessione di ${session.clientName}? Questa azione non può essere annullata.`)) {
      return;
    }
    
    try {
      const response = await apiRequest('DELETE', `/api/selection/sessions/${session.id}`);
      if (response.ok) {
        setSessions(prev => prev.filter(s => s.id !== session.id));
        toast({
          title: 'Sessione eliminata',
          description: 'La sessione è stata eliminata con successo.',
        });
      } else {
        throw new Error('Errore nell\'eliminazione della sessione');
      }
    } catch (error: any) {
      console.error('Errore nell\'eliminazione della sessione:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile eliminare la sessione.',
        variant: 'destructive',
      });
    }
  };

  // Copia il link della sessione
  const copySessionLink = (session: SelectionSession) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/public/selection/${session.sessionKey}/${galleryId}`;
    
    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: 'Link copiato',
        description: 'Il link della sessione è stato copiato negli appunti.',
      });
    }).catch(err => {
      console.error('Errore durante la copia del link:', err);
      toast({
        title: 'Errore',
        description: 'Impossibile copiare il link negli appunti.',
        variant: 'destructive',
      });
    });
  };

  // Formatta lo stato della sessione per visualizzazione
  const formatStatus = (status: string) => {
    switch (status) {
      case 'active': return { label: 'Attiva', variant: 'default' as const };
      case 'completed': return { label: 'Completata', variant: 'success' as const };
      case 'expired': return { label: 'Scaduta', variant: 'destructive' as const };
      default: return { label: status, variant: 'secondary' as const };
    }
  };

  // Formatta la data di una sessione
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy HH:mm', { locale: it });
    } catch (e) {
      return 'Data non valida';
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl font-bold">Sessioni di Selezione</CardTitle>
            <CardDescription>
              Gestisci le sessioni di selezione per la galleria {galleryName}
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={fetchSessions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Aggiorna
            </Button>
            <Button size="sm" onClick={() => setIsNewSession(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Sessione
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 bg-secondary/20 rounded-md">
              <p className="text-muted-foreground">Nessuna sessione trovata per questa galleria</p>
              <Button className="mt-4" size="sm" onClick={() => setIsNewSession(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crea sessione
              </Button>
            </div>
          ) : (
            <Table>
              <TableCaption>Elenco sessioni di selezione</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-center">Selezioni</TableHead>
                  <TableHead className="text-center">Commenti</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map(session => {
                  const { label, variant } = formatStatus(session.status);
                  return (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.clientName}</TableCell>
                      <TableCell>{session.clientEmail}</TableCell>
                      <TableCell>
                        <Badge variant={variant}>{label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {session._count?.selections || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {session._count?.comments || 0}
                      </TableCell>
                      <TableCell>
                        {formatDate(session.startedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => viewSession(session)}>
                              <Image className="h-4 w-4 mr-2" />
                              Visualizza selezioni
                            </DropdownMenuItem>
                            {session._count && session._count.comments > 0 && (
                              <DropdownMenuItem onClick={() => viewComments(session)}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Visualizza commenti
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => copySessionLink(session)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copia link
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a 
                                href={`/public/selection/${session.sessionKey}/${galleryId}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Apri in nuova scheda
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteSession(session)}>
                              <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                              <span className="text-destructive">Elimina</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog per nuova sessione */}
      <Dialog open={isNewSession} onOpenChange={setIsNewSession}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nuova sessione di selezione</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nome cliente</Label>
                <Input 
                  id="clientName" 
                  {...form.register('clientName')} 
                  placeholder="Nome e cognome"
                />
                {form.formState.errors.clientName && (
                  <p className="text-sm text-destructive">{form.formState.errors.clientName.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email cliente</Label>
                <Input 
                  id="clientEmail" 
                  type="email" 
                  {...form.register('clientEmail')} 
                  placeholder="email@esempio.com"
                />
                {form.formState.errors.clientEmail && (
                  <p className="text-sm text-destructive">{form.formState.errors.clientEmail.message}</p>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsNewSession(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crea sessione
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog per visualizzazione commenti */}
      <Dialog open={isViewingComments} onOpenChange={setIsViewingComments}>
        <DialogContent className="max-w-4xl w-[90vw]">
          <DialogHeader>
            <DialogTitle>
              Commenti di {currentSession?.clientName}
            </DialogTitle>
          </DialogHeader>
          
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nessun commento trovato</p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="mb-6 border-b pb-4">
                  <div className="flex items-center mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">
                        {comment.user ? `${comment.user.fullName} (Staff)` : comment.clientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(comment.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      Foto #{comment.photoId}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-4">
                    {comment.photo && (
                      <img
                        src={comment.photo.thumbnailUrl}
                        alt={comment.photo.title || `Foto ${comment.photoId}`}
                        className="w-20 h-20 object-cover rounded-md"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setIsViewingComments(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}