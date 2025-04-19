import { storage } from "../server/storage";

async function backfillTotals() {
  console.log("Inizio backfill dei totali...");
  const allQuotes = await storage.getAllQuotes();
  for (const q of allQuotes) {
    const quoteId = q.id;
    // Ricalcola con la logica già in getQuoteFinancialData
    const recalculated = await (async () => {
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      const modules = await storage.getModulesByQuote(quoteId);
      const itemsSum = quoteItems.reduce((s, it) => s + (it.unitPrice || it.total || 0) * (it.quantity||1), 0);
      const modulesSum = (
        await Promise.all(modules.map(m => storage.getQuoteModuleItemsByModule(m.id)))
      )
      .flat()
      .reduce((s, it) => s + (it.unitPrice || it.total || 0) * (it.selectedQuantity||1), 0);
      return itemsSum + modulesSum;
    })();
    await storage.updateQuote(quoteId, { total: recalculated });
    console.log(`Quote ${quoteId}: totale aggiornato a ${recalculated}`);
  }
  console.log("Backfill completato.");
}

backfillTotals()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1) });