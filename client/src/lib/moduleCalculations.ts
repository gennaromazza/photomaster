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