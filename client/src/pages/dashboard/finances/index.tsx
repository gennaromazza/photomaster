import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Filter, Download, Plus, Euro } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FinancialDashboard } from '@/components/finances/financial-dashboard';
import { PaymentTracker } from '@/components/finances/payment-tracker';
import { Separator } from '@/components/ui/separator';

export default function FinancesPage() {
  const [period, setPeriod] = useState<string>('monthly');
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString());
  
  // Ottieni le statistiche finanziarie
  const { 
    data: stats,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ['/api/finance/stats', period, year, month],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('period', period);
      params.append('year', year);
      
      if (period === 'monthly') {
        params.append('month', month);
      }
      
      const response = await fetch(`/api/finance/stats?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Errore nel recupero delle statistiche');
      }
      return await response.json();
    }
  });
  
  // Ottieni le transazioni
  const {
    data: transactions = [],
    isLoading: transactionsLoading,
  } = useQuery({
    queryKey: ['/api/finance/transactions'],
  });
  
  // Ottieni i pagamenti programmati
  const {
    data: scheduledPayments = [],
    isLoading: scheduledLoading,
  } = useQuery({
    queryKey: ['/api/finance/scheduled-payments'],
  });
  
  // Funzione per formattare l'importo come valuta
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };
  
  // Calcola i pagamenti in scadenza
  const duePayments = scheduledPayments.filter(
    (p: any) => p.status === 'pending' && new Date(p.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );
  
  // Calcola i pagamenti in ritardo
  const overduePayments = scheduledPayments.filter(
    (p: any) => p.status === 'overdue'
  );
  
  return (
    <PageWrapper
      title="Gestione Finanziaria"
      subtitle="Monitora entrate, uscite e pianifica i pagamenti"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagamenti in Scadenza
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scheduledLoading ? "Caricamento..." : duePayments.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Nei prossimi 7 giorni
            </p>
            <Button variant="link" className="px-0 text-sm" asChild>
              <a href="/dashboard/finances/scheduled">Visualizza tutti</a>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagamenti in Ritardo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {scheduledLoading ? "Caricamento..." : overduePayments.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Importo totale: {
                scheduledLoading 
                  ? "Caricamento..." 
                  : formatCurrency(
                      overduePayments.reduce((acc: number, payment: any) => 
                        acc + parseFloat(payment.amount), 0)
                    )
              }
            </p>
            <Button variant="link" className="px-0 text-sm" asChild>
              <a href="/dashboard/finances/scheduled?filter=overdue">Gestisci pagamenti</a>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo del Periodo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading 
                ? "Caricamento..." 
                : formatCurrency(stats?.currentPeriod?.balance || 0)
              }
            </div>
            <div className="flex flex-row justify-between items-center">
              <p className="text-xs text-muted-foreground">
                {period === 'monthly' 
                  ? `${getMonthName(parseInt(month))} ${year}` 
                  : `Anno ${year}`}
              </p>
              
              <Select 
                value={period} 
                onValueChange={setPeriod}
              >
                <SelectTrigger className="w-auto h-7 text-xs bg-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensile</SelectItem>
                  <SelectItem value="yearly">Annuale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <Tabs defaultValue="dashboard">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="transactions">Transazioni</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtri
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Esporta
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuova Transazione
              </Button>
            </div>
          </div>
          
          <TabsContent value="dashboard" className="mt-0">
            <FinancialDashboard 
              stats={stats} 
              isLoading={statsLoading} 
              transactions={transactions}
            />
          </TabsContent>
          
          <TabsContent value="transactions" className="mt-0">
            <PaymentTracker 
              transactions={transactions} 
              isLoading={transactionsLoading} 
              showFilters={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}

// Utility per ottenere il nome del mese dall'indice
function getMonthName(monthIndex: number): string {
  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  
  // L'indice del mese è 1-based, quindi sottraiamo 1
  return months[monthIndex - 1] || '';
}