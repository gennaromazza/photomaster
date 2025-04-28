
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
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['quoteFinancialData', props.quoteId], // Chiave più specifica per miglior gestione della cache
    queryFn: async () => {
      console.log(`Fetching financial data for quote ${props.quoteId}`);
      const res = await apiRequest('GET', `/api/finance/quotes/${props.quoteId}`);
      if (!res.ok) {
        throw new Error(`Errore nel caricamento dei dati finanziari: ${res.status}`);
      }
      const data = await res.json();
      console.log(`Received financial data for quote ${props.quoteId}:`, data);
      return data;
    },
    enabled: !!props.quoteId,
    staleTime: 5000, // 5 secondi
    retry: 3,
    refetchOnWindowFocus: true, // Aggiorniamo i dati quando la finestra è in focus
    refetchInterval: 30000, // Aggiorniamo ogni 30 secondi
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
    // Prima verifica se abbiamo un modulesTotal dalla query API (ha precedenza in quanto più preciso)
    if (data?.modulesTotal && data.modulesTotal > 0) {
      console.log(`Using data.modulesTotal: ${data.modulesTotal}`);
      return data.modulesTotal;
    }
    
    // Poi verifica se abbiamo totalAmount dalla query API
    if (data?.totalAmount) {
      console.log(`Using data.totalAmount: ${data.totalAmount}`);
      return data.totalAmount;
    }
    
    // Altrimenti usa il totale dal sommario se disponibile
    if (data?.summary?.quoteTotal) {
      console.log(`Using data.summary.quoteTotal: ${data.summary.quoteTotal}`);
      return data.summary.quoteTotal;
    }
    
    // Se disponibile, usa totalAmount dai props
    if (props.totalAmount !== undefined) {
      console.log(`Using props.totalAmount: ${props.totalAmount}`);
      return props.totalAmount;
    }
    
    // Se disponibile, usa quoteTotal dai props
    if (props.quoteTotal !== undefined) {
      console.log(`Using props.quoteTotal: ${props.quoteTotal}`);
      return props.quoteTotal;
    }
    
    // Se ancora non abbiamo un totale valido, cerca i dati dal preventivo
    // (Se sei in questa situazione, è possibile che ci sia un problema nell'API)
    console.warn('Non è stato possibile determinare il totale del preventivo, utilizzo 0 come fallback');
    console.warn('QuoteID:', props.quoteId);
    console.warn('Props disponibili:', props);
    console.warn('Dati API:', data);
    
    // Infine usa 0 come ultima risorsa
    return 0;
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
