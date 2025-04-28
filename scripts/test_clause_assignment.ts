/**
 * Script di test: Assegnazione Clausole
 * Simula l'assegnazione clausole, verifica che siano collegate ai moduli corretti
 * e controlla che in Frontend vengano visualizzate esattamente.
 */
import { db } from '../server/db';
import { contracts, quoteModules, quotes } from '../shared/schema';
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

interface ClauseTestResults {
  timestamp: string;
  contractId?: number;
  quoteId?: number;
  modulesTestResults: ModuleClauseTestResult[];
  frontendTestResults: FrontendClauseTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  }
}

interface ModuleClauseTestResult {
  moduleId: number;
  moduleName: string;
  tests: TestResult[];
}

interface FrontendClauseTestResult {
  quoteId: number;
  shareToken: string;
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
 * Ottieni un contratto casuale con clausole dal database
 */
async function getContractWithClauses() {
  const contractsWithClauses = await db.select().from(contracts).where(
    and(
      not(isNull(contracts.clauses)),
      not(isNull(contracts.quoteId))
    )
  );
  
  if (contractsWithClauses.length === 0) {
    throw new Error('Nessun contratto con clausole trovato nel database');
  }
  
  return contractsWithClauses[Math.floor(Math.random() * contractsWithClauses.length)];
}

/**
 * Ottieni i moduli associati a un preventivo
 */
async function getModulesByQuote(quoteId: number) {
  return await db.select().from(quoteModules).where(eq(quoteModules.quoteId, quoteId));
}

/**
 * Recupera il preventivo completo tramite API
 */
async function getQuoteWithModules(quoteId: number) {
  try {
    const response = await axios.get(`${API_BASE_URL}/quotes/${quoteId}`, { headers });
    return response.data;
  } catch (error) {
    console.error(`Errore nel recupero del preventivo ${quoteId}:`, error.message);
    return null;
  }
}

/**
 * Recupera il token di condivisione di un preventivo
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
 * Recupera la pagina di firma pubblica di un preventivo
 */
async function getPublicQuotePage(shareToken: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/quotes/share/${shareToken}`, { headers });
    return response.data;
  } catch (error) {
    console.error(`Errore nel recupero della pagina pubblica del preventivo (token: ${shareToken}):`, error.message);
    return null;
  }
}

/**
 * Verifica che le clausole siano assegnate correttamente ai moduli
 */
async function verifyModuleClauses(contract, apiQuote): Promise<ModuleClauseTestResult[]> {
  const result: ModuleClauseTestResult[] = [];
  
  // Ottieni le clausole del contratto
  const contractClauses = contract.clauses;
  if (!contractClauses || !Array.isArray(contractClauses) || contractClauses.length === 0) {
    console.log('⚠️ Il contratto non ha clausole definite');
    return result;
  }
  
  // Normalizza le clausole del contratto (potrebbero essere oggetti o ID)
  const contractClauseIds = contractClauses.map(c => 
    typeof c === 'object' ? c.id : c
  );
  
  console.log(`📋 Contratto ${contract.id} ha ${contractClauseIds.length} clausole: ${contractClauseIds.join(', ')}`);
  
  // Per ogni modulo nel preventivo
  for (const apiModule of apiQuote.modules || []) {
    const moduleName = apiModule.name;
    const moduleId = apiModule.id;
    
    const tests: TestResult[] = [];
    
    // Verifica se il modulo ha clausole
    if (!apiModule.clauses) {
      tests.push({
        test: 'Presenza clausole',
        status: 'fail',
        details: `Il modulo non ha un array 'clauses' definito nell'API`
      });
    } else if (!Array.isArray(apiModule.clauses)) {
      tests.push({
        test: 'Formato clausole',
        status: 'fail',
        details: `Le clausole del modulo non sono in formato array`
      });
    } else if (apiModule.clauses.length === 0) {
      tests.push({
        test: 'Presenza clausole',
        status: 'warning',
        details: `Il modulo non ha clausole assegnate, ma il contratto ne ha ${contractClauseIds.length}`
      });
    } else {
      tests.push({
        test: 'Presenza clausole',
        status: 'pass',
        details: `Il modulo ha ${apiModule.clauses.length} clausole assegnate`
      });
      
      // Normalizza le clausole del modulo
      const moduleClauseIds = apiModule.clauses.map(c => 
        typeof c === 'object' ? c.id : c
      );
      
      // Verifica che tutte le clausole del contratto siano presenti nel modulo
      const missingClauses = contractClauseIds.filter(id => !moduleClauseIds.includes(id));
      
      if (missingClauses.length === 0) {
        tests.push({
          test: 'Completezza clausole',
          status: 'pass',
          details: `Il modulo contiene tutte le clausole del contratto`
        });
      } else {
        tests.push({
          test: 'Completezza clausole',
          status: 'fail',
          details: `Il modulo manca di ${missingClauses.length} clausole presenti nel contratto: ${missingClauses.join(', ')}`,
          expected: contractClauseIds,
          actual: moduleClauseIds
        });
      }
      
      // Verifica se ci sono clausole extra nel modulo non presenti nel contratto
      const extraClauses = moduleClauseIds.filter(id => !contractClauseIds.includes(id));
      
      if (extraClauses.length === 0) {
        tests.push({
          test: 'Clausole extra',
          status: 'pass',
          details: `Il modulo non ha clausole extra rispetto al contratto`
        });
      } else {
        tests.push({
          test: 'Clausole extra',
          status: 'warning',
          details: `Il modulo ha ${extraClauses.length} clausole non presenti nel contratto: ${extraClauses.join(', ')}`,
          expected: contractClauseIds,
          actual: moduleClauseIds
        });
      }
    }
    
    result.push({
      moduleId,
      moduleName,
      tests
    });
  }
  
  return result;
}

/**
 * Verifica che le clausole siano presenti nella pagina di firma
 */
async function verifyFrontendClauses(contract, publicQuote, shareToken: string): Promise<FrontendClauseTestResult> {
  const tests: TestResult[] = [];
  const quoteId = contract.quoteId;
  
  // Verifica che la pagina pubblica sia stata recuperata
  if (!publicQuote) {
    tests.push({
      test: 'Recupero pagina pubblica',
      status: 'fail',
      details: `Impossibile recuperare la pagina pubblica del preventivo (token: ${shareToken})`
    });
    
    return {
      quoteId,
      shareToken,
      tests
    };
  }
  
  tests.push({
    test: 'Recupero pagina pubblica',
    status: 'pass',
    details: `Pagina pubblica del preventivo recuperata con successo`
  });
  
  // Verifica che la pagina pubblica abbia i moduli
  if (!publicQuote.modules || !Array.isArray(publicQuote.modules) || publicQuote.modules.length === 0) {
    tests.push({
      test: 'Presenza moduli in frontend',
      status: 'fail',
      details: `La pagina pubblica non ha moduli`
    });
    
    return {
      quoteId,
      shareToken,
      tests
    };
  }
  
  tests.push({
    test: 'Presenza moduli in frontend',
    status: 'pass',
    details: `La pagina pubblica ha ${publicQuote.modules.length} moduli`
  });
  
  // Ottieni le clausole del contratto
  const contractClauses = contract.clauses;
  if (!contractClauses || !Array.isArray(contractClauses) || contractClauses.length === 0) {
    tests.push({
      test: 'Clausole contratto',
      status: 'warning',
      details: `Il contratto non ha clausole definite`
    });
    
    return {
      quoteId,
      shareToken,
      tests
    };
  }
  
  // Normalizza le clausole del contratto
  const contractClauseIds = contractClauses.map(c => 
    typeof c === 'object' ? c.id : c
  );
  
  // Verifica che le clausole siano presenti nell'oggetto clausole globale
  if (!publicQuote.contractClauses) {
    tests.push({
      test: 'Presenza clausole in frontend',
      status: 'fail',
      details: `La pagina pubblica non ha l'oggetto 'contractClauses'`
    });
  } else if (!Array.isArray(publicQuote.contractClauses)) {
    tests.push({
      test: 'Formato clausole in frontend',
      status: 'fail',
      details: `Le clausole nella pagina pubblica non sono in formato array`
    });
  } else if (publicQuote.contractClauses.length === 0) {
    tests.push({
      test: 'Presenza clausole in frontend',
      status: 'fail',
      details: `La pagina pubblica non ha clausole, ma il contratto ne ha ${contractClauseIds.length}`
    });
  } else {
    tests.push({
      test: 'Presenza clausole in frontend',
      status: 'pass',
      details: `La pagina pubblica ha ${publicQuote.contractClauses.length} clausole`
    });
    
    // Normalizza le clausole del frontend
    const frontendClauseIds = publicQuote.contractClauses.map(c => 
      typeof c === 'object' ? c.id : c
    );
    
    // Verifica che tutte le clausole del contratto siano presenti nel frontend
    const missingClauses = contractClauseIds.filter(id => !frontendClauseIds.includes(id));
    
    if (missingClauses.length === 0) {
      tests.push({
        test: 'Completezza clausole in frontend',
        status: 'pass',
        details: `La pagina pubblica contiene tutte le clausole del contratto`
      });
    } else {
      tests.push({
        test: 'Completezza clausole in frontend',
        status: 'fail',
        details: `La pagina pubblica manca di ${missingClauses.length} clausole presenti nel contratto: ${missingClauses.join(', ')}`,
        expected: contractClauseIds,
        actual: frontendClauseIds
      });
    }
  }
  
  // Verifica che le clausole siano associate ai moduli nel frontend
  let modulesWithClauses = 0;
  const modulesWithoutClauses = [];
  
  for (const module of publicQuote.modules) {
    if (module.clauses && Array.isArray(module.clauses) && module.clauses.length > 0) {
      modulesWithClauses++;
    } else {
      modulesWithoutClauses.push(module.name);
    }
  }
  
  if (modulesWithClauses === publicQuote.modules.length) {
    tests.push({
      test: 'Associazione clausole ai moduli in frontend',
      status: 'pass',
      details: `Tutti i moduli nella pagina pubblica hanno clausole associate`
    });
  } else if (modulesWithClauses === 0) {
    tests.push({
      test: 'Associazione clausole ai moduli in frontend',
      status: 'fail',
      details: `Nessun modulo nella pagina pubblica ha clausole associate`
    });
  } else {
    tests.push({
      test: 'Associazione clausole ai moduli in frontend',
      status: 'warning',
      details: `${modulesWithClauses} moduli su ${publicQuote.modules.length} hanno clausole associate. Moduli senza clausole: ${modulesWithoutClauses.join(', ')}`
    });
  }
  
  return {
    quoteId,
    shareToken,
    tests
  };
}

/**
 * Funzione principale per il test delle clausole
 */
async function testClauseAssignment() {
  console.log('🧪 Avvio test di assegnazione clausole...');
  ensureOutputDir();
  
  try {
    // Ottieni un contratto casuale con clausole
    const contract = await getContractWithClauses();
    console.log(`📋 Utilizzando contratto ID ${contract.id} associato al preventivo ID ${contract.quoteId}`);
    
    // Recupera il preventivo completo tramite API
    console.log(`🔍 Recupero preventivo ${contract.quoteId} tramite API...`);
    const apiQuote = await getQuoteWithModules(contract.quoteId);
    
    if (!apiQuote) {
      throw new Error(`Impossibile recuperare il preventivo ${contract.quoteId} tramite API`);
    }
    
    console.log(`✅ Preventivo recuperato: "${apiQuote.title}"`);
    
    // Verifica che le clausole siano assegnate correttamente ai moduli
    console.log('🔍 Verifica assegnazione clausole ai moduli...');
    const moduleResults = await verifyModuleClauses(contract, apiQuote);
    
    // Recupera il token di condivisione del preventivo
    console.log(`🔍 Recupero token di condivisione per il preventivo ${contract.quoteId}...`);
    const shareToken = await getQuoteShareToken(contract.quoteId);
    
    let frontendResult: FrontendClauseTestResult = {
      quoteId: contract.quoteId,
      shareToken: shareToken || 'non disponibile',
      tests: [{
        test: 'Token di condivisione',
        status: shareToken ? 'pass' : 'fail',
        details: shareToken 
          ? `Token di condivisione recuperato: ${shareToken}` 
          : `Impossibile recuperare il token di condivisione`
      }]
    };
    
    // Se il token di condivisione è disponibile, verifica le clausole nel frontend
    if (shareToken) {
      console.log(`🔍 Recupero pagina pubblica del preventivo (token: ${shareToken})...`);
      const publicQuote = await getPublicQuotePage(shareToken);
      
      console.log('🔍 Verifica clausole nel frontend...');
      frontendResult = await verifyFrontendClauses(contract, publicQuote, shareToken);
    }
    
    // Calcola il riepilogo
    const allTests = [
      ...moduleResults.flatMap(m => m.tests),
      ...frontendResult.tests
    ];
    
    const summary = {
      total: allTests.length,
      passed: allTests.filter(t => t.status === 'pass').length,
      failed: allTests.filter(t => t.status === 'fail').length,
      warnings: allTests.filter(t => t.status === 'warning').length
    };
    
    // Crea il risultato
    const results: ClauseTestResults = {
      timestamp: new Date().toISOString(),
      contractId: contract.id,
      quoteId: contract.quoteId,
      modulesTestResults: moduleResults,
      frontendTestResults: [frontendResult],
      summary
    };
    
    // Salva i risultati
    const resultsFilePath = path.join(RESULTS_DIR, `clause-assignment-test-${Date.now()}.json`);
    fs.writeFileSync(resultsFilePath, JSON.stringify(results, null, 2));
    
    // Genera e salva il report in formato markdown
    const markdownReport = generateMarkdownReport(results);
    const markdownFilePath = path.join(RESULTS_DIR, `clause-assignment-test-${Date.now()}.md`);
    fs.writeFileSync(markdownFilePath, markdownReport);
    
    console.log(`\n📊 Riepilogo: ${summary.passed} test passati, ${summary.failed} falliti, ${summary.warnings} avvisi su un totale di ${summary.total}`);
    console.log(`📝 Risultati salvati in ${resultsFilePath} e ${markdownFilePath}`);
    
    return results;
  } catch (error) {
    console.error('❌ Errore durante il test di assegnazione clausole:', error);
    throw error;
  }
}

/**
 * Genera un report markdown dai risultati
 */
function generateMarkdownReport(results: ClauseTestResults): string {
  let markdown = `# Test Assegnazione Clausole\n\n`;
  markdown += `Data: ${new Date(results.timestamp).toLocaleString()}\n\n`;
  
  markdown += `## Informazioni Generali\n\n`;
  markdown += `- **Contratto ID**: ${results.contractId}\n`;
  markdown += `- **Preventivo ID**: ${results.quoteId}\n`;
  
  markdown += `\n## Riepilogo\n\n`;
  markdown += `- **Test Totali**: ${results.summary.total}\n`;
  markdown += `- **Test Passati**: ${results.summary.passed} (${Math.round(results.summary.passed / results.summary.total * 100)}%)\n`;
  markdown += `- **Test Falliti**: ${results.summary.failed} (${Math.round(results.summary.failed / results.summary.total * 100)}%)\n`;
  markdown += `- **Avvisi**: ${results.summary.warnings} (${Math.round(results.summary.warnings / results.summary.total * 100)}%)\n`;
  
  markdown += `\n## Test Moduli\n\n`;
  
  for (const moduleResult of results.modulesTestResults) {
    markdown += `### Modulo: ${moduleResult.moduleName} (ID: ${moduleResult.moduleId})\n\n`;
    markdown += `| Test | Stato | Dettagli |\n`;
    markdown += `|------|-------|----------|\n`;
    
    for (const test of moduleResult.tests) {
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
  
  for (const frontendResult of results.frontendTestResults) {
    markdown += `### Pagina Pubblica (Token: ${frontendResult.shareToken})\n\n`;
    markdown += `| Test | Stato | Dettagli |\n`;
    markdown += `|------|-------|----------|\n`;
    
    for (const test of frontendResult.tests) {
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
    markdown += `✅ **Tutti i test sono stati superati con successo!** Il sistema di assegnazione clausole funziona correttamente.\n`;
  } else if (results.summary.failed === 0) {
    markdown += `⚠️ **Test superati ma con ${results.summary.warnings} avvisi.** Il sistema di assegnazione clausole funziona ma potrebbe richiedere attenzione in alcune aree.\n`;
  } else {
    markdown += `❌ **Sono stati rilevati ${results.summary.failed} test falliti.** Si consiglia di rivedere il sistema di assegnazione clausole.\n`;
    
    // Aggiungi raccomandazioni specifiche
    markdown += `\n### Problemi Rilevati\n\n`;
    
    // Problemi nei moduli
    const failedModuleTests = results.modulesTestResults
      .flatMap(m => m.tests.filter(t => t.status === 'fail')
        .map(t => ({ moduleId: m.moduleId, moduleName: m.moduleName, test: t })));
    
    if (failedModuleTests.length > 0) {
      markdown += `#### Problemi nei Moduli\n\n`;
      
      for (const { moduleId, moduleName, test } of failedModuleTests) {
        markdown += `- **${moduleName} (ID: ${moduleId})**: ${test.test} - ${test.details}\n`;
        if (test.expected !== undefined && test.actual !== undefined) {
          markdown += `  - Valore atteso: \`${JSON.stringify(test.expected)}\`\n`;
          markdown += `  - Valore effettivo: \`${JSON.stringify(test.actual)}\`\n`;
        }
      }
      
      markdown += `\n`;
    }
    
    // Problemi nel frontend
    const failedFrontendTests = results.frontendTestResults
      .flatMap(f => f.tests.filter(t => t.status === 'fail')
        .map(t => ({ shareToken: f.shareToken, test: t })));
    
    if (failedFrontendTests.length > 0) {
      markdown += `#### Problemi nel Frontend\n\n`;
      
      for (const { shareToken, test } of failedFrontendTests) {
        markdown += `- **Pagina Pubblica (Token: ${shareToken})**: ${test.test} - ${test.details}\n`;
        if (test.expected !== undefined && test.actual !== undefined) {
          markdown += `  - Valore atteso: \`${JSON.stringify(test.expected)}\`\n`;
          markdown += `  - Valore effettivo: \`${JSON.stringify(test.actual)}\`\n`;
        }
      }
    }
  }
  
  return markdown;
}

// Esegui il test
testClauseAssignment().catch(console.error);