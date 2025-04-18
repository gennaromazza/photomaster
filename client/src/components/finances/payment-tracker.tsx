import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, CheckCircle, PlusCircle, Trash2, Edit } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Transaction = {
  id: number;
  quoteId: number | null;
  amount: number;
  description: string;
  date: string;
  type: 'payment' | 'expense' | 'deposit';
  method: string;
  status: string;
  notificationSent: boolean;
  createdAt: string;
  createdBy: number;
};

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
};

interface PaymentTrackerProps {
  quoteId?: number;
  hideTitle?: boolean;
}

export function PaymentTracker({ quoteId, hideTitle = false }: PaymentTrackerProps) {
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isAddScheduledPaymentOpen, setIsAddScheduledPaymentOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedDueDate, setSelectedDueDate] = useState<Date | undefined>(new Date());
  
  const { toast } = useToast();
  
  // Stato per il nuovo pagamento
  const [newPayment, setNewPayment] = useState({
    amount: '',
    description: '',
    method: 'wire_transfer',
    type: 'payment',
  });
  
  // Stato per il nuovo pagamento programmato
  const [newScheduledPayment, setNewScheduledPayment] = useState({
    amount: '',
    description: '',
    note: '',
  });
  
  // Query per ottenere i pagamenti
  const { 
    data: transactions, 
    isLoading: isLoadingTransactions 
  } = useQuery({
    queryKey: ['/api/finance/transactions', quoteId],
    queryFn: async () => {
      const url = quoteId 
        ? `/api/finance/transactions?quoteId=${quoteId}` 
        : '/api/finance/transactions';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    }
  });
  
  // Query per ottenere i pagamenti programmati
  const { 
    data: scheduledPayments, 
    isLoading: isLoadingScheduledPayments 
  } = useQuery({
    queryKey: ['/api/finance/scheduled-payments', quoteId],
    queryFn: async () => {
      const url = quoteId 
        ? `/api/finance/scheduled-payments?quoteId=${quoteId}` 
        : '/api/finance/scheduled-payments';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled payments');
      }
      return response.json();
    }
  });

  // Mutazione per aggiungere un pagamento
  const addPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const res = await apiRequest('POST', '/api/finance/transactions', paymentData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/transactions', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes/financials', quoteId] });
      toast({
        title: "Pagamento aggiunto",
        description: "Il pagamento è stato registrato con successo",
      });
      setIsAddPaymentOpen(false);
      // Reset del form
      setNewPayment({
        amount: '',
        description: '',
        method: 'wire_transfer',
        type: 'payment',
      });
      setSelectedDate(new Date());
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Impossibile aggiungere il pagamento: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutazione per aggiungere un pagamento programmato
  const addScheduledPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const res = await apiRequest('POST', '/api/finance/scheduled-payments', paymentData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/scheduled-payments', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes/financials', quoteId] });
      toast({
        title: "Pagamento programmato",
        description: "Il pagamento programmato è stato aggiunto con successo",
      });
      setIsAddScheduledPaymentOpen(false);
      // Reset del form
      setNewScheduledPayment({
        amount: '',
        description: '',
        note: '',
      });
      setSelectedDueDate(new Date());
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Impossibile aggiungere il pagamento programmato: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Funzione per registrare un pagamento da un pagamento programmato
  const registerPaymentMutation = useMutation({
    mutationFn: async ({ scheduledPaymentId, amount, description }: { scheduledPaymentId: number, amount: number, description: string }) => {
      const payment = {
        quoteId: quoteId,
        amount,
        description,
        date: new Date().toISOString(),
        type: 'payment',
        method: 'wire_transfer',
        scheduledPaymentId,
      };
      
      const res = await apiRequest('POST', '/api/finance/transactions', payment);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/transactions', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/scheduled-payments', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes/financials', quoteId] });
      toast({
        title: "Pagamento registrato",
        description: "Il pagamento è stato registrato con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Impossibile registrare il pagamento: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Funzione per eliminare un pagamento
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      await apiRequest('DELETE', `/api/finance/transactions/${transactionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/transactions', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes/financials', quoteId] });
      toast({
        title: "Pagamento eliminato",
        description: "Il pagamento è stato eliminato con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Impossibile eliminare il pagamento: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Funzione per eliminare un pagamento programmato
  const deleteScheduledPaymentMutation = useMutation({
    mutationFn: async (scheduledPaymentId: number) => {
      await apiRequest('DELETE', `/api/finance/scheduled-payments/${scheduledPaymentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/scheduled-payments', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes/financials', quoteId] });
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
  
  const handleAddPayment = () => {
    if (!newPayment.amount || !selectedDate) {
      toast({
        title: "Errore",
        description: "Inserisci importo e data",
        variant: "destructive",
      });
      return;
    }
    
    const amount = parseFloat(newPayment.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Errore",
        description: "L'importo deve essere un numero positivo",
        variant: "destructive",
      });
      return;
    }
    
    const payment = {
      quoteId: quoteId,
      amount,
      description: newPayment.description || 'Pagamento',
      date: selectedDate.toISOString(),
      type: newPayment.type,
      method: newPayment.method,
    };
    
    addPaymentMutation.mutate(payment);
  };
  
  const handleAddScheduledPayment = () => {
    if (!newScheduledPayment.amount || !selectedDueDate) {
      toast({
        title: "Errore",
        description: "Inserisci importo e data di scadenza",
        variant: "destructive",
      });
      return;
    }
    
    const amount = parseFloat(newScheduledPayment.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Errore",
        description: "L'importo deve essere un numero positivo",
        variant: "destructive",
      });
      return;
    }
    
    if (!quoteId) {
      toast({
        title: "Errore",
        description: "Nessun preventivo selezionato",
        variant: "destructive",
      });
      return;
    }
    
    const scheduledPayment = {
      quoteId,
      amount,
      description: newScheduledPayment.description || 'Pagamento programmato',
      dueDate: selectedDueDate.toISOString(),
      status: 'pending',
      note: newScheduledPayment.note || null,
    };
    
    addScheduledPaymentMutation.mutate(scheduledPayment);
  };
  
  const handleRegisterPayment = (scheduledPayment: ScheduledPayment) => {
    registerPaymentMutation.mutate({
      scheduledPaymentId: scheduledPayment.id,
      amount: scheduledPayment.amount,
      description: `Pagamento per: ${scheduledPayment.description}`,
    });
  };
  
  // Funzioni di utilità per la formattazione
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd MMMM yyyy', { locale: it });
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
  
  const getPaymentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      payment: 'Pagamento',
      expense: 'Spesa',
      deposit: 'Acconto'
    };
    return types[type] || 'Altro';
  };
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending':
        return 'text-yellow-600';
      case 'paid':
        return 'text-green-600';
      case 'overdue':
        return 'text-red-600';
      default:
        return '';
    }
  };
  
  const getStatusLabel = (status: string) => {
    const statuses: Record<string, string> = {
      pending: 'In attesa',
      paid: 'Pagato',
      overdue: 'Scaduto'
    };
    return statuses[status] || 'Sconosciuto';
  };
  
  return (
    <Card className="w-full">
      {!hideTitle && (
        <CardHeader>
          <CardTitle>Tracciamento Pagamenti</CardTitle>
          <CardDescription>Gestisci pagamenti e scadenze</CardDescription>
        </CardHeader>
      )}
      <CardContent>
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Pagamenti registrati</h3>
            <Button onClick={() => setIsAddPaymentOpen(true)} size="sm" className="flex items-center gap-1">
              <PlusCircle className="h-4 w-4" />
              <span>Aggiungi</span>
            </Button>
          </div>
          
          {isLoadingTransactions ? (
            <div className="text-center py-4">Caricamento pagamenti...</div>
          ) : transactions && transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction: Transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{formatDate(transaction.date)}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{getPaymentTypeLabel(transaction.type)}</TableCell>
                    <TableCell>{getPaymentMethodLabel(transaction.method)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Elimina pagamento</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sei sicuro di voler eliminare questo pagamento? 
                              Questa azione non può essere annullata.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteTransactionMutation.mutate(transaction.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Elimina
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Nessun pagamento registrato.
            </div>
          )}
        </div>
        
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Pagamenti programmati</h3>
            {quoteId && (
              <Button onClick={() => setIsAddScheduledPaymentOpen(true)} size="sm" className="flex items-center gap-1">
                <PlusCircle className="h-4 w-4" />
                <span>Programma</span>
              </Button>
            )}
          </div>
          
          {isLoadingScheduledPayments ? (
            <div className="text-center py-4">Caricamento pagamenti programmati...</div>
          ) : scheduledPayments && scheduledPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scadenza</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledPayments.map((payment: ScheduledPayment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.dueDate)}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{payment.description}</span>
                          </TooltipTrigger>
                          {payment.note && (
                            <TooltipContent>
                              <p>{payment.note}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <span className={cn("font-medium", getStatusColor(payment.status))}>
                        {getStatusLabel(payment.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {payment.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleRegisterPayment(payment)}
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
              Nessun pagamento programmato.
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Dialog per aggiungere un pagamento */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Pagamento</DialogTitle>
            <DialogDescription>
              Inserisci i dettagli del pagamento da registrare.
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
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Descrizione
              </Label>
              <Input
                id="description"
                placeholder="Descrizione del pagamento"
                className="col-span-3"
                value={newPayment.description}
                onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Data</Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? (
                        format(selectedDate, "PPP", { locale: it })
                      ) : (
                        <span>Seleziona una data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      locale={it}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Tipo
              </Label>
              <Select
                value={newPayment.type}
                onValueChange={(value) => setNewPayment({ ...newPayment, type: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleziona il tipo di pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">Pagamento</SelectItem>
                  <SelectItem value="deposit">Acconto</SelectItem>
                  <SelectItem value="expense">Spesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="method" className="text-right">
                Metodo
              </Label>
              <Select 
                value={newPayment.method}
                onValueChange={(value) => setNewPayment({ ...newPayment, method: value })}
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
            <Button variant="outline" onClick={() => setIsAddPaymentOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleAddPayment} disabled={addPaymentMutation.isPending}>
              {addPaymentMutation.isPending ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog per aggiungere un pagamento programmato */}
      <Dialog open={isAddScheduledPaymentOpen} onOpenChange={setIsAddScheduledPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programma Pagamento</DialogTitle>
            <DialogDescription>
              Programma un pagamento futuro per questo preventivo.
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
                  value={newScheduledPayment.amount}
                  onChange={(e) => setNewScheduledPayment({ ...newScheduledPayment, amount: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Descrizione
              </Label>
              <Input
                id="description"
                placeholder="Descrizione del pagamento"
                className="col-span-3"
                value={newScheduledPayment.description}
                onChange={(e) => setNewScheduledPayment({ ...newScheduledPayment, description: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Scadenza</Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDueDate ? (
                        format(selectedDueDate, "PPP", { locale: it })
                      ) : (
                        <span>Seleziona una data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDueDate}
                      onSelect={setSelectedDueDate}
                      initialFocus
                      locale={it}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="note" className="text-right">
                Note
              </Label>
              <Input
                id="note"
                placeholder="Note aggiuntive (opzionale)"
                className="col-span-3"
                value={newScheduledPayment.note}
                onChange={(e) => setNewScheduledPayment({ ...newScheduledPayment, note: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddScheduledPaymentOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleAddScheduledPayment} disabled={addScheduledPaymentMutation.isPending}>
              {addScheduledPaymentMutation.isPending ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}