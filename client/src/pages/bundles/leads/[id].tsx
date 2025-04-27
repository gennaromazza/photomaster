import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatPrice } from '@/lib/utils';
import { Loader2, ArrowLeft, FileText, Check, X, ExternalLink } from 'lucide-react';
import PdfGenerator from '@/components/bundles/pdf-generator';

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

const BundleLeadDetailPage: React.FC = () => {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  
  // Carica i dettagli della richiesta di preventivo
  const { data: bundleLead, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/bundle-leads/${id}`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/bundle-leads/${id}`);
        if (!res.ok) throw new Error('Errore nel caricamento dei dettagli della richiesta');
        return await res.json();
      } catch (error) {
        console.error('Errore durante il recupero dei dettagli:', error);
        throw error;
      }
    }
  });
  
  // Carica le impostazioni dello studio
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Errore nel caricamento delle impostazioni');
        return await res.json();
      } catch (error) {
        console.error('Errore durante il recupero delle impostazioni:', error);
        return null;
      }
    }
  });
  
  // Mutazione per convertire un lead in preventivo
  const convertToQuoteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/bundle-leads/convert-to-quote/${id}`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Preventivo creato',
        description: 'La richiesta è stata convertita in preventivo con successo',
      });
      // Aggiorna i dati
      refetch();
      // Reindirizza alla pagina del preventivo se richiesto
      if (data.quoteId) {
        navigate(`/quotes/detail/${data.quoteId}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Si è verificato un errore: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
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
              <X className="h-5 w-5 mr-2" />
              Errore nel caricamento dei dettagli
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{(error as Error).message}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/bundles/leads')} variant="outline" className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna alla lista
            </Button>
            <Button onClick={() => refetch()} variant="outline">
              Riprova
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (!bundleLead) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Richiesta non trovata</CardTitle>
            <CardDescription>
              La richiesta di preventivo specificata non è stata trovata
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>La richiesta potrebbe essere stata eliminata o l'ID potrebbe non essere valido.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/bundles/leads')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna alla lista
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Calcola il totale del pacchetto
  const calculateTotal = () => {
    if (!bundleLead.bundle?.items) return 0;
    
    const totalAmount = bundleLead.bundle.items.reduce((sum, item) => {
      return sum + ((item.service?.price || 0) * item.quantity);
    }, 0);
    
    // Calcolo prezzo scontato se disponibile
    if (bundleLead.bundle?.discountType && bundleLead.bundle?.discountValue > 0) {
      if (bundleLead.bundle.discountType === 'percentage') {
        return totalAmount - (totalAmount * bundleLead.bundle.discountValue / 100);
      } else {
        return Math.max(0, totalAmount - bundleLead.bundle.discountValue);
      }
    }
    
    return totalAmount;
  };

  const totalPrice = calculateTotal();
  
  return (
    <div className="p-8">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate('/bundles/leads')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla lista
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              Richiesta da {bundleLead.firstName} {bundleLead.lastName}
              <span className="ml-3">{formatStatus(bundleLead.status)}</span>
            </h1>
            <p className="text-gray-600 mt-1">
              {bundleLead.bundle?.name || "Pacchetto non disponibile"} • 
              Richiesto il {formatDate(bundleLead.createdAt)}
            </p>
          </div>
          
          <div className="flex gap-2">
            {bundleLead.quoteId ? (
              // Se esiste quoteId, mostra il pulsante per vedere il preventivo
              <Button
                onClick={() => navigate(`/quotes/detail/${bundleLead.quoteId}`)}
                className="flex items-center"
              >
                <FileText className="h-4 w-4 mr-2" />
                Vai al preventivo
              </Button>
            ) : bundleLead.status === "converted" ? (
              // Se è convertito ma non c'è quoteId, mostra un messaggio informativo
              <Button
                variant="outline"
                onClick={() => toast({
                  title: "Richiesta già in elaborazione", 
                  description: "La richiesta è già stata convertita ma il preventivo non è ancora disponibile"
                })}
                className="flex items-center"
              >
                <Check className="h-4 w-4 mr-2" />
                Elaborazione in corso
              </Button>
            ) : (
              // Se non è convertito, mostra il pulsante di conversione
              <Button
                onClick={() => convertToQuoteMutation.mutate()}
                disabled={convertToQuoteMutation.isPending}
                className="flex items-center"
              >
                {convertToQuoteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Converti in preventivo
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Dettagli Richiesta</TabsTrigger>
          <TabsTrigger value="services">Servizi Inclusi</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Nome</p>
                      <p>{bundleLead.firstName} {bundleLead.lastName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p>{bundleLead.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Telefono</p>
                      <p>{bundleLead.phone || "Non specificato"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Data Richiesta</p>
                      <p>{formatDate(bundleLead.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Dettagli Evento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Tipo Evento</p>
                      <p>{bundleLead.eventType || "Non specificato"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Data Evento</p>
                      <p>{bundleLead.eventDate ? formatDate(bundleLead.eventDate) : "Non specificata"}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Location</p>
                    <p>{bundleLead.location || "Non specificata"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {bundleLead.message && (
            <Card>
              <CardHeader>
                <CardTitle>Messaggio del Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{bundleLead.message}</p>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Azioni</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <PdfGenerator lead={bundleLead} settings={settings} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dettagli Pacchetto</CardTitle>
              <CardDescription>
                {bundleLead.bundle?.description || "Nessuna descrizione disponibile"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {bundleLead.bundle?.items?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Servizio</TableHead>
                        <TableHead className="text-right">Prezzo</TableHead>
                        <TableHead className="text-center">Qtà</TableHead>
                        <TableHead className="text-right">Totale</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bundleLead.bundle.items.map((item) => {
                        const price = item.service?.price || 0;
                        const quantity = item.quantity;
                        const total = price * quantity;
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.service?.name || "Servizio non disponibile"}</div>
                                {item.service?.description && (
                                  <div className="text-sm text-gray-500">{item.service.description}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{formatPrice(price)}</TableCell>
                            <TableCell className="text-center">{quantity}</TableCell>
                            <TableCell className="text-right">{formatPrice(total)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500">Nessun servizio incluso nel pacchetto</p>
                )}
                
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex justify-between items-center text-sm">
                    <span>Subtotale</span>
                    <span>{formatPrice(bundleLead.bundle?.totalPrice || 0)}</span>
                  </div>
                  
                  {bundleLead.bundle?.discountType && bundleLead.bundle?.discountValue > 0 && (
                    <div className="flex justify-between items-center text-sm mt-2">
                      <span>Sconto {bundleLead.bundle.discountType === 'percentage' ? `(${bundleLead.bundle.discountValue}%)` : ''}</span>
                      <span>-{formatPrice(bundleLead.bundle.totalPrice - bundleLead.bundle.discountedPrice)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center font-bold mt-2 pt-2 border-t border-border">
                    <span>Totale</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BundleLeadDetailPage;