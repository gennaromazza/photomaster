/**
 * Script di test: Applicazione Sconti
 * Crea moduli con sconti, verifica il calcolo backend (sconto giusto sul totale),
 * e confronta i valori frontend mostrati nella firma.
 */
import { db } from '../server/db';
import { quoteModules, quotes } from '../shared/schema';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { and, eq, not, isNull } from 'drizzle-orm';

// Configurazione
const API_BASE_URL = 'http://localhost:5000/api';
const RESULTS_DIR = path.join(process.cwd(), 'diagnostics-results');
const headers = {
  'Content-Type': 'application/json',
  'X-CSRF-Test': 'true'
};

// Tipi di sconto da testare
const DISCOUNT_TYPES = ['percentage', 'fixed'];

// Interfacce
interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  expected?: any;
  actual?: any;
}

interface DiscountTestResults {
  timestamp: string;
  createdModules: any[];
  backendTests: ModuleDiscountTestResult[];
  frontendTests: FrontendDiscountTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  }
}

interface ModuleDiscountTestResult {
  moduleId: number;
  moduleName: string;
  discountType: string;
  discountValue: number;
  subtotal: number;
  total: number;
  tests: TestResult[];
}

interface FrontendDiscountTestResult {
  quoteId: number;
  shareToken: string;
  moduleId: number;
  moduleName: string;
  tests: TestResult[];
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
 * Ottieni un preventivo casuale dal database
 */
async function getRandomQuote() {
  const allQuotes = await db.select().from(quotes)
    .where(
      and(
        eq(quotes.isShared, true),
        not(isNull(quotes.shareToken))
      )
    )
    .limit(10);
  
  if (allQuotes.length === 0) {
    throw new Error('Nessun preventivo condivisibile trovato nel database');
  }
  
  return allQuotes[Math.floor(Math.random() * allQuotes.length)];
}

/**
 * Crea un nuovo modulo con sconto
 */
async function createModuleWithDiscount(quoteId: number, discountType: string, discountValue: number) {
  const moduleData = {
    name: `Test Sconto ${discountType} ${Date.now()}`,
    type: 'fixed',
    quoteId,
    description: `Modulo test con sconto ${discountType} del ${discountValue}${discountType === 'percentage' ? '%' : '€'}`,
    discountType,
    discountValue,
    subtotal: 1000 // Valore base di 1000€
  };

  try {
    const response = await axios.post(
      `${API_BASE_URL}/quotes/${quoteId}/modules`,
      moduleData,
      { headers }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Errore nella creazione del modulo con sconto ${discountType}:`, error.message);
    throw error;
  }
}

/**
 * Aggiorna un modulo con sconto
 */
async function updateModuleWithDiscount(moduleId: number, discountType: string, discountValue: number) {
  const updateData = {
    discountType,
    discountValue
  };

  try {
    const response = await axios.put(
      `${API_BASE_URL}/quotes/modules/${moduleId}`,
      updateData,
      { headers }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Errore nell'aggiornamento del modulo ${moduleId} con sconto ${discountType}:`, error.message);
    throw error;
  }
}

/**
 * Verifica che lo sconto sia stato applicato correttamente nel backend
 */
async function verifyDiscountBackend(module): Promise<TestResult[]> {
  const tests: TestResult[] = [];
  
  // Verifica che il modulo abbia i campi di sconto
  if (!module.discountType) {
    tests.push({
      test: 'Campo discountType',
      status: 'fail',
      details: `Il modulo non ha il campo discountType definito`
    });
  } else {
    tests.push({
      test: 'Campo discountType',
      status: 'pass',
      details: `Il modulo ha il campo discountType definito: "${module.discountType}"`
    });
  }
  
  if (module.discountValue === undefined || module.discountValue === null) {
    tests.push({
      test: 'Campo discountValue',
      status: 'fail',
      details: `Il modulo non ha il campo discountValue definito`
    });
  } else {
    tests.push({
      test: 'Campo discountValue',
      status: 'pass',
      details: `Il modulo ha il campo discountValue definito: ${module.discountValue}`
    });
  }
  
  // Verifica che i campi subtotal e total siano definiti
  if (module.subtotal === undefined || module.subtotal === null) {
    tests.push({
      test: 'Campo subtotal',
      status: 'fail',
      details: `Il modulo non ha il campo subtotal definito`
    });
    return tests;
  } else {
    tests.push({
      test: 'Campo subtotal',
      status: 'pass',
      details: `Il modulo ha il campo subtotal definito: ${module.subtotal}`
    });
  }
  
  if (module.total === undefined || module.total === null) {
    tests.push({
      test: 'Campo total',
      status: 'fail',
      details: `Il modulo non ha il campo total definito`
    });
    return tests;
  } else {
    tests.push({
      test: 'Campo total',
      status: 'pass',
      details: `Il modulo ha il campo total definito: ${module.total}`
    });
  }
  
  // Verifica che lo sconto sia stato applicato correttamente
  const subtotal = Number(module.subtotal);
  const discountValue = Number(module.discountValue);
  let expectedTotal = subtotal;
  
  if (module.discountType === 'percentage') {
    expectedTotal = subtotal * (1 - discountValue / 100);
  } else if (module.discountType === 'fixed') {
    expectedTotal = Math.max(0, subtotal - discountValue);
  }
  
  // Arrotonda a due decimali
  expectedTotal = Math.round(expectedTotal * 100) / 100;
  const actualTotal = Number(module.total);
  
  // Tolleriamo piccole differenze di arrotondamento (0.01€)
  if (Math.abs(actualTotal - expectedTotal) <= 0.01) {
    tests.push({
      test: 'Calcolo sconto',
      status: 'pass',
      details: `Lo sconto è calcolato correttamente: subtotal=${subtotal}, discount=${discountValue} (${module.discountType}), total=${actualTotal}`,
      expected: expectedTotal,
      actual: actualTotal
    });
  } else {
    tests.push({
      test: 'Calcolo sconto',
      status: 'fail',
      details: `Lo sconto non è calcolato correttamente`,
      expected: expectedTotal,
      actual: actualTotal
    });
  }
  
  return tests;
}

/**
 * Recupera la pagina pubblica del preventivo
 */
async function getPublicQuotePage(shareToken: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/quotes/share/${shareToken}`, { headers });
    return response.data;
  } catch (error) {
    console.error(`Errore nel recupero della pagina pubblica (token: ${shareToken}):`, error.message);
    return null;
  }
}

/**
 * Verifica che lo sconto sia visualizzato correttamente nel frontend
 */
async function verifyDiscountFrontend(module, publicQuote, shareToken: string): Promise<TestResult[]> {
  const tests: TestResult[] = [];
  
  // Verifica che la pagina pubblica sia stata recuperata
  if (!publicQuote) {
    tests.push({
      test: 'Recupero pagina pubblica',
      status: 'fail',
      details: `Impossibile recuperare la pagina pubblica (token: ${shareToken})`
    });
    return tests;
  }
  
  tests.push({
    test: 'Recupero pagina pubblica',
    status: 'pass',
    details: `Pagina pubblica recuperata con successo`
  });
  
  // Verifica che il modulo sia presente nella pagina pubblica
  if (!publicQuote.modules || !Array.isArray(publicQuote.modules)) {
    tests.push({
      test: 'Presenza moduli in frontend',
      status: 'fail',
      details: `La pagina pubblica non ha moduli`
    });
    return tests;
  }
  
  const frontendModule = publicQuote.modules.find(m => m.id === module.id);
  
  if (!frontendModule) {
    tests.push({
      test: 'Presenza modulo in frontend',
      status: 'fail',
      details: `Il modulo (ID: ${module.id}) non è presente nella pagina pubblica`
    });
    return tests;
  }
  
  tests.push({
    test: 'Presenza modulo in frontend',
    status: 'pass',
    details: `Il modulo (ID: ${module.id}) è presente nella pagina pubblica`
  });
  
  // Verifica che il modulo abbia i campi di sconto nel frontend
  if (!frontendModule.discountType) {
    tests.push({
      test: 'Campo discountType in frontend',
      status: 'fail',
      details: `Il modulo nel frontend non ha il campo discountType definito`
    });
  } else if (frontendModule.discountType !== module.discountType) {
    tests.push({
      test: 'Corrispondenza discountType in frontend',
      status: 'fail',
      details: `Il campo discountType nel frontend non corrisponde al backend`,
      expected: module.discountType,
      actual: frontendModule.discountType
    });
  } else {
    tests.push({
      test: 'Corrispondenza discountType in frontend',
      status: 'pass',
      details: `Il campo discountType nel frontend corrisponde al backend: "${frontendModule.discountType}"`
    });
  }
  
  if (frontendModule.discountValue === undefined || frontendModule.discountValue === null) {
    tests.push({
      test: 'Campo discountValue in frontend',
      status: 'fail',
      details: `Il modulo nel frontend non ha il campo discountValue definito`
    });
  } else if (Number(frontendModule.discountValue) !== Number(module.discountValue)) {
    tests.push({
      test: 'Corrispondenza discountValue in frontend',
      status: 'fail',
      details: `Il campo discountValue nel frontend non corrisponde al backend`,
      expected: Number(module.discountValue),
      actual: Number(frontendModule.discountValue)
    });
  } else {
    tests.push({
      test: 'Corrispondenza discountValue in frontend',
      status: 'pass',
      details: `Il campo discountValue nel frontend corrisponde al backend: ${frontendModule.discountValue}`
    });
  }
  
  // Verifica che i campi subtotal e total siano presenti e corrispondano al backend
  if (frontendModule.subtotal === undefined || frontendModule.subtotal === null) {
    tests.push({
      test: 'Campo subtotal in frontend',
      status: 'fail',
      details: `Il modulo nel frontend non ha il campo subtotal definito`
    });
  } else if (Number(frontendModule.subtotal) !== Number(module.subtotal)) {
    tests.push({
      test: 'Corrispondenza subtotal in frontend',
      status: 'fail',
      details: `Il campo subtotal nel frontend non corrisponde al backend`,
      expected: Number(module.subtotal),
      actual: Number(frontendModule.subtotal)
    });
  } else {
    tests.push({
      test: 'Corrispondenza subtotal in frontend',
      status: 'pass',
      details: `Il campo subtotal nel frontend corrisponde al backend: ${frontendModule.subtotal}`
    });
  }
  
  if (frontendModule.total === undefined || frontendModule.total === null) {
    tests.push({
      test: 'Campo total in frontend',
      status: 'fail',
      details: `Il modulo nel frontend non ha il campo total definito`
    });
  } else if (Number(frontendModule.total) !== Number(module.total)) {
    tests.push({
      test: 'Corrispondenza total in frontend',
      status: 'fail',
      details: `Il campo total nel frontend non corrisponde al backend`,
      expected: Number(module.total),
      actual: Number(frontendModule.total)
    });
  } else {
    tests.push({
      test: 'Corrispondenza total in frontend',
      status: 'pass',
      details: `Il campo total nel frontend corrisponde al backend: ${frontendModule.total}`
    });
  }
  
  // Verifica che il frontend mostri esplicitamente lo sconto al cliente
  // Questo dipende dall'implementazione specifica del frontend
  if (frontendModule.hasDiscount !== undefined) {
    tests.push({
      test: 'Indicatore di sconto in frontend',
      status: 'pass',
      details: `Il frontend include un indicatore esplicito per lo sconto (hasDiscount: ${frontendModule.hasDiscount})`
    });
  } else {
    tests.push({
      test: 'Indicatore di sconto in frontend',
      status: 'warning',
      details: `Il frontend potrebbe non avere un indicatore esplicito per lo sconto (campo hasDiscount non trovato)`
    });
  }
  
  return tests;
}

/**
 * Funzione principale per il test degli sconti
 */
async function testDiscountApplication() {
  console.log('🧪 Avvio test di applicazione sconti...');
  ensureOutputDir();
  
  try {
    // Ottieni un preventivo casuale condivisibile
    const quote = await getRandomQuote();
    console.log(`📋 Utilizzando preventivo ID ${quote.id} (token: ${quote.shareToken})`);
    
    const createdModules = [];
    const backendTests = [];
    const frontendTests = [];
    
    // Crea un modulo per ogni tipo di sconto
    for (const discountType of DISCOUNT_TYPES) {
      // Per il tipo percentuale, testiamo diversi valori
      const discountValues = discountType === 'percentage' 
        ? [10, 25, 50, 100] // 10%, 25%, 50%, 100%
        : [100, 250, 500, 1000]; // 100€, 250€, 500€, 1000€
      
      for (const discountValue of discountValues) {
        console.log(`🔨 Creazione modulo con sconto ${discountType} ${discountValue}...`);
        
        let module;
        try {
          module = await createModuleWithDiscount(quote.id, discountType, discountValue);
          console.log(`✅ Modulo creato con ID ${module.id}`);
          createdModules.push(module);
        } catch (error) {
          console.error(`❌ Errore nella creazione del modulo: ${error.message}`);
          continue;
        }
        
        // Verifica che lo sconto sia stato applicato correttamente nel backend
        console.log(`🔍 Verifica sconto ${discountType} ${discountValue} nel backend...`);
        const moduleTests = await verifyDiscountBackend(module);
        
        backendTests.push({
          moduleId: module.id,
          moduleName: module.name,
          discountType,
          discountValue,
          subtotal: Number(module.subtotal),
          total: Number(module.total),
          tests: moduleTests
        });
        
        // Recupera la pagina pubblica e verifica lo sconto nel frontend
        console.log(`🔍 Verifica sconto ${discountType} ${discountValue} nel frontend...`);
        const publicQuote = await getPublicQuotePage(quote.shareToken);
        const frontendModuleTests = await verifyDiscountFrontend(module, publicQuote, quote.shareToken);
        
        frontendTests.push({
          quoteId: quote.id,
          shareToken: quote.shareToken,
          moduleId: module.id,
          moduleName: module.name,
          tests: frontendModuleTests
        });
      }
    }
    
    // Calcola il riepilogo
    const allTests = [
      ...backendTests.flatMap(m => m.tests),
      ...frontendTests.flatMap(f => f.tests)
    ];
    
    const summary = {
      total: allTests.length,
      passed: allTests.filter(t => t.status === 'pass').length,
      failed: allTests.filter(t => t.status === 'fail').length,
      warnings: allTests.filter(t => t.status === 'warning').length
    };
    
    // Crea il risultato
    const results: DiscountTestResults = {
      timestamp: new Date().toISOString(),
      createdModules,
      backendTests,
      frontendTests,
      summary
    };
    
    // Salva i risultati
    const resultsFilePath = path.join(RESULTS_DIR, `discount-application-test-${Date.now()}.json`);
    fs.writeFileSync(resultsFilePath, JSON.stringify(results, null, 2));
    
    // Genera e salva il report in formato markdown
    const markdownReport = generateMarkdownReport(results);
    const markdownFilePath = path.join(RESULTS_DIR, `discount-application-test-${Date.now()}.md`);
    fs.writeFileSync(markdownFilePath, markdownReport);
    
    console.log(`\n📊 Riepilogo: ${summary.passed} test passati, ${summary.failed} falliti, ${summary.warnings} avvisi su un totale di ${summary.total}`);
    console.log(`📝 Risultati salvati in ${resultsFilePath} e ${markdownFilePath}`);
    
    return results;
  } catch (error) {
    console.error('❌ Errore durante il test di applicazione sconti:', error);
    throw error;
  }
}

/**
 * Genera un report markdown dai risultati
 */
function generateMarkdownReport(results: DiscountTestResults): string {
  let markdown = `# Test Applicazione Sconti\n\n`;
  markdown += `Data: ${new Date(results.timestamp).toLocaleString()}\n\n`;
  
  markdown += `## Riepilogo\n\n`;
  markdown += `- **Test Totali**: ${results.summary.total}\n`;
  markdown += `- **Test Passati**: ${results.summary.passed} (${Math.round(results.summary.passed / results.summary.total * 100)}%)\n`;
  markdown += `- **Test Falliti**: ${results.summary.failed} (${Math.round(results.summary.failed / results.summary.total * 100)}%)\n`;
  markdown += `- **Avvisi**: ${results.summary.warnings} (${Math.round(results.summary.warnings / results.summary.total * 100)}%)\n`;
  
  markdown += `\n## Test Backend\n\n`;
  
  // Tabella riepilogativa dei moduli testati
  markdown += `### Moduli Testati\n\n`;
  markdown += `| ID | Nome | Tipo Sconto | Valore Sconto | Subtotale | Totale | Risultato |\n`;
  markdown += `|----|------|-------------|---------------|-----------|--------|----------|\n`;
  
  for (const moduleTest of results.backendTests) {
    const passedTests = moduleTest.tests.filter(t => t.status === 'pass').length;
    const totalTests = moduleTest.tests.length;
    const status = passedTests === totalTests ? '✅' : (passedTests > 0 ? '⚠️' : '❌');
    
    markdown += `| ${moduleTest.moduleId} | ${moduleTest.moduleName} | ${moduleTest.discountType} | ${moduleTest.discountValue} | ${moduleTest.subtotal} | ${moduleTest.total} | ${status} ${passedTests}/${totalTests} |\n`;
  }
  
  // Dettagli test per ogni modulo
  markdown += `\n### Dettagli Test Backend\n\n`;
  
  for (const moduleTest of results.backendTests) {
    markdown += `#### Modulo: ${moduleTest.moduleName} (ID: ${moduleTest.moduleId})\n\n`;
    markdown += `- **Tipo Sconto**: ${moduleTest.discountType}\n`;
    markdown += `- **Valore Sconto**: ${moduleTest.discountValue}\n`;
    markdown += `- **Subtotale**: ${moduleTest.subtotal}\n`;
    markdown += `- **Totale**: ${moduleTest.total}\n\n`;
    
    markdown += `| Test | Stato | Dettagli |\n`;
    markdown += `|------|-------|----------|\n`;
    
    for (const test of moduleTest.tests) {
      let statusIcon;
      switch (test.status) {
        case 'pass': statusIcon = '✅'; break;
        case 'fail': statusIcon = '❌'; break;
        case 'warning': statusIcon = '⚠️'; break;
      }
      
      markdown += `| ${test.test} | ${statusIcon} | ${test.details} |\n`;
    }
    
    markdown += `\n`;
  }
  
  markdown += `## Test Frontend\n\n`;
  
  for (const frontendTest of results.frontendTests) {
    markdown += `### Modulo: ${frontendTest.moduleName} (ID: ${frontendTest.moduleId})\n\n`;
    markdown += `- **Preventivo ID**: ${frontendTest.quoteId}\n`;
    markdown += `- **Token Condivisione**: ${frontendTest.shareToken}\n\n`;
    
    markdown += `| Test | Stato | Dettagli |\n`;
    markdown += `|------|-------|----------|\n`;
    
    for (const test of frontendTest.tests) {
      let statusIcon;
      switch (test.status) {
        case 'pass': statusIcon = '✅'; break;
        case 'fail': statusIcon = '❌'; break;
        case 'warning': statusIcon = '⚠️'; break;
      }
      
      markdown += `| ${test.test} | ${statusIcon} | ${test.details} |\n`;
    }
    
    markdown += `\n`;
  }
  
  markdown += `## Conclusioni\n\n`;
  
  if (results.summary.failed === 0 && results.summary.warnings === 0) {
    markdown += `✅ **Tutti i test sono stati superati con successo!** Il sistema di applicazione sconti funziona correttamente.\n`;
  } else if (results.summary.failed === 0) {
    markdown += `⚠️ **Test superati ma con ${results.summary.warnings} avvisi.** Il sistema di applicazione sconti funziona ma potrebbe richiedere attenzione in alcune aree.\n`;
  } else {
    markdown += `❌ **Sono stati rilevati ${results.summary.failed} test falliti.** Si consiglia di rivedere il sistema di applicazione sconti.\n`;
    
    // Aggiungi raccomandazioni specifiche
    markdown += `\n### Problemi Rilevati\n\n`;
    
    // Problemi nel backend
    const failedBackendTests = results.backendTests
      .flatMap(m => m.tests.filter(t => t.status === 'fail')
        .map(t => ({ moduleId: m.moduleId, moduleName: m.moduleName, discountType: m.discountType, discountValue: m.discountValue, test: t })));
    
    if (failedBackendTests.length > 0) {
      markdown += `#### Problemi nel Backend\n\n`;
      
      for (const { moduleId, moduleName, discountType, discountValue, test } of failedBackendTests) {
        markdown += `- **${moduleName} (ID: ${moduleId}, ${discountType}: ${discountValue})**: ${test.test} - ${test.details}\n`;
        if (test.expected !== undefined && test.actual !== undefined) {
          markdown += `  - Valore atteso: \`${JSON.stringify(test.expected)}\`\n`;
          markdown += `  - Valore effettivo: \`${JSON.stringify(test.actual)}\`\n`;
        }
      }
      
      markdown += `\n`;
    }
    
    // Problemi nel frontend
    const failedFrontendTests = results.frontendTests
      .flatMap(f => f.tests.filter(t => t.status === 'fail')
        .map(t => ({ moduleId: f.moduleId, moduleName: f.moduleName, shareToken: f.shareToken, test: t })));
    
    if (failedFrontendTests.length > 0) {
      markdown += `#### Problemi nel Frontend\n\n`;
      
      for (const { moduleId, moduleName, shareToken, test } of failedFrontendTests) {
        markdown += `- **${moduleName} (ID: ${moduleId}, Token: ${shareToken})**: ${test.test} - ${test.details}\n`;
        if (test.expected !== undefined && test.actual !== undefined) {
          markdown += `  - Valore atteso: \`${JSON.stringify(test.expected)}\`\n`;
          markdown += `  - Valore effettivo: \`${JSON.stringify(test.actual)}\`\n`;
        }
      }
    }
    
    // Raccomandazioni generali
    markdown += `\n### Raccomandazioni\n\n`;
    
    if (failedBackendTests.some(t => t.test.test.includes('Calcolo sconto'))) {
      markdown += `- **Correggere la formula di calcolo degli sconti**: L'algoritmo di calcolo degli sconti non sta funzionando correttamente. Verificare la logica nel controller o nel servizio che gestisce gli sconti.\n`;
    }
    
    if (failedFrontendTests.some(t => t.test.test.includes('Corrispondenza'))) {
      markdown += `- **Sincronizzare i dati tra backend e frontend**: I valori degli sconti, subtotali o totali non corrispondono tra backend e frontend. Verificare che i dati vengano correttamente trasmessi e visualizzati.\n`;
    }
    
    if (results.frontendTests.flatMap(f => f.tests).some(t => t.test.includes('Indicatore di sconto') && t.status === 'warning')) {
      markdown += `- **Migliorare la visualizzazione degli sconti**: Aggiungere indicatori espliciti per mostrare al cliente che è stato applicato uno sconto e il suo valore.\n`;
    }
  }
  
  return markdown;
}

// Esegui il test
testDiscountApplication().catch(console.error);