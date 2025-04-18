import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Variabile per memorizzare il token CSRF
let csrfToken: string | null = null;

// Funzione per ottenere il token CSRF
export async function getCsrfToken(): Promise<string> {
  // Se abbiamo già un token, lo restituiamo
  if (csrfToken) {
    return csrfToken;
  }
  
  // Altrimenti, lo richiediamo all'API
  try {
    const response = await fetch('/api/csrf-token');
    
    if (!response.ok) {
      // Gestisci il caso in cui il server non risponde o restituisce un errore
      console.warn('Server non ha restituito un token CSRF, continuo senza token');
      return ''; // Restituiamo una stringa vuota invece di fallire
    }
    
    const data = await response.json();
    csrfToken = data.token; // L'API restituisce il token con chiave 'token'
    
    if (!csrfToken) {
      console.warn('Token CSRF non valido o mancante, continuo senza token');
      return ''; // Restituiamo una stringa vuota invece di fallire
    }
    
    return csrfToken;
  } catch (error) {
    console.warn('Errore durante il recupero del token CSRF, continuo senza token:', error);
    return ''; // Restituiamo una stringa vuota invece di fallire
  }
}

// Funzione per invalidare il token CSRF (utile dopo logout o errori 403)
export function invalidateCsrfToken(): void {
  csrfToken = null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  retryOnCsrf: boolean = true,
): Promise<Response> {
  // Controlla se c'è un token JWT nel localStorage
  const token = localStorage.getItem("auth_token");
  
  // Prepara gli headers di base
  const headers: Record<string, string> = {};

  // For non-GET requests, always get a fresh CSRF token
  if (method.toUpperCase() !== 'GET') {
    try {
      const csrfResponse = await fetch('/api/csrf-token');
      const { csrfToken } = await csrfResponse.json();
      headers['X-CSRF-Token'] = csrfToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  }
  
  // Aggiungi Content-Type se c'è un body
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Aggiungi il token all'header Authorization se presente
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // Ottieni e aggiungi il token CSRF per le richieste che modificano dati 
  // (ma non per GET e HEAD che non richiedono protezione CSRF)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    try {
      const csrfToken = await getCsrfToken();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    } catch (error) {
      console.warn('Errore nel recupero del token CSRF:', error);
      // Non blocchiamo la richiesta, il server respingerà se necessario
    }
  }
  
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include", // Manteniamo per compatibilità con sessioni
    });

    // Se riceviamo 403 e c'è un errore CSRF, proviamo a invalidare il token e ritentare
    if (res.status === 403 && retryOnCsrf) {
      const responseText = await res.text();
      if (responseText.includes('CSRF') || responseText.includes('csrf')) {
        // Invalidiamo il token CSRF e ritentiamo una volta
        invalidateCsrfToken();
        return apiRequest(method, url, data, false); // Ritenta senza ulteriori retry
      }
      throw new Error(`${res.status}: ${responseText}`);
    }

    if (!res.ok) {
      const errorMessage = await res.text();
      throw new Error(`${res.status}: ${errorMessage}`);
    }

    return res;
  } catch (error) {
    console.error(`Errore durante la richiesta ${method} a ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    // Controlla se c'è un token JWT nel localStorage
    const token = localStorage.getItem("auth_token");
    
    // Prepara gli headers
    const headers: Record<string, string> = {};
    
    // Aggiungi il token all'header Authorization se presente
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    // Costruisci l'URL completo in base alla queryKey
    let url = queryKey[0] as string;
    
    // Se c'è un secondo elemento nella queryKey, è l'id da aggiungere all'URL
    if (queryKey.length > 1 && queryKey[1] !== undefined) {
      url = `${url}/${queryKey[1]}`;
    }
    
    const res = await fetch(url, {
      headers,
      credentials: "include", // Manteniamo per compatibilità con sessioni
      signal, // Passa il segnale di abort
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    if (!res.ok) {
      const errorMessage = await res.text();
      throw new Error(`${res.status}: ${errorMessage}`);
    }
    
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
