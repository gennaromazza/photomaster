
export interface BaseQuoteItem {
  id?: number;
  quantity: number;
  unitPrice: number;
  hasDiscount: boolean;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountedPrice?: number;
  total: number;
  finalUnitPrice?: number;
  notes?: string;
}

export interface QuoteModuleItem extends BaseQuoteItem {
  moduleId?: number;
  serviceId?: number;
  bundleId?: number;
  isSelected?: boolean;
  selectionRequired?: boolean;
  isDefault?: boolean;
  selectionOrder?: number;
  minSelectCount?: number;
  serviceName?: string;
  serviceDescription?: string;
  bundleName?: string;
  bundleDescription?: string;
}

export interface ModuleTotals {
  subtotal: number;
  total: number;
  hasDiscounts: boolean;
}
