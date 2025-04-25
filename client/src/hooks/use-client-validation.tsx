import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  company?: string;
  [key: string]: any;
}

interface UseClientValidationResult {
  checkExistingClient: (email?: string, phone?: string) => Promise<boolean>;
  foundClients: Client[];
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  selectExistingClient: (clientId: number) => Client | undefined;
  continueWithNewClient: () => void;
  isChecking: boolean;
}

export function useClientValidation(): UseClientValidationResult {
  const [foundClients, setFoundClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const checkExistingClient = useCallback(async (email?: string, phone?: string): Promise<boolean> => {
    try {
      if (!email && !phone) {
        return false;
      }

      setIsChecking(true);

      const queryParams = new URLSearchParams();
      if (email) queryParams.append('email', email);
      if (phone) queryParams.append('phone', phone);

      const response = await apiRequest('GET', `/api/client-validation/check?${queryParams.toString()}`);
      const data = await response.json();

      setIsChecking(false);

      if (data.exists && data.clients && data.clients.length > 0) {
        setFoundClients(data.clients);
        setIsModalOpen(true);
        return true;
      }

      return false;
    } catch (error: any) {
      setIsChecking(false);
      toast({
        title: 'Errore durante la verifica del cliente',
        description: error.message || 'Si è verificato un errore durante la ricerca di clienti esistenti',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  const selectExistingClient = useCallback((clientId: number): Client | undefined => {
    const selectedClient = foundClients.find(client => client.id === clientId);
    setIsModalOpen(false);
    
    if (selectedClient) {
      toast({
        title: 'Cliente esistente selezionato',
        description: `Hai selezionato ${selectedClient.firstName} ${selectedClient.lastName}`,
      });
    }
    
    return selectedClient;
  }, [foundClients, toast]);

  const continueWithNewClient = useCallback(() => {
    setIsModalOpen(false);
    toast({
      title: 'Continua come nuovo cliente',
      description: 'Stai continuando come nuovo cliente',
    });
  }, [toast]);

  return {
    checkExistingClient,
    foundClients,
    isModalOpen,
    setIsModalOpen,
    selectExistingClient,
    continueWithNewClient,
    isChecking
  };
}