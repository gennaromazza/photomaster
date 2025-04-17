/**
 * Utility per calcoli relativi ai moduli dei preventivi
 */

/**
 * Arrotonda un numero a due decimali
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calcola il prezzo scontato
 */
export function calculateDiscountedPrice(price: number, discountType: 'percentage' | 'amount', discountValue: number): number {
  if (discountType === 'percentage') {
    return roundToTwoDecimals(price * (1 - discountValue / 100));
  } else {
    return roundToTwoDecimals(Math.max(0, price - discountValue));
  }
}

/**
 * Formatta il prezzo in valuta
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
}

/**
 * Calcola i totali di un singolo item (per retrocompatibilità con nome vecchio)
 */
export const calculateItemTotals = (item: any) => {
  const quantity = item.quantity || 1;
  const unitPrice = item.unitPrice || 0;
  const hasDiscount = item.hasDiscount || false;
  const discountType = item.discountType || 'percentage';
  const discountValue = item.discountValue || 0;
  
  const total = calculateItemTotal(
    unitPrice,
    quantity,
    hasDiscount,
    hasDiscount ? discountType : null,
    hasDiscount ? discountValue : null
  );
  
  return { total };
};

/**
 * Calcola il prezzo totale di un elemento
 */
export function calculateItemTotal(
  price: number, 
  quantity: number, 
  hasDiscount: boolean, 
  discountType: 'percentage' | 'amount' | null, 
  discountValue: number | null
): number {
  if (!hasDiscount || !discountType || !discountValue || discountValue <= 0) {
    return roundToTwoDecimals(price * quantity);
  }
  
  if (discountType === 'percentage') {
    const discountedPrice = price * (1 - discountValue / 100);
    return roundToTwoDecimals(discountedPrice * quantity);
  } else {
    const discountedPrice = Math.max(0, price - discountValue);
    return roundToTwoDecimals(discountedPrice * quantity);
  }
}

/**
 * Calcola il totale di tutti gli elementi (per retrocompatibilità con nome vecchio)
 */
export const calculateModuleTotals = (items: any[] = []): number => {
  if (!Array.isArray(items) || items.length === 0) return 0;
  
  return items.reduce((sum, item) => {
    const itemTotal = item.total || 0;
    return sum + itemTotal;
  }, 0);
};

/**
 * Calcola il totale del modulo (subtotale - sconto sul modulo)
 */
export function calculateModuleTotal(
  subtotal: number, 
  discount: number | undefined, 
  discountType: 'percentage' | 'amount' | undefined
): number {
  if (!discount || discount <= 0 || !discountType) return subtotal;
  
  if (discountType === 'percentage') {
    return roundToTwoDecimals(subtotal * (1 - discount / 100));
  } else {
    return roundToTwoDecimals(Math.max(0, subtotal - discount));
  }
}