import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface FinancialSummaryProps {
  quoteId: number;
}

interface FinancialData {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  nextPaymentDate: string | null;
  nextPaymentAmount: number | null;
  transactions: any[];
  scheduledPayments: any[];
  status: 'paid' | 'partial' | 'unpaid';
}

export function FinancialSummary({ quoteId }: FinancialSummaryProps) {
  const { data, isLoading, error } = useQuery<FinancialData>({
    queryKey: ['/api/quotes/financials', quoteId],
    queryFn: async () => {
      const response = await fetch(`/api/finance/quotes/${quoteId}/summary`);
      if (!response.ok) {
        throw new Error('Failed to fetch financial data');
      }
      return response.json();
    },
    enabled: !!quoteId
  });
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'd MMMM yyyy', { locale: it });
  };
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid':
        return 'bg-green-100 text-green-800 hover:bg-green-100/80';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80';
      case 'unpaid':
        return 'bg-red-100 text-red-800 hover:bg-red-100/80';
      default:
        return '';
    }
  };
  
  const getStatusLabel = (status: string) => {
    const statuses: Record<string, string> = {
      paid: 'Pagato',
      partial: 'Parziale',
      unpaid: 'Non pagato'
    };
    return statuses[status] || 'Sconosciuto';
  };
  
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'paid':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'partial':
        return <ArrowUpRight className="h-4 w-4" />;
      case 'unpaid':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Riepilogo Finanziario</CardTitle>
          <CardDescription>Errore nel caricamento dei dati finanziari</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Impossibile caricare i dati finanziari. Riprova più tardi.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const { totalAmount, paidAmount, remainingAmount, nextPaymentDate, nextPaymentAmount, status } = data;
  const percentagePaid = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Riepilogo Finanziario</CardTitle>
          <CardDescription>Stato dei pagamenti per questo preventivo</CardDescription>
        </div>
        <Badge className={cn("ml-auto", getStatusColor(status))}>
          <span className="flex items-center gap-1">
            {getStatusIcon(status)}
            {getStatusLabel(status)}
          </span>
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Totale preventivo</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Importo pagato</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
            <p className="text-xs text-muted-foreground">{percentagePaid.toFixed(0)}% completato</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Importo restante</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(remainingAmount)}</p>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        {nextPaymentDate && nextPaymentAmount ? (
          <div className="mt-4 bg-muted p-3 rounded-md">
            <div className="flex items-center">
              <div className="mr-3 bg-primary/20 p-2 rounded-full">
                <ArrowUpRight className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Prossimo pagamento:</p>
                <p className="text-lg font-bold">{formatCurrency(nextPaymentAmount)}</p>
                <p className="text-xs text-muted-foreground">Scadenza: {formatDate(nextPaymentDate)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 bg-muted p-3 rounded-md text-sm text-muted-foreground text-center">
            Nessun pagamento programmato
          </div>
        )}
        
        <div className="mt-4 text-xs text-muted-foreground">
          Ultimo aggiornamento: {format(new Date(), 'd MMMM yyyy, HH:mm', { locale: it })}
        </div>
      </CardContent>
    </Card>
  );
}