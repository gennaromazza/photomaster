import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowUpCircle, ArrowDownCircle, Search, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface PaymentTrackerProps {
  transactions: any[];
  isLoading: boolean;
  limit?: number;
}

export function PaymentTracker({ transactions = [], isLoading, limit }: PaymentTrackerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Funzione per filtrare le transazioni in base al termine di ricerca
  const filteredTransactions = transactions.filter((transaction) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      transaction.description?.toLowerCase().includes(searchLower) ||
      transaction.client?.firstName?.toLowerCase().includes(searchLower) ||
      transaction.client?.lastName?.toLowerCase().includes(searchLower) ||
      transaction.type?.toLowerCase().includes(searchLower)
    );
  });

  // Funzione per ordinare le transazioni
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortField === 'date') {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    }
    
    if (sortField === 'amount') {
      return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    }
    
    if (sortField === 'type') {
      return sortOrder === 'asc' 
        ? a.type.localeCompare(b.type) 
        : b.type.localeCompare(a.type);
    }
    
    if (sortField === 'client') {
      const clientNameA = a.client ? `${a.client.firstName} ${a.client.lastName}` : '';
      const clientNameB = b.client ? `${b.client.firstName} ${b.client.lastName}` : '';
      return sortOrder === 'asc' 
        ? clientNameA.localeCompare(clientNameB) 
        : clientNameB.localeCompare(clientNameA);
    }
    
    return 0;
  });

  // Funzione per alternare l'ordinamento quando si fa clic su un'intestazione
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Funzione per formattare l'importo come valuta
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };

  // Funzione per ottenere un'icona basata sul tipo di transazione
  const getTransactionIcon = (type: string) => {
    if (type.toLowerCase() === 'income' || type.toLowerCase() === 'entrata') {
      return <ArrowUpCircle className="h-5 w-5 text-green-500" />;
    }
    return <ArrowDownCircle className="h-5 w-5 text-red-500" />;
  };

  // Limita le transazioni mostrate se specificato
  const displayTransactions = limit 
    ? sortedTransactions.slice(0, limit) 
    : sortedTransactions;

  // Componente per le icone di ordinamento
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <ChevronDown className="h-4 w-4 opacity-50" />;
    }
    return sortOrder === 'asc' 
      ? <ChevronUp className="h-4 w-4" /> 
      : <ChevronDown className="h-4 w-4" />;
  };

  // Skeleon per il caricamento
  const loadingSkeleton = (
    <div className="space-y-4">
      {Array(limit || 5).fill(0).map((_, index) => (
        <div key={index} className="flex space-x-4">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {!limit && (
        <div className="flex items-center pb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cerca transazioni..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}
      
      {isLoading ? (
        loadingSkeleton
      ) : displayTransactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchTerm 
            ? "Nessuna transazione corrisponde alla ricerca." 
            : "Nessuna transazione trovata. Crea la tua prima transazione!"}
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead onClick={() => toggleSort('date')} className="cursor-pointer">
                  <div className="flex items-center">
                    Data <SortIcon field="date" />
                  </div>
                </TableHead>
                <TableHead onClick={() => toggleSort('type')} className="cursor-pointer">
                  <div className="flex items-center">
                    Tipo <SortIcon field="type" />
                  </div>
                </TableHead>
                <TableHead onClick={() => toggleSort('client')} className="cursor-pointer hidden md:table-cell">
                  <div className="flex items-center">
                    Cliente <SortIcon field="client" />
                  </div>
                </TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead onClick={() => toggleSort('amount')} className="text-right cursor-pointer">
                  <div className="flex items-center justify-end">
                    Importo <SortIcon field="amount" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayTransactions.map((transaction) => {
                const isIncome = transaction.type?.toLowerCase() === 'income' || 
                                 transaction.type?.toLowerCase() === 'entrata';
                
                return (
                  <TableRow key={transaction.id} className="group hover:bg-muted/50">
                    <TableCell>
                      {getTransactionIcon(transaction.type)}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(transaction.date), 'dd MMM yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isIncome ? "success" : "destructive"}>
                        {isIncome ? 'Entrata' : 'Uscita'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {transaction.client 
                        ? `${transaction.client.firstName} ${transaction.client.lastName}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {transaction.description || '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                      {isIncome ? '+ ' : '- '}{formatCurrency(Math.abs(transaction.amount))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      
      {limit && displayTransactions.length > 0 && (
        <div className="text-center">
          <Button variant="link" asChild>
            <a href="/dashboard/finances?tab=transactions">Visualizza tutte le transazioni</a>
          </Button>
        </div>
      )}
    </div>
  );
}