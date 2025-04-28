/**
 * Script di diagnostica per il sistema di moduli fissi e variabili
 * 
 * Questo script analizza le incongruenze tra frontend e backend nel sistema
 * di moduli fissi e variabili utilizzati nei preventivi.
 */

import { db } from '../server/db.ts';
import axios from 'axios';
import { 
  quotes, 
  quoteModules,
  quoteModuleItems,
  quoteItems,
  services,
  serviceBundles,
  serviceBundleItems
} from '../shared/schema.ts';
import { eq, sql } from 'drizzle-orm';

// Configurazione
const API_BASE_URL = 'http://localhost:5000/api';
const MOCK_AUTH_TOKEN = 'mock-auth-token'; // Token utilizzato in ambiente di sviluppo

// Headers per le richieste API
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${MOCK_AUTH_TOKEN}`,
  'X-CSRF-Token': 'testing-csrf-token'
};

/**
 * Funzione principale di diagnostica
 */
async function runDiagnostics() {
  console.log('🔍 Avvio diagnostica del sistema moduli...');
  
  try {
    // Test 1: Recupero e confronto dati moduli da DB e API
    await testModuleDataConsistency();
    
    // Test 2: Verifica relazioni tra moduli e preventivi
    await testModuleQuoteRelations();
    
    // Test 3: Verifica calcolo prezzi e sconti dei moduli
    await testModulePriceCalculations();
    
    // Test 4: Verifica consistenza tra moduli fissi e variabili
    await testFixedVariableModuleConsistency();
    
    console.log('\n✅ Diagnostica completata con successo!');
  } catch (error) {
    console.error('\n❌ Errore durante la diagnostica:', error);
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
  
  // Moduli presenti nel DB ma non nell'API
  const missingInApi = dbModules.filter(m => !apiModuleIds.has(m.id));
  if (missingInApi.length > 0) {
    console.warn(`⚠️ Trovati ${missingInApi.length} moduli nel DB che non sono accessibili tramite API:`);
    missingInApi.forEach(m => console.warn(`   - ID: ${m.id}, Nome: ${m.name}, Tipo: ${m.type}`));
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
        discrepancies.push(`nome (DB: "${dbModule.name}", API: "${apiModule.name}")`);
      
      if (dbModule.type !== apiModule.type) 
        discrepancies.push(`tipo (DB: "${dbModule.type}", API: "${apiModule.type}")`);
      
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
}

/**
 * Test 2: Verifica le relazioni tra moduli e preventivi
 */
async function testModuleQuoteRelations() {
  console.log('\n🔍 Test 2: Verifica relazioni tra moduli e preventivi...');
  
  // 2.1 Recupera tutti i preventivi e i moduli dal DB
  const dbQuotes = await db.select().from(quotes);
  const dbModules = await db.select().from(quoteModules);
  
  console.log(`Trovati ${dbQuotes.length} preventivi e ${dbModules.length} moduli nel DB`);
  
  // 2.2 Verifica integrità relazioni
  const quoteIdsWithModules = new Set(dbModules.map(m => m.quoteId));
  const quoteIds = new Set(dbQuotes.map(q => q.id));
  
  // Moduli che fanno riferimento a preventivi inesistenti
  const orphanModules = dbModules.filter(m => !quoteIds.has(m.quoteId));
  
  if (orphanModules.length > 0) {
    console.error(`❌ Trovati ${orphanModules.length} moduli orfani (riferimento a preventivi inesistenti):`);
    orphanModules.forEach(m => console.error(`   - Modulo ID: ${m.id}, si riferisce al preventivo ID: ${m.quoteId} (inesistente)`));
  } else {
    console.log('✅ Tutti i moduli si riferiscono a preventivi esistenti');
  }
  
  // 2.3 Verifica moduli duplicati per lo stesso preventivo
  const modulesByQuote = dbModules.reduce((acc, m) => {
    if (!acc[m.quoteId]) acc[m.quoteId] = [];
    acc[m.quoteId].push(m);
    return acc;
  }, {});
  
  let duplicateNameIssues = 0;
  Object.entries(modulesByQuote).forEach(([quoteId, modules]) => {
    // Cerca moduli con lo stesso nome all'interno dello stesso preventivo
    const names = modules.map(m => m.name);
    const uniqueNames = new Set(names);
    
    if (names.length !== uniqueNames.size) {
      console.warn(`⚠️ Preventivo ID ${quoteId} ha moduli con nomi duplicati:`);
      
      // Trova i nomi duplicati
      const nameCounts = names.reduce((acc, name) => {
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(nameCounts)
        .filter(([_, count]) => count > 1)
        .forEach(([name, count]) => {
          console.warn(`   - "${name}" appare ${count} volte`);
          duplicateNameIssues++;
        });
    }
  });
  
  if (duplicateNameIssues === 0) {
    console.log('✅ Nessun modulo con nome duplicato trovato negli stessi preventivi');
  }
  
  // 2.4 Verifica consistenza API per le relazioni
  for (const quoteId of quoteIdsWithModules) {
    try {
      // Verifica che il preventivo esista
      if (!quoteIds.has(quoteId)) {
        continue; // Già riportato sopra come modulo orfano
      }
      
      // Recupera i dettagli del preventivo dall'API
      const quoteDetails = await fetchQuoteDetails(quoteId);
      
      // Controlla che i moduli nel DB corrispondano a quelli nell'API
      const dbModulesForQuote = dbModules.filter(m => m.quoteId === quoteId);
      const apiModulesForQuote = quoteDetails.modules || [];
      
      if (dbModulesForQuote.length !== apiModulesForQuote.length) {
        console.warn(`⚠️ Discrepanza nel numero di moduli per il preventivo ID ${quoteId}:`);
        console.warn(`   - DB: ${dbModulesForQuote.length} moduli`);
        console.warn(`   - API: ${apiModulesForQuote.length} moduli`);
      }
    } catch (err) {
      console.error(`- Errore nella verifica delle relazioni per il preventivo ${quoteId}:`, err.message);
    }
  }
}

/**
 * Test 3: Verifica il calcolo dei prezzi e degli sconti dei moduli
 */
async function testModulePriceCalculations() {
  console.log('\n🔍 Test 3: Verifica calcolo prezzi e sconti dei moduli...');
  
  // 3.1 Recupera i moduli, gli elementi dei moduli e i servizi dal DB
  const dbModules = await db.select().from(quoteModules);
  const moduleItemsPromises = dbModules.map(module => 
    db.select().from(quoteModuleItems).where(eq(quoteModuleItems.moduleId, module.id))
  );
  
  const allModuleItems = await Promise.all(moduleItemsPromises)
    .then(results => results.flat());
  
  // Recupera tutti i servizi per i calcoli dei prezzi
  const allServices = await db.select().from(services);
  const serviceMap = allServices.reduce((map, service) => {
    map[service.id] = service;
    return map;
  }, {});
  
  console.log(`Analisi di ${dbModules.length} moduli con ${allModuleItems.length} elementi totali`);
  
  // 3.2 Verifica i calcoli dei prezzi per ogni modulo
  let priceDiscrepancies = 0;
  
  for (const module of dbModules) {
    try {
      // Recupera dettagli del preventivo dall'API
      const quoteDetails = await fetchQuoteDetails(module.quoteId);
      if (!quoteDetails || !quoteDetails.modules) continue;
      
      // Trova il modulo corrispondente nell'API
      const apiModule = quoteDetails.modules.find(m => m.id === module.id);
      if (!apiModule) {
        console.warn(`⚠️ Modulo ID ${module.id} non trovato nell'API per il preventivo ${module.quoteId}`);
        continue;
      }
      
      // Calcola il prezzo totale del modulo dal DB
      const moduleItems = allModuleItems.filter(item => item.moduleId === module.id);
      let dbTotalPrice = 0;
      
      for (const item of moduleItems) {
        // Calcola il prezzo base dell'elemento
        let itemPrice = 0;
        
        if (item.serviceId) {
          const service = serviceMap[item.serviceId];
          if (service) {
            itemPrice = service.price * item.quantity;
          }
        }
        
        // Applica lo sconto se presente
        if (item.hasDiscount && item.discountValue) {
          if (item.discountType === 'percentage') {
            itemPrice -= (itemPrice * item.discountValue / 100);
          } else if (item.discountType === 'fixed') {
            itemPrice -= item.discountValue;
          }
        }
        
        dbTotalPrice += itemPrice;
      }
      
      // Confronta con il prezzo dell'API
      const apiTotalPrice = apiModule.totalPrice || 0;
      
      // Tolleranza per le differenze di arrotondamento (2 centesimi)
      const tolerance = 0.02;
      if (Math.abs(dbTotalPrice - apiTotalPrice) > tolerance) {
        console.warn(`⚠️ Discrepanza nel prezzo del modulo ID ${module.id} (${module.name}):`);
        console.warn(`   - Calcolato dal DB: ${dbTotalPrice.toFixed(2)} €`);
        console.warn(`   - Riportato dall'API: ${apiTotalPrice.toFixed(2)} €`);
        console.warn(`   - Differenza: ${Math.abs(dbTotalPrice - apiTotalPrice).toFixed(2)} €`);
        priceDiscrepancies++;
      }
    } catch (err) {
      console.error(`- Errore nel calcolo dei prezzi per il modulo ${module.id}:`, err.message);
    }
  }
  
  if (priceDiscrepancies === 0) {
    console.log('✅ Calcoli dei prezzi dei moduli coerenti tra DB e API');
  } else {
    console.warn(`⚠️ Trovate ${priceDiscrepancies} discrepanze nei calcoli dei prezzi`);
  }
}

/**
 * Test 4: Verifica la consistenza tra moduli fissi e variabili
 */
async function testFixedVariableModuleConsistency() {
  console.log('\n🔍 Test 4: Verifica consistenza tra moduli fissi e variabili...');
  
  // 4.1 Recupera tutti i moduli dal DB
  const dbModules = await db.select().from(quoteModules);
  
  // Dividi in fissi e variabili
  const fixedModules = dbModules.filter(m => m.type === 'fixed');
  const variableModules = dbModules.filter(m => m.type === 'variable');
  
  console.log(`Trovati ${fixedModules.length} moduli fissi e ${variableModules.length} moduli variabili`);
  
  // 4.2 Verifica la corretta configurazione dei moduli fissi
  let fixedModuleIssues = 0;
  
  for (const module of fixedModules) {
    try {
      // Recupera gli elementi del modulo
      const moduleItems = await db.select()
        .from(quoteModuleItems)
        .where(eq(quoteModuleItems.moduleId, module.id));
      
      // Un modulo fisso dovrebbe avere almeno un elemento e non dovrebbe avere
      // opzioni di selezione minima/massima impostate
      if (moduleItems.length === 0) {
        console.warn(`⚠️ Modulo fisso ID ${module.id} (${module.name}) non ha elementi`);
        fixedModuleIssues++;
      }
      
      if (module.minSelectCount !== null || module.maxSelectCount !== null) {
        console.warn(`⚠️ Modulo fisso ID ${module.id} (${module.name}) ha limiti di selezione impostati:`);
        console.warn(`   - minSelectCount: ${module.minSelectCount}`);
        console.warn(`   - maxSelectCount: ${module.maxSelectCount}`);
        fixedModuleIssues++;
      }
    } catch (err) {
      console.error(`- Errore nella verifica del modulo fisso ${module.id}:`, err.message);
    }
  }
  
  // 4.3 Verifica la corretta configurazione dei moduli variabili
  let variableModuleIssues = 0;
  
  for (const module of variableModules) {
    try {
      // Un modulo variabile dovrebbe avere limiti di selezione impostati
      if (module.minSelectCount === null && module.maxSelectCount === null) {
        console.warn(`⚠️ Modulo variabile ID ${module.id} (${module.name}) non ha limiti di selezione impostati`);
        variableModuleIssues++;
      }
      
      // Verifica che min < max (se entrambi impostati)
      if (module.minSelectCount !== null && module.maxSelectCount !== null && 
          module.minSelectCount > module.maxSelectCount) {
        console.error(`❌ Modulo variabile ID ${module.id} (${module.name}) ha minSelectCount > maxSelectCount:`);
        console.error(`   - minSelectCount: ${module.minSelectCount}`);
        console.error(`   - maxSelectCount: ${module.maxSelectCount}`);
        variableModuleIssues++;
      }
      
      // Recupera gli elementi del modulo per verificare le quantità selezionate
      const moduleItems = await db.select()
        .from(quoteModuleItems)
        .where(eq(quoteModuleItems.moduleId, module.id));
      
      if (moduleItems.length === 0) {
        console.warn(`⚠️ Modulo variabile ID ${module.id} (${module.name}) non ha elementi`);
        variableModuleIssues++;
      }
      
      // Verifica le quantità selezionate negli elementi
      const selectedItems = moduleItems.filter(item => item.selectedQuantity > 0);
      const totalSelected = selectedItems.reduce((sum, item) => sum + (item.selectedQuantity || 0), 0);
      
      // Verifica la coerenza con i limiti minimi
      if (module.minSelectCount !== null && totalSelected < module.minSelectCount) {
        console.warn(`⚠️ Modulo variabile ID ${module.id} (${module.name}) ha ${totalSelected} elementi selezionati, meno del minimo richiesto (${module.minSelectCount})`);
        variableModuleIssues++;
      }
      
      // Verifica la coerenza con i limiti massimi
      if (module.maxSelectCount !== null && totalSelected > module.maxSelectCount) {
        console.warn(`⚠️ Modulo variabile ID ${module.id} (${module.name}) ha ${totalSelected} elementi selezionati, più del massimo consentito (${module.maxSelectCount})`);
        variableModuleIssues++;
      }
    } catch (err) {
      console.error(`- Errore nella verifica del modulo variabile ${module.id}:`, err.message);
    }
  }
  
  if (fixedModuleIssues === 0) {
    console.log('✅ Tutti i moduli fissi sono configurati correttamente');
  } else {
    console.warn(`⚠️ Trovati ${fixedModuleIssues} problemi nella configurazione dei moduli fissi`);
  }
  
  if (variableModuleIssues === 0) {
    console.log('✅ Tutti i moduli variabili sono configurati correttamente');
  } else {
    console.warn(`⚠️ Trovati ${variableModuleIssues} problemi nella configurazione dei moduli variabili`);
  }
}

/**
 * Recupera tutti i preventivi
 * @param {number} limit - Numero massimo di preventivi da recuperare (opzionale)
 */
async function fetchAllQuotes(limit = 5) {
  try {
    const response = await axios.get(`${API_BASE_URL}/quotes`, { headers });
    // Limita il numero di preventivi per evitare timeouts nei test
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
async function fetchQuoteDetails(quoteId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/quotes/${quoteId}`, { headers });
    return response.data;
  } catch (error) {
    console.error(`Errore nel recupero dei dettagli del preventivo ${quoteId}:`, error.message);
    throw error;
  }
}

// Esecuzione del programma
runDiagnostics().catch(err => {
  console.error('Errore fatale durante l\'esecuzione della diagnostica:', err);
  process.exit(1);
});

// Esportiamo le funzioni per test
export {
  fetchAllQuotes,
  fetchQuoteDetails,
  testModuleDataConsistency,
  testModuleQuoteRelations,
  testModulePriceCalculations,
  testFixedVariableModuleConsistency
};