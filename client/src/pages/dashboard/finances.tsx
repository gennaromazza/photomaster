import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Euro, CalendarClock, ArrowDown, ArrowUp, Plus, CreditCard, FileText } from "lucide-react";
import { format, parseISO, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Link } from "wouter";

/**
 * Pagina principale della sezione finanze.
 * Mostra una panoramica delle finanze con grafici e dati aggregati.
 */
export default function FinancesPage() {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calcola l'intervallo di date basato sul periodo selezionato
  const dateRange = () => {
    const start = startOfMonth(currentDate);
    let end;

    switch (period) {
      case "month":
        end = endOfMonth(start);
        break;
      case "quarter":
        end = endOfMonth(addMonths(start, 2));
        break;
      case "year":
        end = endOfMonth(addMonths(start, 11));
        break;
      default:
        end = endOfMonth(start);
    }

    return { start, end };
  };

  // Ottieni i dati finanziari per il periodo selezionato
  const { data: financeData, isLoading } = useQuery({
    queryKey: ["/api/finance/stats", dateRange().start, dateRange().end],
    queryFn: async () => {
      const range = dateRange();
      const startStr = format(range.start, "yyyy-MM-dd");
      const endStr = format(range.end, "yyyy-MM-dd");
      
      const res = await fetch(`/api/finance/stats?start=${startStr}&end=${endStr}`);
      if (!res.ok) {
        throw new Error("Errore nel caricamento dei dati finanziari");
      }
      return res.json();
    },
  });

  // Cambia periodo (mese, trimestre, anno)
  const handlePeriodChange = (value: string) => {
    setPeriod(value as "month" | "quarter" | "year");
  };

  // Cambia periodo corrente (avanti/indietro nel tempo)
  const navigatePeriod = (direction: "next" | "prev") => {
    const months = period === "month" ? 1 : period === "quarter" ? 3 : 12;
    setCurrentDate(prevDate => 
      direction === "next" 
        ? addMonths(prevDate, months) 
        : addMonths(prevDate, -months)
    );
  };

  // Formatta il periodo corrente per la visualizzazione
  const formatPeriodLabel = () => {
    const { start, end } = dateRange();
    
    if (period === "month") {
      return format(start, "MMMM yyyy", { locale: it });
    } else if (period === "quarter") {
      return `${format(start, "MMM", { locale: it })} - ${format(end, "MMM yyyy", { locale: it })}`;
    } else {
      return `${format(start, "MMM yyyy", { locale: it })} - ${format(end, "MMM yyyy", { locale: it })}`;
    }
  };

  // Prepara i dati per il grafico
  const chartData = financeData?.chartData || [];

  return (
    <PageWrapper>
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-playfair font-bold">Dashboard Finanziaria</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/finances/scheduled">
                <CalendarClock className="h-4 w-4 mr-2" />
                Pagamenti programmati
              </Link>
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi transazione
            </Button>
          </div>
        </div>

        {/* Pannelli riassuntivi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Entrate totali</CardDescription>
              <CardTitle className="text-2xl flex items-center">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <>
                    <ArrowDown className="h-5 w-5 text-green-500 mr-2" />
                    € {(financeData?.summary?.income || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                  </>
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Uscite totali</CardDescription>
              <CardTitle className="text-2xl flex items-center">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <>
                    <ArrowUp className="h-5 w-5 text-red-500 mr-2" />
                    € {(financeData?.summary?.expenses || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                  </>
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Profitto netto</CardDescription>
              <CardTitle className="text-2xl flex items-center">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <>
                    <Euro className="h-5 w-5 text-primary mr-2" />
                    € {(financeData?.summary?.profit || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                  </>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Selettore periodo e grafico */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle>Andamento Finanziario</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => navigatePeriod("prev")}
                    className="rounded-r-none border-r-0"
                  >
                    <ArrowDown className="h-4 w-4 rotate-90" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => navigatePeriod("next")}
                    className="rounded-l-none"
                  >
                    <ArrowDown className="h-4 w-4 -rotate-90" />
                  </Button>
                </div>
                <div className="min-w-[180px] text-sm font-medium text-center">
                  {formatPeriodLabel()}
                </div>
                <Tabs defaultValue={period} onValueChange={handlePeriodChange}>
                  <TabsList>
                    <TabsTrigger value="month">Mese</TabsTrigger>
                    <TabsTrigger value="quarter">Trimestre</TabsTrigger>
                    <TabsTrigger value="year">Anno</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="label" 
                      tickFormatter={(value) => {
                        try {
                          return format(parseISO(value), "d MMM", { locale: it });
                        } catch (e) {
                          return value;
                        }
                      }}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [`€ ${value.toFixed(2)}`, undefined]}
                      labelFormatter={(label) => {
                        try {
                          return format(parseISO(label), "d MMMM yyyy", { locale: it });
                        } catch (e) {
                          return label;
                        }
                      }}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Entrate" fill="#4ade80" />
                    <Bar dataKey="expenses" name="Uscite" fill="#f87171" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ultime transazioni */}
        <Card>
          <CardHeader>
            <CardTitle>Ultime Transazioni</CardTitle>
            <CardDescription>Le tue transazioni più recenti</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
              </div>
            ) : !financeData?.recentTransactions?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nessuna transazione recente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {financeData.recentTransactions.map((transaction: any) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-primary/5 rounded-md">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {transaction.type === 'income' ? (
                          <ArrowDown className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowUp className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.source} • {format(parseISO(transaction.date), "d MMM yyyy", { locale: it })}
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'} € {transaction.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}