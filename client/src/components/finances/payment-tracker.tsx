import React, { useState, useMemo } from 'react';
import { format, parseISO, isAfter, isBefore, isEqual, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowDown, 
  ArrowUp, 
  Download, 
  Filter, 
  Search, 
  SlidersHorizontal, 
  MoreHorizontal,
  ChevronDown,
  Trash,
  Edit,
  LinkIcon,
  BadgeEuro,
  CalendarDays,
  FileText,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

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
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Funzione per formattare l'importo come valuta
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };
  
  // Funzione per invertire la direzione di ordinamento
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Applica i filtri e ordina i dati
  const filteredTransactions = useMemo(() => {
    // Data range per il filtro
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    const now = new Date();
    
    switch (dateFilter) {
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'lastMonth':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case 'custom':
        // Per filtri di data personalizzati (da implementare)
        break;
      default:
        // 'all' - nessun filtro di data
        break;
    }
    
    // Filtra per data, tipo e termine di ricerca
    return transactions
      .filter(t => {
        // Filtra per data
        if (startDate && endDate) {
          const transactionDate = parseISO(t.date);
          return (
            (isAfter(transactionDate, startDate) || isEqual(transactionDate, startDate)) &&
            (isBefore(transactionDate, endDate) || isEqual(transactionDate, endDate))
          );
        }
        return true;
      })
      .filter(t => {
        // Filtra per tipo
        if (typeFilter === 'all') return true;
        
        // Per gestire diverse notazioni del tipo
        if (typeFilter === 'income') {
          return t.type === 'income' || t.type === 'entrata';
        } else if (typeFilter === 'expense') {
          return t.type === 'expense' || t.type === 'uscita';
        }
        
        return t.type === typeFilter;
      })
      .filter(t => {
        // Filtra per termine di ricerca
        if (!searchTerm) return true;
        
        const searchLower = searchTerm.toLowerCase();
        return (
          (t.description && t.description.toLowerCase().includes(searchLower)) ||
          (t.category && t.category.toLowerCase().includes(searchLower)) ||
          (t.reference && t.reference.toLowerCase().includes(searchLower)) ||
          (t.paymentMethod && t.paymentMethod.toLowerCase().includes(searchLower))
        );
      })
      .sort((a, b) => {
        // Ordina i risultati
        if (sortField === 'date') {
          return sortDirection === 'asc'
            ? new Date(a.date).getTime() - new Date(b.date).getTime()
            : new Date(b.date).getTime() - new Date(a.date).getTime();
        } else if (sortField === 'amount') {
          return sortDirection === 'asc'
            ? parseFloat(a.amount) - parseFloat(b.amount)
            : parseFloat(b.amount) - parseFloat(a.amount);
        }
        
        // Ordinamento predefinito per campi di testo
        if (!a[sortField]) return sortDirection === 'asc' ? 1 : -1;
        if (!b[sortField]) return sortDirection === 'asc' ? -1 : 1;
        
        return sortDirection === 'asc'
          ? a[sortField].localeCompare(b[sortField])
          : b[sortField].localeCompare(a[sortField]);
      })
      .slice(0, limit);
  }, [transactions, dateFilter, typeFilter, searchTerm, sortField, sortDirection, limit]);
  
  // Calcola i totali
  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income' || t.type === 'entrata')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const expenses = filteredTransactions
      .filter(t => t.type === 'expense' || t.type === 'uscita')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    return {
      income,
      expenses,
      balance: income - expenses
    };
  }, [filteredTransactions]);
  
  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutto</SelectItem>
                  <SelectItem value="month">Mese corrente</SelectItem>
                  <SelectItem value="lastMonth">Mese precedente</SelectItem>
                  <SelectItem value="year">Anno corrente</SelectItem>
                  <SelectItem value="custom">Periodo personalizzato</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="income">Entrate</SelectItem>
                  <SelectItem value="expense">Uscite</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="relative w-full md:w-auto md:flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca transazione..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilterPanel(!showFilterPanel)}>
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filtri avanzati
              </Button>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Esporta
              </Button>
            </div>
          </div>
          
          <Collapsible open={showFilterPanel} onOpenChange={setShowFilterPanel}>
            <CollapsibleContent>
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Categorie</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="cat-servizi" />
                          <Label htmlFor="cat-servizi">Servizi</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="cat-prodotti" />
                          <Label htmlFor="cat-prodotti">Prodotti</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="cat-eventi" />
                          <Label htmlFor="cat-eventi">Eventi</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="cat-altro" />
                          <Label htmlFor="cat-altro">Altro</Label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Metodi di pagamento</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="method-bonifico" />
                          <Label htmlFor="method-bonifico">Bonifico</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="method-contanti" />
                          <Label htmlFor="method-contanti">Contanti</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="method-carta" />
                          <Label htmlFor="method-carta">Carta</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="method-altro" />
                          <Label htmlFor="method-altro">Altro</Label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Importo</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="min-amount" className="text-xs">Minimo</Label>
                          <Input id="min-amount" placeholder="0" type="number" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="max-amount" className="text-xs">Massimo</Label>
                          <Input id="max-amount" placeholder="10000" type="number" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm">Reimposta</Button>
                    <Button size="sm">Applica filtri</Button>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center text-lg font-medium">
                <ArrowUpRight className="h-5 w-5 mr-2 text-green-500" />
                Entrate
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Totale del periodo selezionato
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">
              {isLoading ? <Skeleton className="h-8 w-28" /> : formatCurrency(totals.income)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center text-lg font-medium">
                <ArrowDownRight className="h-5 w-5 mr-2 text-red-500" />
                Uscite
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Totale del periodo selezionato
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-red-600">
              {isLoading ? <Skeleton className="h-8 w-28" /> : formatCurrency(totals.expenses)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center text-lg font-medium">
                <BadgeEuro className="h-5 w-5 mr-2 text-primary" />
                Saldo
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Differenza entrate/uscite
              </div>
            </div>
            <div className={`mt-2 text-2xl font-bold ${totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {isLoading ? <Skeleton className="h-8 w-28" /> : formatCurrency(totals.balance)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <div className="mb-2">Nessuna transazione trovata.</div>
          {searchTerm && <div>Prova a modificare i criteri di ricerca.</div>}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">
                <Button variant="ghost" size="sm" className="-ml-3 h-8 data-[state=open]:bg-accent" onClick={() => toggleSort('date')}>
                  <span>Data</span>
                  {sortField === 'date' && (
                    <span className="ml-2">
                      {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    </span>
                  )}
                </Button>
              </TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Riferimento</TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="-ml-3 h-8 data-[state=open]:bg-accent" onClick={() => toggleSort('amount')}>
                  <span>Importo</span>
                  {sortField === 'amount' && (
                    <span className="ml-2">
                      {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    </span>
                  )}
                </Button>
              </TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction, index) => {
              const isIncome = transaction.type === 'income' || transaction.type === 'entrata';
              
              return (
                <TableRow key={transaction.id || index}>
                  <TableCell className="font-medium">
                    {format(parseISO(transaction.date), 'dd/MM/yyyy', { locale: it })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {transaction.description || (isIncome ? 'Entrata' : 'Uscita')}
                      </div>
                      {transaction.paymentMethod && (
                        <div className="text-xs text-muted-foreground">
                          {transaction.paymentMethod}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={isIncome ? "bg-green-100" : "bg-red-100"}>
                      {transaction.category || (isIncome ? 'Entrata' : 'Uscita')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {transaction.reference ? (
                      <div className="flex items-center">
                        <span className="text-sm">{transaction.reference}</span>
                        {transaction.quoteId && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2" asChild>
                            <a href={`/quotes/detail/${transaction.quoteId}`} title="Vai al preventivo">
                              <LinkIcon className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className={isIncome ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {isIncome ? '+' : '-'}{formatCurrency(parseFloat(transaction.amount))}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Apri menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifica
                        </DropdownMenuItem>
                        {transaction.quoteId && (
                          <DropdownMenuItem asChild>
                            <a href={`/quotes/detail/${transaction.quoteId}`}>
                              <FileText className="mr-2 h-4 w-4" />
                              Vedi preventivo
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash className="mr-2 h-4 w-4" />
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}