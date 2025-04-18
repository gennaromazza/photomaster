import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowUpCircle, ArrowDownCircle, Plus, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface FinancialSummaryProps {
  quoteId: number;
  quoteTotal: number;
}

export function FinancialSummary({ quoteId, quoteTotal }: FinancialSummaryProps) {
  const { toast } = useToast();
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  
  // Ottieni i dati finanziari per il preventivo
  const { 
    data: financeData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [`/api/finance/quotes/${quoteId}`],
  });
  
  // Ottieni le transazioni per il preventivo
  const {
    data: transactions,
    isLoading: transactionsLoading,
  } = useQuery({
    queryKey: [`/api/finance/quotes/${quoteId}/transactions`],
  });
  
  // Ottieni i pagamenti programmati per il preventivo
  const {
    data: scheduledPayments,
    isLoading: scheduledLoading,
  } = useQuery({
    queryKey: [`/api/finance/quotes/${quoteId}/scheduled`],
  });
  
  // Funzione per formattare l'importo come valuta
  const formatCurrency = (amount: number = 0) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };
  
  // Calcola l'importo pagato e il saldo
  const paidAmount = transactions?.reduce((total: number, transaction: any) => {
    if (transaction.type?.toLowerCase() === 'income' || transaction.type?.toLowerCase() === 'entrata') {
      return total + transaction.amount;
    }
    return total;
  }, 0) || 0;
  
  const remainingAmount = Math.max(0, quoteTotal - paidAmount);
  const paymentPercentage = quoteTotal > 0 ? (paidAmount / quoteTotal) * 100 : 0;
  
  // Funzione per determinare se un pagamento programmato è scaduto
  const isPaymentOverdue = (payment: any) => {
    return !payment.paid && payment.dueDate && isAfter(new Date(), parseISO(payment.dueDate));
  };
  
  // Ottieni il prossimo pagamento programmato
  const upcomingPayments = scheduledPayments?.filter((payment: any) => !payment.paid) || [];
  const overduePayments = upcomingPayments.filter(isPaymentOverdue);
  
  // Stabilisci lo stato del pagamento
  const getPaymentStatus = () => {
    if (paymentPercentage >= 100) {
      return { 
        status: 'Pagato', 
        color: 'bg-green-100 text-green-800',
        description: 'Il preventivo è stato pagato completamente'
      };
    }
    
    if (overduePayments.length > 0) {
      return { 
        status: 'Scaduto', 
        color: 'bg-red-100 text-red-800',
        description: `${overduePayments.length} pagamento/i in ritardo`
      };
    }
    
    if (paymentPercentage > 0) {
      return { 
        status: 'Parziale', 
        color: 'bg-amber-100 text-amber-800',
        description: `Pagato ${paymentPercentage.toFixed(0)}% del totale`
      };
    }
    
    return { 
      status: 'Non pagato', 
      color: 'bg-gray-100 text-gray-800',
      description: 'Nessun pagamento registrato'
    };
  };
  
  const paymentStatus = getPaymentStatus();
  
  // Componente skeleton per il caricamento
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">
            <Skeleton className="h-6 w-40" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-60" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center justify-between">
          <span>Riepilogo Finanziario</span>
          <Badge variant="outline" className={paymentStatus.color}>
            {paymentStatus.status}
          </Badge>
        </CardTitle>
        <CardDescription>
          {paymentStatus.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Avanzamento Pagamenti</span>
            <span className="font-medium">{paymentPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={paymentPercentage} className="h-2" />
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-sm text-muted-foreground">Pagato</p>
              <p className="text-lg font-medium text-green-600">{formatCurrency(paidAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rimanente</p>
              <p className="text-lg font-medium text-rose-600">{formatCurrency(remainingAmount)}</p>
            </div>
          </div>
        </div>
        
        {upcomingPayments.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <h4 className="font-medium">Prossimi Pagamenti</h4>
            <ul className="space-y-2">
              {upcomingPayments.slice(0, 3).map((payment: any) => (
                <li key={payment.id} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className={cn(
                      isPaymentOverdue(payment) && "text-red-600 font-medium"
                    )}>
                      {format(parseISO(payment.dueDate), 'dd MMM yyyy', { locale: it })}
                      {isPaymentOverdue(payment) && (
                        <span className="ml-2 text-xs inline-flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" /> 
                          Scaduto
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="font-medium">{formatCurrency(payment.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex flex-col">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setOpenPaymentDialog(true)}
            >
              <ArrowUpCircle className="h-4 w-4 mr-2 text-green-500" />
              Registra Pagamento
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => window.location.href = `/dashboard/finances/scheduled/new?quoteId=${quoteId}`}
            >
              <Plus className="h-4 w-4 mr-2" />
              Programma Pagamento
            </Button>
          </div>
        </div>
      </CardContent>
      
      {/* Dialog per registrare un nuovo pagamento */}
      <Dialog open={openPaymentDialog} onOpenChange={setOpenPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registra Pagamento</DialogTitle>
            <DialogDescription>
              Registra un nuovo pagamento per questo preventivo. Il pagamento verrà registrato come una transazione in entrata.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <h4 className="font-medium mb-2">Transazioni Recenti</h4>
            {transactionsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : transactions?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 5).map((transaction: any) => {
                    const isIncome = transaction.type?.toLowerCase() === 'income' || 
                                     transaction.type?.toLowerCase() === 'entrata';
                    
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {format(parseISO(transaction.date), 'dd/MM/yyyy', { locale: it })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {isIncome ? (
                              <ArrowUpCircle className="h-4 w-4 mr-2 text-green-500" />
                            ) : (
                              <ArrowDownCircle className="h-4 w-4 mr-2 text-red-500" />
                            )}
                            {isIncome ? 'Entrata' : 'Uscita'}
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                Nessuna transazione registrata per questo preventivo.
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpenPaymentDialog(false)}>
              Chiudi
            </Button>
            <Button onClick={() => window.location.href = `/dashboard/finances/transaction/new?quoteId=${quoteId}`}>
              Nuova Transazione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}