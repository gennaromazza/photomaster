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
  loginWithGoogle: () => void;
  handleGoogleCallback: (token: string) => Promise<void>;
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

  // Funzione per decodificare il token JWT senza verificarlo
  const decodeToken = (token: string): { exp?: number } | null => {
    try {
      // Dividi il token in parti (header, payload, signature)
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      // Decodifica il payload (seconda parte)
      const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(payload);
    } catch (error) {
      console.error('Errore nella decodifica del token:', error);
      return null;
    }
  };
  
  // Funzione per verificare se il token sta per scadere (entro 30 minuti)
  const isTokenExpiringSoon = (token: string): boolean => {
    try {
      const decoded = decodeToken(token);
      if (!decoded || !decoded.exp) return true;
      
      // Calcola quando manca alla scadenza (in secondi)
      const now = Math.floor(Date.now() / 1000);
      const timeRemaining = decoded.exp - now;
      
      // Considera il token in scadenza se mancano meno di 30 minuti
      return timeRemaining < 30 * 60;
    } catch (error) {
      console.error('Errore nella verifica della scadenza del token:', error);
      return true;
    }
  };

  // Verifica token all'avvio e imposta refresh automatico
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem("auth_token");
      if (storedToken) {
        setToken(storedToken);
        // Verifica il token
        verifyToken(storedToken);
        
        // Imposta un intervallo per verificare e refreshare il token
        const tokenRefreshInterval = setInterval(() => {
          const currentToken = localStorage.getItem("auth_token");
          if (currentToken && isTokenExpiringSoon(currentToken)) {
            verifyToken(currentToken);
          }
        }, 5 * 60 * 1000); // Controlla ogni 5 minuti
        
        return () => clearInterval(tokenRefreshInterval);
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

  // Funzione per iniziare il flusso di autenticazione Google
  const loginWithGoogle = () => {
    // Reindirizza l'utente all'endpoint di autenticazione Google
    window.location.href = "/api/auth/google";
  };
  
  // Funzione per gestire il callback dopo l'autenticazione Google
  const handleGoogleCallback = async (tokenFromGoogle: string) => {
    try {
      // Salva il token nel localStorage
      localStorage.setItem("auth_token", tokenFromGoogle);
      setToken(tokenFromGoogle);
      
      // Verifica il token per ottenere i dati dell'utente
      await verifyToken(tokenFromGoogle);
      
      toast({
        title: "Login con Google effettuato",
        description: "Sei stato autenticato tramite Google",
      });
    } catch (error) {
      toast({
        title: "Login con Google fallito",
        description: "Si è verificato un errore durante l'autenticazione con Google",
        variant: "destructive",
      });
      
      // Rimuovi il token
      localStorage.removeItem("auth_token");
      setToken(null);
    }
  };

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
        loginWithGoogle,
        handleGoogleCallback,
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