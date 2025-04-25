import { db, pgClient } from "../server/db";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Script per standardizzare tutti gli importi nel database
 * Questo script converte tutti gli importi che sono stati moltiplicati per 10 o 100
 * in un formato standard: valore in Euro senza moltiplicatori
 */
async function standardizePrices() {
  console.log("Iniziando la standardizzazione degli importi...");
  
  try {
    // 1. Normalizzazione dei service_bundles (dividi per 100)
    console.log("\n===== STANDARDIZZAZIONE SERVICE_BUNDLES =====");
    const bundles = await db.query.serviceBundles.findMany();
    
    for (const bundle of bundles) {
      const originalTotalPrice = bundle.totalPrice;
      const originalDiscountedPrice = bundle.discountedPrice;
      
      // Se il prezzo è maggiore di 10.000, probabilmente è stato moltiplicato per 100
      if (originalTotalPrice && originalTotalPrice > 10000) {
        const normalizedTotalPrice = Math.round(originalTotalPrice / 100);
        const normalizedDiscountedPrice = originalDiscountedPrice 
          ? Math.round(originalDiscountedPrice / 100) 
          : null;
        
        await db.update(schema.serviceBundles)
          .set({
            totalPrice: normalizedTotalPrice,
            discountedPrice: normalizedDiscountedPrice,
          })
          .where(eq(schema.serviceBundles.id, bundle.id));
        
        console.log(`Bundle ID ${bundle.id} (${bundle.name}): Prezzo totale da ${originalTotalPrice}€ a ${normalizedTotalPrice}€`);
      } else {
        console.log(`Bundle ID ${bundle.id} (${bundle.name}): Prezzo già normalizzato (${originalTotalPrice}€)`);
      }
    }
    
    // 2. Normalizzazione dei quote_items (dividi per 10)
    console.log("\n===== STANDARDIZZAZIONE QUOTE_ITEMS =====");
    const quoteItems = await db.query.quoteItems.findMany();
    
    for (const item of quoteItems) {
      const originalUnitPrice = item.unitPrice;
      const originalTotal = item.total;
      const originalDiscountedPrice = item.discountedPrice;
      
      // Se il prezzo è maggiore di 1.000, probabilmente è stato moltiplicato per 10
      if (originalUnitPrice && originalUnitPrice > 1000) {
        const normalizedUnitPrice = Math.round(originalUnitPrice / 10);
        const normalizedTotal = originalTotal 
          ? Math.round(originalTotal / 10) 
          : null;
        const normalizedDiscountedPrice = originalDiscountedPrice 
          ? Math.round(originalDiscountedPrice / 10) 
          : null;
        
        await db.update(schema.quoteItems)
          .set({
            unitPrice: normalizedUnitPrice,
            total: normalizedTotal,
            discountedPrice: normalizedDiscountedPrice,
          })
          .where(eq(schema.quoteItems.id, item.id));
        
        console.log(`Quote Item ID ${item.id}: Prezzo unitario da ${originalUnitPrice}€ a ${normalizedUnitPrice}€`);
      } else {
        console.log(`Quote Item ID ${item.id}: Prezzo già normalizzato (${originalUnitPrice}€)`);
      }
    }
    
    // 3. Normalizzazione dei quote_module_items (dividi per 10)
    console.log("\n===== STANDARDIZZAZIONE QUOTE_MODULE_ITEMS =====");
    const quoteModuleItems = await db.query.quoteModuleItems.findMany();
    
    for (const item of quoteModuleItems) {
      const originalUnitPrice = item.unitPrice;
      const originalTotal = item.total;
      const originalDiscountedPrice = item.discountedPrice;
      
      // Se il prezzo è maggiore di 1.000, probabilmente è stato moltiplicato per 10
      if (originalUnitPrice && originalUnitPrice > 1000) {
        const normalizedUnitPrice = Math.round(originalUnitPrice / 10);
        const normalizedTotal = originalTotal 
          ? Math.round(originalTotal / 10) 
          : null;
        const normalizedDiscountedPrice = originalDiscountedPrice 
          ? Math.round(originalDiscountedPrice / 10) 
          : null;
        
        await db.update(schema.quoteModuleItems)
          .set({
            unitPrice: normalizedUnitPrice,
            total: normalizedTotal,
            discountedPrice: normalizedDiscountedPrice,
          })
          .where(eq(schema.quoteModuleItems.id, item.id));
        
        console.log(`Quote Module Item ID ${item.id}: Prezzo unitario da ${originalUnitPrice}€ a ${normalizedUnitPrice}€`);
      } else {
        console.log(`Quote Module Item ID ${item.id}: Prezzo già normalizzato (${originalUnitPrice}€)`);
      }
    }
    
    // 4. Normalizzazione dei quote_modules (dividi per 10)
    console.log("\n===== STANDARDIZZAZIONE QUOTE_MODULES =====");
    const quoteModules = await db.query.quoteModules.findMany();
    
    for (const module of quoteModules) {
      const originalSubtotal = module.subtotal;
      const originalTotal = module.total;
      
      // Se il prezzo è maggiore di 1.000, probabilmente è stato moltiplicato per 10
      if (originalSubtotal && originalSubtotal > 1000) {
        const normalizedSubtotal = Math.round(originalSubtotal / 10);
        const normalizedTotal = originalTotal 
          ? Math.round(originalTotal / 10) 
          : 0;
        
        await db.update(schema.quoteModules)
          .set({
            subtotal: normalizedSubtotal,
            total: normalizedTotal,
          })
          .where(eq(schema.quoteModules.id, module.id));
        
        console.log(`Quote Module ID ${module.id}: Subtotal da ${originalSubtotal}€ a ${normalizedSubtotal}€`);
      } else {
        console.log(`Quote Module ID ${module.id}: Prezzo già normalizzato (${originalSubtotal}€)`);
      }
    }

    console.log("\n✅ Standardizzazione degli importi completata con successo!");
    
    // Output riassuntivo
    console.log("\n===== RIEPILOGO IMPORTI STANDARDIZZATI =====");
    console.log("Pacchetti servizi (service_bundles): Divisi per 100");
    console.log("Elementi preventivo (quote_items): Divisi per 10");
    console.log("Elementi modulo preventivo (quote_module_items): Divisi per 10");
    console.log("Moduli preventivo (quote_modules): Divisi per 10");
    
  } catch (error) {
    console.error("❌ Errore durante la standardizzazione degli importi:", error);
  }
}

// Esegui lo script
standardizePrices().then(() => {
  console.log("Script terminato.");
  process.exit(0);
}).catch(err => {
  console.error("Errore fatale:", err);
  process.exit(1);
});