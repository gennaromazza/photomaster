import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { Button } from '@/components/ui/button';
import { Plus, PlusCircle, Download, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialDashboard } from '@/components/finances/financial-dashboard';
import { PaymentTracker } from '@/components/finances/payment-tracker';
import { useToast } from '@/hooks/use-toast';

export default function FinancesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  // Ottieni statistiche finanziarie
  const { 
    data: financeStats, 
    isLoading: statsLoading,
    error: statsError 
  } = useQuery({
    queryKey: ['/api/finance/stats'],
  });

  // Ottieni le transazioni recenti
  const { 
    data: transactions, 
    isLoading: transactionsLoading,
    error: transactionsError 
  } = useQuery({
    queryKey: ['/api/finance/transactions'],
  });

  // Gestione della creazione di una nuova transazione
  const handleCreateTransaction = () => {
    // Navigazione alla pagina di creazione transazione
    window.location.href = '/dashboard/finances/transaction/new';
  };

  return (
    <PageWrapper 
      title="Finanze" 
      subtitle="Gestisci le finanze del tuo studio fotografico"
      action={
        <div className="flex space-x-2">
          <Button onClick={handleCreateTransaction}>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Transazione
          </Button>
        </div>
      }
    >
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="transactions">Transazioni</TabsTrigger>
          <TabsTrigger value="scheduled">Pagamenti Programmati</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <FinancialDashboard 
            stats={financeStats} 
            isLoading={statsLoading} 
            transactions={transactions?.slice(0, 5) || []}
          />
        </TabsContent>
        
        <TabsContent value="transactions" className="mt-6">
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-medium">Transazioni</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Esporta
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Importa
              </Button>
            </div>
          </div>
          
          <PaymentTracker 
            transactions={transactions || []} 
            isLoading={transactionsLoading} 
          />
        </TabsContent>
        
        <TabsContent value="scheduled" className="mt-6">
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-medium">Pagamenti Programmati</h3>
            <Button size="sm" variant="default">
              <PlusCircle className="h-4 w-4 mr-2" />
              Nuovo Pagamento
            </Button>
          </div>
          
          {/* Qui ci sarebbe la tabella dei pagamenti programmati */}
          <div className="text-center py-12">
            <a href="/dashboard/finances/scheduled" className="text-primary underline">
              Visualizza tutti i pagamenti programmati
            </a>
          </div>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}