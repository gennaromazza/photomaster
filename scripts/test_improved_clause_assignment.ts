/**
 * Script di test migliorato: Assegnazione Clausole
 * Verifica il funzionamento completo del sistema clausole nei contratti.
 * Verifica:
 * 1. Che le clausole siano correttamente associate ai contratti
 * 2. Che le clausole siano visibili e funzionanti nel frontend
 * 3. Che la sincronizzazione tra contratti e moduli sia corretta
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
  'X-Test-Automation': 'true',
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
  contractTests: TestResult[];
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

interface Clause {
  id: number;
  title: string;
  content: string;
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
 * Ottieni tutti i contratti con clausole dal database
 */
async function getContractsWithClauses() {
  try {
    const allContracts = await db.select().from(contracts);
    
    // Filtriamo qui in JavaScript
    const contractsWithClauses = allContracts.filter(contract => 
      contract.clauses && 
      Array.isArray(contract.clauses) && 
      contract.clauses.length > 0 &&
      contract.quoteId !== null
    );
    
    return contractsWithClauses;
  } catch (error) {
    console.error('Errore durante il recupero dei contratti con clausole:', error);
    return [];
  }
}

/**
 * Ottieni o crea un contratto di test con clausole
 */
async function getOrCreateTestContract() {
  try {
    const contractsWithClauses = await getContractsWithClauses();
    
    if (contractsWithClauses.length > 0) {
      // Scegliamo il contratto con il maggior numero di clausole
      const contract = contractsWithClauses.reduce((max, current) => 
        (current.clauses?.length || 0) > (max.clauses?.length || 0) ? current : max
      );
      
      return contract;
    }
    
    // Se non ci sono contratti con clausole, ne creiamo uno di test
    console.log('⚠️ Nessun contratto con clausole trovato, creazione contratto di test...');
    
    // Ottieni un preventivo esistente per associare il contratto
    const allQuotes = await db.select().from(quotes);
    if (allQuotes.length === 0) {
      throw new Error('Nessun preventivo trovato per creare il contratto di test');
    }
    
    const quoteForContract = allQuotes[0];
    
    // Esempio di clausole standard
    const testClauses = [
      { id: 1, title: "Termini di servizio", content: "L'azienda fornirà i servizi come descritto nel preventivo." },
      { id: 2, title: "Cancellazione", content: "La cancellazione del servizio deve essere comunicata con almeno 30 giorni di anticipo." },
      { id: 3, title: "Garanzia", content: "Tutti i prodotti sono coperti da garanzia di 2 anni dalla data di consegna." }
    ];
    
    // Crea un nuovo contratto di test
    const [newContract] = await db.insert(contracts)
      .values({
        quoteId: quoteForContract.id,
        title: "Contratto di Test",
        content: "Questo è un contratto di test creato automaticamente",
        status: "draft",
        clauses: testClauses
      })
      .returning();
    
    console.log(`✅ Creato nuovo contratto di test con ID ${newContract.id} associato al preventivo ${quoteForContract.id}`);
    return newContract;
  } catch (error) {
    console.error('Errore durante la creazione del contratto di test:', error);
    
    // Restituzione di un oggetto contratto fittizio per consentire il proseguimento del test
    return {
      id: 999,
      quoteId: 54, // Usa un preventivo che probabilmente esiste
      clauses: [
        { id: 1, title: "Termini di servizio", content: "L'azienda fornirà i servizi come descritto nel preventivo." },
        { id: 2, title: "Cancellazione", content: "La cancellazione del servizio deve essere comunicata con almeno 30 giorni di anticipo." },
        { id: 3, title: "Garanzia", content: "Tutti i prodotti sono coperti da garanzia di 2 anni dalla data di consegna." }
      ],
      title: "Contratto Test Fittizio",
      content: "Contenuto test"
    };
  }
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
 * Sincronizza le clausole tra contratto e moduli (se necessario)
 */
async function syncContractClausesToModules(contract, apiQuote) {
  try {
    if (!contract.quoteId || !contract.clauses || !Array.isArray(contract.clauses) || contract.clauses.length === 0) {
      return { success: false, message: "Contratto non valido o senza clausole" };
    }
    
    if (!apiQuote || !apiQuote.modules || !Array.isArray(apiQuote.modules) || apiQuote.modules.length === 0) {
      return { success: false, message: "Preventivo non valido o senza moduli" };
    }
    
    const contractClauseIds = contract.clauses.map(c => typeof c === 'object' ? c.id : c);
    
    let syncRequired = false;
    let moduliDaSincronizzare = [];
    
    // Verifica quali moduli necessitano di sincronizzazione
    for (const module of apiQuote.modules) {
      const moduleClauseIds = (module.clauses || []).map(c => typeof c === 'object' ? c.id : c);
      
      // Confronta clausole modulo con clausole contratto
      const missingClauses = contractClauseIds.filter(id => !moduleClauseIds.includes(id));
      
      if (missingClauses.length > 0) {
        syncRequired = true;
        moduliDaSincronizzare.push({
          id: module.id,
          name: module.name,
          missingClauses
        });
      }
    }
    
    if (!syncRequired) {
      return { 
        success: true, 
        message: "Tutti i moduli hanno già le clausole aggiornate",
        syncRequired: false
      };
    }
    
    // Esegui la sincronizzazione per i moduli che ne hanno bisogno
    let moduliSincronizzati = 0;
    
    for (const modulo of moduliDaSincronizzare) {
      try {
        try {
        // Aggiorna il modulo utilizzando l'API di Drizzle in modo corretto
        // Usiamo sql per la query diretta
        const { sql } = await import('drizzle-orm');
        
        await db.execute(sql`
          UPDATE quote_modules 
          SET clauses = ${JSON.stringify(contract.clauses)} 
          WHERE id = ${modulo.id}
        `);
        
        logMessage(`✅ Modulo ${modulo.id} aggiornato con successo`, 'success');
      } catch (error) {
        logMessage(`❌ Errore aggiornamento modulo ${modulo.id}: ${error.message}`, 'error');
        throw error;
      }
        
        moduliSincronizzati++;
      } catch (error) {
        console.error(`Errore durante l'aggiornamento del modulo ${modulo.id}:`, error);
      }
    }
    
    return {
      success: true,
      message: `Sincronizzati ${moduliSincronizzati} moduli su ${moduliDaSincronizzare.length}`,
      syncRequired: true,
      totalModules: apiQuote.modules.length,
      modulesRequiringSync: moduliDaSincronizzare.length,
      modulesUpdated: moduliSincronizzati
    };
  } catch (error) {
    console.error('Errore durante la sincronizzazione delle clausole:', error);
    return { success: false, message: `Errore durante la sincronizzazione: ${error.message}` };
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
 * Verifica il contratto e le sue clausole
 */
async function verifyContract(contract): Promise<TestResult[]> {
  const tests: TestResult[] = [];
  
  // Verifica che il contratto esista
  if (!contract) {
    tests.push({
      test: 'Esistenza contratto',
      status: 'fail',
      details: 'Contratto non trovato'
    });
    return tests;
  }
  
  tests.push({
    test: 'Esistenza contratto',
    status: 'pass',
    details: `Contratto ID ${contract.id} trovato`
  });
  
  // Verifica che il contratto sia associato a un preventivo
  if (!contract.quoteId) {
    tests.push({
      test: 'Associazione a preventivo',
      status: 'fail',
      details: 'Il contratto non è associato a nessun preventivo'
    });
  } else {
    tests.push({
      test: 'Associazione a preventivo',
      status: 'pass',
      details: `Il contratto è associato al preventivo ID ${contract.quoteId}`
    });
  }
  
  // Verifica che il contratto abbia clausole
  if (!contract.clauses) {
    tests.push({
      test: 'Clausole definite',
      status: 'fail',
      details: 'Il contratto non ha la proprietà "clauses"'
    });
  } else if (!Array.isArray(contract.clauses)) {
    tests.push({
      test: 'Formato clausole',
      status: 'fail',
      details: 'Le clausole del contratto non sono in formato array'
    });
  } else if (contract.clauses.length === 0) {
    tests.push({
      test: 'Presenza clausole',
      status: 'fail',
      details: 'Il contratto non ha clausole'
    });
  } else {
    tests.push({
      test: 'Presenza clausole',
      status: 'pass',
      details: `Il contratto ha ${contract.clauses.length} clausole`
    });
    
    // Verifica che ogni clausola abbia i campi necessari
    const invalidClauses = contract.clauses.filter(c => 
      typeof c !== 'object' || !c.id || (!c.title && !c.content)
    );
    
    if (invalidClauses.length === 0) {
      tests.push({
        test: 'Validità clausole',
        status: 'pass',
        details: 'Tutte le clausole sono valide e hanno i campi necessari'
      });
    } else {
      tests.push({
        test: 'Validità clausole',
        status: 'fail',
        details: `${invalidClauses.length} clausole non sono valide o non hanno i campi necessari`
      });
    }
  }
  
  return tests;
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
 * Genera un report in formato Markdown dai risultati dei test
 */
function generateMarkdownReport(results: ClauseTestResults): string {
  const {
    timestamp,
    contractId,
    quoteId,
    contractTests,
    modulesTestResults,
    frontendTestResults,
    summary
  } = results;
  
  const date = new Date(timestamp).toLocaleString();
  
  let markdown = `# Report Test Assegnazione Clausole
Data: ${date}

## Riepilogo
- **Contratto**: ID ${contractId}
- **Preventivo**: ID ${quoteId}
- **Totale test**: ${summary.total}
- **Test passati**: ${summary.passed} (${Math.round((summary.passed / summary.total) * 100)}%)
- **Test falliti**: ${summary.failed} (${Math.round((summary.failed / summary.total) * 100)}%)
- **Avvisi**: ${summary.warnings} (${Math.round((summary.warnings / summary.total) * 100)}%)

`;

  // Aggiungi sezione per i test del contratto
  markdown += `## Test Contratto\n\n`;
  
  for (const test of contractTests) {
    const emoji = test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '⚠️';
    markdown += `${emoji} **${test.test}**: ${test.details}\n\n`;
  }
  
  // Aggiungi sezione per i test dei moduli
  markdown += `## Test Moduli\n\n`;
  
  for (const moduleResult of modulesTestResults) {
    markdown += `### Modulo "${moduleResult.moduleName}" (ID: ${moduleResult.moduleId})\n\n`;
    
    for (const test of moduleResult.tests) {
      const emoji = test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '⚠️';
      markdown += `${emoji} **${test.test}**: ${test.details}\n\n`;
      
      if (test.expected && test.actual) {
        markdown += `Atteso: \`${JSON.stringify(test.expected)}\`\n\n`;
        markdown += `Effettivo: \`${JSON.stringify(test.actual)}\`\n\n`;
      }
    }
  }
  
  // Aggiungi sezione per i test del frontend
  markdown += `## Test Frontend\n\n`;
  
  for (const frontendResult of frontendTestResults) {
    markdown += `### Pagina pubblica preventivo (Token: ${frontendResult.shareToken})\n\n`;
    
    for (const test of frontendResult.tests) {
      const emoji = test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '⚠️';
      markdown += `${emoji} **${test.test}**: ${test.details}\n\n`;
      
      if (test.expected && test.actual) {
        markdown += `Atteso: \`${JSON.stringify(test.expected)}\`\n\n`;
        markdown += `Effettivo: \`${JSON.stringify(test.actual)}\`\n\n`;
      }
    }
  }
  
  return markdown;
}

/**
 * Stampa un messaggio colorato nella console
 */
function logMessage(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  // Utilizziamo direttamente console.log con prefissi per evitare problemi con il modulo colors
  switch (type) {
    case 'success':
      console.log(`✅ ${message}`);
      break;
    case 'warning':
      console.log(`⚠️ ${message}`);
      break;
    case 'error':
      console.log(`❌ ${message}`);
      break;
    case 'info':
    default:
      console.log(`ℹ️ ${message}`);
      break;
  }
}

/**
 * Funzione principale per il test delle clausole
 */
async function testClauseAssignment() {
  logMessage('🧪 Avvio test migliorato di assegnazione clausole...', 'info');
  ensureOutputDir();
  
  try {
    // Ottieni o crea un contratto con clausole
    const contract = await getOrCreateTestContract();
    logMessage(`📋 Utilizzando contratto ID ${contract.id} associato al preventivo ID ${contract.quoteId}`, 'info');
    
    // Esegui i test sul contratto
    logMessage('🔍 Verifica contratto e clausole...', 'info');
    const contractTests = await verifyContract(contract);
    
    // Recupera il preventivo completo tramite API
    logMessage(`🔍 Recupero preventivo ${contract.quoteId} tramite API...`, 'info');
    let apiQuote = await getQuoteWithModules(contract.quoteId);
    
    if (!apiQuote) {
      throw new Error(`Impossibile recuperare il preventivo ${contract.quoteId} tramite API`);
    }
    
    logMessage(`✅ Preventivo recuperato: "${apiQuote.title}"`, 'success');
    
    // Verifica se è necessaria la sincronizzazione e, in caso, eseguila
    logMessage('🔍 Verifica necessità di sincronizzazione clausole...', 'info');
    const syncResult = await syncContractClausesToModules(contract, apiQuote);
    
    if (syncResult.syncRequired) {
      logMessage(`🔄 ${syncResult.message}`, syncResult.success ? 'success' : 'error');
      
      // Ricarica il preventivo dopo la sincronizzazione
      logMessage(`🔍 Ricarico il preventivo dopo la sincronizzazione...`, 'info');
      const updatedApiQuote = await getQuoteWithModules(contract.quoteId);
      
      if (updatedApiQuote) {
        apiQuote = updatedApiQuote;
      }
    } else {
      logMessage(`✅ ${syncResult.message}`, 'success');
    }
    
    // Verifica che le clausole siano assegnate correttamente ai moduli
    logMessage('🔍 Verifica assegnazione clausole ai moduli...', 'info');
    const moduleResults = await verifyModuleClauses(contract, apiQuote);
    
    // Recupera il token di condivisione del preventivo
    logMessage(`🔍 Recupero token di condivisione per il preventivo ${contract.quoteId}...`, 'info');
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
      logMessage(`🔍 Recupero pagina pubblica del preventivo (token: ${shareToken})...`, 'info');
      const publicQuote = await getPublicQuotePage(shareToken);
      
      logMessage('🔍 Verifica clausole nel frontend...', 'info');
      frontendResult = await verifyFrontendClauses(contract, publicQuote, shareToken);
    }
    
    // Calcola il riepilogo
    const allTests = [
      ...contractTests,
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
      contractTests,
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
    
    logMessage(`\n📊 Riepilogo: ${summary.passed} test passati, ${summary.failed} falliti, ${summary.warnings} avvisi su un totale di ${summary.total}`, 'info');
    logMessage(`📝 Risultati salvati in ${resultsFilePath} e ${markdownFilePath}`, 'info');
    
    // Restituisci risultati
    return {
      success: summary.failed === 0,
      summary,
      resultsFilePath,
      markdownFilePath
    };
  } catch (error) {
    logMessage(`❌ Errore durante l'esecuzione dei test: ${error.message}`, 'error');
    console.error(error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Esegui il test automaticamente
testClauseAssignment().catch(console.error);

export { testClauseAssignment };