import { QuoteModuleData, ModuleSelection, SelectionOption } from "@/types/module-types";
import { v4 as uuidv4 } from "uuid";

/**
 * Tipo per lo stato di caricamento delle immagini
 */
export interface ImageLoadState {
  [key: string]: {
    hasError: boolean;
    loaded: boolean;
  };
}

/**
 * Ottiene il percorso dell'immagine per un elemento (servizio o prodotto)
 */
export function getItemImagePath(item: any): string | undefined {
  return item.serviceImagePath || item.productImagePath || item.bundleImagePath || undefined;
}

/**
 * Ottiene il nome e la descrizione di un elemento (servizio o prodotto)
 */
export function getItemNameAndDescription(item: any): { name: string; description: string | undefined } {
  const name = item.serviceName || item.productName || item.bundleName || "Servizio/Prodotto";
  const description = item.serviceDescription || item.productDescription || item.bundleDescription || undefined;
  
  return { name, description };
}

/**
 * Calcola il totale di un elemento in base al prezzo e alla quantità
 */
export function calculateItemTotal(item: any): number {
  const price = item.price || 0;
  const quantity = item.quantity || 1;
  return price * quantity;
}

/**
 * Calcola il totale di un modulo in base ai suoi elementi
 */
export function calculateModuleTotal(module: any): number {
  if (!module.items || !Array.isArray(module.items) || module.items.length === 0) {
    return 0;
  }
  
  let total = 0;
  
  // Somma i totali di tutti gli elementi
  module.items.forEach((item: any) => {
    total += calculateItemTotal(item);
  });
  
  // Applica lo sconto se presente
  if (module.discount && module.discount > 0) {
    if (module.discountType === 'percentage') {
      total = total - (total * module.discount / 100);
    } else {
      total = total - module.discount;
    }
  }
  
  // Assicura che il totale non sia negativo
  return Math.max(0, total);
}

/**
 * Utility per la gestione dei moduli
 */
export const ModuleUtils = {
  /**
   * Calcola il totale di un modulo fisso
   * @param module - Il modulo di cui calcolare il totale
   * @returns Il modulo con i totali aggiornati
   */
  calculateFixedModuleTotals(module: QuoteModuleData): QuoteModuleData {
    if (!module.items || module.items.length === 0) {
      return { ...module, subtotal: 0, total: 0 };
    }

    // Calcola il subtotale
    let subtotal = 0;
    const updatedItems = module.items.map(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      
      return {
        ...item,
        total: itemTotal
      };
    });

    // Applica lo sconto se presente
    let total = subtotal;
    if (module.discount && module.discount > 0) {
      if (module.discountType === 'percentage') {
        total = subtotal - (subtotal * module.discount / 100);
      } else {
        total = subtotal - module.discount;
      }
    }
    
    // Assicura che il totale non sia negativo
    total = Math.max(0, total);

    return {
      ...module,
      items: updatedItems,
      subtotal,
      total
    };
  },

  /**
   * Calcola i potenziali totali per un modulo variabile
   * Questo metodo fornisce solo una stima, poiché il totale effettivo
   * dipenderà dalle selezioni fatte dall'utente
   * @param module - Il modulo variabile
   * @returns Il modulo con una stima dei totali
   */
  calculateVariableModuleTotals(module: QuoteModuleData): QuoteModuleData {
    if (!module.selections || module.selections.length === 0) {
      return { ...module, subtotal: 0, total: 0 };
    }

    // Calcola il subtotale minimo (selezionando solo gli item obbligatori)
    let minSubtotal = 0;
    
    // Per ogni selezione, controlla se è obbligatoria
    module.selections.forEach(selection => {
      if (selection.isRequired && selection.minOptions && selection.minOptions > 0) {
        // Ordina le opzioni per prezzo crescente
        const sortedOptions = [...selection.options].sort((a, b) => a.price - b.price);
        
        // Prendi le opzioni più economiche fino al minimo richiesto
        for (let i = 0; i < Math.min(selection.minOptions, sortedOptions.length); i++) {
          minSubtotal += sortedOptions[i].price;
        }
      }
    });

    // Il valore del totale è uguale al subtotale in questo caso
    // Non applichiamo sconti in quanto è solo una stima
    return {
      ...module,
      subtotal: minSubtotal,
      total: minSubtotal
    };
  },

  /**
   * Genera un nuovo ID unico per un'opzione o una selezione
   * @returns Un ID univoco
   */
  generateUniqueId(): string {
    return uuidv4();
  },

  /**
   * Crea una copia di una selezione con un nuovo ID
   * @param selection - La selezione da clonare
   * @returns Una nuova selezione con ID univoco
   */
  cloneSelection(selection: ModuleSelection): ModuleSelection {
    const newSelectionId = this.generateUniqueId();
    
    // Clona le opzioni con nuovi ID
    const clonedOptions = selection.options.map(option => ({
      ...option,
      id: this.generateUniqueId(),
      selectionId: newSelectionId
    }));

    return {
      ...selection,
      id: newSelectionId,
      options: clonedOptions
    };
  },

  /**
   * Verifica se un modulo variabile è stato completato
   * (tutte le selezioni obbligatorie sono state fatte)
   * @param module - Il modulo da verificare
   * @returns true se il modulo è completo, false altrimenti
   */
  isVariableModuleComplete(module: QuoteModuleData): boolean {
    if (!module.selections) return true;
    
    // Controlla ogni selezione
    for (const selection of module.selections) {
      if (selection.isRequired) {
        // Conta quante opzioni sono state selezionate
        const selectedOptions = selection.options.filter(opt => opt.isSelected);
        
        // Se il numero di opzioni selezionate è inferiore al minimo richiesto
        if (selection.minOptions && selectedOptions.length < selection.minOptions) {
          return false;
        }
      }
    }
    
    // Controlla i requisiti a livello di modulo
    if (module.minSelections && module.minSelections > 0) {
      // Conta quante selezioni hanno almeno un'opzione selezionata
      const completedSelections = module.selections.filter(
        selection => selection.options.some(opt => opt.isSelected)
      );
      
      if (completedSelections.length < module.minSelections) {
        return false;
      }
    }
    
    return true;
  },

  /**
   * Formatta un prezzo in formato leggibile
   * @param price - Il prezzo in centesimi
   * @returns Il prezzo formattato
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price / 100);
  }
};