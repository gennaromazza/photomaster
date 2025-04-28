
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

export async function addFixedModuleToQuote(quoteId: number, moduleData: any) {
  try {
    // Create the module first
    const [newModule] = await db.insert(quoteModules).values({
      quoteId,
      name: moduleData.name,
      description: moduleData.description,
      type: 'fixed',
      status: moduleData.status || 'active',
      subtotal: moduleData.subtotal || 0,
      total: moduleData.total || 0,
    }).returning();

    // Add module items
    if (moduleData.items && Array.isArray(moduleData.items)) {
      await Promise.all(moduleData.items.map(item => 
        db.insert(quoteModuleItems).values({
          moduleId: newModule.id,
          serviceId: item.serviceId,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.total,
          position: item.position,
          notes: item.notes,
          isRequired: item.isRequired || false,
          isSelected: item.isSelected || false,
        })
      ));
    }

    return newModule;
  } catch (error) {
    console.error('Error adding fixed module to quote:', error);
    throw error;
  }
}
