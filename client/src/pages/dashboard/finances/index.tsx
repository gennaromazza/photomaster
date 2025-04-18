import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { FinancialDashboard } from '@/components/finances/financial-dashboard';
import { PaymentTracker } from '@/components/finances/payment-tracker';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Send, BarChart2, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function FinancesPage() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Ottieni le statistiche finanziarie
  const { 
    data: stats,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ['/api/finance/stats']
  });
  
  // Ottieni l'elenco delle transazioni
  const { 
    data: transactions = [],
    isLoading: transactionsLoading,
  } = useQuery({
    queryKey: ['/api/finance/transactions']
  });
  
  // Ottieni l'elenco dei pagamenti programmati
  const { 
    data: scheduledPayments = [],
    isLoading: scheduledLoading,
  } = useQuery({
    queryKey: ['/api/finance/scheduled']
  });
  
  const getOverduePaymentsCount = () => {
    if (!scheduledPayments.length) return 0;
    return scheduledPayments.filter((payment: any) => payment.status === 'overdue').length;
  };
  
  const overdueCount = getOverduePaymentsCount();
  
  return (
    <PageWrapper
      title="Finanze"
      subtitle="Gestisci entrate, uscite e pagamenti programmati"
      actions={
        <div className="flex gap-2">
          <Button asChild>
            <a href="/dashboard/finances/transaction/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuova Transazione
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/dashboard/finances/scheduled/new">
              <Clock className="mr-2 h-4 w-4" />
              Programma Pagamento
            </a>
          </Button>
        </div>
      }
    >
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="transactions">
            Transazioni
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="relative">
            Pagamenti Programmati
            {overdueCount > 0 && (
              <span className="absolute inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full -top-2 -right-2">
                {overdueCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <FinancialDashboard 
            stats={stats} 
            isLoading={statsLoading} 
            transactions={transactions} 
          />
        </TabsContent>
        
        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Transazioni</CardTitle>
              <CardDescription>
                Gestisci tutte le entrate e le uscite del tuo studio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentTracker 
                transactions={transactions} 
                isLoading={transactionsLoading} 
                showFilters={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="scheduled" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pagamenti Programmati</CardTitle>
                <CardDescription>
                  Monitora e gestisci scadenze e rate future
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <a href="/dashboard/finances/scheduled">
                  <BarChart2 className="mr-2 h-4 w-4" />
                  Vista Completa
                </a>
              </Button>
            </CardHeader>
            <CardContent>
              {scheduledLoading ? (
                <div>Caricamento in corso...</div>
              ) : scheduledPayments.length > 0 ? (
                <div className="space-y-4">
                  {overdueCount > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
                      <h4 className="text-sm font-semibold text-red-800 mb-1">
                        Attenzione: {overdueCount} pagament{overdueCount === 1 ? 'o' : 'i'} in ritardo
                      </h4>
                      <p className="text-sm text-red-700">
                        Ci sono pagamenti scaduti che richiedono attenzione. Vai alla pagina dei pagamenti programmati per gestirli.
                      </p>
                      <Button size="sm" variant="outline" className="mt-2 border-red-300 text-red-700 hover:bg-red-100" asChild>
                        <a href="/dashboard/finances/scheduled">
                          <Send className="mr-2 h-3 w-3" />
                          Gestisci Pagamenti Scaduti
                        </a>
                      </Button>
                    </div>
                  )}
                  
                  <div className="text-center mt-2">
                    <Button asChild>
                      <a href="/dashboard/finances/scheduled">
                        Visualizza tutti i pagamenti programmati
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Non ci sono pagamenti programmati. Crea un nuovo pagamento programmato!</p>
                  <Button className="mt-4" asChild>
                    <a href="/dashboard/finances/scheduled/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Nuovo Pagamento Programmato
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}