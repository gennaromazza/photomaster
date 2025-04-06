import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Utilizziamo un tipo per l'utente senza il campo password
type UserWithoutPassword = Omit<SelectUser, "password">;

// Tipo per la risposta del login con JWT
type LoginResponse = {
  user: UserWithoutPassword;
  token: string;
};

type AuthContextType = {
  user: UserWithoutPassword | null;
  token: string | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<LoginResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<UserWithoutPassword, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  fullName: string;
  email: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  // Legge il token dal localStorage durante l'inizializzazione
  const [token, setToken] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null
  );
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<UserWithoutPassword | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Verifica token all'avvio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem("auth_token");
      if (storedToken) {
        setToken(storedToken);
        // Verifica il token
        verifyToken(storedToken);
      }
    }
  }, []);
  
  // Funzione per verificare il token
  const verifyToken = async (tokenToVerify: string) => {
    try {
      const res = await apiRequest("POST", "/api/token/verify", { token: tokenToVerify });
      if (!res.ok) {
        // Se il token non è valido, rimuovilo
        localStorage.removeItem("auth_token");
        setToken(null);
        return;
      }
      
      const data = await res.json();
      // Aggiorna il token e l'utente
      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      queryClient.setQueryData(["/api/user"], data.user);
    } catch (error) {
      // In caso di errore, rimuovi il token
      localStorage.removeItem("auth_token");
      setToken(null);
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Errore durante il login");
      }
      return data as LoginResponse;
    },
    onSuccess: (data) => {
      // Salva il token nel localStorage
      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      
      // Aggiorna i dati dell'utente
      queryClient.setQueryData(["/api/user"], data.user);
      
      toast({
        title: "Login effettuato",
        description: "Benvenuto nel sistema",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login fallito",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", userData);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Errore durante la registrazione");
      }
      return data;
    },
    onSuccess: (data) => {
      // Se l'utente è stato registrato come attivo (admin),
      // imposta i dati dell'utente nella cache
      if (data.status === "active") {
        queryClient.setQueryData(["/api/user"], data);
        toast({
          title: "Registrazione completata",
          description: "Il tuo account è stato creato con successo",
        });
      } else {
        // Altrimenti, mostra un messaggio che indica che l'account
        // è in attesa di approvazione
        toast({
          title: "Registrazione completata",
          description: "Il tuo account è in attesa di approvazione da parte dell'amministratore",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registrazione fallita",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Non è più necessario chiamare /api/logout con JWT
      // ma lo facciamo per compatibilità
      try {
        await apiRequest("POST", "/api/logout");
      } catch (error) {
        // Ignora eventuali errori
      }
      
      // Rimuovi il token dal localStorage
      localStorage.removeItem("auth_token");
      setToken(null);
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logout effettuato",
        description: "Sei stato disconnesso dal sistema",
      });
    },
    onError: (error: Error) => {
      // Anche se il logout fallisce, rimuoviamo comunque il token
      localStorage.removeItem("auth_token");
      setToken(null);
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Logout fallito",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        token,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve essere utilizzato all'interno di un AuthProvider");
  }
  return context;
}