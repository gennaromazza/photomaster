/**
 * File di definizione dei tipi condivisi tra i moduli del preventivo
 */

// Interfacce base per servizi e prodotti
export interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  imagePath?: string;
  type: 'service' | 'product';
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  imagePath?: string;
  type: 'service' | 'product';
}

// Interfaccia per gli elementi del modulo
export interface ModuleItem {
  id?: number;
  moduleId?: number;
  serviceId?: number | null;
  bundleId?: number | null;
  productId?: number | null;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  notes?: string;
  hasDiscount: boolean;
  discountValue: number | null;
  discountType: 'percentage' | 'amount' | null;
  discountedPrice: number | null;
  total: number;
  position?: number;
}

// Interfaccia per le opzioni di selezione in un modulo variabile
export interface SelectionOption {
  id: string;
  selectionId: string;
  itemId: number;
  itemType: 'service' | 'product';
  name: string;
  description?: string;
  price: number;
  isDefault?: boolean;
  isRequired?: boolean;
  position?: number;
}

// Interfaccia per le selezioni in un modulo variabile
export interface ModuleSelection {
  id: string;
  moduleId?: number;
  name: string;
  description?: string;
  minOptions?: number;
  maxOptions?: number;
  isRequired?: boolean;
  options: SelectionOption[];
  position?: number;
}

// Interfaccia principale per un modulo di preventivo
export interface QuoteModule {
  id?: number;
  quoteId: number;
  name: string;
  description?: string;
  type: 'fixed' | 'variable';
  status?: 'draft' | 'active' | 'pending_selection' | 'completed';
  position?: number;
  subtotal?: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  total?: number;
  items?: ModuleItem[];
  selections?: ModuleSelection[];
  shareToken?: string;
  expiryDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Helper per lo stato di caricamento delle immagini
export interface ImageLoadState {
  [key: string]: boolean;
}