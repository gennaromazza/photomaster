/**
 * Utility per i moduli dei preventivi
 * Centralizza funzioni di calcolo e gestione elementi comuni
 */

import { formatCurrency } from "@/lib/utils";

interface ItemTotalResult {
  total: number;
  discountedPrice: number | undefined;
}

/**
 * Calcola il totale di un elemento in base a prezzo unitario, quantità e sconto
 * @param item Oggetto contenente i dati dell'elemento o parametri individuali
 * @returns Oggetto con il prezzo totale e il prezzo scontato unitario
 */
export function calculateItemTotal(item: any): ItemTotalResult {
  // Se l'oggetto non è definito, ritorna valori di default
  if (!item) {
    return { total: 0, discountedPrice: undefined };
  }
  
  // Estrai i valori dall'oggetto item
  const unitPrice = Number(item.unitPrice) || 0;
  const quantity = Number(item.quantity) || 1;
  const hasDiscount = Boolean(item.hasDiscount);
  const discountType = item.discountType || 'percentage';
  const discountValue = Number(item.discountValue) || 0;
  
  let discountedUnitPrice: number | undefined = undefined;
  let total = unitPrice * quantity;
  
  // Applica lo sconto se presente
  if (hasDiscount && discountValue > 0) {
    if (discountType === 'percentage') {
      discountedUnitPrice = unitPrice * (1 - (discountValue / 100));
      total = quantity * discountedUnitPrice;
    } else { // sconto fisso
      discountedUnitPrice = Math.max(0, unitPrice - discountValue);
      total = quantity * discountedUnitPrice;
    }
  }
  
  return { 
    total: total, 
    discountedPrice: discountedUnitPrice 
  };
}

/**
 * Calcola il totale di un modulo in base ai suoi elementi
 */
export function calculateModuleTotal(items: any[]): number {
  if (!items || !items.length) return 0;
  
  return items.reduce((sum, item) => {
    if (!item) return sum;
    return sum + (Number(item.total) || 0);
  }, 0);
}

/**
 * Formatta una stringa di sconto in base al tipo e valore
 */
export function formatDiscount(discountType: string, discountValue: number): string {
  if (discountType === 'percentage') {
    return `${discountValue}%`;
  } else {
    return formatCurrency(discountValue);
  }
}

/**
 * Estrae il nome e la descrizione di un elemento in base al tipo
 */
export function getItemNameAndDescription(item: any): { name: string, description: string | null } {
  const name = item.serviceName || item.productName || item.bundleName || "Elemento";
  const description = item.serviceDescription || item.productDescription || item.bundleDescription || null;
  
  return { name, description };
}

/**
 * Ottiene il percorso dell'immagine di un elemento in base al tipo
 */
export function getItemImagePath(item: any): string | null {
  return item.serviceImagePath || item.productImagePath || item.bundleImagePath || null;
}

/**
 * Utilità per gestire il caricamento fallito delle immagini
 */
export interface ImageLoadState {
  hasError: boolean;
  isLoading: boolean;
}

/**
 * Resetta i campi dell'elemento quando si cambia il tipo di selezione
 */
export function resetItemFields(item: any, keepCommonFields: boolean = true): any {
  const commonFields = keepCommonFields ? 
    {
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      hasDiscount: item.hasDiscount || false,
      discountType: item.discountType || 'percentage',
      discountValue: item.discountValue || 0,
      isRequired: item.isRequired || false,
      position: item.position || 0,
      notes: item.notes || '',
    } : 
    {
      quantity: 1,
      unitPrice: 0,
      hasDiscount: false,
      discountType: 'percentage',
      discountValue: 0,
      isRequired: false,
      position: 0,
      notes: '',
    };
  
  return {
    ...item,
    ...commonFields,
    serviceId: null,
    productId: null,
    bundleId: null,
    // Rimuovi i campi specifici
    serviceName: undefined,
    serviceDescription: undefined,
    serviceImagePath: undefined,
    productName: undefined,
    productDescription: undefined,
    productImagePath: undefined,
    bundleName: undefined,
    bundleDescription: undefined,
    bundleImagePath: undefined,
  };
}