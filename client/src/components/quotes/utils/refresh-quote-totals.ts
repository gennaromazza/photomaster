/**
 * Utility per il calcolo dei totali dei moduli e dei preventivi
 */

// Tipi
interface ModuleItem {
  id?: number;
  moduleId?: number;
  itemId: number;
  itemType: 'service' | 'product';
  name: string;
  description?: string;
  price: number;
  quantity: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  total?: number;
  note?: string;
}

interface SelectionOption {
  id?: string;
  selectionId?: string;
  itemId: number;
  itemType: 'service' | 'product';
  name: string;
  description?: string;
  price: number;
  isSelected?: boolean;
  isDefault?: boolean;
}

interface ModuleSelection {
  id?: string;
  moduleId?: number;
  name: string;
  description?: string;
  options: Array<SelectionOption>;
  minOptions?: number;
  maxOptions?: number;
  isRequired?: boolean;
}

interface QuoteModuleData {
  id?: number;
  quoteId: number;
  name: string;
  description?: string;
  type: 'fixed' | 'variable';
  position?: number;
  subtotal?: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  total?: number;
  items?: Array<ModuleItem>;
  selections?: Array<ModuleSelection>;
  minSelections?: number;
  maxSelections?: number;
  isRequired?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface Quote {
  id: number;
  title: string;
  clientId: number;
  secondClientId?: number;
  status: string;
  eventDate?: string | Date;
  eventType?: string;
  location?: string;
  isFullDay?: boolean;
  eventTime?: string;
  eventEndTime?: string;
  ceremonyLocation?: string;
  ceremonyTime?: string;
  notes?: string;
  subtotal?: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  total?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  modules?: QuoteModuleData[];
}

/**
 * Calcola il totale di un item considerando quantità e sconto
 * @param item - Item di cui calcolare il totale
 * @returns Totale dell'item
 */
export function calculateItemTotal(item: ModuleItem): number {
  const baseTotal = item.price * item.quantity;
  
  if (!item.discount || item.discount <= 0) {
    return baseTotal;
  }
  
  if (item.discountType === "percentage") {
    return baseTotal - (baseTotal * item.discount) / 100;
  } else {
    return Math.max(0, baseTotal - item.discount);
  }
}

/**
 * Calcola il subtotale di un modulo fisso (somma dei totali degli items)
 * @param module - Modulo da calcolare
 * @returns Subtotale del modulo
 */
export function calculateFixedModuleSubtotal(module: QuoteModuleData): number {
  if (!module.items || module.items.length === 0) {
    return 0;
  }
  
  return module.items.reduce((total, item) => {
    return total + (item.total || calculateItemTotal(item));
  }, 0);
}

/**
 * Calcola il subtotale di un modulo variabile (somma delle opzioni predefinite)
 * @param module - Modulo da calcolare
 * @returns Subtotale del modulo
 */
export function calculateVariableModuleSubtotal(module: QuoteModuleData): number {
  if (!module.selections || module.selections.length === 0) {
    return 0;
  }
  
  let subtotal = 0;
  
  module.selections.forEach(selection => {
    selection.options.forEach(option => {
      if (option.isDefault || option.isSelected) {
        subtotal += option.price;
      }
    });
  });
  
  return subtotal;
}

/**
 * Calcola il totale di un modulo considerando lo sconto applicato
 * @param module - Modulo da calcolare
 * @returns Totale del modulo dopo lo sconto
 */
export function calculateModuleTotal(module: QuoteModuleData): number {
  const subtotal = module.type === "fixed" 
    ? calculateFixedModuleSubtotal(module)
    : calculateVariableModuleSubtotal(module);
  
  if (!module.discount || module.discount <= 0) {
    return subtotal;
  }
  
  if (module.discountType === "percentage") {
    return subtotal - (subtotal * module.discount) / 100;
  } else {
    return Math.max(0, subtotal - module.discount);
  }
}

/**
 * Calcola il subtotale di un preventivo (somma dei totali dei moduli)
 * @param quote - Preventivo da calcolare
 * @returns Subtotale del preventivo
 */
export function calculateQuoteSubtotal(quote: Quote): number {
  if (!quote.modules || quote.modules.length === 0) {
    return 0;
  }
  
  return quote.modules.reduce((total, module) => {
    // Usa il total preesistente o ricalcola
    return total + (module.total !== undefined ? module.total : calculateModuleTotal(module));
  }, 0);
}

/**
 * Calcola il totale di un preventivo considerando lo sconto applicato
 * @param quote - Preventivo da calcolare
 * @returns Totale del preventivo dopo lo sconto
 */
export function calculateQuoteTotal(quote: Quote): number {
  const subtotal = calculateQuoteSubtotal(quote);
  
  if (!quote.discount || quote.discount <= 0) {
    return subtotal;
  }
  
  if (quote.discountType === "percentage") {
    return subtotal - (subtotal * quote.discount) / 100;
  } else {
    return Math.max(0, subtotal - quote.discount);
  }
}

/**
 * Aggiorna tutti i totali di un preventivo e dei suoi moduli
 * @param quote - Preventivo da aggiornare
 * @returns Preventivo con totali aggiornati
 */
export function refreshQuoteTotals(quote: Quote): Quote {
  if (!quote.modules || quote.modules.length === 0) {
    quote.subtotal = 0;
    quote.total = 0;
    return quote;
  }
  
  // Aggiorna i totali di ogni modulo
  const updatedModules = quote.modules.map(module => {
    if (module.type === "fixed" && module.items) {
      // Aggiorna i totali di ogni item
      module.items = module.items.map(item => ({
        ...item,
        total: calculateItemTotal(item),
      }));
      
      module.subtotal = calculateFixedModuleSubtotal(module);
    } else if (module.type === "variable" && module.selections) {
      module.subtotal = calculateVariableModuleSubtotal(module);
    }
    
    module.total = calculateModuleTotal(module);
    return module;
  });
  
  // Aggiorna il preventivo con i moduli aggiornati
  const updatedQuote = {
    ...quote,
    modules: updatedModules,
    subtotal: 0,
    total: 0,
  };
  
  // Calcola i totali del preventivo
  updatedQuote.subtotal = calculateQuoteSubtotal(updatedQuote);
  updatedQuote.total = calculateQuoteTotal(updatedQuote);
  
  return updatedQuote;
}