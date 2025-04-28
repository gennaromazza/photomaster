import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ContractClausesProps {
  quoteId: string | number;
  onClausesAccepted?: (accepted: boolean) => void;
  readOnly?: boolean;
}

/**
 * Componente per visualizzare le clausole contrattuali nel preventivo prima della firma
 */
export function ContractClauses({ quoteId, onClausesAccepted, readOnly = false }: ContractClausesProps) {
  const [acceptedClauses, setAcceptedClauses] = useState<Record<number, boolean>>({});
  
  // Recupera le clausole associate al preventivo
  const { data: quoteClauses, isLoading, isError } = useQuery({
    queryKey: ['/api/clauses/quote', quoteId],
    queryFn: async () => {
      console.log(`Recupero clausole per il preventivo ${quoteId}`);
      const res = await fetch(`/api/clauses/quote/${quoteId}`);
      if (!res.ok) {
        console.error(`Errore nel caricamento delle clausole: ${res.status}`);
        throw new Error('Errore nel caricamento delle clausole');
      }
      return res.json();
    }
  });

  // Verifica se tutte le clausole obbligatorie sono state accettate
  const allRequiredClausesAccepted = React.useMemo(() => {
    if (!quoteClauses) return false;
    
    return quoteClauses.every((quoteClause: any) => {
      // Se la clausola è già accettata o non è obbligatoria, è ok
      if (quoteClause.isAccepted || !quoteClause.clause?.isRequired) return true;
      // Altrimenti deve essere accettata dall'utente
      return !!acceptedClauses[quoteClause.clauseId];
    });
  }, [quoteClauses, acceptedClauses]);
  
  // Notifica al genitore quando lo stato di accettazione cambia
  React.useEffect(() => {
    if (onClausesAccepted) {
      onClausesAccepted(allRequiredClausesAccepted);
    }
  }, [allRequiredClausesAccepted, onClausesAccepted]);

  // Gestisce il cambio di stato di accettazione di una clausola
  const handleClauseAcceptChange = (clauseId: number, accepted: boolean) => {
    setAcceptedClauses(prev => ({
      ...prev,
      [clauseId]: accepted
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Errore</AlertTitle>
        <AlertDescription>
          Si è verificato un errore durante il caricamento delle clausole. Riprova più tardi.
        </AlertDescription>
      </Alert>
    );
  }

  if (!quoteClauses || quoteClauses.length === 0) {
    return (
      <div className="bg-gray-50 rounded-md p-4">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-gray-500" />
          <p className="text-sm text-gray-600">Nessuna clausola contrattuale associata a questo preventivo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-lg mb-3">Termini e Condizioni</h3>
        <p className="text-sm text-gray-600 mb-4">
          Le seguenti clausole contrattuali costituiscono parte integrante del preventivo.
          {!readOnly && " Le clausole contrassegnate come obbligatorie devono essere accettate per procedere con la firma."}
        </p>
      </div>

      <Accordion type="multiple" className="w-full space-y-2">
        {quoteClauses.map((quoteClause: any) => {
          const isRequired = quoteClause.clause?.isRequired;
          const isAccepted = readOnly ? quoteClause.isAccepted : (acceptedClauses[quoteClause.clauseId] || quoteClause.isAccepted);
          
          return (
            <Card key={quoteClause.id} className={isRequired ? "border-amber-200" : ""}>
              <AccordionItem value={`clause-${quoteClause.clauseId}`} className="border-b-0">
                <AccordionTrigger className="px-4 py-2 hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <span className="font-medium">{quoteClause.clause?.title}</span>
                    {isRequired && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        Obbligatoria
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="prose prose-sm max-w-none text-gray-600" 
                    dangerouslySetInnerHTML={{ __html: quoteClause.clause?.content }} />
                  
                  {!readOnly && (
                    <div className="mt-4 flex items-center space-x-2">
                      <Checkbox 
                        id={`accept-clause-${quoteClause.clauseId}`}
                        checked={isAccepted}
                        onCheckedChange={(checked) => handleClauseAcceptChange(quoteClause.clauseId, !!checked)}
                      />
                      <Label 
                        htmlFor={`accept-clause-${quoteClause.clauseId}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        Ho letto e accetto questa clausola
                      </Label>
                    </div>
                  )}

                  {readOnly && isAccepted && (
                    <div className="mt-4 text-sm text-green-600 flex items-center gap-1">
                      ✓ Clausola accettata
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Card>
          );
        })}
      </Accordion>
    </div>
  );
}

export default ContractClauses;