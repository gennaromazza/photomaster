
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
  const { data } = useQuery({
    queryKey: ['quoteStats', props.quoteId],
    queryFn: () => apiRequest('GET', `/api/finance/quotes/${props.quoteId}`).then(res => res.json()),
    enabled: !!props.quoteId
  });

  const isQuoteSigned = (): boolean => {
    if (props.readOnly) return true;
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
      
      <FinancialSummary 
        {...props}
        quoteTotal={data?.summary?.quoteTotal ?? props.quoteTotal}
      />
    </div>
  );
}
