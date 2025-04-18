import { useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  CreditCard, 
  DollarSign, 
  Users, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Calendar,
  ChevronDown
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PaymentTracker } from './payment-tracker';
import { Skeleton } from '@/components/ui/skeleton';

interface FinancialDashboardProps {
  stats: any;
  isLoading: boolean;
  transactions: any[];
}

export function FinancialDashboard({ stats, isLoading, transactions }: FinancialDashboardProps) {
  const [period, setPeriod] = useState('month');
  
  // Funzione per formattare l'importo come valuta
  const formatCurrency = (amount: number = 0) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };
  
  // Funzione per calcolare l'andamento percentuale
  const calculateChange = (current: number = 0, previous: number = 0) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    
    return ((current - previous) / previous) * 100;
  };
  
  const getChangeClassName = (change: number) => {
    return change >= 0 
      ? 'text-emerald-500' 
      : 'text-rose-500';
  };
  
  const getChangeSymbol = (change: number) => {
    return change >= 0 ? '+' : '';
  };
  
  const getRevenueData = () => {
    if (!stats) return { current: 0, previous: 0, change: 0 };
    
    const current = stats.income?.current || 0;
    const previous = stats.income?.previous || 0;
    const change = calculateChange(current, previous);
    
    return { current, previous, change };
  };
  
  const getExpensesData = () => {
    if (!stats) return { current: 0, previous: 0, change: 0 };
    
    const current = stats.expenses?.current || 0;
    const previous = stats.expenses?.previous || 0;
    const change = calculateChange(current, previous);
    
    return { current, previous, change };
  };
  
  const getProfitData = () => {
    if (!stats) return { current: 0, previous: 0, change: 0 };
    
    const current = (stats.income?.current || 0) - (stats.expenses?.current || 0);
    const previous = (stats.income?.previous || 0) - (stats.expenses?.previous || 0);
    const change = calculateChange(current, previous);
    
    return { current, previous, change };
  };
  
  const getClientsData = () => {
    if (!stats) return { current: 0, previous: 0, change: 0 };
    
    const current = stats.clientCount?.current || 0;
    const previous = stats.clientCount?.previous || 0;
    const change = calculateChange(current, previous);
    
    return { current, previous, change };
  };
  
  const renderStatsCard = (
    title: string, 
    value: string, 
    change: number, 
    icon: JSX.Element,
    description: string
  ) => {
    const changeClass = getChangeClassName(change);
    const changeSymbol = getChangeSymbol(change);
    
    if (isLoading) {
      return (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              <Skeleton className="h-4 w-24" />
            </CardTitle>
            <Skeleton className="h-8 w-8 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-28 mb-1" />
            <Skeleton className="h-4 w-16" />
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground pt-1">
            <span className={changeClass}>
              {changeSymbol}{change.toFixed(1)}%
            </span>
            {' '}{description}
          </p>
        </CardContent>
      </Card>
    );
  };
  
  // Ottieni i dati per le card
  const revenueData = getRevenueData();
  const expensesData = getExpensesData();
  const profitData = getProfitData();
  const clientsData = getClientsData();
  
  const currentMonthName = format(new Date(), 'MMMM', { locale: it });
  const previousMonthName = format(subMonths(new Date(), 1), 'MMMM', { locale: it });
  
  // Determina la descrizione in base al periodo selezionato
  const getPeriodDescription = () => {
    if (period === 'month') {
      return `rispetto a ${previousMonthName}`;
    } else if (period === 'quarter') {
      return 'rispetto al trimestre precedente';
    } else {
      return 'rispetto all\'anno precedente';
    }
  };
  
  const description = getPeriodDescription();

  return (
    <div className="space-y-8">
      <div className="flex justify-between">
        <h3 className="text-lg font-medium">Panoramica Finanziaria</h3>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleziona periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Mensile</SelectItem>
            <SelectItem value="quarter">Trimestrale</SelectItem>
            <SelectItem value="year">Annuale</SelectItem>
          </SelectContent>
        </Select>
      </div>
    
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {renderStatsCard(
          'Entrate', 
          formatCurrency(revenueData.current), 
          revenueData.change, 
          <ArrowUpCircle className="h-4 w-4 text-emerald-500" />,
          description
        )}
        
        {renderStatsCard(
          'Uscite', 
          formatCurrency(expensesData.current), 
          -expensesData.change, 
          <ArrowDownCircle className="h-4 w-4 text-rose-500" />,
          description
        )}
        
        {renderStatsCard(
          'Profitto', 
          formatCurrency(profitData.current), 
          profitData.change, 
          <DollarSign className="h-4 w-4 text-blue-500" />,
          description
        )}
        
        {renderStatsCard(
          'Clienti Attivi', 
          clientsData.current.toString(), 
          clientsData.change, 
          <Users className="h-4 w-4 text-violet-500" />,
          description
        )}
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Transazioni Recenti</TabsTrigger>
          <TabsTrigger value="analytics">Analisi</TabsTrigger>
          <TabsTrigger value="forecast">Previsioni</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Ultime Transazioni</h4>
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Vedi Calendario
            </Button>
          </div>
          
          <PaymentTracker 
            transactions={transactions} 
            isLoading={isLoading} 
            limit={5} 
          />
        </TabsContent>
        
        <TabsContent value="analytics" className="h-[300px] flex items-center justify-center border rounded-md">
          <div className="text-center">
            <p className="text-muted-foreground">
              Le analisi finanziarie saranno disponibili prossimamente.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="forecast" className="h-[300px] flex items-center justify-center border rounded-md">
          <div className="text-center">
            <p className="text-muted-foreground">
              Le previsioni finanziarie saranno disponibili prossimamente.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}