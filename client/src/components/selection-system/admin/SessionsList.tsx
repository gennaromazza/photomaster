import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Eye, 
  Loader2, 
  UserCircle, 
  Calendar, 
  CheckCircle2, 
  Clock,
  ImageIcon,
  MessageSquare
} from 'lucide-react';

// Tipi per i dati
type SelectionSession = {
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
  _count?: {
    selections: number;
    comments: number;
  };
};

type SessionsListProps = {
  galleryId: number;
};

export default function SessionsList({ galleryId }: SessionsListProps) {
  const [selectedSession, setSelectedSession] = useState<SelectionSession | null>(null);
  const [viewTab, setViewTab] = useState('active');

  // Carica le sessioni di selezione
  const { data: sessions, isLoading } = useQuery<SelectionSession[]>({
    queryKey: [`/api/selection/sessions`, { galleryId }],
    enabled: !!galleryId,
  });

  // Filtra le sessioni in base al tab
  const filteredSessions = sessions?.filter(session => {
    if (viewTab === 'active') return session.status === 'active';
    if (viewTab === 'completed') return session.status === 'completed';
    if (viewTab === 'expired') return session.status === 'expired';
    return true;
  });

  // Apri i dettagli della sessione
  const openSessionDetails = (session: SelectionSession) => {
    setSelectedSession(session);
  };

  // Chiudi i dettagli della sessione
  const closeSessionDetails = () => {
    setSelectedSession(null);
  };

  // Genera stato per il rendering
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Attiva</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Completata</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Scaduta</Badge>;
      default:
        return <Badge variant="outline">Sconosciuto</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Sessioni di Selezione</CardTitle>
          <CardDescription>
            Gestisci le sessioni di selezione foto create dai clienti
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" onValueChange={setViewTab}>
            <TabsList className="mb-4 grid grid-cols-3 w-full md:w-auto">
              <TabsTrigger value="active">Attive</TabsTrigger>
              <TabsTrigger value="completed">Completate</TabsTrigger>
              <TabsTrigger value="expired">Scadute</TabsTrigger>
            </TabsList>
            
            {filteredSessions?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-muted-foreground mt-2">
                  {viewTab === 'active' && "Non ci sono sessioni attive"}
                  {viewTab === 'completed' && "Non ci sono sessioni completate"}
                  {viewTab === 'expired' && "Non ci sono sessioni scadute"}
                </h3>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="hidden md:table-cell">Iniziata il</TableHead>
                      <TableHead className="hidden md:table-cell">Stato</TableHead>
                      <TableHead className="hidden md:table-cell">Selezioni</TableHead>
                      <TableHead className="hidden md:table-cell">Commenti</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions?.map(session => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{session.clientName}</span>
                            <span className="text-xs text-muted-foreground">{session.clientEmail}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(session.startedAt), "d MMM yyyy", { locale: it })}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {getStatusBadge(session.status)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary" className="ml-1">
                            {session._count?.selections || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary" className="ml-1">
                            {session._count?.comments || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => openSessionDetails(session)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Dettagli
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogo Dettagli Sessione */}
      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && closeSessionDetails()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Dettagli Sessione di Selezione</DialogTitle>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <UserCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Cliente:</span>
                    <span className="ml-2">{selectedSession.clientName}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Iniziata il:</span>
                    <span className="ml-2">
                      {format(new Date(selectedSession.startedAt), "d MMMM yyyy, HH:mm", { locale: it })}
                    </span>
                  </div>
                  {selectedSession.completedAt && (
                    <div className="flex items-center text-sm">
                      <CheckCircle2 className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">Completata il:</span>
                      <span className="ml-2">
                        {format(new Date(selectedSession.completedAt), "d MMMM yyyy, HH:mm", { locale: it })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Stato:</span>
                    <span className="ml-2">{getStatusBadge(selectedSession.status)}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <ImageIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Foto selezionate:</span>
                    <span className="ml-2">
                      <Badge variant="secondary">{selectedSession._count?.selections || 0}</Badge>
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Commenti:</span>
                    <span className="ml-2">
                      <Badge variant="secondary">{selectedSession._count?.comments || 0}</Badge>
                    </span>
                  </div>
                </div>
              </div>

              {selectedSession.notes && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-1">Note del cliente:</h4>
                  <p className="text-sm p-3 bg-muted rounded-md">{selectedSession.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={closeSessionDetails}>
                  Chiudi
                </Button>
                <Button onClick={() => window.open(`/selection/sessions/${selectedSession.id}`, '_blank')}>
                  Visualizza Selezioni
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}