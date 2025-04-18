import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format, isBefore } from 'date-fns';
import { it } from 'date-fns/locale';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageWrapper } from '@/components/ui/page-wrapper';

type ScheduledPayment = {
  id: number;
  quoteId: number;
  description: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  transactionId: number | null;
  reminderSent: boolean;
  note: string | null;
  quote?: {
    id: number;
    title: string;
    client?: {
      id: number;
      firstName: string;
      lastName: string;
    };
  };
};

export default function ScheduledPaymentsPage() {
  const { toast } = useToast();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<ScheduledPayment | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({
    amount: '',
    method: 'wire_transfer',
  });
  
  // Query per recuperare tutti i pagamenti programmati
  const { data: scheduledPayments, isLoading } = useQuery<ScheduledPayment[]>({
    queryKey: ['/api/finance/scheduled-payments'],
    queryFn: async () => {
      const response = await fetch('/api/finance/scheduled-payments');
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled payments');
      }
      return response.json();
    }
  });
  
  // Mutazione per registrare un pagamento
  const registerPaymentMutation = useMutation({
    mutationFn: async ({ scheduledPaymentId, amount, method }: { scheduledPaymentId: number, amount: number, method: string }) => {
      const payment = {
        quoteId: selectedPayment?.quoteId,
        amount,
        description: `Pagamento per: ${selectedPayment?.description}`,
        date: new Date().toISOString(),
        type: 'payment',
        method,
        scheduledPaymentId,
      };
      
      const res = await apiRequest('POST', '/api/finance/transactions', payment);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/scheduled-payments'] });
      toast({
        title: "Pagamento registrato",
        description: "Il pagamento è stato registrato con successo",
      });
      setIsPaymentDialogOpen(false);
      setSelectedPayment(null);
      setPaymentDetails({ amount: '', method: 'wire_transfer' });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Impossibile registrare il pagamento: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutazione per eliminare un pagamento programmato
  const deleteScheduledPaymentMutation = useMutation({
    mutationFn: async (scheduledPaymentId: number) => {
      await apiRequest('DELETE', `/api/finance/scheduled-payments/${scheduledPaymentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/scheduled-payments'] });
      toast({
        title: "Pagamento programmato eliminato",
        description: "Il pagamento programmato è stato eliminato con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Impossibile eliminare il pagamento programmato: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const handleOpenPaymentDialog = (payment: ScheduledPayment) => {
    setSelectedPayment(payment);
    setPaymentDetails({
      amount: payment.amount.toString(),
      method: 'wire_transfer',
    });
    setIsPaymentDialogOpen(true);
  };
  
  const handleRegisterPayment = () => {
    if (!selectedPayment) return;
    
    const amount = parseFloat(paymentDetails.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Errore",
        description: "L'importo deve essere un numero positivo",
        variant: "destructive",
      });
      return;
    }
    
    registerPaymentMutation.mutate({
      scheduledPaymentId: selectedPayment.id,
      amount,
      method: paymentDetails.method,
    });
  };
  
  // Funzioni di utilità per la formattazione
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd MMMM yyyy', { locale: it });
  };
  
  const getStatusColor = (status: string, dueDate: string) => {
    // Se lo stato è già 'paid', usa il colore verde
    if (status === 'paid') return 'text-green-600';
    
    // Controlla se la data di scadenza è passata
    const isPastDue = isBefore(new Date(dueDate), new Date());
    
    // Se la data è passata ma lo stato è ancora 'pending', considera come 'overdue'
    if (isPastDue && status === 'pending') return 'text-red-600';
    
    // Altrimenti, usa il colore originale dello stato
    switch(status) {
      case 'pending':
        return 'text-yellow-600';
      case 'overdue':
        return 'text-red-600';
      default:
        return '';
    }
  };
  
  const getStatusLabel = (status: string, dueDate: string) => {
    // Se lo stato è già 'paid', mostra 'Pagato'
    if (status === 'paid') return 'Pagato';
    
    // Controlla se la data di scadenza è passata
    const isPastDue = isBefore(new Date(dueDate), new Date());
    
    // Se la data è passata ma lo stato è ancora 'pending', considera come 'overdue'
    if (isPastDue && status === 'pending') return 'Scaduto';
    
    // Altrimenti, usa l'etichetta originale dello stato
    const statuses: Record<string, string> = {
      pending: 'In attesa',
      paid: 'Pagato',
      overdue: 'Scaduto'
    };
    return statuses[status] || 'Sconosciuto';
  };
  
  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Contanti',
      wire_transfer: 'Bonifico bancario',
      credit_card: 'Carta di credito',
      check: 'Assegno',
      other: 'Altro'
    };
    return methods[method] || 'Sconosciuto';
  };
  
  // Filtra e ordina i pagamenti
  const filteredPayments = scheduledPayments
    ? [...scheduledPayments].sort((a, b) => {
        // Prima ordina per stato (pending/overdue prima di paid)
        if (a.status === 'paid' && b.status !== 'paid') return 1;
        if (a.status !== 'paid' && b.status === 'paid') return -1;
        
        // Poi ordina per data di scadenza (più imminenti prima)
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      })
    : [];
  
  return (
    <PageWrapper>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Pagamenti Programmati</CardTitle>
            <CardDescription>
              Tutti i pagamenti programmati per i preventivi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Caricamento pagamenti programmati...</div>
            ) : filteredPayments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preventivo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.quote?.title || `Preventivo #${payment.quoteId}`}
                      </TableCell>
                      <TableCell>
                        {payment.quote?.client
                          ? `${payment.quote.client.firstName} ${payment.quote.client.lastName}`
                          : 'Cliente non specificato'}
                      </TableCell>
                      <TableCell>{payment.description}</TableCell>
                      <TableCell>{formatDate(payment.dueDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {payment.status === 'paid' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : isBefore(new Date(payment.dueDate), new Date()) ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : null}
                          <span className={cn("font-medium", getStatusColor(payment.status, payment.dueDate))}>
                            {getStatusLabel(payment.status, payment.dueDate)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {payment.status !== 'paid' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleOpenPaymentDialog(payment)}
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                          )}
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Elimina pagamento programmato</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Sei sicuro di voler eliminare questo pagamento programmato? 
                                  Questa azione non può essere annullata.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteScheduledPaymentMutation.mutate(payment.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Elimina
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Nessun pagamento programmato trovato.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog per registrare un pagamento */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registra Pagamento</DialogTitle>
            <DialogDescription>
              Registra un pagamento per questo importo programmato.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Importo
              </Label>
              <div className="col-span-3">
                <Input
                  id="amount"
                  placeholder="0,00"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentDetails.amount}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, amount: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="method" className="text-right">
                Metodo
              </Label>
              <Select 
                value={paymentDetails.method}
                onValueChange={(value) => setPaymentDetails({ ...paymentDetails, method: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleziona il metodo di pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wire_transfer">Bonifico bancario</SelectItem>
                  <SelectItem value="cash">Contanti</SelectItem>
                  <SelectItem value="credit_card">Carta di credito</SelectItem>
                  <SelectItem value="check">Assegno</SelectItem>
                  <SelectItem value="other">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleRegisterPayment} disabled={registerPaymentMutation.isPending}>
              {registerPaymentMutation.isPending ? "Registrazione..." : "Registra Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}