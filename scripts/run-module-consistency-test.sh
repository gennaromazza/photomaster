#!/bin/bash

# Script per eseguire solo il test di consistenza dati dei moduli

echo "🔍 Avvio test di consistenza dati dei moduli fissi e variabili..."
echo ""

# Imposta variabile d'ambiente per la CSRF protection in testing mode
export CSRF_TEST_MODE=true

# Esegui lo script di diagnostica con tsx che supporta sia JS che TS
# La consistenza verrà testata con un tempo di esecuzione più breve
NODE_OPTIONS="--max-old-space-size=4096" npx tsx -e "
import { db } from '../server/db.ts';
import { quoteModules } from '../shared/schema.ts';
import { eq } from 'drizzle-orm';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';
const headers = {
  'Content-Type': 'application/json',
  'X-CSRF-Test': 'true'
};

async function fetchAllQuotes(limit = 5) {
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

async function fetchQuoteDetails(quoteId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/quotes/${quoteId}`, { headers });
    return response.data;
  } catch (error) {
    console.error(`Errore nel recupero dei dettagli del preventivo ${quoteId}:`, error.message);
    throw error;
  }
}

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
  
  const results = {
    timestamp: new Date().toISOString(),
    stats: {
      modulesTotal: dbModules.length,
      modulesMissingInApi: missingInApi.length,
      modulesMissingInDb: missingInDb.length,
      modulesWithFieldDiscrepancies: fieldMismatches
    },
    missingInApi: missingInApi,
    missingInDb: missingInDb
  };
  
  // Salvataggio risultati in un file JSON
  const fs = require('fs');
  fs.writeFileSync('module-consistency-results.json', JSON.stringify(results, null, 2));
  console.log('✅ Risultati salvati in module-consistency-results.json');
}

// Funzione principale
async function runSingleTest() {
  try {
    await testModuleDataConsistency();
    console.log('✅ Test completato con successo!');
  } catch (err) {
    console.error('Errore durante il test:', err);
    process.exit(1);
  }
}

// Esegui la funzione
runSingleTest();
"

# Ripristina l'ambiente
unset CSRF_TEST_MODE

echo ""
echo "Test di consistenza completato!"