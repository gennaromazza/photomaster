/**
 * Script di test: Minimo/Massimo Scelte Variabili
 * Simula un cliente che seleziona prodotti, verificando che vengano rispettati:
 * - Minimo selezioni richieste (es: obbligo 3 prodotti)
 * - Massimo selezioni consentite (es: massimo 5 prodotti)
 */
import { db } from '../server/db';
import { quoteModules, quoteModuleItems, quotes } from '../shared/schema';
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

// Interfacce
interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  expected?: any;
  actual?: any;
}

interface MinMaxTestResults {
  timestamp: string;
  moduleTests: ModuleTestResult[];
  simulationTests: SimulationTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  }
}

interface ModuleTestResult {
  moduleId: number;
  moduleName: string;
  quoteId: number;
  minSelectCount: number | null;
  maxSelectCount: number | null;
  itemCount: number;
  tests: TestResult[];
}

interface SimulationTestResult {
  moduleId: number;
  moduleName: string;
  shareToken: string;
  selectedItems: number[];
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
 * Ottieni moduli variabili con vincoli min/max dal database
 */
async function getVariableModulesWithConstraints() {
  const modules = await db.select().from(quoteModules).where(
    and(
      eq(quoteModules.type, 'variable'),
      not(
        and(
          isNull(quoteModules.minSelectCount),
          isNull(quoteModules.maxSelectCount)
        )
      )
    )
  );
  
  if (modules.length === 0) {
    throw new Error('Nessun modulo variabile con vincoli min/max trovato nel database');
  }
  
  return modules;
}

/**
 * Ottieni la token di condivisione di un preventivo
 */
async function getQuoteShareToken(quoteId: number) {
  try {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
    return quote?.shareToken;
  } catch (error) {
    console.error(`Errore nel recupero del token di condivisione per il preventivo ${quoteId}:`, error.message);
    return null;
  }
}

/**
 * Ottieni gli elementi di un modulo
 */
async function getModuleItems(moduleId: number) {
  return await db.select().from(quoteModuleItems).where(eq(quoteModuleItems.moduleId, moduleId));
}

/**
 * Recupera la pagina pubblica di un preventivo
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
 * Simula la selezione di elementi in un modulo
 */
async function simulateItemSelection(
  shareToken: string, 
  moduleId: number, 
  selectedItemIds: number[]
) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/quotes/share/${shareToken}/modules/${moduleId}/select`,
      { selectedItemIds },
      { headers }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Errore nella simulazione della selezione:`, error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Verifica i vincoli min/max di un modulo
 */
async function verifyModuleConstraints(module, items): Promise<TestResult[]> {
  const tests: TestResult[] = [];
  
  // Verifica che il modulo abbia il tipo corretto
  if (module.type !== 'variable') {
    tests.push({
      test: 'Tipo modulo',
      status: 'fail',
      details: `Il modulo non è di tipo 'variable', ma '${module.type}'`
    });
    return tests;
  }
  
  tests.push({
    test: 'Tipo modulo',
    status: 'pass',
    details: `Il modulo è di tipo 'variable'`
  });
  
  // Verifica che il modulo abbia almeno un vincolo min o max
  if (module.minSelectCount === null && module.maxSelectCount === null) {
    tests.push({
      test: 'Presenza vincoli',
      status: 'warning',
      details: `Il modulo non ha vincoli min/max definiti`
    });
  } else {
    tests.push({
      test: 'Presenza vincoli',
      status: 'pass',
      details: `Il modulo ha vincoli definiti: ${module.minSelectCount !== null ? `min=${module.minSelectCount}` : ''} ${module.maxSelectCount !== null ? `max=${module.maxSelectCount}` : ''}`
    });
  }
  
  // Verifica che ci siano abbastanza elementi per soddisfare il vincolo minimo
  if (module.minSelectCount !== null && module.minSelectCount > 0) {
    if (items.length < module.minSelectCount) {
      tests.push({
        test: 'Elementi sufficienti per min',
        status: 'fail',
        details: `Il modulo richiede minimo ${module.minSelectCount} selezioni, ma ha solo ${items.length} elementi`,
        expected: module.minSelectCount,
        actual: items.length
      });
    } else {
      tests.push({
        test: 'Elementi sufficienti per min',
        status: 'pass',
        details: `Il modulo ha abbastanza elementi (${items.length}) per soddisfare il minimo richiesto (${module.minSelectCount})`
      });
    }
  }
  
  // Verifica validità dei vincoli
  if (module.minSelectCount !== null && module.maxSelectCount !== null) {
    if (module.minSelectCount > module.maxSelectCount) {
      tests.push({
        test: 'Validità vincoli',
        status: 'fail',
        details: `Il vincolo minimo (${module.minSelectCount}) è maggiore del vincolo massimo (${module.maxSelectCount})`,
        expected: `min <= max`,
        actual: `${module.minSelectCount} > ${module.maxSelectCount}`
      });
    } else {
      tests.push({
        test: 'Validità vincoli',
        status: 'pass',
        details: `I vincoli min (${module.minSelectCount}) e max (${module.maxSelectCount}) sono validi`
      });
    }
  }
  
  return tests;
}

/**
 * Verifica se i vincoli min/max sono rispettati nel frontend
 */
async function verifyFrontendConstraints(
  module, 
  items, 
  publicQuote
): Promise<TestResult[]> {
  const tests: TestResult[] = [];
  
  // Verifica che la pagina pubblica sia stata recuperata
  if (!publicQuote) {
    tests.push({
      test: 'Recupero pagina pubblica',
      status: 'fail',
      details: `Impossibile recuperare la pagina pubblica`
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
  
  // Verifica che i vincoli siano presenti nel frontend
  if (frontendModule.minSelectCount === undefined || frontendModule.minSelectCount === null) {
    if (module.minSelectCount !== null) {
      tests.push({
        test: 'Vincolo minimo in frontend',
        status: 'fail',
        details: `Il vincolo minimo (${module.minSelectCount}) non è presente nel frontend`
      });
    } else {
      tests.push({
        test: 'Vincolo minimo in frontend',
        status: 'pass',
        details: `Nessun vincolo minimo nel backend, correttamente assente nel frontend`
      });
    }
  } else if (frontendModule.minSelectCount !== module.minSelectCount) {
    tests.push({
      test: 'Corrispondenza vincolo minimo',
      status: 'fail',
      details: `Il vincolo minimo nel frontend (${frontendModule.minSelectCount}) non corrisponde al backend (${module.minSelectCount})`,
      expected: module.minSelectCount,
      actual: frontendModule.minSelectCount
    });
  } else {
    tests.push({
      test: 'Corrispondenza vincolo minimo',
      status: 'pass',
      details: `Il vincolo minimo nel frontend (${frontendModule.minSelectCount}) corrisponde al backend`
    });
  }
  
  if (frontendModule.maxSelectCount === undefined || frontendModule.maxSelectCount === null) {
    if (module.maxSelectCount !== null) {
      tests.push({
        test: 'Vincolo massimo in frontend',
        status: 'fail',
        details: `Il vincolo massimo (${module.maxSelectCount}) non è presente nel frontend`
      });
    } else {
      tests.push({
        test: 'Vincolo massimo in frontend',
        status: 'pass',
        details: `Nessun vincolo massimo nel backend, correttamente assente nel frontend`
      });
    }
  } else if (frontendModule.maxSelectCount !== module.maxSelectCount) {
    tests.push({
      test: 'Corrispondenza vincolo massimo',
      status: 'fail',
      details: `Il vincolo massimo nel frontend (${frontendModule.maxSelectCount}) non corrisponde al backend (${module.maxSelectCount})`,
      expected: module.maxSelectCount,
      actual: frontendModule.maxSelectCount
    });
  } else {
    tests.push({
      test: 'Corrispondenza vincolo massimo',
      status: 'pass',
      details: `Il vincolo massimo nel frontend (${frontendModule.maxSelectCount}) corrisponde al backend`
    });
  }
  
  // Verifica che gli elementi del modulo siano presenti nel frontend
  if (!frontendModule.items || !Array.isArray(frontendModule.items)) {
    tests.push({
      test: 'Elementi modulo in frontend',
      status: 'fail',
      details: `Il modulo nel frontend non ha elementi`
    });
    return tests;
  }
  
  if (frontendModule.items.length !== items.length) {
    tests.push({
      test: 'Numero elementi in frontend',
      status: 'fail',
      details: `Il numero di elementi nel frontend (${frontendModule.items.length}) non corrisponde al backend (${items.length})`,
      expected: items.length,
      actual: frontendModule.items.length
    });
  } else {
    tests.push({
      test: 'Numero elementi in frontend',
      status: 'pass',
      details: `Il numero di elementi nel frontend (${frontendModule.items.length}) corrisponde al backend`
    });
  }
  
  return tests;
}

/**
 * Simula diverse selezioni di elementi e verifica il rispetto dei vincoli
 */
async function simulateSelections(
  module, 
  items, 
  shareToken
): Promise<SimulationTestResult[]> {
  const results: SimulationTestResult[] = [];
  
  // Nessuna selezione
  if (module.minSelectCount !== null && module.minSelectCount > 0) {
    console.log(`🔍 Simulazione: nessuna selezione (deve fallire se minSelectCount=${module.minSelectCount})...`);
    
    const noSelectionTests: TestResult[] = [];
    const noSelectionResponse = await simulateItemSelection(shareToken, module.id, []);
    
    if (noSelectionResponse.success) {
      noSelectionTests.push({
        test: 'Validazione minimo',
        status: 'fail',
        details: `Il sistema ha accettato una selezione vuota nonostante il minimo richiesto sia ${module.minSelectCount}`,
        expected: false,
        actual: true
      });
    } else {
      noSelectionTests.push({
        test: 'Validazione minimo',
        status: 'pass',
        details: `Il sistema ha correttamente rifiutato una selezione vuota (minSelectCount=${module.minSelectCount})`
      });
    }
    
    results.push({
      moduleId: module.id,
      moduleName: module.name,
      shareToken,
      selectedItems: [],
      tests: noSelectionTests
    });
  }
  
  // Meno del minimo richiesto (se minSelectCount > 1)
  if (module.minSelectCount !== null && module.minSelectCount > 1 && items.length >= module.minSelectCount) {
    const belowMinCount = module.minSelectCount - 1;
    console.log(`🔍 Simulazione: ${belowMinCount} selezioni (deve fallire se minSelectCount=${module.minSelectCount})...`);
    
    const belowMinTests: TestResult[] = [];
    const itemIds = items.slice(0, belowMinCount).map(item => item.id);
    const belowMinResponse = await simulateItemSelection(shareToken, module.id, itemIds);
    
    if (belowMinResponse.success) {
      belowMinTests.push({
        test: 'Validazione sotto il minimo',
        status: 'fail',
        details: `Il sistema ha accettato ${belowMinCount} selezioni nonostante il minimo richiesto sia ${module.minSelectCount}`,
        expected: false,
        actual: true
      });
    } else {
      belowMinTests.push({
        test: 'Validazione sotto il minimo',
        status: 'pass',
        details: `Il sistema ha correttamente rifiutato ${belowMinCount} selezioni (minSelectCount=${module.minSelectCount})`
      });
    }
    
    results.push({
      moduleId: module.id,
      moduleName: module.name,
      shareToken,
      selectedItems: itemIds,
      tests: belowMinTests
    });
  }
  
  // Esattamente il minimo richiesto
  if (module.minSelectCount !== null && items.length >= module.minSelectCount) {
    console.log(`🔍 Simulazione: ${module.minSelectCount} selezioni (deve avere successo)...`);
    
    const exactMinTests: TestResult[] = [];
    const itemIds = items.slice(0, module.minSelectCount).map(item => item.id);
    const exactMinResponse = await simulateItemSelection(shareToken, module.id, itemIds);
    
    if (exactMinResponse.success) {
      exactMinTests.push({
        test: 'Validazione minimo esatto',
        status: 'pass',
        details: `Il sistema ha correttamente accettato ${module.minSelectCount} selezioni (minSelectCount=${module.minSelectCount})`
      });
    } else {
      exactMinTests.push({
        test: 'Validazione minimo esatto',
        status: 'fail',
        details: `Il sistema ha rifiutato ${module.minSelectCount} selezioni nonostante sia esattamente il minimo richiesto`,
        expected: true,
        actual: false
      });
    }
    
    results.push({
      moduleId: module.id,
      moduleName: module.name,
      shareToken,
      selectedItems: itemIds,
      tests: exactMinTests
    });
  }
  
  // Più del massimo consentito
  if (module.maxSelectCount !== null && items.length > module.maxSelectCount) {
    const aboveMaxCount = module.maxSelectCount + 1;
    console.log(`🔍 Simulazione: ${aboveMaxCount} selezioni (deve fallire se maxSelectCount=${module.maxSelectCount})...`);
    
    const aboveMaxTests: TestResult[] = [];
    const itemIds = items.slice(0, aboveMaxCount).map(item => item.id);
    const aboveMaxResponse = await simulateItemSelection(shareToken, module.id, itemIds);
    
    if (aboveMaxResponse.success) {
      aboveMaxTests.push({
        test: 'Validazione sopra il massimo',
        status: 'fail',
        details: `Il sistema ha accettato ${aboveMaxCount} selezioni nonostante il massimo consentito sia ${module.maxSelectCount}`,
        expected: false,
        actual: true
      });
    } else {
      aboveMaxTests.push({
        test: 'Validazione sopra il massimo',
        status: 'pass',
        details: `Il sistema ha correttamente rifiutato ${aboveMaxCount} selezioni (maxSelectCount=${module.maxSelectCount})`
      });
    }
    
    results.push({
      moduleId: module.id,
      moduleName: module.name,
      shareToken,
      selectedItems: itemIds,
      tests: aboveMaxTests
    });
  }
  
  // Esattamente il massimo consentito
  if (module.maxSelectCount !== null && items.length >= module.maxSelectCount) {
    console.log(`🔍 Simulazione: ${module.maxSelectCount} selezioni (deve avere successo)...`);
    
    const exactMaxTests: TestResult[] = [];
    const itemIds = items.slice(0, module.maxSelectCount).map(item => item.id);
    const exactMaxResponse = await simulateItemSelection(shareToken, module.id, itemIds);
    
    if (exactMaxResponse.success) {
      exactMaxTests.push({
        test: 'Validazione massimo esatto',
        status: 'pass',
        details: `Il sistema ha correttamente accettato ${module.maxSelectCount} selezioni (maxSelectCount=${module.maxSelectCount})`
      });
    } else {
      exactMaxTests.push({
        test: 'Validazione massimo esatto',
        status: 'fail',
        details: `Il sistema ha rifiutato ${module.maxSelectCount} selezioni nonostante sia esattamente il massimo consentito`,
        expected: true,
        actual: false
      });
    }
    
    results.push({
      moduleId: module.id,
      moduleName: module.name,
      shareToken,
      selectedItems: itemIds,
      tests: exactMaxTests
    });
  }
  
  // Una selezione valida tra min e max
  if (
    module.minSelectCount !== null && 
    module.maxSelectCount !== null && 
    module.minSelectCount < module.maxSelectCount && 
    items.length > module.minSelectCount
  ) {
    const validCount = Math.floor((module.minSelectCount + module.maxSelectCount) / 2);
    console.log(`🔍 Simulazione: ${validCount} selezioni (deve avere successo)...`);
    
    const validTests: TestResult[] = [];
    const itemIds = items.slice(0, validCount).map(item => item.id);
    const validResponse = await simulateItemSelection(shareToken, module.id, itemIds);
    
    if (validResponse.success) {
      validTests.push({
        test: 'Validazione selezione valida',
        status: 'pass',
        details: `Il sistema ha correttamente accettato ${validCount} selezioni (tra minSelectCount=${module.minSelectCount} e maxSelectCount=${module.maxSelectCount})`
      });
    } else {
      validTests.push({
        test: 'Validazione selezione valida',
        status: 'fail',
        details: `Il sistema ha rifiutato ${validCount} selezioni nonostante sia tra min e max`,
        expected: true,
        actual: false
      });
    }
    
    results.push({
      moduleId: module.id,
      moduleName: module.name,
      shareToken,
      selectedItems: itemIds,
      tests: validTests
    });
  }
  
  return results;
}

/**
 * Funzione principale per il test dei vincoli min/max
 */
async function testMinMaxConstraints() {
  console.log('🧪 Avvio test vincoli minimo/massimo per moduli variabili...');
  ensureOutputDir();
  
  try {
    // Ottieni moduli variabili con vincoli min/max
    const modules = await getVariableModulesWithConstraints();
    console.log(`📋 Trovati ${modules.length} moduli variabili con vincoli min/max`);
    
    // Per evitare di sovraccaricare il sistema, limitiamo i test a 3 moduli
    const modulesToTest = modules.slice(0, 3);
    console.log(`📋 Test limitato a ${modulesToTest.length} moduli`);
    
    const moduleTestResults: ModuleTestResult[] = [];
    const simulationTestResults: SimulationTestResult[] = [];
    
    for (const module of modulesToTest) {
      console.log(`\n🔍 Test modulo "${module.name}" (ID: ${module.id})`);
      
      // Ottieni gli elementi del modulo
      const items = await getModuleItems(module.id);
      console.log(`📋 Modulo ha ${items.length} elementi`);
      
      // Verifica i vincoli min/max del modulo
      const moduleTests = await verifyModuleConstraints(module, items);
      
      moduleTestResults.push({
        moduleId: module.id,
        moduleName: module.name,
        quoteId: module.quoteId,
        minSelectCount: module.minSelectCount,
        maxSelectCount: module.maxSelectCount,
        itemCount: items.length,
        tests: moduleTests
      });
      
      // Ottieni il token di condivisione del preventivo
      const shareToken = await getQuoteShareToken(module.quoteId);
      
      if (!shareToken) {
        console.log(`⚠️ Impossibile recuperare il token di condivisione per il preventivo ${module.quoteId}, saltando test frontend`);
        continue;
      }
      
      console.log(`📋 Token di condivisione: ${shareToken}`);
      
      // Recupera la pagina pubblica
      const publicQuote = await getPublicQuotePage(shareToken);
      
      // Verifica i vincoli min/max nel frontend
      const frontendTests = await verifyFrontendConstraints(module, items, publicQuote);
      moduleTestResults[moduleTestResults.length - 1].tests.push(...frontendTests);
      
      // Simula diverse selezioni e verifica il rispetto dei vincoli
      console.log(`🔍 Simulazione selezioni per il modulo "${module.name}" (ID: ${module.id})...`);
      const simulationResults = await simulateSelections(module, items, shareToken);
      simulationTestResults.push(...simulationResults);
    }
    
    // Calcola il riepilogo
    const allTests = [
      ...moduleTestResults.flatMap(m => m.tests),
      ...simulationTestResults.flatMap(s => s.tests)
    ];
    
    const summary = {
      total: allTests.length,
      passed: allTests.filter(t => t.status === 'pass').length,
      failed: allTests.filter(t => t.status === 'fail').length,
      warnings: allTests.filter(t => t.status === 'warning').length
    };
    
    // Crea il risultato
    const results: MinMaxTestResults = {
      timestamp: new Date().toISOString(),
      moduleTests: moduleTestResults,
      simulationTests: simulationTestResults,
      summary
    };
    
    // Salva i risultati
    const resultsFilePath = path.join(RESULTS_DIR, `min-max-test-${Date.now()}.json`);
    fs.writeFileSync(resultsFilePath, JSON.stringify(results, null, 2));
    
    // Genera e salva il report in formato markdown
    const markdownReport = generateMarkdownReport(results);
    const markdownFilePath = path.join(RESULTS_DIR, `min-max-test-${Date.now()}.md`);
    fs.writeFileSync(markdownFilePath, markdownReport);
    
    console.log(`\n📊 Riepilogo: ${summary.passed} test passati, ${summary.failed} falliti, ${summary.warnings} avvisi su un totale di ${summary.total}`);
    console.log(`📝 Risultati salvati in ${resultsFilePath} e ${markdownFilePath}`);
    
    return results;
  } catch (error) {
    console.error('❌ Errore durante il test dei vincoli min/max:', error);
    throw error;
  }
}

/**
 * Genera un report markdown dai risultati
 */
function generateMarkdownReport(results: MinMaxTestResults): string {
  let markdown = `# Test Vincoli Minimo/Massimo per Moduli Variabili\n\n`;
  markdown += `Data: ${new Date(results.timestamp).toLocaleString()}\n\n`;
  
  markdown += `## Riepilogo\n\n`;
  markdown += `- **Test Totali**: ${results.summary.total}\n`;
  markdown += `- **Test Passati**: ${results.summary.passed} (${Math.round(results.summary.passed / results.summary.total * 100)}%)\n`;
  markdown += `- **Test Falliti**: ${results.summary.failed} (${Math.round(results.summary.failed / results.summary.total * 100)}%)\n`;
  markdown += `- **Avvisi**: ${results.summary.warnings} (${Math.round(results.summary.warnings / results.summary.total * 100)}%)\n`;
  
  markdown += `\n## Moduli Testati\n\n`;
  markdown += `| ID | Nome | Preventivo ID | Min | Max | Elementi | Risultato |\n`;
  markdown += `|----|------|---------------|-----|-----|----------|----------|\n`;
  
  for (const moduleTest of results.moduleTests) {
    const passedTests = moduleTest.tests.filter(t => t.status === 'pass').length;
    const totalTests = moduleTest.tests.length;
    const status = passedTests === totalTests ? '✅' : (passedTests > 0 ? '⚠️' : '❌');
    
    markdown += `| ${moduleTest.moduleId} | ${moduleTest.moduleName} | ${moduleTest.quoteId} | ${moduleTest.minSelectCount || '-'} | ${moduleTest.maxSelectCount || '-'} | ${moduleTest.itemCount} | ${status} ${passedTests}/${totalTests} |\n`;
  }
  
  markdown += `\n## Dettagli Test per Modulo\n\n`;
  
  for (const moduleTest of results.moduleTests) {
    markdown += `### Modulo: ${moduleTest.moduleName} (ID: ${moduleTest.moduleId})\n\n`;
    markdown += `- **Preventivo ID**: ${moduleTest.quoteId}\n`;
    markdown += `- **Min**: ${moduleTest.minSelectCount || '-'}\n`;
    markdown += `- **Max**: ${moduleTest.maxSelectCount || '-'}\n`;
    markdown += `- **Elementi**: ${moduleTest.itemCount}\n\n`;
    
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
  
  markdown += `## Risultati Simulazioni\n\n`;
  
  for (const simulationTest of results.simulationTests) {
    markdown += `### Modulo: ${simulationTest.moduleName} (ID: ${simulationTest.moduleId})\n\n`;
    markdown += `- **Elementi Selezionati**: ${simulationTest.selectedItems.length > 0 ? simulationTest.selectedItems.join(', ') : 'nessuno'}\n\n`;
    
    markdown += `| Test | Stato | Dettagli |\n`;
    markdown += `|------|-------|----------|\n`;
    
    for (const test of simulationTest.tests) {
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
    markdown += `✅ **Tutti i test sono stati superati con successo!** Il sistema di vincoli min/max per i moduli variabili funziona correttamente.\n`;
  } else if (results.summary.failed === 0) {
    markdown += `⚠️ **Test superati ma con ${results.summary.warnings} avvisi.** Il sistema di vincoli min/max funziona ma potrebbe richiedere attenzione in alcune aree.\n`;
  } else {
    markdown += `❌ **Sono stati rilevati ${results.summary.failed} test falliti.** Si consiglia di rivedere il sistema di vincoli min/max.\n`;
    
    // Aggiungi raccomandazioni specifiche
    markdown += `\n### Problemi Rilevati\n\n`;
    
    // Problemi nei moduli
    const failedModuleTests = results.moduleTests
      .flatMap(m => m.tests.filter(t => t.status === 'fail')
        .map(t => ({ moduleId: m.moduleId, moduleName: m.moduleName, minSelectCount: m.minSelectCount, maxSelectCount: m.maxSelectCount, test: t })));
    
    if (failedModuleTests.length > 0) {
      markdown += `#### Problemi di Configurazione\n\n`;
      
      for (const { moduleId, moduleName, minSelectCount, maxSelectCount, test } of failedModuleTests) {
        markdown += `- **${moduleName} (ID: ${moduleId}, Min: ${minSelectCount || '-'}, Max: ${maxSelectCount || '-'})**: ${test.test} - ${test.details}\n`;
        if (test.expected !== undefined && test.actual !== undefined) {
          markdown += `  - Valore atteso: \`${JSON.stringify(test.expected)}\`\n`;
          markdown += `  - Valore effettivo: \`${JSON.stringify(test.actual)}\`\n`;
        }
      }
      
      markdown += `\n`;
    }
    
    // Problemi nelle simulazioni
    const failedSimulationTests = results.simulationTests
      .flatMap(s => s.tests.filter(t => t.status === 'fail')
        .map(t => ({ moduleId: s.moduleId, moduleName: s.moduleName, selectedItems: s.selectedItems.length, test: t })));
    
    if (failedSimulationTests.length > 0) {
      markdown += `#### Problemi di Validazione\n\n`;
      
      for (const { moduleId, moduleName, selectedItems, test } of failedSimulationTests) {
        markdown += `- **${moduleName} (ID: ${moduleId}, Selezioni: ${selectedItems})**: ${test.test} - ${test.details}\n`;
        if (test.expected !== undefined && test.actual !== undefined) {
          markdown += `  - Valore atteso: \`${JSON.stringify(test.expected)}\`\n`;
          markdown += `  - Valore effettivo: \`${JSON.stringify(test.actual)}\`\n`;
        }
      }
    }
    
    // Raccomandazioni generali
    markdown += `\n### Raccomandazioni\n\n`;
    
    if (failedModuleTests.some(t => t.test.test.includes('Validità vincoli'))) {
      markdown += `- **Correggere i vincoli non validi**: Ci sono moduli in cui il vincolo minimo è maggiore del vincolo massimo. Assicurarsi che minSelectCount <= maxSelectCount.\n`;
    }
    
    if (failedModuleTests.some(t => t.test.test.includes('Elementi sufficienti'))) {
      markdown += `- **Aggiungere più elementi ai moduli**: Alcuni moduli non hanno abbastanza elementi per soddisfare il vincolo minimo richiesto.\n`;
    }
    
    if (failedModuleTests.some(t => t.test.test.includes('Vincolo minimo in frontend'))) {
      markdown += `- **Sincronizzare i vincoli tra backend e frontend**: I vincoli min/max non vengono correttamente trasmessi al frontend.\n`;
    }
    
    if (failedSimulationTests.some(t => t.test.test.includes('Validazione minimo'))) {
      markdown += `- **Correggere la validazione del minimo**: Il sistema non sta bloccando le selezioni che non raggiungono il minimo richiesto.\n`;
    }
    
    if (failedSimulationTests.some(t => t.test.test.includes('Validazione sopra il massimo'))) {
      markdown += `- **Correggere la validazione del massimo**: Il sistema non sta bloccando le selezioni che superano il massimo consentito.\n`;
    }
  }
  
  return markdown;
}

// Esegui il test
testMinMaxConstraints().catch(console.error);