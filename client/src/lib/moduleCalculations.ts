
import { QuoteModuleItemData } from "@/components/quotes/module-selector";

export function calculateItemTotals(item: QuoteModuleItemData): QuoteModuleItemData {
  const qty = item.quantity || 1;
  const unitPrice = item.unitPrice || 0;
  
  if (!item.hasDiscount) {
    const total = qty * unitPrice;
    return { 
      ...item, 
      total,
      discountedPrice: undefined,
      finalUnitPrice: unitPrice
    };
  } else {
    const discountType = item.discountType || 'percentage';
    const discountValue = item.discountValue || 0;
    
    if (discountType === 'percentage') {
      const discountedPrice = unitPrice * (1 - discountValue / 100);
      const total = qty * discountedPrice;
      return { 
        ...item, 
        discountedPrice,
        total,
        finalUnitPrice: discountedPrice
      };
    } else { // fixed
      const discountedPrice = Math.max(0, unitPrice - discountValue);
      const total = qty * discountedPrice;
      return { 
        ...item,
        discountedPrice,
        total,
        finalUnitPrice: discountedPrice
      };
    }
  }
}

export function calculateModuleTotals(items: QuoteModuleItemData[]) {
  return items.reduce((acc, item) => {
    const calculated = calculateItemTotals(item);
    return {
      subtotal: acc.subtotal + (calculated.unitPrice * calculated.quantity),
      total: acc.total + calculated.total,
      hasDiscounts: acc.hasDiscounts || calculated.hasDiscount
    };
  }, { subtotal: 0, total: 0, hasDiscounts: false });
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount / 100);
}
