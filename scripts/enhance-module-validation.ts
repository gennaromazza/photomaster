/**
 * Script per migliorare la validazione dei moduli e prevenire i duplicati
 */
import * as fs from 'fs';
import * as path from 'path';

/**
 * Modifica il file routes.ts per aggiungere il controllo sui moduli duplicati
 */
async function enhanceModuleValidation() {
  console.log('🔧 Avvio miglioramento validazione moduli...');
  
  try {
    // Percorso del file delle route
    const routesFilePath = path.join(process.cwd(), 'server', 'routes.ts');
    
    // Leggi il contenuto del file
    let content = fs.readFileSync(routesFilePath, 'utf8');
    
    // Trova la parte della route POST per la creazione dei moduli
    const modulePostRoute = content.match(/apiRouter\.post\("\/quotes\/:quoteId\/modules", async \(req, res\) => \{([^}]+?\}\));/s);
    
    if (!modulePostRoute) {
      console.error('❌ Route per la creazione dei moduli non trovata nel file routes.ts');
      return false;
    }
    
    // Estrai il corpo della route
    const originalRouteBody = modulePostRoute[1];
    
    // Verifica se l'implementazione per prevenire i duplicati è già presente
    if (originalRouteBody.includes('verificare che non ci siano duplicati')) {
      console.log('✅ La validazione per prevenire i duplicati è già implementata');
      return true;
    }
    
    // Prepara il codice per verificare i duplicati
    const newValidationCode = `
      // Verifica che il preventivo esista
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ message: "Preventivo non trovato" });
      }

      // Valida i dati del modulo
      if (!req.body.name || !req.body.type) {
        return res.status(400).json({ 
          message: "Dati del modulo incompleti",
          details: "Nome e tipo sono richiesti"
        });
      }

      // Verifica che non ci siano duplicati nei nomi dei moduli
      const existingModules = await storage.getModulesByQuote(quoteId);
      const duplicateModule = existingModules.find(
        m => m.name.toLowerCase() === req.body.name.toLowerCase()
      );
      
      if (duplicateModule) {
        return res.status(400).json({
          message: "Nome modulo duplicato",
          details: \`Esiste già un modulo con il nome "\${req.body.name}" in questo preventivo\`
        });
      }`;
    
    // Sostituisci la parte di validazione originale con quella nuova
    const updatedRouteBody = originalRouteBody.replace(
      /\s+\/\/ Verifica che il preventivo esista[\s\S]+?}\);/,
      newValidationCode
    );
    
    // Aggiorna il contenuto del file
    const updatedContent = content.replace(modulePostRoute[0], `apiRouter.post("/quotes/:quoteId/modules", async (req, res) => {${updatedRouteBody});`);
    
    // Scrivi il contenuto aggiornato nel file
    fs.writeFileSync(routesFilePath, updatedContent, 'utf8');
    
    console.log('✅ Validazione aggiornata per prevenire moduli con nomi duplicati');
    
    // Aggiorniamo anche la route PUT per aggiornare i moduli
    const modulePutRoute = updatedContent.match(/apiRouter\.put\("\/quotes\/modules\/:id", async \(req, res\) => \{([^}]+?\}\));/s);
    
    if (!modulePutRoute) {
      console.log('⚠️ Route per l\'aggiornamento dei moduli non trovata, creazione validazione saltata');
    } else {
      // Estrai il corpo della route per l'aggiornamento
      const originalPutRouteBody = modulePutRoute[1];
      
      // Verifica se l'implementazione per prevenire i duplicati è già presente
      if (originalPutRouteBody.includes('verificare duplicati durante aggiornamento')) {
        console.log('✅ La validazione per l\'aggiornamento è già implementata');
      } else {
        // Prepara il codice per verificare i duplicati durante l'aggiornamento
        const newPutValidationCode = `
      // Ottieni il modulo corrente
      const existingModule = await storage.getQuoteModule(id);
      if (!existingModule) {
        return res.status(404).json({ message: "Modulo non trovato" });
      }
      
      // Verificare duplicati durante aggiornamento (solo se il nome è cambiato)
      if (req.body.name && req.body.name !== existingModule.name) {
        const otherModules = await storage.getModulesByQuote(existingModule.quoteId);
        const duplicateModule = otherModules.find(
          m => m.id !== id && m.name.toLowerCase() === req.body.name.toLowerCase()
        );
        
        if (duplicateModule) {
          return res.status(400).json({
            message: "Nome modulo duplicato",
            details: \`Esiste già un modulo con il nome "\${req.body.name}" in questo preventivo\`
          });
        }
      }`;
        
        // Sostituisci la parte di validazione originale con quella nuova
        const updatedPutRouteBody = originalPutRouteBody.replace(
          /\s+\/\/ Ottieni il modulo corrente[\s\S]+?}\);/,
          newPutValidationCode
        );
        
        // Aggiorna il contenuto del file
        const finalContent = updatedContent.replace(
          modulePutRoute[0], 
          `apiRouter.put("/quotes/modules/:id", async (req, res) => {${updatedPutRouteBody});`
        );
        
        // Scrivi il contenuto finale aggiornato nel file
        fs.writeFileSync(routesFilePath, finalContent, 'utf8');
        
        console.log('✅ Validazione aggiornata anche per le operazioni di aggiornamento moduli');
      }
    }
    
    return true;
  } catch (err) {
    console.error('❌ Errore durante l\'aggiornamento della validazione:', err);
    return false;
  }
}

// Esecuzione della funzione principale
enhanceModuleValidation().then(success => {
  if (success) {
    console.log('🎉 Miglioramento validazione moduli completato con successo!');
    console.log('👉 Ora è necessario riavviare il server per applicare le modifiche.');
  } else {
    console.error('❌ Il miglioramento della validazione dei moduli non è riuscito.');
  }
});