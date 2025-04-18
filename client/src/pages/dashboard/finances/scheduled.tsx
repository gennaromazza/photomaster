import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Plus, 
  Search, 
  CalendarIcon, 
  ChevronDown, 
  Check, 
  AlertCircle, 
  Clock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function ScheduledPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Ottieni i pagamenti programmati
  const { 
    data: payments,
    isLoading,
  } = useQuery({
    queryKey: ['/api/finance/scheduled']
  });
  
  // Funzione per formattare l'importo come valuta
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };
  
  // Filtra i pagamenti in base alla ricerca e al filtro di stato
  const filteredPayments = payments?.filter((payment: any) => {
    const matchesSearch = searchTerm === '' || 
      payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.quote?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.quote?.client?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.quote?.client?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];
  
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
    <PageWrapper 
      title="Pagamenti Programmati" 
      subtitle="Gestisci i pagamenti pianificati e le scadenze"
      actions={
        <Button asChild>
          <a href="/dashboard/finances/scheduled/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Pagamento
          </a>
        </Button>
      }
    >
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per descrizione, preventivo o cliente..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtra per stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="pending">In attesa</SelectItem>
                  <SelectItem value="paid">Pagati</SelectItem>
                  <SelectItem value="overdue">Scaduti</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scadenza</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Preventivo/Cliente</TableHead>
                  <TableHead>Importo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment: any) => {
                  const isPastDue = payment.status === "overdue";
                  
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className={cn(isPastDue && "text-red-600 font-medium")}>
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                          {format(parseISO(payment.dueDate), 'dd MMM yyyy', { locale: it })}
                          {isPastDue && (
                            <AlertCircle className="h-4 w-4 ml-2 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{payment.description || "-"}</TableCell>
                      <TableCell>
                        {payment.quote ? (
                          <div>
                            <div className="font-medium">{payment.quote.title}</div>
                            {payment.quote.client && (
                              <div className="text-sm text-muted-foreground">
                                {payment.quote.client.firstName} {payment.quote.client.lastName}
                              </div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <span className="sr-only">Apri menu</span>
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <a href={`/dashboard/finances/scheduled/edit/${payment.id}`}>
                                Modifica
                              </a>
                            </DropdownMenuItem>
                            {payment.status !== 'paid' && (
                              <DropdownMenuItem asChild>
                                <a href={`/dashboard/finances/transaction/new?scheduledPaymentId=${payment.id}`}>
                                  <Check className="mr-2 h-4 w-4" />
                                  Registra pagamento
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                              <a href={`/quotes/detail/${payment.quoteId}`}>
                                Vai al preventivo
                              </a>
                            </DropdownMenuItem>
                            {payment.status === 'pending' && (
                              <DropdownMenuItem 
                                className="text-amber-600"
                                onClick={() => console.log('Invia promemoria', payment.id)}
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                Invia promemoria
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== 'all' ? (
                <p>Nessun pagamento programmato corrisponde ai filtri selezionati.</p>
              ) : (
                <p>Non ci sono pagamenti programmati. Crea il tuo primo pagamento programmato!</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}