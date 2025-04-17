import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

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
      throw new Error('Impossibile ottenere il token CSRF');
    }
    
    const data = await response.json();
    csrfToken = data.csrfToken;
    
    if (!csrfToken) {
      throw new Error('Token CSRF non valido');
    }
    
    return csrfToken;
  } catch (error) {
    console.error('Errore durante il recupero del token CSRF:', error);
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Controlla se c'è un token JWT nel localStorage
  const token = localStorage.getItem("auth_token");
  
  // Prepara gli headers di base
  const headers: Record<string, string> = {};
  
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
      headers['X-CSRF-Token'] = csrfToken;
    } catch (error) {
      console.error('Errore nel recupero del token CSRF:', error);
      // Non blocchiamo la richiesta, il server respingerà se necessario
    }
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Manteniamo per compatibilità con sessioni
  });

  await throwIfResNotOk(res);
  return res;
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

    await throwIfResNotOk(res);
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
