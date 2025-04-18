import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, parseISO, isAfter, isBefore, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  AlertCircle, 
  Calendar, 
  ArrowUpDown, 
  MoreHorizontal, 
  Check, 
  Bell, 
  Search,
  Filter,
  Plus,
  X,
  Clock
} from 'lucide-react';

export default function ScheduledPaymentsPage() {
  const [location, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  
  // Controlla se c'è un filtro nell'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const filter = urlParams.get('filter');
    if (filter) {
      setStatusFilter(filter);
    }
  }, [location]);
  
  // Ottieni tutti i pagamenti programmati
  const { 
    data: scheduledPayments = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['/api/finance/scheduled-payments']
  });
  
  // Funzione per formattare l'importo come valuta
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };
  
  // Filtra i pagamenti programmati in base ai filtri attivi
  const filteredPayments = scheduledPayments.filter((payment: any) => {
    // Filtro per stato
    if (statusFilter && payment.status !== statusFilter) {
      return false;
    }
    
    // Filtro per ricerca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        (payment.description && payment.description.toLowerCase().includes(searchLower)) ||
        (payment.quoteTitle && payment.quoteTitle.toLowerCase().includes(searchLower)) ||
        (payment.clientName && payment.clientName.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });
  
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
  
  // Funzione per gestire lo status della data di scadenza
  const getDueDateStatus = (dueDate: string): 'overdue' | 'today' | 'upcoming' | 'future' => {
    const date = parseISO(dueDate);
    const now = new Date();
    
    if (isBefore(date, now) && !isToday(date)) {
      return 'overdue';
    } else if (isToday(date)) {
      return 'today';
    } else if (isBefore(date, new Date(now.setDate(now.getDate() + 7)))) {
      return 'upcoming';
    } else {
      return 'future';
    }
  };
  
  // Calcola i totali
  const totals = {
    all: filteredPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
    pending: filteredPayments
      .filter((p: any) => p.status === 'pending')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
    overdue: filteredPayments
      .filter((p: any) => p.status === 'overdue')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0)
  };
  
  return (
    <PageWrapper
      title="Pagamenti Programmati"
      subtitle="Gestisci i pagamenti da ricevere e le scadenze"
      actions={
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca pagamento..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                className="absolute right-0 top-0 h-9 w-9 p-0"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuovo Pagamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aggiungi Pagamento Programmato</DialogTitle>
                <DialogDescription>
                  Pianifica una nuova scadenza di pagamento da monitorare.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="quote">Preventivo collegato</Label>
                  <Input
                    id="quote"
                    placeholder="Seleziona preventivo..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Lascia vuoto se non è associato ad un preventivo specifico
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">Importo</Label>
                  <Input
                    id="amount"
                    placeholder="0,00"
                    type="number"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Data scadenza</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    defaultValue={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrizione</Label>
                  <Input
                    id="description"
                    placeholder="Es. Acconto, Saldo finale, ecc."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Note</Label>
                  <Input
                    id="notes"
                    placeholder="Eventuali note sul pagamento..."
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox id="sendReminder" />
                  <Label htmlFor="sendReminder">
                    Invia promemoria automatico 3 giorni prima della scadenza
                  </Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddPaymentOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit">
                  <Clock className="mr-2 h-4 w-4" />
                  Programma Pagamento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totale da Ricevere
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "Caricamento..." : formatCurrency(totals.all)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredPayments.length} pagamenti programmati
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Scadenza
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "Caricamento..." : formatCurrency(totals.pending)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredPayments.filter((p: any) => p.status === 'pending').length} pagamenti da ricevere
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Ritardo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {isLoading ? "Caricamento..." : formatCurrency(totals.overdue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredPayments.filter((p: any) => p.status === 'overdue').length} pagamenti scaduti
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <Tabs defaultValue={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">Tutti</TabsTrigger>
            <TabsTrigger value="pending">In attesa</TabsTrigger>
            <TabsTrigger value="overdue">Scaduti</TabsTrigger>
            <TabsTrigger value="paid">Pagati</TabsTrigger>
          </TabsList>
          
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 text-center">
                  <p>Caricamento pagamenti...</p>
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-muted-foreground">
                    {searchTerm 
                      ? "Nessun pagamento trovato con i criteri di ricerca inseriti." 
                      : statusFilter 
                        ? `Nessun pagamento con stato "${statusFilter}".` 
                        : "Nessun pagamento programmato da visualizzare."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Scadenza</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Descrizione</TableHead>
                      <TableHead>Preventivo</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Importo</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment: any) => {
                      const dueDateStatus = getDueDateStatus(payment.dueDate);
                      
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className={dueDateStatus === 'overdue' ? "font-medium text-destructive" : "font-medium"}>
                            <div className="flex items-center">
                              <Calendar className={`h-4 w-4 mr-2 ${dueDateStatus === 'overdue' ? 'text-destructive' : 'text-muted-foreground'}`} />
                              {format(parseISO(payment.dueDate), 'dd/MM/yyyy', { locale: it })}
                              {dueDateStatus === 'today' && (
                                <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800">Oggi</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {payment.clientName || "Non specificato"}
                          </TableCell>
                          <TableCell>
                            {payment.description || "Pagamento programmato"}
                          </TableCell>
                          <TableCell>
                            {payment.quoteTitle ? (
                              <Button variant="link" className="p-0 h-auto" asChild>
                                <a href={`/quotes/detail/${payment.quoteId}`}>{payment.quoteTitle}</a>
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">Non collegato</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payment.status)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(parseFloat(payment.amount))}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Apri menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                                {payment.status !== 'paid' && (
                                  <DropdownMenuItem>
                                    <Check className="mr-2 h-4 w-4" />
                                    Segna come pagato
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  <Bell className="mr-2 h-4 w-4" />
                                  Invia promemoria
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>Modifica</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
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
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </PageWrapper>
  );
}