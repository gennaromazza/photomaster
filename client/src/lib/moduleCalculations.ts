
import { QuoteModuleItemData } from "@/components/quotes/module-selector";

export function calculateItemTotals(item: QuoteModuleItemData): QuoteModuleItemData {
  const qty = Math.max(1, item.quantity || 1); // Garantisci quantità minima 1
  const unitPrice = Math.max(0, item.unitPrice || 0); // Garantisci prezzo non negativo
  
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
  if (!items || items.length === 0) {
    return {
      subtotal: 0,
      total: 0,
      hasDiscounts: false,
      itemCount: 0,
      discountedItemCount: 0,
      totalDiscount: 0,
      averageDiscount: 0,
      discountPercentage: 0
    };
  }

  const result = items.reduce((acc, item) => {
    const calculated = calculateItemTotals(item);
    const itemSubtotal = (calculated.unitPrice || 0) * (calculated.quantity || 1);
    const itemTotal = calculated.total || itemSubtotal;
    
    return {
      subtotal: acc.subtotal + itemSubtotal,
      total: acc.total + itemTotal,
      hasDiscounts: acc.hasDiscounts || calculated.hasDiscount,
      itemCount: acc.itemCount + 1,
      discountedItemCount: acc.discountedItemCount + (calculated.hasDiscount ? 1 : 0),
      totalDiscount: acc.totalDiscount + (itemSubtotal - itemTotal)
    };
  }, { 
    subtotal: 0, 
    total: 0, 
    hasDiscounts: false,
    itemCount: 0,
    discountedItemCount: 0,
    totalDiscount: 0
  });

  return {
    ...result,
    averageDiscount: result.discountedItemCount > 0 ? 
      (result.totalDiscount / result.discountedItemCount) : 0,
    discountPercentage: result.subtotal > 0 ? 
      ((result.subtotal - result.total) / result.subtotal * 100) : 0
  };
}

export function calculateDiscountAmount(price: number, discountType: 'percentage' | 'fixed', discountValue: number): number {
  if (!price || !discountValue) return 0;
  
  if (discountType === 'percentage') {
    return roundToTwoDecimals(price * (discountValue / 100));
  }
  return roundToTwoDecimals(Math.min(price, discountValue));
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
