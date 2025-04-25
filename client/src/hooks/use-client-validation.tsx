import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Tipo per la risposta della verifica di cliente esistente
interface CheckExistingClientResponse {
  exists: boolean;
  clients: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    [key: string]: any;
  }>;
  message: string;
}

// Tipo per la risposta della ricerca clienti
interface SearchClientsResponse {
  clients: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    [key: string]: any;
  }>;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function useClientValidation() {
  const { toast } = useToast();
  const [foundClients, setFoundClients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mutation per verificare se un cliente esiste già
  const checkExistingClientMutation = useMutation({
    mutationFn: async ({ email, phone }: { email?: string; phone?: string }) => {
      const res = await apiRequest("POST", "/api/client-validation/check-existing", { email, phone });
      return await res.json() as CheckExistingClientResponse;
    },
    onSuccess: (data) => {
      if (data.exists) {
        setFoundClients(data.clients);
        setIsModalOpen(true);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Errore nella verifica del cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Query per cercare clienti in base a una stringa di ricerca
  const searchClients = ({ query, page = 1, limit = 10 }: { query: string; page?: number; limit?: number }) => {
    return useQuery<SearchClientsResponse, Error>({
      queryKey: ["/api/client-validation/search", query, page, limit],
      queryFn: async () => {
        const searchParams = new URLSearchParams({
          query,
          page: page.toString(),
          limit: limit.toString()
        });
        
        const res = await apiRequest("GET", `/api/client-validation/search?${searchParams.toString()}`);
        return await res.json();
      },
      enabled: query.length > 2, // Abilita la query solo se la stringa di ricerca è più lunga di 2 caratteri
      staleTime: 1000 * 60 * 5, // Cache valida per 5 minuti
    });
  };

  // Funzione per verificare l'esistenza di un cliente
  const checkExistingClient = async (email?: string, phone?: string) => {
    if (!email && !phone) return false;
    
    try {
      const result = await checkExistingClientMutation.mutateAsync({ email, phone });
      return result.exists;
    } catch (error) {
      console.error("Errore nella verifica del cliente:", error);
      return false;
    }
  };

  // Funzione per selezionare un cliente esistente
  const selectExistingClient = (clientId: number) => {
    setIsModalOpen(false);
    return foundClients.find(client => client.id === clientId) || null;
  };

  // Funzione per chiudere il modale e continuare con un nuovo cliente
  const continueWithNewClient = () => {
    setIsModalOpen(false);
    setFoundClients([]);
  };

  return {
    checkExistingClient,
    searchClients,
    selectExistingClient,
    continueWithNewClient,
    foundClients,
    isModalOpen,
    setIsModalOpen,
    isChecking: checkExistingClientMutation.isPending
  };
}