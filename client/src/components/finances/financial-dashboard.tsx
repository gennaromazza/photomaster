import React from 'react';
import { format, parseISO, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
  // Funzione per formattare l'importo come valuta
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };
  
  // Prepara i dati per il grafico delle entrate/uscite mensili
  const getMonthlyChart = () => {
    // Se non ci sono statistiche, crea dati di esempio vuoti per gli ultimi 6 mesi
    if (!stats || !stats.monthlyData) {
      return Array(6).fill(0).map((_, i) => {
        const date = subMonths(new Date(), 5 - i);
        return {
          name: format(date, 'MMM', { locale: it }),
          entrate: 0,
          uscite: 0,
          saldo: 0
        };
      });
    }
    
    // Altrimenti, utilizza i dati reali
    return stats.monthlyData.map((item: any) => ({
      name: format(parseISO(item.month), 'MMM', { locale: it }),
      entrate: parseFloat(item.income || 0),
      uscite: parseFloat(item.expenses || 0),
      saldo: parseFloat(item.income || 0) - parseFloat(item.expenses || 0)
    }));
  };
  
  // Prepara i dati per il grafico della distribuzione delle transazioni per categoria
  const getCategoryChart = () => {
    if (!stats || !stats.categoriesData) {
      return [];
    }
    
    return stats.categoriesData.map((item: any) => ({
      name: item.category || 'Altro',
      value: parseFloat(item.amount)
    }));
  };
  
  // Prepara i dati per la tabella delle ultime transazioni
  const getRecentTransactions = () => {
    if (!transactions) return [];
    
    return transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  };
  
  // Calcola le percentuali di variazione rispetto al periodo precedente
  const getChangePercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };
  
  // Formatta la percentuale con il segno appropriato
  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };
  
  const monthlyChartData = getMonthlyChart();
  const categoryChartData = getCategoryChart();
  const recentTransactions = getRecentTransactions();
  
  // Calcoli sui dati per le card in cima
  const currentPeriodIncome = stats?.currentPeriod?.income || 0;
  const previousPeriodIncome = stats?.previousPeriod?.income || 0;
  const incomeChange = getChangePercentage(currentPeriodIncome, previousPeriodIncome);
  
  const currentPeriodExpenses = stats?.currentPeriod?.expenses || 0;
  const previousPeriodExpenses = stats?.previousPeriod?.expenses || 0;
  const expensesChange = getChangePercentage(currentPeriodExpenses, previousPeriodExpenses);
  
  const currentProfitMargin = currentPeriodIncome > 0 
    ? ((currentPeriodIncome - currentPeriodExpenses) / currentPeriodIncome) * 100 
    : 0;
  const previousProfitMargin = previousPeriodIncome > 0 
    ? ((previousPeriodIncome - previousPeriodExpenses) / previousPeriodIncome) * 100 
    : 0;
  const profitMarginChange = getChangePercentage(currentProfitMargin, previousProfitMargin);
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Entrate
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(currentPeriodIncome)}
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  {incomeChange >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span className={incomeChange >= 0 ? "text-green-500" : "text-red-500"}>
                    {formatPercentage(incomeChange)}
                  </span>
                  <span>dal periodo precedente</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Uscite
            </CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(currentPeriodExpenses)}
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  {expensesChange <= 0 ? (
                    <TrendingDown className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span className={expensesChange <= 0 ? "text-green-500" : "text-red-500"}>
                    {formatPercentage(Math.abs(expensesChange))}
                  </span>
                  <span>{expensesChange <= 0 ? "in meno" : "in più"} dal periodo precedente</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Margine di Profitto
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {currentProfitMargin.toFixed(1)}%
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  {profitMarginChange >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span className={profitMarginChange >= 0 ? "text-green-500" : "text-red-500"}>
                    {formatPercentage(profitMarginChange)}
                  </span>
                  <span>dal periodo precedente</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Previsione Prossimo Mese
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.forecast?.income || 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  basato sugli ultimi 3 mesi
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="distribution">Distribuzione</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Andamento Finanziario</CardTitle>
              <CardDescription>
                Visualizzazione delle entrate e uscite mensili
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-80">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyChartData}
                      margin={{
                        top: 5,
                        right: 10,
                        left: 10,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `€${value}`} />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), '']}
                        labelFormatter={(value) => `Mese: ${value}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="entrate"
                        stroke="#10b981"
                        activeDot={{ r: 8 }}
                        name="Entrate"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="uscite" 
                        stroke="#ef4444" 
                        name="Uscite"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="saldo" 
                        stroke="#6366f1" 
                        strokeDasharray="5 5" 
                        name="Saldo"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Principali Fonti di Reddito</CardTitle>
                <CardDescription>
                  Entrate suddivise per categoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[250px]">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `€${value}`} />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), 'Importo']}
                        />
                        <Bar dataKey="value" fill="#8884d8" name="Importo" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Ultime Transazioni</CardTitle>
                <CardDescription>
                  Gli ultimi movimenti registrati
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.length > 0 ? (
                      recentTransactions.map((transaction, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {transaction.description || 'Transazione'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(transaction.date), 'dd MMM yyyy', { locale: it })}
                            </p>
                          </div>
                          <div className={`font-medium ${transaction.type === 'income' || transaction.type === 'entrata' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'income' || transaction.type === 'entrata' ? '+' : '-'}
                            {formatCurrency(parseFloat(transaction.amount))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nessuna transazione registrata.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuzione delle Spese</CardTitle>
              <CardDescription>
                Suddivisione delle uscite per categoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-80">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats?.expensesCategories || []}
                      layout="vertical"
                      margin={{
                        top: 20,
                        right: 30,
                        left: 100,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `€${value}`} />
                      <YAxis type="category" dataKey="category" />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Importo']} 
                      />
                      <Legend />
                      <Bar dataKey="amount" fill="#ef4444" name="Spese" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Previsione Spese</CardTitle>
                <CardDescription>
                  Proiezione delle spese per i prossimi mesi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[250px]">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={stats?.expensesForecast || []}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `€${value}`} />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), '']}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="projected" 
                          stroke="#8884d8" 
                          name="Stima Spese" 
                          strokeDasharray="5 5"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="actual" 
                          stroke="#82ca9d" 
                          name="Spese Effettive" 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Efficienza Operativa</CardTitle>
                <CardDescription>
                  Rapporto tra entrate e uscite
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[250px]">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyChartData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `${value}%`} />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Efficienza']} 
                        />
                        <Bar 
                          dataKey={(entry) => {
                            if (entry.entrate === 0) return 0;
                            return ((entry.entrate - entry.uscite) / entry.entrate) * 100;
                          }}
                          fill="#6366f1"
                          name="Efficienza Operativa"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}