/**
 * Utility per il calcolo dei totali di un preventivo e dei suoi moduli
 * Centralizza la logica di calcolo per garantire consistenza
 */

// Tipi semplificati per le funzioni di calcolo
interface ModuleItem {
  price: number;
  quantity: number;
}

interface SelectionOption {
  price: number;
  isSelected?: boolean;
}

interface ModuleSelection {
  options: SelectionOption[];
}

interface QuoteModule {
  type: 'fixed' | 'variable';
  items?: ModuleItem[];
  selections?: ModuleSelection[];
  subtotal?: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  total?: number;
}

interface Quote {
  modules?: QuoteModule[];
  subtotal?: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  total?: number;
}

/**
 * Calcola il subtotale di un modulo fisso
 * @param items - Array di elementi nel modulo
 * @returns Subtotale del modulo
 */
export function calculateFixedModuleSubtotal(items: ModuleItem[] = []): number {
  return items.reduce((sum, item) => {
    return sum + (item.price * (item.quantity || 1));
  }, 0);
}

/**
 * Calcola il totale di un modulo fisso dopo l'applicazione di eventuali sconti
 * @param subtotal - Subtotale del modulo
 * @param discount - Valore dello sconto
 * @param discountType - Tipo di sconto (percentuale o importo)
 * @returns Totale del modulo scontato
 */
export function calculateModuleTotal(
  subtotal: number,
  discount?: number,
  discountType?: 'percentage' | 'amount'
): number {
  if (!discount || discount <= 0) return subtotal;
  
  let total = subtotal;
  
  if (discountType === 'percentage') {
    const discountAmount = (subtotal * discount) / 100;
    total = subtotal - discountAmount;
  } else if (discountType === 'amount') {
    total = subtotal - discount;
  }
  
  return Math.max(0, total); // Evita totali negativi
}

/**
 * Calcola il subtotale di un modulo variabile
 * Nota: per i moduli variabili, il subtotale comprende solo opzioni selezionate
 * @param selections - Array di selezioni nel modulo
 * @returns Subtotale del modulo
 */
export function calculateVariableModuleSubtotal(selections: ModuleSelection[] = []): number {
  return selections.reduce((sum, selection) => {
    // Considera solo le opzioni selezionate
    const selectedOptionsTotal = selection.options
      .filter(option => option.isSelected)
      .reduce((optionSum, option) => optionSum + option.price, 0);
    
    return sum + selectedOptionsTotal;
  }, 0);
}

/**
 * Calcola il totale di un preventivo basato sui suoi moduli
 * @param quote - Preventivo da calcolare
 * @returns Preventivo con totali aggiornati
 */
export function refreshQuoteTotals(quote: Quote): Quote {
  const modules = (quote.modules || []).map(module => {
    let moduleSubtotal = 0;
    
    // Calcola subtotale in base al tipo di modulo
    if (module.type === 'fixed' && module.items) {
      moduleSubtotal = calculateFixedModuleSubtotal(module.items);
    } else if (module.type === 'variable' && module.selections) {
      moduleSubtotal = calculateVariableModuleSubtotal(module.selections);
    }
    
    // Calcola il totale del modulo applicando eventuali sconti
    const moduleTotal = calculateModuleTotal(
      moduleSubtotal,
      module.discount,
      module.discountType
    );
    
    // Aggiorna e restituisci il modulo con i totali calcolati
    return {
      ...module,
      subtotal: moduleSubtotal,
      total: moduleTotal
    };
  });
  
  // Calcola il subtotale del preventivo sommando i totali dei moduli
  const quoteSubtotal = modules.reduce((sum, module) => sum + (module.total || 0), 0);
  
  // Applica lo sconto al preventivo
  const quoteTotal = calculateModuleTotal(
    quoteSubtotal,
    quote.discount,
    quote.discountType
  );
  
  // Restituisce il preventivo aggiornato
  return {
    ...quote,
    modules,
    subtotal: quoteSubtotal,
    total: quoteTotal
  };
}