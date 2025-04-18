import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  FilterX, 
  Download, 
  CalendarIcon, 
  ChevronLeft,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function ScheduledPaymentsPage() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDueDate, setFilterDueDate] = useState<Date | undefined>(undefined);
  const [filterClient, setFilterClient] = useState('');

  // Ottieni i pagamenti programmati
  const { 
    data: scheduledPayments, 
    isLoading,
    error 
  } = useQuery({
    queryKey: ['/api/finance/scheduled-payments'],
  });

  // Filtra i pagamenti in base ai criteri selezionati
  const filteredPayments = scheduledPayments?.filter((payment: any) => {
    // Filtra per stato
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending' && payment.paid) return false;
      if (filterStatus === 'paid' && !payment.paid) return false;
      if (filterStatus === 'overdue' && 
          (!payment.dueDate || 
           payment.paid || 
           !isAfter(new Date(), parseISO(payment.dueDate)))) {
        return false;
      }
    }
    
    // Filtra per data scadenza
    if (filterDueDate && payment.dueDate) {
      const dueDate = parseISO(payment.dueDate);
      if (dueDate.getDate() !== filterDueDate.getDate() || 
          dueDate.getMonth() !== filterDueDate.getMonth() || 
          dueDate.getFullYear() !== filterDueDate.getFullYear()) {
        return false;
      }
    }
    
    // Filtra per cliente
    if (filterClient && payment.client) {
      const clientName = `${payment.client.firstName} ${payment.client.lastName}`.toLowerCase();
      if (!clientName.includes(filterClient.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  }) || [];

  // Funzione per ottenere lo stato del pagamento
  const getPaymentStatus = (payment: any) => {
    if (payment.paid) {
      return { label: 'Pagato', color: 'bg-green-100 text-green-800' };
    }
    
    if (payment.dueDate && isAfter(new Date(), parseISO(payment.dueDate))) {
      return { label: 'Scaduto', color: 'bg-red-100 text-red-800' };
    }
    
    return { label: 'In attesa', color: 'bg-yellow-100 text-yellow-800' };
  };

  // Funzione per formattare l'importo come valuta
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };

  // Pulisce tutti i filtri
  const clearFilters = () => {
    setFilterStatus('all');
    setFilterDueDate(undefined);
    setFilterClient('');
  };

  // Skeleon per il caricamento
  const loadingSkeleton = (
    <div className="space-y-4">
      {Array(5).fill(0).map((_, index) => (
        <div key={index} className="flex space-x-4">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );

  return (
    <PageWrapper 
      title="Pagamenti Programmati" 
      subtitle="Gestisci e monitora tutti i pagamenti futuri"
      action={
        <div className="flex space-x-2">
          <Button onClick={() => window.location.href = '/dashboard/finances/scheduled/new'}>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Pagamento
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <a href="/dashboard/finances" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Torna alla panoramica
            </a>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <FilterX className="h-4 w-4 mr-2" />
              Pulisci filtri
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Esporta
            </Button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="w-full max-w-xs">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Stato pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="pending">In attesa</SelectItem>
                <SelectItem value="paid">Pagati</SelectItem>
                <SelectItem value="overdue">Scaduti</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full max-w-xs">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filterDueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDueDate ? (
                    format(filterDueDate, "PPP", { locale: it })
                  ) : (
                    "Filtra per data scadenza"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filterDueDate}
                  onSelect={setFilterDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="w-full max-w-xs">
            <Input
              placeholder="Cerca cliente"
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        
        {isLoading ? (
          loadingSkeleton
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            Si è verificato un errore durante il caricamento dei pagamenti programmati.
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nessun pagamento programmato trovato.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Preventivo</TableHead>
                <TableHead>Importo</TableHead>
                <TableHead>Data Scadenza</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment: any) => {
                const status = getPaymentStatus(payment);
                
                return (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.client ? `${payment.client.firstName} ${payment.client.lastName}` : '-'}
                    </TableCell>
                    <TableCell>{payment.quote?.title || '-'}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                      {payment.dueDate 
                        ? format(parseISO(payment.dueDate), 'dd MMM yyyy', { locale: it })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.color}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center space-x-2">
                        {!payment.paid && (
                          <Button variant="outline" size="sm">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Segna pagato
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.location.href = `/dashboard/finances/scheduled/${payment.id}`}
                        >
                          Dettaglio
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </PageWrapper>
  );
}