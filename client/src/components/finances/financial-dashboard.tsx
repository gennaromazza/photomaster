import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { PaymentTracker } from './payment-tracker';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  TrendingDown,
  CalendarIcon,
  BarChart3,
  PiggyBank,
  Euro
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

// Interfaccia per i dati finanziari
interface FinancialData {
  summary: {
    monthlyIncome: number;
    monthlyExpenses: number;
    yearlyIncome: number;
    yearlyExpenses: number;
    pendingPayments: number;
    overduePayments: number;
  };
  monthlyStats: {
    month: string;
    income: number;
    expenses: number;
  }[];
  expenseCategories: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  recentTransactions: {
    id: number;
    date: string;
    description: string;
    amount: number;
    type: string;
  }[];
}

export function FinancialDashboard() {
  const [fromDate, setFromDate] = useState<Date | undefined>(subMonths(new Date(), 6));
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  
  // Query per recuperare i dati finanziari
  const { data, isLoading, error } = useQuery<FinancialData>({
    queryKey: ['/api/finance/summary', fromDate, toDate],
    queryFn: async () => {
      // Formatta le date per la query
      const fromDateStr = fromDate ? format(fromDate, 'yyyy-MM-dd') : '';
      const toDateStr = toDate ? format(toDate, 'yyyy-MM-dd') : '';
      
      const response = await fetch(
        `/api/finance/summary?fromDate=${fromDateStr}&toDate=${toDateStr}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch financial data');
      }
      
      return response.json();
    }
  });
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd MMM yyyy', { locale: it });
  };
  
  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    return format(new Date(parseInt(year), parseInt(month) - 1), 'MMM yyyy', { locale: it });
  };
  
  // Colori per i grafici
  const COLORS = ['#4f46e5', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];
  
  // Custom tooltip per i grafici
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-2 border rounded-md shadow-sm">
          <p className="text-sm font-medium">{formatMonth(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Finanziaria</h2>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="h-96 lg:col-span-4" />
          <Skeleton className="h-96 lg:col-span-3" />
        </div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Finanziaria</h2>
        <Card>
          <CardHeader>
            <CardTitle>Errore</CardTitle>
            <CardDescription>
              Si è verificato un errore nel caricamento dei dati finanziari. Riprova più tardi.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  const { summary, monthlyStats, expenseCategories, recentTransactions } = data;
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Finanziaria</h2>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fromDate ? format(fromDate, 'PP', { locale: it }) : 'Seleziona inizio'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={setFromDate}
                initialFocus
                locale={it}
              />
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {toDate ? format(toDate, 'PP', { locale: it }) : 'Seleziona fine'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={setToDate}
                initialFocus
                locale={it}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span>Panoramica</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-1">
              <Euro className="h-4 w-4" />
              <span>Transazioni</span>
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="flex items-center gap-1">
              <PiggyBank className="h-4 w-4" />
              <span>Pagamenti Programmati</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Entrate Mensili
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.monthlyIncome)}</div>
                <p className="text-xs text-muted-foreground">
                  +{((summary.monthlyIncome / (summary.yearlyIncome / 12)) * 100 - 100).toFixed(1)}% rispetto alla media
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Uscite Mensili
                </CardTitle>
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.monthlyExpenses)}</div>
                <p className="text-xs text-muted-foreground">
                  {((summary.monthlyExpenses / (summary.yearlyExpenses / 12)) * 100 - 100).toFixed(1)}% rispetto alla media
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pagamenti in Attesa
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.pendingPayments)}</div>
                <p className="text-xs text-muted-foreground">
                  Da ricevere nei prossimi 30 giorni
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pagamenti Scaduti
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.overduePayments)}</div>
                <p className="text-xs text-muted-foreground">
                  Pagamenti non ricevuti in tempo
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Entrate e Uscite</CardTitle>
                <CardDescription>
                  Confronto tra entrate e uscite negli ultimi mesi
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyStats}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={formatMonth}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        tickFormatter={(value) => new Intl.NumberFormat('it-IT', {
                          style: 'currency',
                          currency: 'EUR',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(value)}
                        tick={{ fontSize: 12 }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar 
                        dataKey="income" 
                        name="Entrate" 
                        fill="#4f46e5" 
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="expenses" 
                        name="Uscite" 
                        fill="#ef4444" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Categorie di Spesa</CardTitle>
                <CardDescription>
                  Ripartizione delle spese per categoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseCategories}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                        nameKey="category"
                      >
                        {expenseCategories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-2">
                  <ScrollArea className="h-[100px]">
                    <div className="space-y-1">
                      {expenseCategories.map((category, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <div className="flex items-center">
                            <span
                              className="mr-2 h-3 w-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span>{category.category}</span>
                          </div>
                          <span>{formatCurrency(category.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-7">
              <CardHeader>
                <CardTitle>Transazioni Recenti</CardTitle>
                <CardDescription>
                  Le ultime 5 transazioni registrate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((transaction, index) => (
                      <div key={index} className="flex items-center">
                        <div className={cn(
                          "mr-4 rounded-full p-2",
                          transaction.type === 'payment' || transaction.type === 'deposit'
                            ? "bg-green-100"
                            : "bg-red-100"
                        )}>
                          {transaction.type === 'payment' || transaction.type === 'deposit' ? (
                            <ArrowUpRight className={cn(
                              "h-4 w-4",
                              transaction.type === 'payment' || transaction.type === 'deposit'
                                ? "text-green-600"
                                : "text-red-600"
                            )} />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                        </div>
                        <div className={cn(
                          "font-medium",
                          transaction.type === 'payment' || transaction.type === 'deposit'
                            ? "text-green-600"
                            : "text-red-600"
                        )}>
                          {transaction.type === 'payment' || transaction.type === 'deposit'
                            ? `+${formatCurrency(transaction.amount)}`
                            : `-${formatCurrency(transaction.amount)}`}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground">Nessuna transazione recente</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="transactions">
          <PaymentTracker hideTitle={true} />
        </TabsContent>
        
        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Pagamenti Programmati</CardTitle>
              <CardDescription>
                Visualizza tutti i pagamenti programmati per i tuoi preventivi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <iframe 
                src="/dashboard/finances/scheduled"
                style={{ width: '100%', height: '600px', border: 'none' }}
                title="Pagamenti Programmati"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}