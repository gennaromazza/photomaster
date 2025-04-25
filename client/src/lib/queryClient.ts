import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Sistema avanzato per la gestione del token CSRF con cache timeout
interface CsrfTokenCache {
  token: string | null;
  timestamp: number;
  pending: Promise<string> | null;
}

// Cache con timestamp
const csrfCache: CsrfTokenCache = {
  token: null,
  timestamp: 0,
  pending: null
};

// Tempo di validità del token in ms (30 minuti)
const CSRF_TOKEN_VALIDITY = 30 * 60 * 1000;

// Funzione per ottenere il token CSRF con migliore caching
export async function getCsrfToken(): Promise<string> {
  const now = Date.now();
  
  // Se un token è già in fase di recupero, attendiamo quella richiesta invece di farne una nuova
  if (csrfCache.pending) {
    return csrfCache.pending;
  }
  
  // Se abbiamo già un token valido, lo restituiamo
  if (csrfCache.token && (now - csrfCache.timestamp) < CSRF_TOKEN_VALIDITY) {
    return csrfCache.token;
  }
  
  // Altrimenti, avviamo una nuova richiesta e la memorizziamo come pending
  try {
    // Creazione della promise per la richiesta del token
    csrfCache.pending = (async () => {
      try {
        const response = await fetch('/api/csrf-token');
        
        if (!response.ok) {
          console.warn('Server non ha restituito un token CSRF valido, continuo senza token');
          return '';
        }
        
        const data = await response.json();
        const token = data.token || (data.csrfToken ? data.csrfToken : '');
        
        if (!token) {
          console.warn('Token CSRF non valido o mancante nella risposta');
          return '';
        }
        
        // Aggiorna la cache con il nuovo token
        csrfCache.token = token;
        csrfCache.timestamp = now;
        
        return token;
      } catch (error) {
        console.warn('Errore durante il recupero del token CSRF:', error);
        return '';
      } finally {
        // Resetta la promise pendente
        csrfCache.pending = null;
      }
    })();
    
    return await csrfCache.pending;
  } catch (error) {
    console.error('Errore non gestito durante il recupero del token CSRF:', error);
    csrfCache.pending = null;
    return '';
  }
}

// Funzione per invalidare il token CSRF (utile dopo logout o errori 403)
export function invalidateCsrfToken(): void {
  csrfCache.token = null;
  csrfCache.timestamp = 0;
  csrfCache.pending = null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options: {
    headers?: Record<string, string>,
    retryOnCsrf?: boolean
  } = { retryOnCsrf: true },
): Promise<Response> {
  const retryOnCsrf = options.retryOnCsrf !== false;
  // Controlla se c'è un token JWT nel localStorage
  const token = localStorage.getItem("auth_token");
  
  // Prepara gli headers di base
  const headers: Record<string, string> = {};

  // Aggiungi Content-Type se c'è un body e non è FormData
  if (data && !(data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  // Aggiungi il token all'header Authorization se presente
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // Otteniamo il token CSRF solo per richieste che modificano dati e solo una volta
  // Questo evita di fare due chiamate separate come nel codice originale
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    try {
      // Usa la funzione getCsrfToken che implementa la memorizzazione nella cache
      const token = await getCsrfToken();
      if (token) {
        headers['X-CSRF-Token'] = token;
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
      body: data 
        ? (data instanceof FormData ? data : JSON.stringify(data)) 
        : undefined,
      credentials: "include", // Manteniamo per compatibilità con sessioni
    });

    // Se riceviamo 403 e c'è un errore CSRF, proviamo a invalidare il token e ritentare
    if (res.status === 403 && retryOnCsrf) {
      const responseText = await res.text();
      if (responseText.includes('CSRF') || responseText.includes('csrf')) {
        // Invalidiamo il token CSRF e ritentiamo una volta
        invalidateCsrfToken();
        return apiRequest(method, url, data, { retryOnCsrf: false }); // Ritenta senza ulteriori retry
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
// Funzione per costruire URL in modo più efficiente e flessibile
function buildQueryUrl(queryKey: readonly unknown[]): string {
  // Se il primo elemento è già una stringa completa (URL), la usiamo direttamente
  const baseUrl = queryKey[0] as string;
  
  // Se abbiamo solo la base URL, la restituiamo
  if (queryKey.length === 1) {
    return baseUrl;
  }
  
  // Se il secondo elemento è undefined, null o false, lo ignoriamo
  if (queryKey.length > 1 && (queryKey[1] === undefined || queryKey[1] === null || queryKey[1] === false)) {
    return baseUrl;
  }
  
  // Se il secondo elemento è un oggetto, lo trattiamo come parametri di query
  if (queryKey.length > 1 && typeof queryKey[1] === 'object' && queryKey[1] !== null && !Array.isArray(queryKey[1])) {
    const queryParams = new URLSearchParams();
    const params = queryKey[1] as Record<string, any>;
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    
    const queryString = queryParams.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }
  
  // Altrimenti aggiungiamo il secondo elemento come parametro di percorso
  return `${baseUrl}/${queryKey[1]}`;
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    // Controlla se c'è un token JWT nel localStorage
    const token = localStorage.getItem("auth_token");
    
    // Prepara gli headers
    const headers: Record<string, string> = {
      // Aggiungiamo Accept per migliorare le prestazioni specificando il tipo di risposta atteso
      "Accept": "application/json"
    };
    
    // Aggiungi il token all'header Authorization se presente
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    // Costruisci l'URL in modo più flessibile
    const url = buildQueryUrl(queryKey);
    
    try {
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
    } catch (error) {
      // Migliore gestione degli errori di rete o timeout
      if (error instanceof Error) {
        // Se è un errore di DOMException con tipo AbortError, significa che la richiesta è stata annullata
        if ('name' in error && error.name === 'AbortError') {
          console.warn(`Richiesta annullata: ${url}`);
          throw new Error(`Richiesta annullata: ${url}`);
        }
        
        console.error(`Errore durante il recupero dei dati da ${url}:`, error);
        throw error;
      } else {
        throw new Error(`Errore non gestito durante il recupero dei dati da ${url}`);
      }
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Modifica dello staleTime per renderlo più flessibile
      // staleTime: Infinity, <- era troppo restrittivo, causava dati obsoleti
      staleTime: 5 * 60 * 1000, // 5 minuti - bilanciamento tra prestazioni e aggiornamento
      retry: 1, // Aggiungiamo un singolo retry per gestire errori temporanei di rete
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      // Aggiunta della persistenza nella cache per migliorare l'esperienza utente
      gcTime: 10 * 60 * 1000, // 10 minuti - mantiene i dati in cache più a lungo
    },
    mutations: {
      retry: 1, // Aggiungiamo un singolo retry anche per le mutations
      retryDelay: 1000, // Ritardo fisso per i retry delle mutations
    },
  },
});
