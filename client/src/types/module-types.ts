/**
 * Interfaccia per la struttura base di un modulo
 */
export interface QuoteModuleData {
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
  isVisible?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Interfaccia per un elemento (servizio o prodotto) all'interno di un modulo
 */
export interface ModuleItem {
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

/**
 * Interfaccia per una selezione all'interno di un modulo variabile
 */
export interface ModuleSelection {
  id?: string; // Uso string come ID univoco generato lato client
  moduleId?: number;
  name: string;
  description?: string;
  options: Array<SelectionOption>;
  minOptions?: number;
  maxOptions?: number;
  isRequired?: boolean;
}

/**
 * Interfaccia per un'opzione all'interno di una selezione
 */
export interface SelectionOption {
  id?: string; // Uso string come ID univoco generato lato client
  selectionId?: string;
  itemId: number;
  itemType: 'service' | 'product';
  name: string;
  description?: string;
  price: number;
  isSelected?: boolean;
  isDefault?: boolean;
}

/**
 * Tipo per il renderer di un modulo
 */
export type ModuleRenderer = 'fixed' | 'variable' | 'selection';