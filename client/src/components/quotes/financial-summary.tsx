import React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Euro, PlusCircle, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface FinancialSummaryProps {
  quoteId: number;
  totalAmount?: number;
  onAddPaymentClick?: () => void;
}

export function FinancialSummary({ quoteId, totalAmount, onAddPaymentClick }: FinancialSummaryProps) {
  // Carica i dati finanziari per questo preventivo
  const { data: financialData, isLoading } = useQuery({
    queryKey: [`/api/finance/quotes/${quoteId}`],
    queryFn: async () => {
      const res = await fetch(`/api/finance/quotes/${quoteId}`);
      if (!res.ok) {
        throw new Error("Errore nel caricamento dei dati finanziari");
      }
      return res.json();
    },
    enabled: !!quoteId,
  });

  // Carica i pagamenti programmati
  const { data: scheduledPayments, isLoading: isLoadingScheduled } = useQuery({
    queryKey: [`/api/finance/quotes/${quoteId}/scheduled`],
    queryFn: async () => {
      const res = await fetch(`/api/finance/quotes/${quoteId}/scheduled`);
      if (!res.ok) {
        throw new Error("Errore nel caricamento dei pagamenti programmati");
      }
      return res.json();
    },
    enabled: !!quoteId,
  });

  // Calcola il totale pagato e il saldo rimanente
  const totalPaid = financialData?.totalPaid || 0;
  const quoteTotal = totalAmount || financialData?.quoteTotal || 0;
  const remainingBalance = quoteTotal - totalPaid;
  const paymentPercentage = quoteTotal > 0 ? Math.round((totalPaid / quoteTotal) * 100) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case 'pending':
        return "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20";
      case 'overdue':
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center">
          <Euro className="h-5 w-5 mr-2 text-primary/80" />
          Riepilogo Finanziario
        </CardTitle>
        <CardDescription>
          Stato pagamenti e importi per questo preventivo
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
          </div>
        ) : (
          <>
            {/* Barra di avanzamento pagamento */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Avanzamento pagamento</span>
                <span className="font-medium">{paymentPercentage}%</span>
              </div>
              <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-in-out" 
                  style={{ width: `${paymentPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className="text-muted-foreground">€ {totalPaid.toFixed(2)}</span>
                <span className="text-muted-foreground">€ {quoteTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Totale preventivo</p>
                <p className="text-xl font-semibold">€ {quoteTotal.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Saldo rimanente</p>
                <p className="text-xl font-semibold">€ {remainingBalance.toFixed(2)}</p>
              </div>
            </div>

            {/* Ultimi pagamenti */}
            {financialData?.recentPayments && financialData.recentPayments.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Ultimi pagamenti</h4>
                  <div className="space-y-2">
                    {financialData.recentPayments.map((payment: any) => (
                      <div key={payment.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-primary/5">
                        <div className="flex items-center gap-2">
                          <Euro className="h-4 w-4 text-primary/70" />
                          <span>{payment.description || "Pagamento"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">€ {payment.amount.toFixed(2)}</span>
                          <Badge variant="secondary" className="text-xs">
                            {format(new Date(payment.date), "dd MMM yyyy", { locale: it })}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Pagamenti programmati */}
            {!isLoadingScheduled && scheduledPayments && scheduledPayments.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Pagamenti programmati</h4>
                  <div className="space-y-2">
                    {scheduledPayments.map((payment: any) => (
                      <div key={payment.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-primary/5">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="h-4 w-4 text-primary/70" />
                          <span>{payment.description || "Pagamento programmato"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">€ {payment.amount.toFixed(2)}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getStatusColor(payment.status)}`}>
                            {payment.status === 'paid' ? 'Pagato' : 
                             payment.status === 'pending' ? 'In attesa' : 
                             payment.status === 'overdue' ? 'Scaduto' : 'Sconosciuto'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {format(new Date(payment.dueDate), "dd MMM yyyy", { locale: it })}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>

      <CardFooter className="pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={onAddPaymentClick}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Aggiungi pagamento
        </Button>
      </CardFooter>
    </Card>
  );
}