import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ContractClause, CreateClauseData, UpdateClauseData, QuoteClause, Category } from '@/components/clauses/types';
import { useToast } from './use-toast';

export function useClauses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateClausesQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/clauses'] });
  };

  // Ottiene tutte le clausole
  const clausesQuery = useQuery({
    queryKey: ['/api/clauses'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clauses');
      return response.json() as Promise<ContractClause[]>;
    },
  });

  // Ottiene una clausola specifica per ID
  const getClause = (id: number) => {
    return useQuery({
      queryKey: ['/api/clauses', id],
      queryFn: async () => {
        const response = await apiRequest('GET', `/api/clauses/${id}`);
        return response.json() as Promise<ContractClause>;
      },
      enabled: !!id,
    });
  };

  // Crea una nuova clausola
  const createClauseMutation = useMutation({
    mutationFn: async (data: CreateClauseData) => {
      const response = await apiRequest('POST', '/api/clauses', data);
      return response.json() as Promise<ContractClause>;
    },
    onSuccess: () => {
      toast({
        title: 'Clausola creata',
        description: 'La clausola è stata creata con successo',
      });
      invalidateClausesQueries();
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Impossibile creare la clausola: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Aggiorna una clausola esistente
  const updateClauseMutation = useMutation({
    mutationFn: async ({ id, ...data }: UpdateClauseData & { id: number }) => {
      const response = await apiRequest('PUT', `/api/clauses/${id}`, data);
      return response.json() as Promise<ContractClause>;
    },
    onSuccess: () => {
      toast({
        title: 'Clausola aggiornata',
        description: 'La clausola è stata aggiornata con successo',
      });
      invalidateClausesQueries();
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Impossibile aggiornare la clausola: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Elimina una clausola
  const deleteClauseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/clauses/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Clausola eliminata',
        description: 'La clausola è stata eliminata con successo',
      });
      invalidateClausesQueries();
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Impossibile eliminare la clausola: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Ottiene le categorie di servizi
  const categoriesQuery = useQuery({
    queryKey: ['/api/clauses/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clauses/categories');
      return response.json() as Promise<Category[]>;
    },
  });

  // Ottiene i tipi di evento disponibili
  const eventTypesQuery = useQuery({
    queryKey: ['/api/clauses/event-types'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clauses/event-types');
      return response.json() as Promise<string[]>;
    },
  });

  // Ottiene le clausole associate a un preventivo
  const getQuoteClauses = (quoteId: number) => {
    return useQuery({
      queryKey: ['/api/clauses/quote', quoteId],
      queryFn: async () => {
        const response = await apiRequest('GET', `/api/clauses/quote/${quoteId}`);
        return response.json() as Promise<QuoteClause[]>;
      },
      enabled: !!quoteId,
    });
  };

  // Ottiene le clausole disponibili per un preventivo
  const getAvailableClauses = (quoteId: number) => {
    return useQuery({
      queryKey: ['/api/clauses/quote', quoteId, 'available'],
      queryFn: async () => {
        const response = await apiRequest('GET', `/api/clauses/quote/${quoteId}/available`);
        return response.json() as Promise<ContractClause[]>;
      },
      enabled: !!quoteId,
    });
  };

  // Associa clausole a un preventivo
  const associateClausesMutation = useMutation({
    mutationFn: async ({
      quoteId,
      clauseIds,
    }: {
      quoteId: number;
      clauseIds: number[];
    }) => {
      const response = await apiRequest('POST', `/api/clauses/quote/${quoteId}/associate`, {
        clauseIds,
      });
      return response.json();
    },
    onSuccess: (_data, variables) => {
      toast({
        title: 'Clausole associate',
        description: 'Le clausole sono state associate al preventivo con successo',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clauses/quote', variables.quoteId] });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Impossibile associare le clausole: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Accetta le clausole di un preventivo
  const acceptClausesMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const response = await apiRequest('POST', `/api/clauses/quote/${quoteId}/accept`);
      return response.json();
    },
    onSuccess: (_data, variables) => {
      toast({
        title: 'Clausole accettate',
        description: 'Le clausole del preventivo sono state accettate con successo',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clauses/quote', variables] });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes', variables] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Impossibile accettare le clausole: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    clausesQuery,
    getClause,
    createClauseMutation,
    updateClauseMutation,
    deleteClauseMutation,
    categoriesQuery,
    eventTypesQuery,
    getQuoteClauses,
    getAvailableClauses,
    associateClausesMutation,
    acceptClausesMutation,
  };
}