
import { settings } from '@/config';

export interface QuoteCalculation {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

export function calculateQuoteTotals(items: { price: number; quantity: number }[]): QuoteCalculation {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = subtotal * (settings.defaultDiscount/100);
  const taxAmount = (subtotal - discountAmount) * (settings.taxRate/100);
  const total = subtotal - discountAmount + taxAmount;
  
  return { subtotal, discountAmount, taxAmount, total };
}
