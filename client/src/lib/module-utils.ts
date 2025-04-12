/**
 * Utility per i moduli dei preventivi
 * Centralizza funzioni di calcolo e gestione elementi comuni
 */

import { formatCurrency } from "@/lib/utils";

/**
 * Calcola il totale di un elemento in base a prezzo unitario, quantità e sconto
 */
export function calculateItemTotal(
  unitPrice: number, 
  quantity: number, 
  hasDiscount: boolean = false,
  discountType: string | null = null,
  discountValue: number | null = null
): number {
  // Calcola il prezzo base
  let total = unitPrice * quantity;
  
  // Applica lo sconto se presente
  if (hasDiscount && discountValue && discountValue > 0) {
    if (discountType === 'percentage') {
      total = total - (total * discountValue / 100);
    } else {
      total = total - discountValue;
    }
  }
  
  return total;
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