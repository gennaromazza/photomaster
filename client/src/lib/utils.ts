import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Utility per combinare classi Tailwind in modo sicuro
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatta un valore monetario in Euro
 * @param amount - Importo in centesimi
 * @returns Stringa formattata con simbolo dell'Euro
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount / 100);
}

/**
 * Formatta una data in formato italiano
 * @param date - Data da formattare
 * @param formatStr - Formato di output (default: 'dd/MM/yyyy')
 * @returns Stringa di data formattata
 */
export function formatDate(date: Date | string, formatStr: string = 'dd/MM/yyyy'): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr, { locale: it });
  } catch (error) {
    console.error('Errore formattazione data:', error);
    return '';
  }
}

/**
 * Formatta una data in formato lungo italiano
 * @param date - Data da formattare
 * @returns Stringa di data formattata in modo esteso
 */
export function formatDateLong(date: Date | string): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'd MMMM yyyy', { locale: it });
  } catch (error) {
    console.error('Errore formattazione data estesa:', error);
    return '';
  }
}

/**
 * Verifica se un valore è definito e non vuoto
 * @param value - Valore da verificare
 * @returns true se il valore è definito e non vuoto
 */
export function isDefined(value: any): boolean {
  return value !== undefined && value !== null && value !== '';
}

/**
 * Genera un ID univoco per elementi
 * @returns Stringa univoca
 */
export function generateUniqueId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Calcola il prezzo scontato in base al tipo di sconto
 * @param price - Prezzo originale
 * @param hasDiscount - Flag per indicare se c'è uno sconto
 * @param discountType - Tipo di sconto (percentuale o importo)
 * @param discountValue - Valore dello sconto
 * @returns Prezzo scontato
 */
export function calculateDiscountedPrice(
  price: number,
  hasDiscount: boolean,
  discountType: 'percentage' | 'amount',
  discountValue: number
): number {
  if (!hasDiscount || !discountValue) return price;
  
  if (discountType === 'percentage') {
    return price - (price * discountValue / 100);
  } else {
    return price - discountValue;
  }
}

/**
 * Utility per troncare un testo a una certa lunghezza
 * @param text - Testo da troncare
 * @param maxLength - Lunghezza massima
 * @returns Testo troncato con '...' se necessario
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Ottiene le iniziali da un nome
 * @param firstName - Nome
 * @param lastName - Cognome
 * @returns Iniziali (massimo 2 caratteri)
 */
export function getInitials(firstName?: string, lastName?: string): string {
  const firstInitial = firstName ? firstName.charAt(0) : '';
  const lastInitial = lastName ? lastName.charAt(0) : '';
  return `${firstInitial}${lastInitial}`.toUpperCase();
}

/**
 * Restituisce la variante del badge in base allo stato
 * @param status - Stato del preventivo/contratto
 * @returns Variante del badge (per styling UI)
 */
export function getStatusBadge(status?: string): "default" | "secondary" | "destructive" | "outline" | "blue" | "green" | "amber" | "red" {
  if (!status) return "default";
  
  const normalizedStatus = status.toLowerCase();
  
  if (normalizedStatus === "approvato" || normalizedStatus === "approved" || 
      normalizedStatus === "confermato" || normalizedStatus === "completed" ||
      normalizedStatus === "completato") {
    return "green";
  }
  
  if (normalizedStatus === "in attesa" || normalizedStatus === "pending" ||
      normalizedStatus === "in corso" || normalizedStatus === "in progress") {
    return "amber";
  }
  
  if (normalizedStatus === "rifiutato" || normalizedStatus === "rejected" ||
      normalizedStatus === "annullato" || normalizedStatus === "cancelled" ||
      normalizedStatus === "canceled") {
    return "destructive";
  }
  
  if (normalizedStatus === "bozza" || normalizedStatus === "draft") {
    return "outline";
  }
  
  return "default";
}

/**
 * Restituisce il testo leggibile di uno stato
 * @param status - Stato da tradurre
 * @returns Testo leggibile dello stato
 */
export function getStatusText(status?: string): string {
  if (!status) return "Sconosciuto";
  
  const normalizedStatus = status.toLowerCase();
  
  if (normalizedStatus === "draft" || normalizedStatus === "bozza") {
    return "Bozza";
  }
  
  if (normalizedStatus === "pending" || normalizedStatus === "in attesa") {
    return "In attesa";
  }
  
  if (normalizedStatus === "approved" || normalizedStatus === "confermato" || 
      normalizedStatus === "approvato") {
    return "Confermato";
  }
  
  if (normalizedStatus === "rejected" || normalizedStatus === "rifiutato") {
    return "Rifiutato";
  }
  
  if (normalizedStatus === "cancelled" || normalizedStatus === "canceled" || 
      normalizedStatus === "annullato") {
    return "Annullato";
  }
  
  if (normalizedStatus === "completed" || normalizedStatus === "completato") {
    return "Completato";
  }
  
  if (normalizedStatus === "in progress" || normalizedStatus === "in corso") {
    return "In corso";
  }
  
  // Se non c'è una traduzione specifica, restituisce il testo originale con la prima lettera maiuscola
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Restituisce un testo formattato per la visualizzazione dei giorni rimanenti
 * @param days - Numero di giorni
 * @returns Testo formattato
 */
export function getDaysLeftText(days: number): string {
  if (days < 0) {
    const absDays = Math.abs(days);
    return absDays === 1 ? "Scaduto da 1 giorno" : `Scaduto da ${absDays} giorni`;
  }
  
  if (days === 0) {
    return "Scade oggi";
  }
  
  return days === 1 ? "Scade domani" : `Scade tra ${days} giorni`;
}

/**
 * Estrae i parametri dalla query string dell'URL corrente
 * @returns Oggetto con i parametri della query string
 */
export function getQueryParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
}

/**
 * Formatta il nome e cognome di una persona in modo standardizzato
 * @param firstName - Nome della persona
 * @param lastName - Cognome della persona
 * @param companyName - Nome dell'azienda (opzionale)
 * @returns Nome completo formattato
 */
export function formatFullName(firstName?: string | null, lastName?: string | null, companyName?: string | null): string {
  // Se abbiamo un nome azienda, lo mettiamo come prefisso tra parentesi
  const company = companyName ? `[${companyName}] ` : '';
  
  if (!firstName && !lastName) return company || 'N/D';
  
  const first = firstName || '';
  const last = lastName || '';
  
  // Formatta il nome completo con cognome prima, iniziale maiuscola
  const formattedName = `${first} ${last}`.trim();
  
  return company + formattedName;
}

/**
 * Formatta il nome e cognome di un cliente, includendo opzionalmente i dati aziendali
 * @param client - Oggetto cliente con firstName, lastName e opzionalmente companyName
 * @returns Nome completo formattato
 */
export function formatClientName(client: { firstName?: string | null, lastName?: string | null, companyName?: string | null }): string {
  return formatFullName(
    client.firstName,
    client.lastName,
    client.companyName
  );
}

/**
 * Formatta un indirizzo completo combinando i vari campi disponibili
 * @param address - Indirizzo principale (via e numero)
 * @param city - Città
 * @param zipCode - Codice postale (CAP)
 * @param province - Provincia
 * @param state - Stato/nazione
 * @returns Indirizzo completo formattato
 */
export function formatAddress(
  address?: string | null, 
  city?: string | null, 
  zipCode?: string | null, 
  province?: string | null,
  state?: string | null
): string {
  // Se c'è già un indirizzo completo, lo usiamo
  if (address && !city && !zipCode && !province && !state) {
    return address;
  }
  
  const parts = [];
  
  // Aggiungi l'indirizzo principale (via e numero)
  if (address) {
    parts.push(address);
  }
  
  // Combina CAP, città e provincia in un'unica riga
  const locationParts = [];
  if (zipCode) locationParts.push(zipCode);
  if (city) locationParts.push(city);
  if (province) locationParts.push(province);
  
  if (locationParts.length > 0) {
    parts.push(locationParts.join(' '));
  }
  
  // Aggiungi lo stato/nazione se disponibile
  if (state) {
    parts.push(state);
  }
  
  return parts.join(', ');
}