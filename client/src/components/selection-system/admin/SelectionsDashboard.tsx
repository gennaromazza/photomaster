import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, Settings, Plus, Link as LinkIcon, Download, RefreshCw, Copy, Check, Calendar, User, Mail, ExternalLink, MoreHorizontal, Image } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Schema per le impostazioni di selezione
const settingsSchema = z.object({
  isEnabled: z.boolean(),
  instructions: z.string().nullable(),
  minSelections: z.coerce.number().min(0),
  maxSelections: z.coerce.number().min(0),
  expiresAt: z.string().nullable()
});

type GallerySelectionSettings = z.infer<typeof settingsSchema> & {
  id: number;
  galleryId: number;
  createdAt: string;
  updatedAt: string;
};

// Schema per la sessione
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

type Photo = {
  id: number;
  galleryId: number;
  filename: string;
  title: string | null;
  thumbnailUrl: string;
  originalUrl: string;
  chapterId: number | null;
};

type PhotoSelection = {
  id: number;
  sessionId: number;
  photoId: number;
  notes: string | null;
  createdAt: string;
  photo: Photo;
};

type SelectionsDashboardProps = {
  galleryId: number;
  galleryName: string;
};

export default function SelectionsDashboard({ galleryId, galleryName }: SelectionsDashboardProps) {
  const [activeTab, setActiveTab] = useState('sessions');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<GallerySelectionSettings | null>(null);
  const [sessions, setSessions] = useState<SelectionSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<SelectionSession | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoSelection[]>([]);
  const [isEditSettings, setIsEditSettings] = useState(false);
  const [isNewSession, setIsNewSession] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'zip'>('csv');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<number[]>([]);
  
  const { toast } = useToast();
  
  // Form per le impostazioni
  const settingsForm = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      isEnabled: false,
      instructions: null,
      minSelections: 0,
      maxSelections: 0,
      expiresAt: null
    }
  });
  
  // Form per la nuova sessione
  const sessionForm = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      clientName: '',
      clientEmail: '',
      clientId: null
    }
  });

  // Carica le impostazioni
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await apiRequest('GET', `/api/selection/settings/${galleryId}`);
        const data = await response.json();
        setSettings(data);
        
        // Aggiorna i valori del form
        settingsForm.reset({
          isEnabled: data.isEnabled,
          instructions: data.instructions,
          minSelections: data.minSelections,
          maxSelections: data.maxSelections,
          expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString().split('T')[0] : null
        });
      } catch (error) {
        console.error('Errore nel caricamento delle impostazioni:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [galleryId, settingsForm]);

  // Carica le sessioni
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await apiRequest('GET', `/api/selection/sessions/gallery/${galleryId}`);
        if (response.ok) {
          const data = await response.json();
          setSessions(data);
        } else {
          throw new Error('Errore durante il recupero delle sessioni');
        }
      } catch (error) {
        console.error('Errore nel caricamento delle sessioni:', error);
        toast({
          title: 'Errore',
          description: 'Impossibile caricare le sessioni per questa galleria.',
          variant: 'destructive',
        });
      }
    };

    fetchSessions();
  }, [galleryId, toast]);

  // Gestisce l'invio del form delle impostazioni
  const handleSettingsSubmit = async (data: z.infer<typeof settingsSchema>) => {
    try {
      const response = await apiRequest('PUT', `/api/selection/settings/${galleryId}`, data);
      
      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
        setIsEditSettings(false);
        
        toast({
          title: 'Impostazioni aggiornate',
          description: 'Le impostazioni di selezione sono state aggiornate con successo.',
        });
      } else {
        throw new Error('Errore nell\'aggiornamento delle impostazioni');
      }
    } catch (error: any) {
      console.error('Errore nell\'aggiornamento delle impostazioni:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Si è verificato un errore durante l\'aggiornamento delle impostazioni.',
        variant: 'destructive',
      });
    }
  };

  // Gestisce l'invio del form per la nuova sessione
  const handleSessionSubmit = async (data: z.infer<typeof sessionSchema>) => {
    try {
      const response = await apiRequest('POST', '/api/selection/sessions', {
        ...data,
        galleryId
      });
      
      if (response.ok) {
        const newSession = await response.json();
        setSessions(prev => [newSession, ...prev]);
        setIsNewSession(false);
        sessionForm.reset();
        
        toast({
          title: 'Sessione creata',
          description: 'La sessione di selezione è stata creata con successo.',
        });
      } else {
        throw new Error('Errore nella creazione della sessione');
      }
    } catch (error: any) {
      console.error('Errore nella creazione della sessione:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Si è verificato un errore durante la creazione della sessione.',
        variant: 'destructive',
      });
    }
  };

  // Visualizza i dettagli di una sessione
  const viewSession = async (session: SelectionSession) => {
    setSelectedSession(session);
    
    try {
      const response = await apiRequest('GET', `/api/selection/selections/session/${session.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedPhotos(data);
      } else {
        throw new Error('Errore durante il recupero delle selezioni');
      }
    } catch (error) {
      console.error('Errore nel caricamento delle selezioni:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le selezioni per questa sessione.',
        variant: 'destructive',
      });
    }
  };

  // Esporta le foto selezionate
  const exportSelections = async () => {
    if (!selectedSession) return;
    
    setIsExporting(true);
    
    try {
      const photoIds = selectedPhotoIds.length > 0 ? selectedPhotoIds : selectedPhotos.map(s => s.photo.id);
      
      const response = await apiRequest('GET', `/api/selection/export/${selectedSession.id}?format=${exportFormat}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `selezione_${selectedSession.clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: 'Esportazione completata',
          description: 'Le foto selezionate sono state esportate con successo.',
        });
      } else {
        throw new Error('Errore nell\'esportazione delle selezioni');
      }
    } catch (error: any) {
      console.error('Errore nell\'esportazione delle selezioni:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Si è verificato un errore durante l\'esportazione delle selezioni.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setExportFormat('csv');
      setSelectAll(false);
      setSelectedPhotoIds([]);
    }
  };

  // Copia il link della sessione
  const copySessionLink = (session: SelectionSession) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/selection/session/${session.sessionKey}/${galleryId}`;
    
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

  // Gestisce la selezione/deselezione di tutte le foto
  useEffect(() => {
    if (selectAll) {
      setSelectedPhotoIds(selectedPhotos.map(p => p.photo.id));
    } else {
      setSelectedPhotoIds([]);
    }
  }, [selectAll, selectedPhotos]);

  // Gestisce la selezione/deselezione di una singola foto
  const togglePhotoSelection = (photoId: number) => {
    setSelectedPhotoIds(prev => {
      if (prev.includes(photoId)) {
        return prev.filter(id => id !== photoId);
      } else {
        return [...prev, photoId];
      }
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">Selezione Foto: {galleryName}</CardTitle>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditSettings(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Impostazioni
          </Button>
          <Button size="sm" onClick={() => setIsNewSession(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Sessione
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="sessions">Sessioni</TabsTrigger>
            <TabsTrigger value="settings">Impostazioni</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sessions">
            <Table>
              <TableCaption>Lista delle sessioni di selezione</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-center">Foto</TableHead>
                  <TableHead className="text-center">Commenti</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Nessuna sessione trovata
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map(session => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.clientName}</TableCell>
                      <TableCell>{session.clientEmail}</TableCell>
                      <TableCell>
                        <Badge variant={
                          session.status === 'active' ? 'default' :
                          session.status === 'completed' ? 'success' : 'destructive'
                        }>
                          {session.status === 'active' ? 'Attiva' :
                           session.status === 'completed' ? 'Completata' : 'Scaduta'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {session._count?.selections || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {session._count?.comments || 0}
                      </TableCell>
                      <TableCell>
                        {format(new Date(session.startedAt), 'dd/MM/yyyy', { locale: it })}
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
                            <DropdownMenuItem onClick={() => copySessionLink(session)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copia link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              const baseUrl = window.location.origin;
                              window.open(`${baseUrl}/selection/session/${session.sessionKey}/${galleryId}`, '_blank');
                            }}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Apri in nuova scheda
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>
          
          <TabsContent value="settings">
            {settings ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Stato</h3>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={settings.isEnabled ? 'default' : 'secondary'}
                      >
                        {settings.isEnabled ? 'Abilitato' : 'Disabilitato'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Limiti selezione</h3>
                    <div className="space-y-1 text-sm">
                      <p>Minimo: {settings.minSelections}</p>
                      <p>Massimo: {settings.maxSelections > 0 ? settings.maxSelections : 'Illimitato'}</p>
                    </div>
                  </div>
                </div>
                
                {settings.instructions && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Istruzioni</h3>
                    <div className="bg-secondary/20 p-3 rounded-md">
                      {settings.instructions}
                    </div>
                  </div>
                )}
                
                {settings.expiresAt && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Scadenza</h3>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(settings.expiresAt), 'dd/MM/yyyy', { locale: it })}</span>
                    </div>
                  </div>
                )}
                
                <Button onClick={() => setIsEditSettings(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Modifica impostazioni
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p>Caricamento impostazioni...</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Dialog per modifica impostazioni */}
      <Dialog open={isEditSettings} onOpenChange={setIsEditSettings}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Impostazioni selezione foto</DialogTitle>
          </DialogHeader>
          <form onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)} className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="isEnabled" 
                checked={settingsForm.watch('isEnabled')}
                onCheckedChange={val => settingsForm.setValue('isEnabled', val)}
              />
              <Label htmlFor="isEnabled">Abilita selezione foto</Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="minSelections">Numero minimo di foto</Label>
              <Input 
                id="minSelections" 
                type="number" 
                min="0"
                {...settingsForm.register('minSelections')}
              />
              {settingsForm.formState.errors.minSelections && (
                <p className="text-sm text-destructive">{settingsForm.formState.errors.minSelections.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxSelections">Numero massimo di foto (0 = nessun limite)</Label>
              <Input 
                id="maxSelections" 
                type="number"
                min="0"
                {...settingsForm.register('maxSelections')}
              />
              {settingsForm.formState.errors.maxSelections && (
                <p className="text-sm text-destructive">{settingsForm.formState.errors.maxSelections.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="instructions">Istruzioni per il cliente</Label>
              <Textarea 
                id="instructions" 
                placeholder="Istruzioni opzionali"
                {...settingsForm.register('instructions')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Data di scadenza (opzionale)</Label>
              <Input 
                id="expiresAt" 
                type="date"
                {...settingsForm.register('expiresAt')}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditSettings(false)}>
                Annulla
              </Button>
              <Button type="submit">Salva impostazioni</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog per nuova sessione */}
      <Dialog open={isNewSession} onOpenChange={setIsNewSession}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nuova sessione di selezione</DialogTitle>
          </DialogHeader>
          <form onSubmit={sessionForm.handleSubmit(handleSessionSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nome cliente</Label>
              <Input 
                id="clientName" 
                placeholder="Nome completo del cliente"
                {...sessionForm.register('clientName')}
              />
              {sessionForm.formState.errors.clientName && (
                <p className="text-sm text-destructive">{sessionForm.formState.errors.clientName.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email cliente</Label>
              <Input 
                id="clientEmail" 
                type="email"
                placeholder="email@esempio.com"
                {...sessionForm.register('clientEmail')}
              />
              {sessionForm.formState.errors.clientEmail && (
                <p className="text-sm text-destructive">{sessionForm.formState.errors.clientEmail.message}</p>
              )}
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewSession(false)}>
                Annulla
              </Button>
              <Button type="submit">Crea sessione</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog per visualizzazione selezioni */}
      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="max-w-6xl w-[90vw]">
          <DialogHeader>
            <DialogTitle>
              Selezioni di {selectedSession?.clientName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>{selectedSession?.clientName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>{selectedSession?.clientEmail}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setExportFormat('csv')}
                disabled={isExporting}
                className={exportFormat === 'csv' ? 'bg-primary text-primary-foreground' : ''}
              >
                Esporta CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setExportFormat('zip')}
                disabled={isExporting}
                className={exportFormat === 'zip' ? 'bg-primary text-primary-foreground' : ''}
              >
                Scarica foto
              </Button>
              <Button 
                size="sm" 
                onClick={exportSelections}
                disabled={selectedPhotos.length === 0 || isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {exportFormat === 'csv' ? 'Esporta' : 'Scarica'}
              </Button>
            </div>
          </div>
          
          {selectedPhotos.length === 0 ? (
            <Alert>
              <AlertDescription>
                Nessuna foto selezionata in questa sessione.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox 
                  id="selectAll" 
                  checked={selectAll}
                  onCheckedChange={setSelectAll}
                />
                <Label htmlFor="selectAll">Seleziona tutte</Label>
                <span className="ml-auto text-sm text-gray-500">
                  {selectedPhotoIds.length} di {selectedPhotos.length} selezionate
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {selectedPhotos.map(selection => (
                  <Card key={selection.id} className={`overflow-hidden ${selectedPhotoIds.includes(selection.photo.id) ? 'ring-2 ring-primary' : ''}`}>
                    <div className="relative">
                      <img 
                        src={selection.photo.thumbnailUrl} 
                        alt={selection.photo.title || `Foto ${selection.photo.id}`}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Checkbox 
                          checked={selectedPhotoIds.includes(selection.photo.id)}
                          onCheckedChange={() => togglePhotoSelection(selection.photo.id)}
                          className="bg-white/90 border-0"
                        />
                      </div>
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs truncate">
                        {selection.photo.title || `Foto ${selection.photo.id}`}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}