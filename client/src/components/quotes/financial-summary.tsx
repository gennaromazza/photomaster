import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowUpRight, ArrowDownRight, Euro, Plus, Calendar, AlertCircle, Check, Clock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FinancialSummaryProps {
  quoteId: number;
  quoteTotal?: number;
}

export function FinancialSummary({ quoteId, quoteTotal = 0 }: FinancialSummaryProps) {
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddScheduledOpen, setIsAddScheduledOpen] = useState(false);
  
  // Ottieni le transazioni per questo preventivo
  const { 
    data: transactions = [],
    isLoading: transactionsLoading,
  } = useQuery({
    queryKey: ['/api/finance/transactions/quote', quoteId]
  });
  
  // Ottieni i pagamenti programmati per questo preventivo
  const { 
    data: scheduledPayments = [],
    isLoading: scheduledLoading,
  } = useQuery({
    queryKey: ['/api/finance/scheduled/quote', quoteId]
  });
  
  // Funzione per formattare l'importo come valuta
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };
  
  // Calcola il totale pagato
  const totalPaid = transactions
    .filter((t: any) => t.type === 'income' || t.type === 'entrata')
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
  
  // Calcola il saldo da pagare
  const remainingBalance = quoteTotal - totalPaid;
  
  // Calcola il totale dei pagamenti programmati
  const totalScheduled = scheduledPayments
    .filter((p: any) => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
  
  // Badge di stato per i pagamenti programmati
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Pagato</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800">In attesa</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Scaduto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Totale Preventivo
            </CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(quoteTotal)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Totale Pagato
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {transactionsLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                formatCurrency(totalPaid)
              )}
            </div>
            {!transactionsLoading && (
              <p className="text-xs text-muted-foreground mt-1">
                {transactions.filter((t: any) => t.type === 'income' || t.type === 'entrata').length} pagamenti registrati
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo da Pagare
            </CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {transactionsLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                formatCurrency(remainingBalance)
              )}
            </div>
            {!transactionsLoading && !scheduledLoading && (
              <p className="text-xs text-muted-foreground mt-1">
                {totalScheduled > 0 ? (
                  <>
                    {formatCurrency(totalScheduled)} programmati in {
                      scheduledPayments.filter((p: any) => p.status === 'pending' || p.status === 'overdue').length
                    } rate
                  </>
                ) : 'Nessun pagamento programmato'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pagamenti</CardTitle>
              <CardDescription>
                Pagamenti registrati per questo preventivo
              </CardDescription>
            </div>
            
            <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Pagamento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registra un nuovo pagamento</DialogTitle>
                  <DialogDescription>
                    Inserisci i dettagli del pagamento ricevuto dal cliente.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Importo</Label>
                    <div className="relative">
                      <Euro className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="amount"
                        placeholder="0,00"
                        className="pl-8"
                        type="number"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date">Data pagamento</Label>
                    <Input
                      id="date"
                      type="date"
                      defaultValue={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="method">Metodo di pagamento</Label>
                    <Input
                      id="method"
                      placeholder="Bonifico, Contanti, ecc."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reference">Riferimento</Label>
                    <Input
                      id="reference"
                      placeholder="Numero transazione, ricevuta, ecc."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Note</Label>
                    <Textarea
                      id="notes"
                      placeholder="Eventuali note sul pagamento..."
                      rows={3}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddTransactionOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit">
                    <Check className="h-4 w-4 mr-2" />
                    Registra Pagamento
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Data</TableHead>
                    <TableHead>Dettagli</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions
                    .filter((t: any) => t.type === 'income' || t.type === 'entrata')
                    .map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {format(parseISO(transaction.date), 'dd/MM/yyyy', { locale: it })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{transaction.description || 'Pagamento'}</div>
                            {transaction.paymentMethod && (
                              <div className="text-xs text-muted-foreground">
                                {transaction.paymentMethod}
                                {transaction.reference && ` • ${transaction.reference}`}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(parseFloat(transaction.amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p>Nessun pagamento registrato.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Rate Programmate</CardTitle>
              <CardDescription>
                Pagamenti pianificati per questo preventivo
              </CardDescription>
            </div>
            
            <Dialog open={isAddScheduledOpen} onOpenChange={setIsAddScheduledOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Aggiungi Rata
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Pianifica un nuovo pagamento</DialogTitle>
                  <DialogDescription>
                    Definisci una nuova scadenza di pagamento per questo preventivo.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-amount">Importo</Label>
                    <div className="relative">
                      <Euro className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="scheduled-amount"
                        placeholder="0,00"
                        className="pl-8"
                        type="number"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="due-date">Data scadenza</Label>
                    <Input
                      id="due-date"
                      type="date"
                      defaultValue={format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-description">Descrizione</Label>
                    <Input
                      id="scheduled-description"
                      placeholder="Es. Acconto, Saldo, ecc."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Metodo di pagamento preferito</Label>
                    <Input
                      id="payment-method"
                      placeholder="Bonifico, Contanti, ecc."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-notes">Note</Label>
                    <Textarea
                      id="scheduled-notes"
                      placeholder="Eventuali note sulla rata..."
                      rows={2}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddScheduledOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit">
                    <Clock className="h-4 w-4 mr-2" />
                    Pianifica Rata
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {scheduledLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : scheduledPayments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Scadenza</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledPayments.map((payment: any) => {
                    const isPastDue = payment.status === 'overdue';
                    
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className={isPastDue ? "text-red-600 font-medium" : "font-medium"}>
                          <div className="flex items-center">
                            {format(parseISO(payment.dueDate), 'dd/MM/yyyy', { locale: it })}
                            {isPastDue && (
                              <AlertCircle className="h-4 w-4 ml-2 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {payment.description || "Pagamento programmato"}
                          {payment.paymentMethod && (
                            <div className="text-xs text-muted-foreground">
                              Metodo preferito: {payment.paymentMethod}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(parseFloat(payment.amount))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p>Nessuna rata programmata.</p>
              </div>
            )}
            
            {quoteTotal > 0 && totalPaid < quoteTotal && scheduledPayments.length === 0 && (
              <div className="mt-4 p-4 border border-amber-200 bg-amber-50 rounded-md">
                <h4 className="text-sm font-semibold text-amber-800 mb-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                  Nessun piano di pagamento definito
                </h4>
                <p className="text-sm text-amber-700">
                  Questo preventivo ha un saldo di {formatCurrency(remainingBalance)} da pagare, ma non hai ancora definito le rate di pagamento.
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2 border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200"
                  onClick={() => setIsAddScheduledOpen(true)}
                >
                  <Calendar className="mr-2 h-3 w-3" />
                  Crea piano di pagamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}