import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowUpCircle, ArrowDownCircle, ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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

interface PaymentTrackerProps {
  transactions: any[];
  isLoading: boolean;
  showFilters?: boolean;
  limit?: number;
}

export function PaymentTracker({ 
  transactions = [], 
  isLoading, 
  showFilters = false,
  limit 
}: PaymentTrackerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  
  // Funzione per formattare l'importo come valuta
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };
  
  // Funzione per invertire l'ordinamento
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Ordina e filtra le transazioni
  const filteredTransactions = useMemo(() => {
    // Filtra per tipo di transazione
    let filtered = transactions;
    if (typeFilter !== 'all') {
      filtered = filtered.filter(transaction => 
        transaction.type?.toLowerCase() === typeFilter.toLowerCase()
      );
    }
    
    // Filtra per termine di ricerca
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(transaction => 
        transaction.description?.toLowerCase().includes(lowerSearchTerm) ||
        transaction.paymentMethod?.toLowerCase().includes(lowerSearchTerm) ||
        transaction.reference?.toLowerCase().includes(lowerSearchTerm) ||
        transaction.notes?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Ordina le transazioni
    const sorted = [...filtered].sort((a, b) => {
      if (sortField === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      if (sortField === 'amount') {
        const amountA = parseFloat(a.amount);
        const amountB = parseFloat(b.amount);
        return sortDirection === 'asc' ? amountA - amountB : amountB - amountA;
      }
      
      return 0;
    });
    
    // Limita il numero di transazioni se specificato
    if (limit && sorted.length > limit) {
      return sorted.slice(0, limit);
    }
    
    return sorted;
  }, [transactions, searchTerm, sortField, sortDirection, typeFilter, limit]);
  
  // Calcola i totali
  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type?.toLowerCase() === 'income' || t.type?.toLowerCase() === 'entrata')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
    const expense = filteredTransactions
      .filter(t => t.type?.toLowerCase() === 'expense' || t.type?.toLowerCase() === 'uscita')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
    return {
      income,
      expense,
      balance: income - expense
    };
  }, [filteredTransactions]);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        {showFilters && <Skeleton className="h-10 w-full" />}
      </div>
    );
  }
  
  return (
    <div>
      {showFilters && (
        <div className={`space-y-4 ${showFiltersMenu ? 'mb-6' : 'mb-4'}`}>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFiltersMenu(!showFiltersMenu)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filtri
              {showFiltersMenu ? (
                <ChevronUp className="h-4 w-4 ml-2" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-2" />
              )}
            </Button>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo transazione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le transazioni</SelectItem>
                <SelectItem value="income">Solo entrate</SelectItem>
                <SelectItem value="expense">Solo uscite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {showFiltersMenu && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca nelle transazioni..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>
      )}
      
      {filteredTransactions.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer w-1/4" onClick={() => toggleSort('date')}>
                  <div className="flex items-center">
                    Data
                    {sortField === 'date' && (
                      sortDirection === 'asc' ? 
                        <ChevronUp className="ml-1 h-4 w-4" /> : 
                        <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => toggleSort('amount')}>
                  <div className="flex items-center justify-end">
                    Importo
                    {sortField === 'amount' && (
                      sortDirection === 'asc' ? 
                        <ChevronUp className="ml-1 h-4 w-4" /> : 
                        <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                {showFilters && (
                  <TableHead className="text-right">Azioni</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => {
                const isIncome = transaction.type?.toLowerCase() === 'income' || 
                                 transaction.type?.toLowerCase() === 'entrata';
                
                return (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center">
                        {isIncome ? (
                          <ArrowUpCircle className="h-4 w-4 mr-2 text-green-500 shrink-0" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 mr-2 text-red-500 shrink-0" />
                        )}
                        <span>
                          {format(parseISO(transaction.date), 'dd MMM yyyy', { locale: it })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{transaction.description || (isIncome ? 'Entrata' : 'Uscita')}</div>
                        {transaction.paymentMethod && (
                          <div className="text-xs text-muted-foreground">
                            {transaction.paymentMethod}
                            {transaction.reference && ` • ${transaction.reference}`}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(parseFloat(transaction.amount))}
                    </TableCell>
                    {showFilters && (
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
                              <a href={`/dashboard/finances/transaction/edit/${transaction.id}`}>
                                Modifica
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={`/dashboard/finances/transaction/${transaction.id}`}>
                                Visualizza dettaglio
                              </a>
                            </DropdownMenuItem>
                            {transaction.sourceId && transaction.source === "quote" && (
                              <DropdownMenuItem asChild>
                                <a href={`/quotes/detail/${transaction.sourceId}`}>
                                  Vai al preventivo
                                </a>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {showFilters && (
            <div className="mt-4 flex flex-col sm:flex-row sm:justify-between space-y-2 sm:space-y-0">
              <div className="text-sm text-muted-foreground">
                {filteredTransactions.length} transazioni visualizzate
              </div>
              <div className="flex space-x-4">
                <div className="text-sm">
                  <span className="font-medium">Entrate:</span>{' '}
                  <span className="text-green-600">{formatCurrency(totals.income)}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Uscite:</span>{' '}
                  <span className="text-red-600">{formatCurrency(totals.expense)}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Saldo:</span>{' '}
                  <span className={totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(totals.balance)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm || typeFilter !== 'all' ? (
            <p>Nessuna transazione corrisponde ai filtri selezionati.</p>
          ) : (
            <p>Non ci sono transazioni registrate. Crea la tua prima transazione!</p>
          )}
        </div>
      )}
    </div>
  );
}