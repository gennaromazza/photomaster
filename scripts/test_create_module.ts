/**
 * Script di test: Generazione Moduli
 * Verifica che il modulo venga creato correttamente lato Backend e che tutte le clausole,
 * prodotti e opzioni siano correttamente associate nel database.
 */
import { db } from '../server/db';
import { quoteModules, quoteModuleItems, quotes } from '../shared/schema';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configurazione
const API_BASE_URL = 'http://localhost:5000/api';
const RESULTS_DIR = path.join(process.cwd(), 'diagnostics-results');
const headers = {
  'Content-Type': 'application/json',
  'X-CSRF-Test': 'true'
};

// Interfacce
interface TestResult {
  test: string;
  status: 'pass' | 'fail';
  details: string;
  expected?: any;
  actual?: any;
}

interface ModuleCreationResults {
  timestamp: string;
  quoteId: number;
  module: any;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  }
}

/**
 * Assicura che la directory di output esista
 */
function ensureOutputDir() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

/**
 * Ottiene un preventivo casuale dal database
 */
async function getRandomQuote() {
  const allQuotes = await db.select().from(quotes).limit(10);
  if (allQuotes.length === 0) {
    throw new Error('Nessun preventivo trovato nel database');
  }
  return allQuotes[Math.floor(Math.random() * allQuotes.length)];
}

/**
 * Crea un nuovo modulo di test
 */
async function createTestModule(quoteId: number) {
  const moduleData = {
    name: `Test Module ${Date.now()}`,
    type: 'variable',
    quoteId,
    description: 'Modulo di test creato automaticamente',
    minSelectCount: 2,
    maxSelectCount: 5
  };

  try {
    const response = await axios.post(
      `${API_BASE_URL}/quotes/${quoteId}/modules`,
      moduleData,
      { headers }
    );
    
    return response.data;
  } catch (error) {
    console.error('Errore nella creazione del modulo:', error.message);
    throw error;
  }
}

/**
 * Aggiunge elementi al modulo di test
 */
async function addItemsToModule(moduleId: number) {
  const items = [
    {
      name: 'Prodotto Test 1',
      description: 'Prodotto di test 1',
      price: 100,
      quantity: 1
    },
    {
      name: 'Prodotto Test 2',
      description: 'Prodotto di test 2',
      price: 200,
      quantity: 1
    },
    {
      name: 'Prodotto Test 3',
      description: 'Prodotto di test 3',
      price: 300,
      quantity: 1
    }
  ];

  const results = [];
  
  for (const item of items) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/quotes/modules/${moduleId}/items`,
        item,
        { headers }
      );
      
      results.push(response.data);
    } catch (error) {
      console.error(`Errore nella creazione dell'elemento "${item.name}":`, error.message);
    }
  }
  
  return results;
}

/**
 * Verifica che il modulo sia stato creato correttamente
 */
async function verifyModuleCreation(moduleId: number, expectedData: any): Promise<TestResult[]> {
  const tests: TestResult[] = [];
  
  // Verifica che il modulo esista nel database
  const dbModule = await db.query.quoteModules.findFirst({
    where: (modules, { eq }) => eq(modules.id, moduleId)
  });
  
  if (!dbModule) {
    tests.push({
      test: 'Esistenza modulo nel database',
      status: 'fail',
      details: `Il modulo con ID ${moduleId} non è stato trovato nel database`
    });
    return tests;
  }
  
  tests.push({
    test: 'Esistenza modulo nel database',
    status: 'pass',
    details: `Il modulo con ID ${moduleId} esiste nel database`
  });
  
  // Verifica che i dati siano corretti
  if (dbModule.name === expectedData.name) {
    tests.push({
      test: 'Nome modulo',
      status: 'pass',
      details: `Il nome del modulo è corretto: "${dbModule.name}"`
    });
  } else {
    tests.push({
      test: 'Nome modulo',
      status: 'fail',
      details: `Il nome del modulo non corrisponde`,
      expected: expectedData.name,
      actual: dbModule.name
    });
  }
  
  if (dbModule.type === expectedData.type) {
    tests.push({
      test: 'Tipo modulo',
      status: 'pass',
      details: `Il tipo del modulo è corretto: "${dbModule.type}"`
    });
  } else {
    tests.push({
      test: 'Tipo modulo',
      status: 'fail',
      details: `Il tipo del modulo non corrisponde`,
      expected: expectedData.type,
      actual: dbModule.type
    });
  }
  
  if (dbModule.description === expectedData.description) {
    tests.push({
      test: 'Descrizione modulo',
      status: 'pass',
      details: `La descrizione del modulo è corretta: "${dbModule.description}"`
    });
  } else {
    tests.push({
      test: 'Descrizione modulo',
      status: 'fail',
      details: `La descrizione del modulo non corrisponde`,
      expected: expectedData.description,
      actual: dbModule.description
    });
  }
  
  if (dbModule.minSelectCount === expectedData.minSelectCount) {
    tests.push({
      test: 'Minimo selezioni',
      status: 'pass',
      details: `Il minimo di selezioni è corretto: ${dbModule.minSelectCount}`
    });
  } else {
    tests.push({
      test: 'Minimo selezioni',
      status: 'fail',
      details: `Il minimo di selezioni non corrisponde`,
      expected: expectedData.minSelectCount,
      actual: dbModule.minSelectCount
    });
  }
  
  if (dbModule.maxSelectCount === expectedData.maxSelectCount) {
    tests.push({
      test: 'Massimo selezioni',
      status: 'pass',
      details: `Il massimo di selezioni è corretto: ${dbModule.maxSelectCount}`
    });
  } else {
    tests.push({
      test: 'Massimo selezioni',
      status: 'fail',
      details: `Il massimo di selezioni non corrisponde`,
      expected: expectedData.maxSelectCount,
      actual: dbModule.maxSelectCount
    });
  }
  
  return tests;
}

/**
 * Verifica che gli elementi del modulo siano stati creati correttamente
 */
async function verifyModuleItems(moduleId: number, expectedItems: any[]): Promise<TestResult[]> {
  const tests: TestResult[] = [];
  
  // Recupera gli elementi del modulo dal database
  const dbItems = await db.query.quoteModuleItems.findMany({
    where: (items, { eq }) => eq(items.moduleId, moduleId)
  });
  
  if (dbItems.length === 0) {
    tests.push({
      test: 'Elementi modulo',
      status: 'fail',
      details: `Il modulo non ha elementi associati nel database`
    });
    return tests;
  }
  
  if (dbItems.length !== expectedItems.length) {
    tests.push({
      test: 'Numero elementi',
      status: 'fail',
      details: `Il numero di elementi non corrisponde`,
      expected: expectedItems.length,
      actual: dbItems.length
    });
  } else {
    tests.push({
      test: 'Numero elementi',
      status: 'pass',
      details: `Il modulo ha il numero corretto di elementi: ${dbItems.length}`
    });
  }
  
  // Verifica che ogni elemento abbia i dati corretti
  for (let i = 0; i < expectedItems.length && i < dbItems.length; i++) {
    const expectedItem = expectedItems[i];
    const dbItem = dbItems.find(item => item.name === expectedItem.name);
    
    if (!dbItem) {
      tests.push({
        test: `Elemento "${expectedItem.name}"`,
        status: 'fail',
        details: `L'elemento "${expectedItem.name}" non è stato trovato nel database`
      });
      continue;
    }
    
    tests.push({
      test: `Elemento "${expectedItem.name}"`,
      status: 'pass',
      details: `L'elemento "${expectedItem.name}" esiste nel database`
    });
    
    // Verifica prezzo
    if (Number(dbItem.price) === expectedItem.price) {
      tests.push({
        test: `Prezzo elemento "${expectedItem.name}"`,
        status: 'pass',
        details: `Il prezzo dell'elemento "${expectedItem.name}" è corretto: ${dbItem.price}`
      });
    } else {
      tests.push({
        test: `Prezzo elemento "${expectedItem.name}"`,
        status: 'fail',
        details: `Il prezzo dell'elemento "${expectedItem.name}" non corrisponde`,
        expected: expectedItem.price,
        actual: Number(dbItem.price)
      });
    }
  }
  
  return tests;
}

/**
 * Verifica il modulo tramite API
 */
async function verifyModuleViaApi(quoteId: number, moduleId: number): Promise<TestResult[]> {
  const tests: TestResult[] = [];
  
  try {
    // Recupera il preventivo tramite API
    const response = await axios.get(`${API_BASE_URL}/quotes/${quoteId}`, { headers });
    const quote = response.data;
    
    if (!quote) {
      tests.push({
        test: 'Recupero preventivo via API',
        status: 'fail',
        details: `Il preventivo con ID ${quoteId} non è stato trovato tramite API`
      });
      return tests;
    }
    
    tests.push({
      test: 'Recupero preventivo via API',
      status: 'pass',
      details: `Il preventivo con ID ${quoteId} è stato recuperato con successo via API`
    });
    
    // Verifica che il modulo sia presente nel preventivo
    const moduleInQuote = quote.modules && quote.modules.some(m => m.id === moduleId);
    
    if (moduleInQuote) {
      tests.push({
        test: 'Presenza modulo nel preventivo via API',
        status: 'pass',
        details: `Il modulo con ID ${moduleId} è presente nel preventivo recuperato via API`
      });
    } else {
      tests.push({
        test: 'Presenza modulo nel preventivo via API',
        status: 'fail',
        details: `Il modulo con ID ${moduleId} non è presente nel preventivo recuperato via API`
      });
    }
    
    // Se il modulo è presente, verifica che gli elementi siano presenti
    if (moduleInQuote) {
      const apiModule = quote.modules.find(m => m.id === moduleId);
      
      if (apiModule.items && apiModule.items.length > 0) {
        tests.push({
          test: 'Elementi del modulo via API',
          status: 'pass',
          details: `Il modulo ha ${apiModule.items.length} elementi recuperati via API`
        });
      } else {
        tests.push({
          test: 'Elementi del modulo via API',
          status: 'fail',
          details: `Il modulo non ha elementi o gli elementi non sono stati recuperati via API`
        });
      }
    }
    
  } catch (error) {
    tests.push({
      test: 'Accesso API',
      status: 'fail',
      details: `Errore durante l'accesso all'API: ${error.message}`
    });
  }
  
  return tests;
}

/**
 * Funzione principale per il test di creazione moduli
 */
async function testModuleCreation() {
  console.log('🧪 Avvio test di creazione moduli...');
  ensureOutputDir();
  
  try {
    // Ottieni un preventivo casuale
    const quote = await getRandomQuote();
    console.log(`📋 Utilizzando preventivo ID ${quote.id} per il test`);
    
    // Crea un nuovo modulo
    console.log('🔨 Creazione nuovo modulo di test...');
    const module = await createTestModule(quote.id);
    console.log(`✅ Modulo creato con ID ${module.id}`);
    
    // Aggiungi elementi al modulo
    console.log('🔨 Aggiunta elementi al modulo...');
    const items = await addItemsToModule(module.id);
    console.log(`✅ Aggiunti ${items.length} elementi al modulo`);
    
    // Verifica la creazione del modulo
    console.log('🔍 Verifica creazione modulo...');
    const moduleTests = await verifyModuleCreation(module.id, {
      name: module.name,
      type: module.type,
      description: module.description,
      minSelectCount: module.minSelectCount,
      maxSelectCount: module.maxSelectCount
    });
    
    // Verifica gli elementi del modulo
    console.log('🔍 Verifica elementi modulo...');
    const itemTests = await verifyModuleItems(module.id, items);
    
    // Verifica il modulo tramite API
    console.log('🔍 Verifica modulo tramite API...');
    const apiTests = await verifyModuleViaApi(quote.id, module.id);
    
    // Combina tutti i test
    const allTests = [...moduleTests, ...itemTests, ...apiTests];
    
    // Calcola il riepilogo
    const summary = {
      total: allTests.length,
      passed: allTests.filter(t => t.status === 'pass').length,
      failed: allTests.filter(t => t.status === 'fail').length
    };
    
    // Crea il risultato
    const results: ModuleCreationResults = {
      timestamp: new Date().toISOString(),
      quoteId: quote.id,
      module,
      tests: allTests,
      summary
    };
    
    // Salva i risultati
    const resultsFilePath = path.join(RESULTS_DIR, `module-creation-test-${Date.now()}.json`);
    fs.writeFileSync(resultsFilePath, JSON.stringify(results, null, 2));
    
    // Genera e salva il report in formato markdown
    const markdownReport = generateMarkdownReport(results);
    const markdownFilePath = path.join(RESULTS_DIR, `module-creation-test-${Date.now()}.md`);
    fs.writeFileSync(markdownFilePath, markdownReport);
    
    console.log(`\n📊 Riepilogo: ${summary.passed} test passati, ${summary.failed} falliti su un totale di ${summary.total}`);
    console.log(`📝 Risultati salvati in ${resultsFilePath} e ${markdownFilePath}`);
    
    return results;
  } catch (error) {
    console.error('❌ Errore durante il test di creazione moduli:', error);
    throw error;
  }
}

/**
 * Genera un report markdown dai risultati
 */
function generateMarkdownReport(results: ModuleCreationResults): string {
  let markdown = `# Test Creazione Moduli\n\n`;
  markdown += `Data: ${new Date(results.timestamp).toLocaleString()}\n\n`;
  
  markdown += `## Informazioni Generali\n\n`;
  markdown += `- **Preventivo ID**: ${results.quoteId}\n`;
  markdown += `- **Modulo ID**: ${results.module.id}\n`;
  markdown += `- **Nome Modulo**: ${results.module.name}\n`;
  markdown += `- **Tipo Modulo**: ${results.module.type}\n`;
  
  markdown += `\n## Riepilogo\n\n`;
  markdown += `- **Test Totali**: ${results.summary.total}\n`;
  markdown += `- **Test Passati**: ${results.summary.passed} (${Math.round(results.summary.passed / results.summary.total * 100)}%)\n`;
  markdown += `- **Test Falliti**: ${results.summary.failed} (${Math.round(results.summary.failed / results.summary.total * 100)}%)\n`;
  
  markdown += `\n## Dettagli Test\n\n`;
  markdown += `| Test | Stato | Dettagli |\n`;
  markdown += `|------|-------|----------|\n`;
  
  for (const test of results.tests) {
    const statusIcon = test.status === 'pass' ? '✅' : '❌';
    markdown += `| ${test.test} | ${statusIcon} | ${test.details} |\n`;
  }
  
  markdown += `\n## Conclusioni\n\n`;
  
  if (results.summary.failed === 0) {
    markdown += `✅ **Tutti i test sono stati superati con successo!** Il sistema di creazione moduli funziona correttamente.\n`;
  } else {
    markdown += `⚠️ **Sono stati rilevati ${results.summary.failed} test falliti.** Si consiglia di rivedere il sistema di creazione moduli.\n`;
    
    // Aggiungi raccomandazioni specifiche
    markdown += `\n### Raccomandazioni\n\n`;
    
    const failedTests = results.tests.filter(t => t.status === 'fail');
    for (const test of failedTests) {
      markdown += `- **${test.test}**: ${test.details}\n`;
      if (test.expected !== undefined && test.actual !== undefined) {
        markdown += `  - Valore atteso: \`${JSON.stringify(test.expected)}\`\n`;
        markdown += `  - Valore effettivo: \`${JSON.stringify(test.actual)}\`\n`;
      }
    }
  }
  
  return markdown;
}

// Esegui il test
testModuleCreation().catch(console.error);