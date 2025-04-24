/**
 * API Adapter per la migrazione da endpoint italiani a endpoint inglesi
 * Fornisce funzioni di utilità per adattare le chiamate API durante la fase di migrazione
 */

import { apiRequest, QueryFn, queryClient } from '@/lib/queryClient';

type ApiAdapterOptions = {
  useTranslatedEndpoints?: boolean;
  mapKeys?: boolean;
};

const DEFAULT_OPTIONS: ApiAdapterOptions = {
  useTranslatedEndpoints: true,
  mapKeys: true
};

/**
 * Mappa gli endpoint italiani ai corrispondenti endpoint inglesi
 */
const ENDPOINT_MAPPING = {
  // Collaboratori
  '/api/collaboratori': '/api/collaborators',
  '/api/collaboratori/': '/api/collaborators/',
  '/api/collaboratori/{id}/eventi': '/api/collaborators/{id}/events',
  '/api/collaboratori/{id}/pagamenti': '/api/collaborators/{id}/payments',
  '/api/collaboratori/{id}/montaggi': '/api/collaborators/{id}/editing',
  '/api/collaboratori/{id}/dashboard': '/api/collaborators/{id}/dashboard',
  
  // Eventi
  '/api/eventi': '/api/events',
  '/api/eventi/': '/api/events/',
  '/api/eventi/senza-collaboratori': '/api/events/without-collaborators',
  
  // Pagamenti
  '/api/pagamenti': '/api/payments',
  '/api/pagamenti/': '/api/payments/',
};

/**
 * Mappa i nomi dei campi italiani ai corrispondenti campi inglesi
 */
const FIELD_MAPPING_IT_TO_EN = {
  // Collaboratori
  'collaboratoreId': 'collaboratorId',
  'eventoId': 'eventId',
  'ruolo': 'role',
  'dataAssegnazione': 'assignedAt',
  'note': 'notes',
  
  // Pagamenti
  'importo': 'amount',
  'tipo': 'type',
  'dataPagamento': 'paymentDate',
  'metodoPagamento': 'paymentMethod',
  'riferimentoEsterno': 'externalReference',
  
  // Montaggi
  'acconto': 'advance',
  'saldo': 'balance',
  'dataPrimoContatto': 'firstContactDate',
  'priorita': 'priority',
  'dataConsegnaPrevista': 'expectedDeliveryDate',
  'stato': 'status',
  
  // Eventi
  'titolo': 'title',
  'descrizione': 'description',
  'data': 'date',
  'luogo': 'location'
};

/**
 * Mappa i nomi dei campi inglesi ai corrispondenti campi italiani
 */
const FIELD_MAPPING_EN_TO_IT = Object.entries(FIELD_MAPPING_IT_TO_EN).reduce((acc, [it, en]) => {
  acc[en] = it;
  return acc;
}, {} as Record<string, string>);

/**
 * Traduce un endpoint da italiano a inglese sostituendo i parametri contenuti nel percorso
 * @param endpoint Endpoint italiano originale (es. '/api/collaboratori/1/eventi')
 * @returns Endpoint inglese tradotto (es. '/api/collaborators/1/events')
 */
export function translateEndpoint(endpoint: string): string {
  // Estrae l'ID dal percorso, se presente
  const matches = endpoint.match(/\/(\d+)(\/|$)/g);
  
  if (!matches) {
    // Cerca una corrispondenza diretta
    for (const [it, en] of Object.entries(ENDPOINT_MAPPING)) {
      if (endpoint.startsWith(it)) {
        return endpoint.replace(it, en);
      }
    }
    return endpoint;
  }
  
  // Sostituisce gli ID con un placeholder per trovare la corrispondenza
  let templateEndpoint = endpoint;
  const ids: string[] = [];
  
  matches.forEach(match => {
    const id = match.replace(/\//g, '');
    ids.push(id);
    templateEndpoint = templateEndpoint.replace(match, '/{id}/');
  });
  
  // Cerca la corrispondenza nel template
  let translatedEndpoint = templateEndpoint;
  for (const [it, en] of Object.entries(ENDPOINT_MAPPING)) {
    if (templateEndpoint.includes(it)) {
      translatedEndpoint = templateEndpoint.replace(it, en);
      break;
    }
  }
  
  // Ripristina gli ID nel percorso tradotto
  ids.forEach(id => {
    translatedEndpoint = translatedEndpoint.replace('{id}', id);
  });
  
  // Corregge eventuali doppie barre
  return translatedEndpoint.replace(/\/\//g, '/');
}

/**
 * Traduce i nomi dei campi da italiano a inglese in un oggetto
 * @param data Oggetto con nomi di campi in italiano
 * @returns Oggetto con nomi di campi tradotti in inglese
 */
export function translateFieldsToEnglish(data: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }
  
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const translatedKey = FIELD_MAPPING_IT_TO_EN[key] || key;
    
    // Traduce ricorsivamente i campi annidati
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[translatedKey] = translateFieldsToEnglish(value);
    } else if (Array.isArray(value)) {
      // Traduce ogni elemento dell'array se è un oggetto
      result[translatedKey] = value.map(item => 
        item && typeof item === 'object' ? translateFieldsToEnglish(item) : item
      );
    } else {
      result[translatedKey] = value;
    }
  }
  
  return result;
}

/**
 * Traduce i nomi dei campi da inglese a italiano in un oggetto
 * @param data Oggetto con nomi di campi in inglese
 * @returns Oggetto con nomi di campi tradotti in italiano
 */
export function translateFieldsToItalian(data: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }
  
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const translatedKey = FIELD_MAPPING_EN_TO_IT[key] || key;
    
    // Traduce ricorsivamente i campi annidati
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[translatedKey] = translateFieldsToItalian(value);
    } else if (Array.isArray(value)) {
      // Traduce ogni elemento dell'array se è un oggetto
      result[translatedKey] = value.map(item => 
        item && typeof item === 'object' ? translateFieldsToItalian(item) : item
      );
    } else {
      result[translatedKey] = value;
    }
  }
  
  return result;
}

/**
 * Funzione di adattamento per richieste API
 * Traduce l'endpoint e i nomi dei campi secondo le opzioni specificate
 * @param method Metodo HTTP (GET, POST, PATCH, DELETE)
 * @param endpoint Endpoint originale
 * @param data Dati da inviare (opzionale)
 * @param options Opzioni di adattamento
 * @returns Risposta dalla richiesta API
 */
export async function adaptedApiRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: any,
  options: ApiAdapterOptions = DEFAULT_OPTIONS
): Promise<Response> {
  const translatedEndpoint = options.useTranslatedEndpoints 
    ? translateEndpoint(endpoint) 
    : endpoint;
  
  const translatedData = options.mapKeys && data 
    ? translateFieldsToEnglish(data) 
    : data;
  
  return apiRequest(method, translatedEndpoint, translatedData);
}

/**
 * Funzione di adattamento per query in TanStack Query
 * Traduce l'endpoint secondo le opzioni specificate
 * @param endpoint Endpoint originale
 * @param options Opzioni di adattamento
 * @returns Funzione di query adattata
 */
export function adaptedQueryFn(
  endpoint: string,
  options: ApiAdapterOptions = DEFAULT_OPTIONS
): QueryFn {
  const translatedEndpoint = options.useTranslatedEndpoints 
    ? translateEndpoint(endpoint) 
    : endpoint;
  
  return async ({ signal }) => {
    const res = await fetch(translatedEndpoint, { signal });
    
    if (!res.ok) {
      throw new Error(`Errore ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    return options.mapKeys ? translateFieldsToItalian(data) : data;
  };
}

/**
 * Invalidates both Italian and English versions of a query
 * @param queryKey Chiave di query in italiano
 */
export function invalidateBothQueries(queryKey: string | string[]): void {
  const keyAsString = Array.isArray(queryKey) ? queryKey[0] : queryKey;
  const translatedKey = translateEndpoint(keyAsString);
  
  // Invalida la versione italiana
  queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
  
  // Invalida anche la versione inglese se diversa
  if (translatedKey !== keyAsString) {
    queryClient.invalidateQueries({ 
      queryKey: Array.isArray(queryKey) 
        ? [translatedKey, ...queryKey.slice(1)] 
        : [translatedKey] 
    });
  }
}