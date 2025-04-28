/**
 * Script di verifica della consistenza per il sistema di moduli fissi e variabili
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

/**
 * Recupera tutti i preventivi
 * @param limit - Numero massimo di preventivi da recuperare
 */
async function fetchAllQuotes(limit = 3) {
  try {
    const response = await axios.get(`${API_BASE_URL}/quotes`, { headers });
    const quotes = response.data;
    console.log(`Trovati ${quotes.length} preventivi, limitando a ${limit} per la diagnostica`);
    return quotes.slice(0, limit);
  } catch (error) {
    console.error('Errore nel recupero dei preventivi:', error.message);
    return [];
  }
}

/**
 * Recupera i dettagli di un preventivo specifico
 */
async function fetchQuoteDetails(quoteId: number) {
  try {
    const response = await axios.get(`${API_BASE_URL}/quotes/${quoteId}`, { headers });
    return response.data;
  } catch (error) {
    console.error(`Errore nel recupero dei dettagli del preventivo ${quoteId}:`, error.message);
    throw error;
  }
}

/**
 * Test 1: Verifica la consistenza dei dati dei moduli tra DB e API
 */
async function testModuleDataConsistency() {
  console.log('\n🔍 Test 1: Verifica consistenza dati moduli tra DB e API...');
  
  // 1.1 Recupera i moduli dal database
  const dbModules = await db.select().from(quoteModules);
  console.log(`Trovati ${dbModules.length} moduli nel database`);
  
  // 1.2 Recupera i moduli dall'API (tramite i preventivi)
  const quotes = await fetchAllQuotes();
  let apiModulesMap = new Map();
  let moduleCount = 0;
  
  // Collezioniamo tutti i moduli trovati nei preventivi tramite API
  for (const quote of quotes) {
    try {
      const quoteDetails = await fetchQuoteDetails(quote.id);
      if (quoteDetails.modules && quoteDetails.modules.length > 0) {
        moduleCount += quoteDetails.modules.length;
        quoteDetails.modules.forEach(module => {
          apiModulesMap.set(module.id, module);
        });
      }
    } catch (err) {
      console.error(`- Errore nel recupero dettagli preventivo ${quote.id}:`, err.message);
    }
  }
  
  console.log(`Trovati ${apiModulesMap.size} moduli unici tramite API (${moduleCount} totali nei preventivi)`);
  
  // 1.3 Confronta i moduli trovati
  const apiModules = Array.from(apiModulesMap.values());
  const dbModuleIds = new Set(dbModules.map(m => m.id));
  const apiModuleIds = new Set(apiModules.map(m => m.id));
  
  // Verifica specifica del modulo ID 77, segnalato come problematico in precedenza
  const module77 = dbModules.find(m => m.id === 77);
  if (module77) {
    console.log(`\n🔍 Analisi specifica modulo ID 77:`);
    console.log(`  - Nome: ${module77.name}`);
    console.log(`  - Tipo: ${module77.type}`);
    console.log(`  - QuoteId: ${module77.quoteId}`);
    
    // Verifica se il preventivo associato esiste
    try {
      console.log(`  - Verifica esistenza preventivo ID ${module77.quoteId}...`);
      const quoteResponse = await axios.get(`${API_BASE_URL}/quotes/${module77.quoteId}`, { headers });
      console.log(`  - Preventivo trovato: ${quoteResponse.data.title}`);
      
      // Verifica se il modulo è presente nel preventivo restituito dall'API
      const moduleInQuote = quoteResponse.data.modules?.find((m: any) => m.id === 77);
      if (moduleInQuote) {
        console.log(`  - ✅ Modulo trovato nel preventivo tramite API`);
      } else {
        console.log(`  - ❌ Modulo NON trovato nel preventivo tramite API`);
      }
    } catch (error) {
      console.error(`  - ❌ Errore nel recupero del preventivo ID ${module77.quoteId}: ${error.message}`);
    }
  } else {
    console.log(`\n🔍 Modulo ID 77 non presente nel database`);
  }
  
  // Moduli presenti nel DB ma non nell'API
  const missingInApi = dbModules.filter(m => !apiModuleIds.has(m.id));
  
  if (missingInApi.length > 0) {
    console.warn(`⚠️ Trovati ${missingInApi.length} moduli nel DB che non sono accessibili tramite API:`);
    missingInApi.forEach(m => console.warn(`   - ID: ${m.id}, Nome: ${m.name}, Tipo: ${m.type}, QuoteId: ${m.quoteId}`));
  } else {
    console.log('✅ Tutti i moduli del DB sono accessibili tramite API');
  }
  
  // Moduli presenti nell'API ma non nel DB (non dovrebbe mai accadere)
  const missingInDb = apiModules.filter(m => !dbModuleIds.has(m.id));
  
  if (missingInDb.length > 0) {
    console.error(`❌ Trovati ${missingInDb.length} moduli nell'API che non esistono nel DB (errore critico):`);
    missingInDb.forEach(m => console.error(`   - ID: ${m.id}, Nome: ${m.name}, Tipo: ${m.type}`));
  } else {
    console.log('✅ Tutti i moduli dell\'API esistono nel DB');
  }
  
  // 1.4 Verifica dei campi dei moduli
  let fieldMismatches = 0;
  
  for (const dbModule of dbModules) {
    const apiModule = apiModules.find(m => m.id === dbModule.id);
    if (apiModule) {
      // Compara i campi principali
      const discrepancies = [];
      
      if (dbModule.name !== apiModule.name) 
        discrepancies.push(`nome (DB: '${dbModule.name}', API: '${apiModule.name}')`);
      
      if (dbModule.type !== apiModule.type) 
        discrepancies.push(`tipo (DB: '${dbModule.type}', API: '${apiModule.type}')`);
      
      if (dbModule.quoteId !== apiModule.quoteId) 
        discrepancies.push(`quoteId (DB: ${dbModule.quoteId}, API: ${apiModule.quoteId})`);
      
      if (discrepancies.length > 0) {
        console.warn(`⚠️ Discrepanze nel modulo ID ${dbModule.id}:`);
        discrepancies.forEach(d => console.warn(`   - ${d}`));
        fieldMismatches++;
      }
    }
  }
  
  if (fieldMismatches === 0) {
    console.log('✅ Campi dei moduli consistenti tra DB e API');
  } else {
    console.warn(`⚠️ Trovate discrepanze nei campi di ${fieldMismatches} moduli`);
  }
  
  // Preparazione dei risultati per il salvataggio in JSON
  const results = {
    timestamp: new Date().toISOString(),
    stats: {
      modulesTotal: dbModules.length,
      modulesMissingInApi: missingInApi.length,
      modulesMissingInDb: missingInDb.length,
      modulesWithFieldDiscrepancies: fieldMismatches
    },
    missingInApi: missingInApi.map(m => ({
      id: m.id,
      name: m.name,
      type: m.type,
      quoteId: m.quoteId
    })),
    missingInDb: missingInDb.map(m => ({
      id: m.id,
      name: m.name,
      type: m.type,
      quoteId: m.quoteId
    }))
  };
  
  // Salvataggio risultati in un file JSON
  fs.writeFileSync('module-consistency-results.json', JSON.stringify(results, null, 2));
  console.log('✅ Risultati salvati in module-consistency-results.json');
  
  return results;
}

// Esecuzione del programma
async function main() {
  console.log('🔍 Avvio test di consistenza dati dei moduli fissi e variabili...');
  
  try {
    await testModuleDataConsistency();
    console.log('✅ Test completato con successo!');
  } catch (err) {
    console.error('Errore durante il test:', err);
    process.exit(1);
  }
}

main();