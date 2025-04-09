import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/layout/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ChevronLeft, Share, Send, FileCheck, FileEdit, Mail, Phone, Calendar } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusColorMap: Record<string, string> = {
  draft: "bg-gray-200 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const QuoteDetailPage: React.FC = () => {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [signature, setSignature] = useState("");
  const [shareMethod, setShareMethod] = useState<"email" | "whatsapp">("email");
  const [shareEmail, setShareEmail] = useState("");
  const [sharePhone, setSharePhone] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  
  // Recupera i dettagli del preventivo
  const quoteQuery = useQuery({
    queryKey: [`/api/quotes/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/${id}`);
      if (!res.ok) throw new Error('Errore nel caricamento del preventivo');
      return await res.json();
    }
  });
  
  // Recupera i dettagli del cliente
  const clientQuery = useQuery({
    queryKey: [`/api/clients/${quoteQuery.data?.clientId}`],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${quoteQuery.data?.clientId}`);
      if (!res.ok) throw new Error('Errore nel caricamento del cliente');
      return await res.json();
    },
    enabled: !!quoteQuery.data?.clientId,
  });
  
  // Recupera gli elementi del preventivo
  const quoteItemsQuery = useQuery({
    queryKey: [`/api/quotes/${id}/items`],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/${id}/items`);
      if (!res.ok) throw new Error('Errore nel caricamento degli elementi del preventivo');
      return await res.json();
    },
    enabled: !!id,
  });
  
  // Mutation per aggiornare lo stato del preventivo
  const updateQuoteMutation = useMutation({
    mutationFn: async (data: { status: string, signature?: string }) => {
      const res = await apiRequest("PUT", `/api/quotes/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Preventivo aggiornato",
        description: "Lo stato del preventivo è stato aggiornato con successo",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      setIsSignDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento del preventivo",
        variant: "destructive",
      });
    },
  });
  
  // Mutation per inviare il preventivo via email
  const sendQuoteEmailMutation = useMutation({
    mutationFn: async (data: { emailTo: string, message: string }) => {
      const res = await apiRequest("POST", `/api/quotes/${id}/send`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Preventivo inviato",
        description: "Il preventivo è stato inviato con successo via email",
      });
      // Aggiorna lo stato del preventivo a "sent"
      updateQuoteMutation.mutate({ status: "sent" });
      setIsShareDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio del preventivo",
        variant: "destructive",
      });
    },
  });
  
  // Gestisci l'approvazione del preventivo
  const handleApproveQuote = () => {
    setIsSignDialogOpen(true);
  };
  
  // Gestisci la firma del preventivo
  const handleSign = () => {
    if (!signature.trim()) {
      toast({
        title: "Firma richiesta",
        description: "Inserisci la tua firma per approvare il preventivo",
        variant: "destructive",
      });
      return;
    }
    
    updateQuoteMutation.mutate({ 
      status: "approved",
      signature: signature,
      updatedAt: new Date().toISOString()
    });
  };
  
  // Gestisci la condivisione del preventivo
  const handleShare = () => {
    if (shareMethod === "email") {
      if (!shareEmail) {
        toast({
          title: "Email richiesta",
          description: "Inserisci un indirizzo email valido",
          variant: "destructive",
        });
        return;
      }
      
      sendQuoteEmailMutation.mutate({
        emailTo: shareEmail,
        message: shareMessage
      });
    } else {
      // WhatsApp
      if (!sharePhone) {
        toast({
          title: "Numero di telefono richiesto",
          description: "Inserisci un numero di telefono valido",
          variant: "destructive",
        });
        return;
      }
      
      // Crea e apri l'URL di WhatsApp con il link al preventivo
      const cleanPhone = sharePhone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
      // Aggiungi prefisso +39 se non presente
      const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+39${cleanPhone}`;
      const quoteUrl = `${window.location.origin}/quotes/public/${id}`;
      const message = shareMessage || "Ecco il tuo preventivo";
      const whatsappUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(message + '\n\n' + quoteUrl)}`;
      
      window.open(whatsappUrl, '_blank');
      
      // Aggiorna lo stato del preventivo a "sent"
      updateQuoteMutation.mutate({ status: "sent" });
      setIsShareDialogOpen(false);
    }
  };
  
  // Crea un nuovo evento da questo preventivo
  const createEventFromQuote = () => {
    navigate(`/calendar?quoteId=${id}`);
  };
  
  // Imposta i valori predefiniti per la condivisione
  useEffect(() => {
    if (clientQuery.data) {
      setShareEmail(clientQuery.data.email || '');
      setSharePhone(clientQuery.data.phone || '');
      setShareMessage(`Gentile ${clientQuery.data.firstName},\n\nGrazie per averci scelto. In allegato trovi il preventivo richiesto.\n\nPer qualsiasi domanda, non esitare a contattarci.\n\nCordiali saluti.`);
    }
  }, [clientQuery.data]);
  
  // Loading state
  if (quoteQuery.isLoading) {
    return (
      <Layout>
        <div className="container py-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  
  // Error state
  if (quoteQuery.isError || !quoteQuery.data) {
    return (
      <Layout>
        <div className="container py-8">
          <Button variant="ghost" onClick={() => navigate('/quotes')} className="mb-6">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Torna ai preventivi
          </Button>
          
          <Card className="text-center p-8">
            <CardTitle className="mb-4">Preventivo non trovato</CardTitle>
            <CardDescription>
              Il preventivo richiesto non esiste o è stato eliminato.
            </CardDescription>
            <CardFooter className="justify-center mt-6">
              <Button onClick={() => navigate('/quotes')}>
                Torna alla lista dei preventivi
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Layout>
    );
  }
  
  const quote = quoteQuery.data;
  const client = clientQuery.data;
  const quoteItems = quoteItemsQuery.data || [];
  const isApproved = quote.status === "approved";
  
  return (
    <Layout>
      <div className="container py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <div className="flex items-center mb-2">
              <Button variant="ghost" onClick={() => navigate('/quotes')} className="mr-2 p-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl lg:text-3xl font-playfair font-bold">{quote.title}</h1>
              <Badge className={`ml-4 ${statusColorMap[quote.status] || 'bg-gray-200'}`}>
                {quote.status === "draft" ? "Bozza" : 
                 quote.status === "sent" ? "Inviato" : 
                 quote.status === "approved" ? "Approvato" : 
                 quote.status === "rejected" ? "Rifiutato" : quote.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Creato il {formatDate(new Date(quote.createdAt))}
              {quote.expiryDate && ` · Scade il ${formatDate(new Date(quote.expiryDate))}`}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4 lg:mt-0">
            {quote.status === "draft" && (
              <>
                <Button 
                  variant="outline" 
                  className="flex items-center" 
                  onClick={() => setIsShareDialogOpen(true)}
                >
                  <Share className="mr-2 h-4 w-4" />
                  Condividi
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center" 
                  onClick={() => navigate(`/quotes/edit/${id}`)}
                >
                  <FileEdit className="mr-2 h-4 w-4" />
                  Modifica
                </Button>
              </>
            )}
            
            {quote.status === "sent" && (
              <>
                <Button 
                  variant="outline" 
                  className="flex items-center" 
                  onClick={handleApproveQuote}
                >
                  <FileCheck className="mr-2 h-4 w-4" />
                  Firma
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center" 
                  onClick={() => setIsShareDialogOpen(true)}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Invia di nuovo
                </Button>
              </>
            )}
            
            {quote.status === "approved" && (
              <Button 
                variant="default" 
                className="flex items-center" 
                onClick={createEventFromQuote}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Crea Evento
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dettagli del cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              {clientQuery.isLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : client ? (
                <div className="space-y-2">
                  <div className="font-medium">{client.firstName} {client.lastName}</div>
                  {client.email && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="mr-2 h-4 w-4" />
                      <a href={`mailto:${client.email}`} className="hover:underline">
                        {client.email}
                      </a>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Phone className="mr-2 h-4 w-4" />
                      <a 
                        href={`https://wa.me/${client.phone.replace(/\s+/g, '').replace(/[^\d+]/g, '').startsWith('+') ? client.phone.replace(/\s+/g, '').replace(/[^\d+]/g, '').substring(1) : '39' + client.phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {client.phone}
                      </a>
                    </div>
                  )}
                  {client.address && (
                    <div className="text-sm text-gray-500 mt-2">
                      {client.address}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500">Cliente non trovato</div>
              )}
            </CardContent>
          </Card>
          
          {/* Riepilogo */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Riepilogo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <span>Subtotale</span>
                  <span>{formatCurrency(quote.subtotal)}</span>
                </div>
                {quote.discount > 0 && (
                  <div className="flex justify-between text-green-600 border-b pb-2">
                    <span>Sconto</span>
                    <span>-{formatCurrency(quote.discount)}</span>
                  </div>
                )}
                {quote.tax > 0 && (
                  <div className="flex justify-between border-b pb-2">
                    <span>IVA</span>
                    <span>{formatCurrency(quote.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>Totale</span>
                  <span>{formatCurrency(quote.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Elementi del preventivo */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Servizi e Prodotti</CardTitle>
            </CardHeader>
            <CardContent>
              {quoteItemsQuery.isLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-12 bg-gray-200 rounded"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              ) : quoteItems.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  Nessun prodotto o servizio aggiunto al preventivo
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Servizio/Prodotto</th>
                        <th className="text-right py-3 px-4">Quantità</th>
                        <th className="text-right py-3 px-4">Prezzo Unitario</th>
                        <th className="text-right py-3 px-4">Sconto</th>
                        <th className="text-right py-3 px-4">Totale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quoteItems.map((item: any) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-3 px-4">
                            <div className="font-medium">{item.serviceName || "Servizio"}</div>
                            {item.notes && (
                              <div className="text-sm text-gray-500 mt-1">{item.notes}</div>
                            )}
                          </td>
                          <td className="text-right py-3 px-4">{item.quantity}</td>
                          <td className="text-right py-3 px-4">{formatCurrency(item.unitPrice)}</td>
                          <td className="text-right py-3 px-4">
                            {item.hasDiscount && item.discountValue ? (
                              item.discountType === "percentage" ? 
                                `${item.discountValue}%` : 
                                formatCurrency(item.discountValue)
                            ) : "-"}
                          </td>
                          <td className="text-right py-3 px-4 font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Note */}
          {quote.notes && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Note</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap">{quote.notes}</div>
              </CardContent>
            </Card>
          )}
          
          {/* Firma (se approvato) */}
          {isApproved && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Firma Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border p-4 rounded-md">
                  <div className="font-italic text-gray-600 mb-2">
                    Firmato digitalmente da:
                  </div>
                  <div className="font-medium text-lg font-playfair">
                    {quote.signature || client?.firstName + ' ' + client?.lastName}
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    Data: {formatDate(new Date(quote.updatedAt || quote.createdAt))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Dialog per la condivisione */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Condividi Preventivo</DialogTitle>
            <DialogDescription>
              Invia il preventivo al cliente via email o WhatsApp
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="email" className="w-full" onValueChange={(v) => setShareMethod(v as "email" | "whatsapp")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            </TabsList>
            
            <TabsContent value="email" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="email@esempio.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Messaggio</Label>
                <Textarea
                  id="message"
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  rows={4}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="whatsapp" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Numero di telefono</Label>
                <Input
                  id="phone"
                  value={sharePhone}
                  onChange={(e) => setSharePhone(e.target.value)}
                  placeholder="+39 123 456 7890"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="whatsapp-message">Messaggio</Label>
                <Textarea
                  id="whatsapp-message"
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" onClick={handleShare}>
              Invia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog per la firma */}
      <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Firma Preventivo</DialogTitle>
            <DialogDescription>
              Inserisci la tua firma per approvare il preventivo
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="signature">La tua firma</Label>
              <Input
                id="signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Inserisci il tuo nome e cognome"
              />
            </div>
            
            <div className="text-sm text-gray-500">
              Approvando questo preventivo, accetti di procedere con i servizi descritti ai prezzi indicati.
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSignDialogOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" onClick={handleSign}>
              Approva e Firma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default QuoteDetailPage;