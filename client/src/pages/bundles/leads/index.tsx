import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Info, FileText, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

// Helper per formattare lo stato della richiesta di preventivo
const formatStatus = (status: string) => {
  switch (status) {
    case 'new':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Nuovo</Badge>;
    case 'contacted':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Contattato</Badge>;
    case 'converted':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Convertito</Badge>;
    case 'archived':
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Archiviato</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const BundleLeadsPage: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Query per recuperare tutte le richieste preventivo da bundle
  const { data: bundleLeads, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/bundle-leads'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/bundle-leads');
        if (!res.ok) throw new Error('Errore nel caricamento delle richieste preventivo');
        return await res.json();
      } catch (error) {
        console.error('Errore durante il recupero delle richieste:', error);
        throw error;
      }
    }
  });
  
  // Mutazione per convertire un lead in preventivo
  const convertToQuoteMutation = useMutation({
    mutationFn: async (leadId: number) => {
      const res = await apiRequest('POST', `/api/bundle-leads/convert-to-quote/${leadId}`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Preventivo creato',
        description: 'La richiesta è stata convertita in preventivo con successo',
      });
      // Aggiorna i dati
      refetch();
      // Reindirizza alla pagina del preventivo
      if (data.quoteId) {
        navigate(`/quotes/detail/${data.quoteId}`);
      }
    },
    onError: (error: Error) => {
      console.error('Errore durante la conversione:', error);
      toast({
        title: 'Errore',
        description: `Si è verificato un errore: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Stato per tracciare il lead in fase di conversione
  const [convertingLeadId, setConvertingLeadId] = useState<number | null>(null);
  
  // Funzione per convertire un bundle lead in preventivo
  const handleConvertToQuote = (leadId: number) => {
    setConvertingLeadId(leadId);
    convertToQuoteMutation.mutate(leadId);
  };
  
  // Se i dati sono in caricamento, mostra un indicatore di caricamento
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Se si è verificato un errore, mostra un messaggio di errore
  if (error) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Errore nel caricamento delle richieste
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{(error as Error).message}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => refetch()} variant="outline">
              Riprova
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Se non ci sono richieste, mostra un messaggio
  if (!bundleLeads || bundleLeads.length === 0) {
    return (
      <div className="p-8">
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle>Richieste preventivo da pacchetti</CardTitle>
            <CardDescription>
              Non sono presenti richieste di preventivo da pacchetti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">
              Le richieste di preventivo dai pacchetti pubblici appariranno qui quando i clienti le invieranno.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/bundles')} variant="outline">
              Gestisci Pacchetti
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Richieste Preventivo da Pacchetti</h1>
          <p className="text-gray-600 mt-1">
            Gestisci le richieste di preventivo inviate dai clienti attraverso i pacchetti pubblici
          </p>
        </div>
        
        <Button onClick={() => navigate('/bundles')} variant="outline">
          Gestisci Pacchetti
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Pacchetto</TableHead>
                <TableHead>Data Evento</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Data Richiesta</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundleLeads.map((lead: any) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{lead.firstName} {lead.lastName}</div>
                      <div className="text-sm text-gray-500">{lead.email}</div>
                      {lead.phone && <div className="text-sm text-gray-500">{lead.phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.bundle?.name || "Pacchetto non disponibile"}
                  </TableCell>
                  <TableCell>
                    {lead.eventDate ? formatDate(lead.eventDate) : "Non specificata"}
                  </TableCell>
                  <TableCell>
                    {formatStatus(lead.status)}
                  </TableCell>
                  <TableCell>
                    {formatDate(lead.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/bundles/leads/${lead.id}`)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Dettagli</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {lead.quoteId ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/quotes/detail/${lead.quoteId}`)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Vai al preventivo</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleConvertToQuote(lead.id)}
                                disabled={convertingLeadId === lead.id || convertToQuoteMutation.isPending}
                              >
                                {convertingLeadId === lead.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Converti in preventivo</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default BundleLeadsPage;