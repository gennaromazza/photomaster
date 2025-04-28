
import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { FinancialSummary } from './financial-summary-fixed';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface FinancialSummaryWrapperProps {
  quoteId: number;
  quoteTotal?: number;
  totalAmount?: number; 
  readOnly?: boolean;
  clientName?: string;
  quoteStatus?: string;
}

export function FinancialSummaryWrapper(props: FinancialSummaryWrapperProps) {
  // Utilizziamo un array per la chiave della query per una migliore invalidazione della cache
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/finance/quotes', props.quoteId],
    queryFn: () => apiRequest('GET', `/api/finance/quotes/${props.quoteId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Errore nel caricamento dei dati finanziari: ${res.status}`);
        }
        return res.json();
      }),
    enabled: !!props.quoteId,
    staleTime: 10000, // 10 secondi
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const isQuoteSigned = (): boolean => {
    if (props.readOnly) return true;
    return props.quoteStatus === 'confermato' || props.quoteStatus === 'approved';
  };

  // Logging per debugging
  if (error) {
    console.error('Errore nel caricamento dei dati finanziari:', error);
  }

  if (data) {
    console.log('Dati finanziari ricevuti:', data);
  }

  // Determina il totale corretto da passare al componente
  const determineTotalAmount = () => {
    // Prima verifica se abbiamo dati dalla query API
    if (data?.totalAmount) {
      return data.totalAmount;
    }
    
    // Altrimenti usa il totale dal sommario se disponibile
    if (data?.summary?.quoteTotal) {
      return data.summary.quoteTotal;
    }
    
    // Infine ricadi sui props passati
    return props.totalAmount || props.quoteTotal || 0;
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errore nel caricamento dei dati finanziari</AlertTitle>
          <AlertDescription>
            Si è verificato un errore nel caricamento delle informazioni finanziarie. Ricarica la pagina o contatta l'assistenza.
          </AlertDescription>
        </Alert>
      )}
      
      {!props.readOnly && !isQuoteSigned() && (
        <Alert className="bg-amber-50 text-amber-800 border-amber-200 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Preventivo non firmato</AlertTitle>
          <AlertDescription>
            Questo preventivo non è ancora stato firmato dal cliente. I pagamenti e le rate programmate potranno essere gestiti solo dopo la firma.
          </AlertDescription>
        </Alert>
      )}
      
      <FinancialSummary 
        {...props}
        quoteTotal={determineTotalAmount()}
        isLoading={isLoading}
      />
    </div>
  );
}
