import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subMonths, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';
import { PaymentTracker } from './payment-tracker';
import { ArrowUp, ArrowDown, Euro, Calendar, TrendingUp, TrendingDown, Wallet, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FinancialDashboardProps {
  stats: any;
  isLoading: boolean;
  transactions?: any[];
}

export function FinancialDashboard({ 
  stats,
  isLoading,
  transactions = []
}: FinancialDashboardProps) {
  const [period, setPeriod] = useState('current_month');
  
  // Funzione per formattare l'importo come valuta
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };
  
  // Filtra le transazioni più recenti
  const recentTransactions = transactions
    ?.filter(t => {
      if (period === 'current_month') {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear;
      }
      
      if (period === 'last_month') {
        const lastMonth = subMonths(new Date(), 1);
        const lastMonthMonth = lastMonth.getMonth();
        const lastMonthYear = lastMonth.getFullYear();
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === lastMonthMonth && 
               transactionDate.getFullYear() === lastMonthYear;
      }
      
      if (period === 'last_3_months') {
        const threeMonthsAgo = subMonths(new Date(), 3);
        return isAfter(new Date(t.date), threeMonthsAgo);
      }
      
      return true; // All transactions if no period filter
    })
    .slice(0, 5); // Get only the first 5 transactions
  
  const getPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };
  
  const renderStat = (title: string, value: number, previousValue: number, icon: React.ReactNode, type: 'income' | 'expense' | 'balance') => {
    const isPositiveChange = value >= previousValue;
    const changePercentage = getPercentage(value, previousValue);
    const displayPercentage = isFinite(changePercentage) ? Math.abs(Math.round(changePercentage)) : 0;
    
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {title}
          </CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              formatCurrency(value)
            )}
          </div>
          {!isLoading && (
            <p className="text-xs text-muted-foreground mt-1">
              <span className={`inline-flex items-center ${isPositiveChange ? 
                (type === 'expense' ? 'text-red-600' : 'text-green-600') : 
                (type === 'expense' ? 'text-green-600' : 'text-red-600')}`}>
                {isPositiveChange ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {displayPercentage}%
              </span>
              {' '}rispetto al periodo precedente
            </p>
          )}
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">Dashboard Finanziaria</h3>
        
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleziona periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_month">Mese corrente</SelectItem>
            <SelectItem value="last_month">Mese precedente</SelectItem>
            <SelectItem value="last_3_months">Ultimi 3 mesi</SelectItem>
            <SelectItem value="last_6_months">Ultimi 6 mesi</SelectItem>
            <SelectItem value="last_12_months">Ultimi 12 mesi</SelectItem>
            <SelectItem value="all">Tutti</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {renderStat(
          "Entrate Totali",
          stats?.currentIncome || 0,
          stats?.previousIncome || 0,
          <Euro className="h-4 w-4 text-green-500" />,
          'income'
        )}
        
        {renderStat(
          "Uscite Totali",
          stats?.currentExpenses || 0,
          stats?.previousExpenses || 0,
          <Euro className="h-4 w-4 text-red-500" />,
          'expense'
        )}
        
        {renderStat(
          "Saldo",
          (stats?.currentIncome || 0) - (stats?.currentExpenses || 0),
          (stats?.previousIncome || 0) - (stats?.previousExpenses || 0),
          <Wallet className="h-4 w-4 text-blue-500" />,
          'balance'
        )}
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pagamenti in Scadenza
            </CardTitle>
            <Calendar className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                stats?.upcomingPayments || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Scadenze nei prossimi 30 giorni
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Transazioni Recenti</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentTracker 
              transactions={recentTransactions}
              isLoading={isLoading}
              limit={5}
            />
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Obiettivi Finanziari</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p>
                    Non hai ancora impostato obiettivi finanziari.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}