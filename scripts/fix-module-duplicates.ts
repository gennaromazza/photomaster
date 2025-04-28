/**
 * Script per risolvere il problema dei moduli duplicati
 */
import { db } from '../server/db';
import { quoteModules } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function fixModuleDuplicates() {
  console.log('🛠️ Avvio correzione moduli duplicati...');
  
  try {
    // 1. Correggiamo i moduli duplicati nel preventivo ID 55
    console.log('\n🔍 Risoluzione duplicati nel preventivo ID 55...');
    
    // Ottieni tutti i moduli del preventivo 55
    const modulesQuote55 = await db.select()
      .from(quoteModules)
      .where(eq(quoteModules.quoteId, 55));
    
    console.log(`Trovati ${modulesQuote55.length} moduli nel preventivo ID 55`);
    
    // Verifica se ci sono nomi duplicati
    const nameCount = {};
    const duplicateNames = [];
    
    modulesQuote55.forEach(module => {
      nameCount[module.name] = (nameCount[module.name] || 0) + 1;
      if (nameCount[module.name] > 1) {
        duplicateNames.push(module.name);
      }
    });
    
    const uniqueDuplicateNames = [...new Set(duplicateNames)];
    
    if (uniqueDuplicateNames.length > 0) {
      console.log(`Trovati ${uniqueDuplicateNames.length} nomi duplicati: ${uniqueDuplicateNames.join(', ')}`);
      
      // Per ogni nome duplicato, rinomina tutti tranne il primo
      for (const name of uniqueDuplicateNames) {
        const modulesWithName = modulesQuote55.filter(m => m.name === name);
        console.log(`Nome "${name}" appare in ${modulesWithName.length} moduli`);
        
        // Manteniamo il primo modulo invariato, rinominiamo gli altri
        for (let i = 1; i < modulesWithName.length; i++) {
          const moduleToFix = modulesWithName[i];
          const newName = `${name}_${i}`;
          
          console.log(`Rinomina modulo ID ${moduleToFix.id} da "${name}" a "${newName}"...`);
          
          // Aggiorna il nome nel database
          await db.update(quoteModules)
            .set({ name: newName })
            .where(eq(quoteModules.id, moduleToFix.id));
          
          console.log(`✅ Modulo ID ${moduleToFix.id} rinominato con successo`);
        }
      }
      
      console.log('✅ Tutti i duplicati rinominati con successo');
    } else {
      console.log('✅ Nessun duplicato trovato (forse già corretto)');
    }
    
    // 2. Verifica finale
    console.log('\n🔍 Verifica finale dopo le correzioni...');
    
    const updatedModulesQuote55 = await db.select()
      .from(quoteModules)
      .where(eq(quoteModules.quoteId, 55));
    
    console.log('Moduli aggiornati:');
    updatedModulesQuote55.forEach(m => {
      console.log(`- ID: ${m.id}, Nome: "${m.name}", Tipo: ${m.type}`);
    });
    
    // Verifica se ci sono ancora duplicati
    const nameCountAfter = {};
    let duplicatesRemain = false;
    
    updatedModulesQuote55.forEach(module => {
      nameCountAfter[module.name] = (nameCountAfter[module.name] || 0) + 1;
      if (nameCountAfter[module.name] > 1) {
        duplicatesRemain = true;
      }
    });
    
    if (!duplicatesRemain) {
      console.log('✅ Tutti i duplicati sono stati risolti con successo!');
    } else {
      console.log('⚠️ Ci sono ancora alcuni duplicati dopo la correzione, potrebbe essere necessario un controllo manuale.');
    }
    
  } catch (err) {
    console.error('❌ Errore durante la correzione:', err);
  }
}

// Esporta la funzione per l'uso in altri script
export { fixModuleDuplicates };

// Se il file viene eseguito direttamente, esegui la funzione principale
// In ES modules, we can check if this is the main file by comparing import.meta.url
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  fixModuleDuplicates().then(() => {
    console.log('\n🎉 Processo di correzione completato!');
  }).catch(console.error);
}