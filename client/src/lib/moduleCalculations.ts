
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
    const itemSubtotal = calculated.unitPrice * calculated.quantity;
    const itemTotal = calculated.total || itemSubtotal;
    
    return {
      subtotal: acc.subtotal + itemSubtotal,
      total: acc.total + itemTotal,
      hasDiscounts: acc.hasDiscounts || calculated.hasDiscount,
      itemCount: acc.itemCount + 1,
      discountedItemCount: acc.discountedItemCount + (calculated.hasDiscount ? 1 : 0)
    };
  }, { 
    subtotal: 0, 
    total: 0, 
    hasDiscounts: false,
    itemCount: 0,
    discountedItemCount: 0 
  });
}

export function calculateDiscountAmount(price: number, discountType: 'percentage' | 'fixed', discountValue: number): number {
  if (discountType === 'percentage') {
    return price * (discountValue / 100);
  }
  return Math.min(price, discountValue);
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount / 100);
}
