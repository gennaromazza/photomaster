/**
 * API Adapter per la migrazione da endpoint italiani a endpoint inglesi
 * Fornisce funzioni di utilità per adattare le chiamate API durante la fase di migrazione
 */

import { queryClient } from "@/lib/queryClient";

export type QueryFn = (context: { signal?: AbortSignal }) => Promise<any>;

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
const ENDPOINT_MAPPINGS: Record<string, string> = {
  // Mappatura collaboratori
  "/api/collaboratori": "/api/collaborators",
  "/api/collaboratori/dashboard": "/api/collaborators/dashboard",
  "/api/collaboratori/:id": "/api/collaborators/:id",
  "/api/collaboratori/:id/eventi": "/api/collaborators/:id/events",
  "/api/collaboratori/:id/pagamenti": "/api/collaborators/:id/payments",
  "/api/collaboratori/:id/montaggi": "/api/collaborators/:id/editing",
  
  // Mappatura eventi
  "/api/eventi": "/api/events",
  "/api/eventi/:id": "/api/events/:id",
  "/api/eventi/prossimi": "/api/events/upcoming",
  "/api/eventi/cliente/:clienteId": "/api/events/client/:clientId",
  "/api/eventi/:id/collaboratori": "/api/events/:id/collaborators",
  "/api/eventi/preventivo/:quoteId/collaboratori": "/api/events/quote/:quoteId/collaborators",
  "/api/eventi/:id/pagamenti": "/api/events/:id/payments",
  "/api/eventi/:id/montaggi": "/api/events/:id/editing",
  
  // Mappatura pagamenti
  "/api/pagamenti": "/api/payments",
  "/api/pagamenti/:id": "/api/payments/:id",
  "/api/pagamenti/eventi/:eventoId": "/api/payments/events/:eventId",
  "/api/pagamenti/collaboratori/:collaboratoreId": "/api/payments/collaborators/:collaboratorId",
  
  // Mappatura montaggi
  "/api/montaggi": "/api/editing",
  "/api/montaggi/:id": "/api/editing/:id",
  "/api/montaggi/eventi/:eventoId": "/api/editing/events/:eventId",
  "/api/montaggi/collaboratori/:collaboratoreId": "/api/editing/collaborators/:collaboratorId"
};

/**
 * Mappa i nomi dei campi italiani ai corrispondenti campi inglesi
 */
const FIELD_MAPPINGS_TO_ENGLISH: Record<string, string> = {
  // Campi comuni
  "id": "id",
  "nome": "name",
  "titolo": "title",
  "descrizione": "description",
  "data": "date",
  "dataFine": "endDate",
  "createdAt": "createdAt",
  "updatedAt": "updatedAt",
  "note": "notes",
  
  // Campi collaboratori
  "cognome": "lastName",
  "email": "email",
  "telefono": "phone",
  "indirizzo": "address",
  "citta": "city",
  "provincia": "province",
  "cap": "postalCode",
  "codiceFiscale": "taxCode",
  "partitaIva": "vatNumber",
  "iban": "iban",
  "tipoCollaboratore": "type",
  
  // Campi eventi
  "luogo": "location",
  "clienteId": "clientId",
  "secondoClienteId": "secondClientId",
  "tipoEvento": "type",
  "statoEvento": "status",
  "pubblico": "isPublic",
  "idEsterno": "externalId",
  "googleCalendarId": "googleCalendarId",
  "googleCalendarLink": "googleCalendarLink",
  "sincronizzaConGoogle": "syncWithGoogle",
  
  // Campi assegnazione collaboratori
  "collaboratoreId": "collaboratorId",
  "eventoId": "eventId",
  "ruolo": "role",
  "dataAssegnazione": "assignedAt",
  
  // Campi pagamenti
  "importo": "amount",
  "dataPagamento": "paymentDate",
  "metodoPagamento": "paymentMethod",
  "tipoPagamento": "type",
  "riferimentoEsterno": "externalReference",
  
  // Campi montaggi
  "tipoMontaggio": "editingType",
  "accontoImporto": "depositAmount",
  "accontoPagato": "depositPaid",
  "accontoDataPagamento": "depositPaymentDate",
  "saldoImporto": "balanceAmount",
  "saldoPagato": "balancePaid",
  "saldoDataPagamento": "balancePaymentDate",
  "dataPrimoContatto": "firstContactDate",
  "priorita": "priority",
  "dataConsegnaPrevista": "expectedDeliveryDate",
  "dataConsegnaEffettiva": "actualDeliveryDate",
  "statoMontaggio": "status"
};

/**
 * Mappa i nomi dei campi inglesi ai corrispondenti campi italiani
 */
const FIELD_MAPPINGS_TO_ITALIAN: Record<string, string> = Object.entries(FIELD_MAPPINGS_TO_ENGLISH)
  .reduce((acc, [italian, english]) => {
    acc[english] = italian;
    return acc;
  }, {} as Record<string, string>);

/**
 * Traduce un endpoint da italiano a inglese sostituendo i parametri contenuti nel percorso
 * @param endpoint Endpoint italiano originale (es. '/api/collaboratori/1/eventi')
 * @returns Endpoint inglese tradotto (es. '/api/collaborators/1/events')
 */
export function translateEndpoint(endpoint: string): string {
  // Prima controlla se abbiamo una corrispondenza esatta
  if (ENDPOINT_MAPPINGS[endpoint]) {
    return ENDPOINT_MAPPINGS[endpoint];
  }

  // Altrimenti, prova a sostituire i parametri specifici
  for (const [italianPattern, englishPattern] of Object.entries(ENDPOINT_MAPPINGS)) {
    // Converti i pattern in espressioni regolari, sostituendo :param con ([^/]+)
    const regexPattern = italianPattern.replace(/:\w+/g, '([^/]+)');
    const regex = new RegExp(`^${regexPattern}$`);
    
    const match = endpoint.match(regex);
    if (match) {
      // Estrai i parametri dal match
      const params = match.slice(1);
      
      // Sostituisci i parametri nel pattern inglese
      let translatedEndpoint = englishPattern;
      let paramIndex = 0;
      
      translatedEndpoint = translatedEndpoint.replace(/:\w+/g, () => {
        return params[paramIndex++];
      });
      
      return translatedEndpoint;
    }
  }
  
  // Se non troviamo una corrispondenza, restituisci l'endpoint originale
  return endpoint;
}

/**
 * Traduce i nomi dei campi da italiano a inglese in un oggetto
 * @param data Oggetto con nomi di campi in italiano
 * @returns Oggetto con nomi di campi tradotti in inglese
 */
export function translateFieldsToEnglish(data: Record<string, any>): Record<string, any> {
  if (!data) return data;
  
  return Object.entries(data).reduce((acc, [key, value]) => {
    const translatedKey = FIELD_MAPPINGS_TO_ENGLISH[key] || key;
    
    // Se il valore è un oggetto (non null e non Array), traduci ricorsivamente
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      acc[translatedKey] = translateFieldsToEnglish(value);
    } 
    // Se il valore è un array di oggetti, traduci ogni oggetto
    else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      acc[translatedKey] = value.map(item => 
        typeof item === 'object' ? translateFieldsToEnglish(item) : item
      );
    } 
    // Altrimenti, usa il valore così com'è
    else {
      acc[translatedKey] = value;
    }
    
    return acc;
  }, {} as Record<string, any>);
}

/**
 * Traduce i nomi dei campi da inglese a italiano in un oggetto
 * @param data Oggetto con nomi di campi in inglese
 * @returns Oggetto con nomi di campi tradotti in italiano
 */
export function translateFieldsToItalian(data: Record<string, any>): Record<string, any> {
  if (!data) return data;
  
  return Object.entries(data).reduce((acc, [key, value]) => {
    const translatedKey = FIELD_MAPPINGS_TO_ITALIAN[key] || key;
    
    // Se il valore è un oggetto (non null e non Array), traduci ricorsivamente
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      acc[translatedKey] = translateFieldsToItalian(value);
    } 
    // Se il valore è un array di oggetti, traduci ogni oggetto
    else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      acc[translatedKey] = value.map(item => 
        typeof item === 'object' ? translateFieldsToItalian(item) : item
      );
    } 
    // Altrimenti, usa il valore così com'è
    else {
      acc[translatedKey] = value;
    }
    
    return acc;
  }, {} as Record<string, any>);
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
  method: string,
  endpoint: string,
  data?: any,
  options: ApiAdapterOptions = DEFAULT_OPTIONS
): Promise<Response> {
  const finalEndpoint = options.useTranslatedEndpoints 
    ? translateEndpoint(endpoint) 
    : endpoint;
  
  const finalData = options.mapKeys && data 
    ? translateFieldsToEnglish(data) 
    : data;
  
  // Usa la fetch API standard
  return fetch(finalEndpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: finalData ? JSON.stringify(finalData) : undefined,
  });
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
  const finalEndpoint = options.useTranslatedEndpoints 
    ? translateEndpoint(endpoint) 
    : endpoint;
  
  return async ({ signal } = {}) => {
    const response = await fetch(finalEndpoint, { signal });
    if (!response.ok) {
      throw new Error(`Errore API: ${response.statusText}`);
    }
    const data = await response.json();
    
    // Se mapKeys è true, traduci le chiavi nella risposta da inglese a italiano
    return options.mapKeys ? translateFieldsToItalian(data) : data;
  };
}

/**
 * Invalidates both Italian and English versions of a query
 * @param queryKey Chiave di query in italiano
 */
export function invalidateBothQueries(queryKey: string | string[]): void {
  const queryKeyStr = Array.isArray(queryKey) ? queryKey[0] : queryKey;
  
  // Converti eventuale array in stringa di path
  const originalKey = Array.isArray(queryKey) 
    ? queryKey 
    : [queryKey];
  
  // Traduci endpoint in inglese
  const translatedEndpoint = translateEndpoint(queryKeyStr);
  
  // Crea chiave tradotta sostituendo il primo elemento dell'array
  const translatedKey = Array.isArray(queryKey) 
    ? [translatedEndpoint, ...queryKey.slice(1)] 
    : [translatedEndpoint];
  
  // Invalida entrambe le versioni
  queryClient.invalidateQueries({ queryKey: originalKey });
  queryClient.invalidateQueries({ queryKey: translatedKey });
}