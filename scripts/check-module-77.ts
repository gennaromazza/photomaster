/**
 * Script di verifica specifico per il modulo ID 77
 */
import { db } from '../server/db';
import { quoteModules } from '../shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import fs from 'fs';

const API_BASE_URL = 'http://localhost:5000/api';
const headers = {
  'Content-Type': 'application/json',
  'X-CSRF-Test': 'true'
};

async function checkModule77() {
  console.log('🔍 Avvio verifica specifica del modulo ID 77...');
  
  try {
    // Recupera il modulo dal database
    const [module77] = await db.select().from(quoteModules).where(eq(quoteModules.id, 77));
    
    if (!module77) {
      console.log('❌ Modulo ID 77 non trovato nel database.');
      return;
    }
    
    console.log('\n🔍 Dettagli modulo ID 77 dal database:');
    console.log(`  - ID: ${module77.id}`);
    console.log(`  - Nome: ${module77.name}`);
    console.log(`  - Tipo: ${module77.type}`);
    console.log(`  - QuoteId: ${module77.quoteId}`);
    
    // Verifica esistenza del preventivo associato
    console.log(`\n🔍 Verifica preventivo ID ${module77.quoteId}...`);
    
    try {
      const quoteResponse = await axios.get(`${API_BASE_URL}/quotes/${module77.quoteId}`, { headers });
      const quote = quoteResponse.data;
      console.log(`  - ✅ Preventivo trovato: "${quote.title}"`);
      
      // Verifica se il modulo è incluso nel preventivo restituito dall'API
      console.log('\n🔍 Verifica presenza del modulo nell\'API:');
      
      if (!quote.modules) {
        console.log('  - ❌ Il preventivo non ha alcun modulo associato.');
      } else {
        const moduleInQuote = quote.modules.find(m => m.id === 77);
        
        if (moduleInQuote) {
          console.log('  - ✅ Modulo trovato nel preventivo tramite API');
          console.log(`  - Nome API: ${moduleInQuote.name}`);
          console.log(`  - Tipo API: ${moduleInQuote.type}`);
        } else {
          console.log('  - ❌ Modulo NON trovato nel preventivo tramite API');
          
          // Analisi dettagliata del motivo della mancanza
          console.log('\n🔍 Analisi dettagliata:');
          console.log(`  - Numero totale di moduli nel preventivo: ${quote.modules.length}`);
          console.log('  - ID dei moduli presenti:');
          quote.modules.forEach(m => console.log(`    * ID: ${m.id}, Nome: ${m.name}`));
          
          // Controlla se ci sono duplicati nei moduli
          const moduleIds = quote.modules.map(m => m.id);
          const uniqueIds = new Set(moduleIds);
          
          if (moduleIds.length !== uniqueIds.size) {
            console.log('\n⚠️ Rilevati ID duplicati nei moduli!');
            
            // Trova i duplicati
            const counts = {};
            for (const id of moduleIds) {
              counts[id] = (counts[id] || 0) + 1;
            }
            
            for (const [id, count] of Object.entries(counts)) {
              if (count > 1) {
                console.log(`  - ID ${id} appare ${count} volte`);
              }
            }
          }
        }
      }
      
      // Verifica preventivo ID 55 (segnalato per avere duplicati)
      console.log('\n🔍 Verifica preventivo ID 55 (segnalato per duplicati)...');
      
      try {
        const quote55Response = await axios.get(`${API_BASE_URL}/quotes/55`, { headers });
        const quote55 = quote55Response.data;
        console.log(`  - ✅ Preventivo trovato: "${quote55.title}"`);
        
        if (!quote55.modules || quote55.modules.length === 0) {
          console.log('  - Preventivo senza moduli.');
        } else {
          console.log(`  - Numero di moduli: ${quote55.modules.length}`);
          
          // Verifica nomi duplicati
          const moduleNames = quote55.modules.map(m => m.name);
          const uniqueNames = new Set(moduleNames);
          
          if (moduleNames.length !== uniqueNames.size) {
            console.log('\n⚠️ Rilevati NOMI duplicati nei moduli!');
            
            // Conta le occorrenze dei nomi
            const nameCounts = {};
            for (const name of moduleNames) {
              nameCounts[name] = (nameCounts[name] || 0) + 1;
            }
            
            // Mostra i nomi duplicati
            for (const [name, count] of Object.entries(nameCounts)) {
              if (count > 1) {
                console.log(`  - Nome "${name}" appare ${count} volte`);
                
                // Trova i moduli con lo stesso nome
                const modulesWithDuplicateName = quote55.modules.filter(m => m.name === name);
                modulesWithDuplicateName.forEach(m => {
                  console.log(`    * ID: ${m.id}, Tipo: ${m.type}`);
                });
              }
            }
          } else {
            console.log('  - ✅ Nessun nome duplicato trovato nei moduli.');
          }
        }
      } catch (error) {
        console.error(`  - ❌ Errore nel recupero del preventivo ID 55: ${error.message}`);
      }
      
    } catch (error) {
      console.error(`  - ❌ Errore nel recupero del preventivo ID ${module77.quoteId}: ${error.message}`);
    }
    
    console.log('\n✅ Verifica completata!');
    
    // Salvataggio risultati in un file JSON
    const results = {
      timestamp: new Date().toISOString(),
      module77: {
        exists: !!module77,
        details: module77 || null
      }
    };
    
    fs.writeFileSync('module-77-results.json', JSON.stringify(results, null, 2));
    console.log('✅ Risultati salvati in module-77-results.json');
    
  } catch (err) {
    console.error('Errore durante la verifica:', err);
  }
}

checkModule77();