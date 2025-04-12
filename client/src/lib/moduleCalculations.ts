
import { QuoteModuleItemData } from "@/components/quotes/module-selector";

export function calculateItemTotals(item: QuoteModuleItemData): QuoteModuleItemData {
  const qty = item.quantity || 1;
  const unitPrice = item.unitPrice || 0;
  if (!item.hasDiscount) {
    return { ...item, total: qty * unitPrice, discountedPrice: undefined };
  } else {
    const discountType = item.discountType || 'percentage';
    const discountValue = item.discountValue || 0;
    if (discountType === 'percentage') {
      const discountedPrice = unitPrice * (1 - discountValue / 100);
      return { ...item, discountedPrice, total: qty * discountedPrice };
    } else { // fixed
      const discountedPrice = Math.max(0, unitPrice - discountValue);
      return { ...item, discountedPrice, total: qty * discountedPrice };
    }
  }
}
