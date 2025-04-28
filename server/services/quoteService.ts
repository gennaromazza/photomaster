
import { settings } from '@/config';

export interface QuoteCalculation {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

export function calculateQuoteTotals(items: { price: number; quantity: number }[]): QuoteCalculation {
  // Values are now handled directly in euros (decimal)
  const subtotal = Number(items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0).toFixed(2));
  const discountAmount = Number((subtotal * (settings.defaultDiscount/100)).toFixed(2));
  const taxAmount = Number(((subtotal - discountAmount) * (settings.taxRate/100)).toFixed(2));
  const total = Number((subtotal - discountAmount + taxAmount).toFixed(2));
  
  return { subtotal, discountAmount, taxAmount, total };
}
