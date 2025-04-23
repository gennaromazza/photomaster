import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ContractClause, CreateClauseData, ServiceCategory } from '@/components/clauses/types';
import { useToast } from './use-toast';

/**
 * Hook personalizzato per gestire le clausole contrattuali
 */
export function useClauses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query per recuperare le clausole
  const clausesQuery = useQuery<ContractClause[]>({
    queryKey: ['/api/clauses'],
    staleTime: 5 * 60 * 1000, // 5 minuti
  });

  // Query per recuperare le categorie di servizio
  const categoriesQuery = useQuery<ServiceCategory[]>({
    queryKey: ['/api/service-categories'],
    staleTime: 10 * 60 * 1000, // 10 minuti
  });

  // Query per recuperare i tipi di evento
  const eventTypesQuery = useQuery<string[]>({
    queryKey: ['/api/event-types'],
    staleTime: 30 * 60 * 1000, // 30 minuti
  });

  // Mutazione per creare una nuova clausola
  const createClauseMutation = useMutation({
    mutationFn: async (data: CreateClauseData) => {
      const response = await apiRequest('POST', '/api/clauses', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore durante la creazione della clausola');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalida la query delle clausole per ricaricare i dati
      queryClient.invalidateQueries({ queryKey: ['/api/clauses'] });
      toast({
        title: 'Clausola creata',
        description: 'La clausola è stata creata con successo.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutazione per aggiornare una clausola esistente
  const updateClauseMutation = useMutation({
    mutationFn: async (data: CreateClauseData & { id: number }) => {
      const { id, ...clauseData } = data;
      const response = await apiRequest('PUT', `/api/clauses/${id}`, clauseData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore durante l\'aggiornamento della clausola');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clauses'] });
      toast({
        title: 'Clausola aggiornata',
        description: 'La clausola è stata aggiornata con successo.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutazione per eliminare una clausola
  const deleteClauseMutation = useMutation({
    mutationFn: async (clauseId: number) => {
      const response = await apiRequest('DELETE', `/api/clauses/${clauseId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore durante l\'eliminazione della clausola');
      }
      return clauseId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clauses'] });
      toast({
        title: 'Clausola eliminata',
        description: 'La clausola è stata eliminata con successo.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    clausesQuery,
    categoriesQuery,
    eventTypesQuery,
    createClauseMutation,
    updateClauseMutation,
    deleteClauseMutation,
  };
}