import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { FinancialSummary } from './financial-summary-fixed';

interface FinancialSummaryWrapperProps {
  quoteId: number;
  quoteTotal?: number;
  totalAmount?: number; 
  readOnly?: boolean;
  clientName?: string;
  quoteStatus?: string;
}

/**
 * Componente wrapper che mostra un avviso quando il preventivo non è firmato
 * e include il componente FinancialSummary standard
 */
export function FinancialSummaryWrapper(props: FinancialSummaryWrapperProps) {
  // Verifica se il preventivo è firmato
  const isQuoteSigned = (): boolean => {
    // Se siamo in modalità sola lettura (link pubblico), consideriamo il preventivo firmato
    if (props.readOnly) return true;
    
    // Altrimenti controlliamo lo status del preventivo
    return props.quoteStatus === 'confermato' || props.quoteStatus === 'approved';
  };

  return (
    <div className="space-y-4">
      {!props.readOnly && !isQuoteSigned() && (
        <Alert className="bg-amber-50 text-amber-800 border-amber-200 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Preventivo non firmato</AlertTitle>
          <AlertDescription>
            Questo preventivo non è ancora stato firmato dal cliente. I pagamenti e le rate programmate potranno essere gestiti solo dopo la firma.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Componente originale FinancialSummary */}
      <FinancialSummary {...props} />
    </div>
  );
}