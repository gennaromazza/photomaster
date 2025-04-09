import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileCheck } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

// Componente per la visualizzazione pubblica e firma del preventivo
const PublicQuotePage: React.FC = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);

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
  
  // Recupera le impostazioni dello studio
  const settingsQuery = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Errore nel caricamento delle impostazioni');
      return await res.json();
    }
  });
  
  // Mutation per firmare il preventivo
  const signQuoteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/quotes/${id}`, {
        status: "approved",
        signature: signature,
        updatedAt: new Date().toISOString()
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Preventivo firmato",
        description: "Grazie per aver approvato il preventivo. Ti contatteremo presto per i prossimi passi.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la firma del preventivo. Riprova più tardi.",
        variant: "destructive",
      });
    },
  });
  
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
    
    if (!agreed) {
      toast({
        title: "Accettazione richiesta",
        description: "Devi accettare i termini e le condizioni prima di firmare",
        variant: "destructive",
      });
      return;
    }
    
    signQuoteMutation.mutate();
  };
  
  // Imposta la firma predefinita se l'utente è autenticato
  useEffect(() => {
    if (clientQuery.data) {
      setSignature(`${clientQuery.data.firstName} ${clientQuery.data.lastName}`);
    }
  }, [clientQuery.data]);
  
  // Loading state
  if (quoteQuery.isLoading || clientQuery.isLoading || settingsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-gray-600">Caricamento preventivo...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (quoteQuery.isError || !quoteQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-2xl text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Preventivo non disponibile</CardTitle>
            <CardDescription>
              Il preventivo richiesto non esiste o non è più disponibile.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <a href="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Torna alla Home
            </a>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const quote = quoteQuery.data;
  const client = clientQuery.data;
  const quoteItems = quoteItemsQuery.data || [];
  const settings = settingsQuery.data || {};
  const isApproved = quote.status === "approved";
  
  // Se il preventivo è già stato approvato
  if (isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-primary">Preventivo già approvato</CardTitle>
            <CardDescription>
              Grazie! Questo preventivo è stato approvato il {formatDate(new Date(quote.updatedAt || quote.createdAt))}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center text-green-500 my-8">
              <div className="rounded-full bg-green-100 p-3">
                <FileCheck className="h-8 w-8" />
              </div>
            </div>
            <div className="text-center space-y-2 mb-6">
              <p>Un nostro rappresentante ti contatterà presto per organizzare i dettagli.</p>
              <p className="text-sm text-gray-500">Riferimento preventivo: #{quote.id}</p>
            </div>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-gray-500">
              {settings.companyName} • {settings.companyPhone} • {settings.companyEmail}
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader className="text-center border-b">
            <div className="mb-4">
              {settings.companyLogo ? (
                <img src={settings.companyLogo} alt={settings.companyName} className="h-16 mx-auto" />
              ) : (
                <h1 className="text-2xl font-playfair font-bold">{settings.companyName || "Studio Fotografico"}</h1>
              )}
            </div>
            <CardTitle className="text-2xl">Preventivo: {quote.title}</CardTitle>
            <CardDescription>
              Creato il {formatDate(new Date(quote.createdAt))}
              {quote.expiryDate && ` · Valido fino al ${formatDate(new Date(quote.expiryDate))}`}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-6">
            {/* Dettagli cliente */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-medium mb-2">Informazioni Cliente</h3>
              <div>
                <p><strong>Nome:</strong> {client.firstName} {client.lastName}</p>
                <p><strong>Email:</strong> {client.email}</p>
                {client.phone && <p><strong>Telefono:</strong> {client.phone}</p>}
                {client.address && <p><strong>Indirizzo:</strong> {client.address}</p>}
              </div>
            </div>
            
            {/* Elementi del preventivo */}
            <div>
              <h3 className="font-medium mb-4">Servizi e Prodotti</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Descrizione</th>
                      <th className="text-right py-3 px-4">Quantità</th>
                      <th className="text-right py-3 px-4">Prezzo</th>
                      <th className="text-right py-3 px-4">Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteItemsQuery.isLoading ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4">Caricamento...</td>
                      </tr>
                    ) : quoteItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4">Nessun prodotto o servizio</td>
                      </tr>
                    ) : (
                      quoteItems.map((item: any) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-3 px-4">
                            <div className="font-medium">{item.serviceName || "Servizio"}</div>
                            {item.notes && (
                              <div className="text-sm text-gray-500 mt-1">{item.notes}</div>
                            )}
                          </td>
                          <td className="text-right py-3 px-4">{item.quantity}</td>
                          <td className="text-right py-3 px-4">
                            {item.hasDiscount && item.discountValue ? (
                              <div>
                                <span className="line-through text-gray-400 mr-2">
                                  {formatCurrency(item.unitPrice)}
                                </span>
                                <span>{formatCurrency(item.discountedPrice || item.unitPrice)}</span>
                              </div>
                            ) : (
                              formatCurrency(item.unitPrice)
                            )}
                          </td>
                          <td className="text-right py-3 px-4 font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Riepilogo totali */}
            <div className="pt-4 space-y-2">
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
                  <span>IVA ({(quote.tax / quote.subtotal * 100).toFixed(0)}%)</span>
                  <span>{formatCurrency(quote.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>Totale</span>
                <span>{formatCurrency(quote.total)}</span>
              </div>
            </div>
            
            {/* Note */}
            {quote.notes && (
              <div className="pt-4">
                <h3 className="font-medium mb-2">Note</h3>
                <div className="bg-gray-50 p-4 rounded-md whitespace-pre-wrap text-sm">
                  {quote.notes}
                </div>
              </div>
            )}
            
            <Separator className="my-8" />
            
            {/* Sezione firma */}
            <div className="pt-4">
              <h3 className="font-medium mb-4">Approva Preventivo</h3>
              <p className="text-sm text-gray-600 mb-6">
                Per approvare il preventivo, inserisci il tuo nome e cognome nel campo sottostante. Questa firma digitale conferma la tua accettazione dei termini e dei costi indicati.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signature">La tua firma</Label>
                  <Input
                    id="signature"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Inserisci il tuo nome e cognome"
                    className="max-w-md"
                  />
                </div>
                
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1"
                  />
                  <Label htmlFor="terms" className="text-sm font-normal">
                    Accetto i termini e le condizioni e autorizzo il trattamento dei miei dati personali in conformità con la normativa sulla privacy. Confermo di aver letto e compreso il preventivo e approvo i servizi e i relativi costi indicati.
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex-col items-start space-y-4 pt-0">
            <Button 
              onClick={handleSign} 
              disabled={signQuoteMutation.isPending}
              className="w-full sm:w-auto"
            >
              {signQuoteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Elaborazione...
                </>
              ) : (
                <>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Approva e Firma
                </>
              )}
            </Button>
            
            <div className="text-xs text-gray-500 mt-6 w-full text-center">
              <p>
                {settings.companyName} • {settings.companyAddress} • {settings.companyPhone} • {settings.companyEmail}
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default PublicQuotePage;