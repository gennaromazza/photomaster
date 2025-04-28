/**
 * Script di diagnostica avanzata per il sistema dei moduli fissi e variabili
 * 
 * Questo script testa automaticamente:
 * - Assegnazione clausole
 * - Sconti backend e frontend
 * - Condizioni moduli variabili (min/max prodotti, obbligatorietà)
 * - Congruenza tra backend e frontend
 */
import { db } from '../server/db';
import { 
  quoteModules, 
  quoteModuleItems,
  quotes,
  contracts
} from '../shared/schema';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { eq, and, not, isNull } from 'drizzle-orm';

// Configurazione
const API_BASE_URL = 'http://localhost:5000/api';
const RESULTS_DIR = path.join(process.cwd(), 'diagnostics-results');
const headers = {
  'Content-Type': 'application/json',
  'X-CSRF-Test': 'true'
};

// Interfacce per i tipi di dati necessari
interface DiagnosticResults {
  timestamp: string;
  moduleTests: ModuleTestResult[];
  clausuleTests: ClausuleTestResult[];
  discountTests: DiscountTestResult[];
  frontendTests: FrontendTestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    warningTests: number;
    testsByCategory: {
      modules: { total: number, passed: number, failed: number, warnings: number };
      clausules: { total: number, passed: number, failed: number, warnings: number };
      discounts: { total: number, passed: number, failed: number, warnings: number };
      frontend: { total: number, passed: number, failed: number, warnings: number };
    }
  }
}

interface ModuleTestResult {
  id: number;
  name: string;
  type: string;
  quoteId: number;
  testName: string;
  result: 'pass' | 'fail' | 'warning';
  details: string;
  expectedValue?: any;
  actualValue?: any;
}

interface ClausuleTestResult {
  moduleId: number;
  moduleName: string;
  testName: string;
  result: 'pass' | 'fail' | 'warning';
  details: string;
  expectedValue?: any;
  actualValue?: any;
}

interface DiscountTestResult {
  moduleId: number;
  moduleName: string;
  discountType?: string;
  discountValue?: number;
  testName: string;
  result: 'pass' | 'fail' | 'warning';
  details: string;
  expectedValue?: any;
  actualValue?: any;
}

interface FrontendTestResult {
  moduleId: number;
  moduleName: string;
  shareUrl?: string;
  testName: string;
  result: 'pass' | 'fail' | 'warning';
  details: string;
  expectedValue?: any;
  actualValue?: any;
}

// Inizializzazione dei risultati della diagnostica
const diagnosticResults: DiagnosticResults = {
  timestamp: new Date().toISOString(),
  moduleTests: [],
  clausuleTests: [],
  discountTests: [],
  frontendTests: [],
  summary: {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    warningTests: 0,
    testsByCategory: {
      modules: { total: 0, passed: 0, failed: 0, warnings: 0 },
      clausules: { total: 0, passed: 0, failed: 0, warnings: 0 },
      discounts: { total: 0, passed: 0, failed: 0, warnings: 0 },
      frontend: { total: 0, passed: 0, failed: 0, warnings: 0 }
    }
  }
};

// Funzioni helper per aggiungere risultati ai test
function addModuleTest(test: Omit<ModuleTestResult, 'result' | 'details'>, result: 'pass' | 'fail' | 'warning', details: string) {
  const testResult: ModuleTestResult = {
    ...test,
    result,
    details
  };
  
  diagnosticResults.moduleTests.push(testResult);
  diagnosticResults.summary.totalTests++;
  diagnosticResults.summary.testsByCategory.modules.total++;
  
  if (result === 'pass') {
    diagnosticResults.summary.passedTests++;
    diagnosticResults.summary.testsByCategory.modules.passed++;
  } else if (result === 'fail') {
    diagnosticResults.summary.failedTests++;
    diagnosticResults.summary.testsByCategory.modules.failed++;
  } else if (result === 'warning') {
    diagnosticResults.summary.warningTests++;
    diagnosticResults.summary.testsByCategory.modules.warnings++;
  }
}

function addClausuleTest(test: Omit<ClausuleTestResult, 'result' | 'details'>, result: 'pass' | 'fail' | 'warning', details: string) {
  const testResult: ClausuleTestResult = {
    ...test,
    result,
    details
  };
  
  diagnosticResults.clausuleTests.push(testResult);
  diagnosticResults.summary.totalTests++;
  diagnosticResults.summary.testsByCategory.clausules.total++;
  
  if (result === 'pass') {
    diagnosticResults.summary.passedTests++;
    diagnosticResults.summary.testsByCategory.clausules.passed++;
  } else if (result === 'fail') {
    diagnosticResults.summary.failedTests++;
    diagnosticResults.summary.testsByCategory.clausules.failed++;
  } else if (result === 'warning') {
    diagnosticResults.summary.warningTests++;
    diagnosticResults.summary.testsByCategory.clausules.warnings++;
  }
}

function addDiscountTest(test: Omit<DiscountTestResult, 'result' | 'details'>, result: 'pass' | 'fail' | 'warning', details: string) {
  const testResult: DiscountTestResult = {
    ...test,
    result,
    details
  };
  
  diagnosticResults.discountTests.push(testResult);
  diagnosticResults.summary.totalTests++;
  diagnosticResults.summary.testsByCategory.discounts.total++;
  
  if (result === 'pass') {
    diagnosticResults.summary.passedTests++;
    diagnosticResults.summary.testsByCategory.discounts.passed++;
  } else if (result === 'fail') {
    diagnosticResults.summary.failedTests++;
    diagnosticResults.summary.testsByCategory.discounts.failed++;
  } else if (result === 'warning') {
    diagnosticResults.summary.warningTests++;
    diagnosticResults.summary.testsByCategory.discounts.warnings++;
  }
}

function addFrontendTest(test: Omit<FrontendTestResult, 'result' | 'details'>, result: 'pass' | 'fail' | 'warning', details: string) {
  const testResult: FrontendTestResult = {
    ...test,
    result,
    details
  };
  
  diagnosticResults.frontendTests.push(testResult);
  diagnosticResults.summary.totalTests++;
  diagnosticResults.summary.testsByCategory.frontend.total++;
  
  if (result === 'pass') {
    diagnosticResults.summary.passedTests++;
    diagnosticResults.summary.testsByCategory.frontend.passed++;
  } else if (result === 'fail') {
    diagnosticResults.summary.failedTests++;
    diagnosticResults.summary.testsByCategory.frontend.failed++;
  } else if (result === 'warning') {
    diagnosticResults.summary.warningTests++;
    diagnosticResults.summary.testsByCategory.frontend.warnings++;
  }
}

/**
 * Funzione per creare o ottenere la directory di output
 */
function ensureOutputDir() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

/**
 * Recupera tutti i moduli dal database
 */
async function getAllModules() {
  return await db.select().from(quoteModules);
}

/**
 * Recupera tutti i preventivi condivisibili
 */
async function getShareableQuotes() {
  return await db.select().from(quotes).where(and(
    not(isNull(quotes.shareToken)),
    eq(quotes.isShared, true)
  ));
}

/**
 * Recupera un preventivo tramite API
 */
async function fetchQuoteDetails(quoteId: number) {
  try {
    const response = await axios.get(`${API_BASE_URL}/quotes/${quoteId}`, { headers });
    return response.data;
  } catch (error) {
    console.error(`Errore nel recupero del preventivo ${quoteId}:`, error.message);
    return null;
  }
}

/**
 * Recupera i moduli di un preventivo tramite API
 */
async function fetchQuoteModules(quoteId: number) {
  try {
    const response = await axios.get(`${API_BASE_URL}/quotes/${quoteId}/modules`, { headers });
    return response.data;
  } catch (error) {
    console.error(`Errore nel recupero dei moduli del preventivo ${quoteId}:`, error.message);
    return [];
  }
}

/**
 * Recupera la pagina di firma pubblica di un preventivo
 */
async function fetchPublicQuotePage(shareToken: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/quotes/share/${shareToken}`, { headers });
    return response.data;
  } catch (error) {
    console.error(`Errore nel recupero della pagina pubblica del preventivo (token: ${shareToken}):`, error.message);
    return null;
  }
}

/**
 * Test 1: Verifica la consistenza dei moduli tra DB e API
 */
async function testModuleConsistency() {
  console.log('\n🔍 Test 1: Verifica consistenza dei moduli tra DB e API...');
  
  const dbModules = await getAllModules();
  console.log(`Trovati ${dbModules.length} moduli nel database`);
  
  for (const dbModule of dbModules) {
    // Verifica che il preventivo associato esista
    try {
      const quote = await fetchQuoteDetails(dbModule.quoteId);
      
      if (!quote) {
        addModuleTest(
          {
            id: dbModule.id,
            name: dbModule.name,
            type: dbModule.type,
            quoteId: dbModule.quoteId,
            testName: 'Esistenza preventivo associato'
          },
          'fail',
          `Il preventivo ID ${dbModule.quoteId} associato al modulo non esiste o non è accessibile`
        );
        continue;
      }
      
      // Verifica che il modulo sia accessibile tramite API
      const moduleExistsInApi = quote.modules && quote.modules.some(m => m.id === dbModule.id);
      
      if (moduleExistsInApi) {
        addModuleTest(
          {
            id: dbModule.id,
            name: dbModule.name,
            type: dbModule.type,
            quoteId: dbModule.quoteId,
            testName: 'Accessibilità tramite API'
          },
          'pass',
          `Il modulo è correttamente accessibile tramite API`
        );
      } else {
        addModuleTest(
          {
            id: dbModule.id,
            name: dbModule.name,
            type: dbModule.type,
            quoteId: dbModule.quoteId,
            testName: 'Accessibilità tramite API'
          },
          'fail',
          `Il modulo non è accessibile tramite API nel preventivo ID ${dbModule.quoteId}`
        );
      }
      
      // Verifica corrispondenza dei campi essenziali
      if (moduleExistsInApi) {
        const apiModule = quote.modules.find(m => m.id === dbModule.id);
        
        // Verifica corrispondenza nome
        if (apiModule.name === dbModule.name) {
          addModuleTest(
            {
              id: dbModule.id,
              name: dbModule.name,
              type: dbModule.type,
              quoteId: dbModule.quoteId,
              testName: 'Corrispondenza nome'
            },
            'pass',
            'Il nome del modulo corrisponde tra DB e API'
          );
        } else {
          addModuleTest(
            {
              id: dbModule.id,
              name: dbModule.name,
              type: dbModule.type,
              quoteId: dbModule.quoteId,
              testName: 'Corrispondenza nome',
              expectedValue: dbModule.name,
              actualValue: apiModule.name
            },
            'fail',
            `Discrepanza nel nome del modulo: DB="${dbModule.name}", API="${apiModule.name}"`
          );
        }
        
        // Verifica corrispondenza tipo
        if (apiModule.type === dbModule.type) {
          addModuleTest(
            {
              id: dbModule.id,
              name: dbModule.name,
              type: dbModule.type,
              quoteId: dbModule.quoteId,
              testName: 'Corrispondenza tipo'
            },
            'pass',
            'Il tipo del modulo corrisponde tra DB e API'
          );
        } else {
          addModuleTest(
            {
              id: dbModule.id,
              name: dbModule.name,
              type: dbModule.type,
              quoteId: dbModule.quoteId,
              testName: 'Corrispondenza tipo',
              expectedValue: dbModule.type,
              actualValue: apiModule.type
            },
            'fail',
            `Discrepanza nel tipo del modulo: DB="${dbModule.type}", API="${apiModule.type}"`
          );
        }
      }
    } catch (error) {
      addModuleTest(
        {
          id: dbModule.id,
          name: dbModule.name,
          type: dbModule.type,
          quoteId: dbModule.quoteId,
          testName: 'Verifica API'
        },
        'fail',
        `Errore durante la verifica del modulo: ${error.message}`
      );
    }
  }
}

/**
 * Test 2: Verifica le clausole associate ai moduli
 */
async function testClausules() {
  console.log('\n🔍 Test 2: Verifica clausole associate ai moduli...');
  
  // Ottieni tutti i contratti con clausole
  const contracts = await db.query.contracts.findMany({
    where: not(isNull(contracts.clauses))
  });
  
  console.log(`Trovati ${contracts.length} contratti con clausole`);
  
  const quoteIds = contracts.map(c => c.quoteId);
  
  // Per ogni preventivo, controlla se i moduli contengono le clausole
  for (const quoteId of quoteIds) {
    try {
      // Recupera il preventivo e i suoi moduli
      const quote = await fetchQuoteDetails(quoteId);
      
      if (!quote) {
        console.log(`Preventivo ID ${quoteId} non trovato o non accessibile`);
        continue;
      }
      
      // Recupera le clausole del contratto
      const contract = contracts.find(c => c.quoteId === quoteId);
      const clauses = contract.clauses;
      
      if (!clauses || !Array.isArray(clauses) || clauses.length === 0) {
        continue;
      }
      
      console.log(`Preventivo ID ${quoteId} ha ${clauses.length} clausole associate`);
      
      // Recupera i moduli tramite API per verificare se contengono le clausole
      if (!quote.modules || quote.modules.length === 0) {
        console.log(`Preventivo ID ${quoteId} non ha moduli associati`);
        continue;
      }
      
      for (const module of quote.modules) {
        // Verifica se il modulo contiene le clausole corrette
        const moduleHasClauses = module.clauses && Array.isArray(module.clauses);
        
        if (!moduleHasClauses) {
          addClausuleTest(
            {
              moduleId: module.id,
              moduleName: module.name,
              testName: 'Esistenza clausole'
            },
            'fail',
            `Il modulo non ha clausole associate, ma il contratto ne ha ${clauses.length}`
          );
          continue;
        }
        
        // Confronta le clausole del contratto con quelle del modulo
        const contractClauseIds = new Set(clauses.map(c => typeof c === 'object' ? c.id : c));
        const moduleClauseIds = new Set(module.clauses.map(c => typeof c === 'object' ? c.id : c));
        
        const missingClauseIds = [...contractClauseIds].filter(id => !moduleClauseIds.has(id));
        const extraClauseIds = [...moduleClauseIds].filter(id => !contractClauseIds.has(id));
        
        if (missingClauseIds.length === 0 && extraClauseIds.length === 0) {
          addClausuleTest(
            {
              moduleId: module.id,
              moduleName: module.name,
              testName: 'Corrispondenza clausole'
            },
            'pass',
            `Le clausole del modulo corrispondono alle clausole del contratto`
          );
        } else {
          if (missingClauseIds.length > 0) {
            addClausuleTest(
              {
                moduleId: module.id,
                moduleName: module.name,
                testName: 'Clausole mancanti',
                expectedValue: [...contractClauseIds],
                actualValue: [...moduleClauseIds]
              },
              'fail',
              `Il modulo manca di ${missingClauseIds.length} clausole presenti nel contratto: ${missingClauseIds.join(', ')}`
            );
          }
          
          if (extraClauseIds.length > 0) {
            addClausuleTest(
              {
                moduleId: module.id,
                moduleName: module.name,
                testName: 'Clausole extra',
                expectedValue: [...contractClauseIds],
                actualValue: [...moduleClauseIds]
              },
              'warning',
              `Il modulo contiene ${extraClauseIds.length} clausole non presenti nel contratto: ${extraClauseIds.join(', ')}`
            );
          }
        }
      }
    } catch (error) {
      console.error(`Errore durante la verifica delle clausole per il preventivo ${quoteId}:`, error.message);
    }
  }
}

/**
 * Test 3: Verifica gli sconti nei moduli
 */
async function testDiscounts() {
  console.log('\n🔍 Test 3: Verifica sconti nei moduli...');
  
  // Ottieni i moduli con sconti
  const dbModules = await db.select().from(quoteModules).where(not(isNull(quoteModules.discountType)));
  
  console.log(`Trovati ${dbModules.length} moduli con sconti configurati nel database`);
  
  for (const dbModule of dbModules) {
    try {
      // Recupera i dettagli del modulo tramite API
      const quote = await fetchQuoteDetails(dbModule.quoteId);
      
      if (!quote || !quote.modules) {
        addDiscountTest(
          {
            moduleId: dbModule.id,
            moduleName: dbModule.name,
            discountType: dbModule.discountType,
            discountValue: Number(dbModule.discountValue),
            testName: 'Esistenza modulo in API'
          },
          'fail',
          `Il modulo con sconto non è accessibile tramite API`
        );
        continue;
      }
      
      const apiModule = quote.modules.find(m => m.id === dbModule.id);
      
      if (!apiModule) {
        addDiscountTest(
          {
            moduleId: dbModule.id,
            moduleName: dbModule.name,
            discountType: dbModule.discountType,
            discountValue: Number(dbModule.discountValue),
            testName: 'Esistenza modulo in API'
          },
          'fail',
          `Il modulo con sconto non è presente nella risposta API del preventivo`
        );
        continue;
      }
      
      // Verifica se lo sconto è presente nell'API
      if (!apiModule.discountType || apiModule.discountType !== dbModule.discountType) {
        addDiscountTest(
          {
            moduleId: dbModule.id,
            moduleName: dbModule.name,
            discountType: dbModule.discountType,
            discountValue: Number(dbModule.discountValue),
            testName: 'Corrispondenza tipo sconto',
            expectedValue: dbModule.discountType,
            actualValue: apiModule.discountType
          },
          'fail',
          `Il tipo di sconto non corrisponde tra DB e API: DB="${dbModule.discountType}", API="${apiModule.discountType || 'non definito'}"`
        );
      } else {
        addDiscountTest(
          {
            moduleId: dbModule.id,
            moduleName: dbModule.name,
            discountType: dbModule.discountType,
            discountValue: Number(dbModule.discountValue),
            testName: 'Corrispondenza tipo sconto'
          },
          'pass',
          `Il tipo di sconto corrisponde tra DB e API: "${dbModule.discountType}"`
        );
      }
      
      // Verifica se il valore dello sconto è presente nell'API
      const dbDiscountValue = Number(dbModule.discountValue);
      const apiDiscountValue = Number(apiModule.discountValue);
      
      if (isNaN(apiDiscountValue) || apiDiscountValue !== dbDiscountValue) {
        addDiscountTest(
          {
            moduleId: dbModule.id,
            moduleName: dbModule.name,
            discountType: dbModule.discountType,
            discountValue: dbDiscountValue,
            testName: 'Corrispondenza valore sconto',
            expectedValue: dbDiscountValue,
            actualValue: apiDiscountValue
          },
          'fail',
          `Il valore dello sconto non corrisponde tra DB e API: DB=${dbDiscountValue}, API=${isNaN(apiDiscountValue) ? 'non definito' : apiDiscountValue}`
        );
      } else {
        addDiscountTest(
          {
            moduleId: dbModule.id,
            moduleName: dbModule.name,
            discountType: dbModule.discountType,
            discountValue: dbDiscountValue,
            testName: 'Corrispondenza valore sconto'
          },
          'pass',
          `Il valore dello sconto corrisponde tra DB e API: ${dbDiscountValue}`
        );
      }
      
      // Verifica se lo sconto è applicato correttamente
      // Calcola il totale senza sconto
      const subtotal = Number(dbModule.subtotal);
      const total = Number(dbModule.total);
      
      // Calcola il totale scontato in base al tipo di sconto
      let expectedTotal = subtotal;
      if (dbModule.discountType === 'percentage') {
        expectedTotal = subtotal * (1 - dbDiscountValue / 100);
      } else if (dbModule.discountType === 'fixed') {
        expectedTotal = subtotal - dbDiscountValue;
      }
      
      // Arrotonda a due decimali
      expectedTotal = Math.round(expectedTotal * 100) / 100;
      
      // Confronta con il totale effettivo
      if (Math.abs(total - expectedTotal) > 0.01) {
        addDiscountTest(
          {
            moduleId: dbModule.id,
            moduleName: dbModule.name,
            discountType: dbModule.discountType,
            discountValue: dbDiscountValue,
            testName: 'Calcolo sconto',
            expectedValue: expectedTotal,
            actualValue: total
          },
          'fail',
          `Il calcolo dello sconto non è corretto: Subtotale=${subtotal}, Sconto=${dbDiscountValue} (${dbModule.discountType}), Totale Atteso=${expectedTotal}, Totale Effettivo=${total}`
        );
      } else {
        addDiscountTest(
          {
            moduleId: dbModule.id,
            moduleName: dbModule.name,
            discountType: dbModule.discountType,
            discountValue: dbDiscountValue,
            testName: 'Calcolo sconto'
          },
          'pass',
          `Lo sconto è calcolato correttamente: Subtotale=${subtotal}, Sconto=${dbDiscountValue} (${dbModule.discountType}), Totale=${total}`
        );
      }
    } catch (error) {
      addDiscountTest(
        {
          moduleId: dbModule.id,
          moduleName: dbModule.name,
          testName: 'Verifica sconti'
        },
        'fail',
        `Errore durante la verifica degli sconti: ${error.message}`
      );
    }
  }
}

/**
 * Test 4: Verifica i vincoli frontend dei moduli variabili
 */
async function testFrontendConstraints() {
  console.log('\n🔍 Test 4: Verifica vincoli frontend dei moduli variabili...');
  
  // Recupera tutti i moduli variabili con vincoli
  const variableModules = await db.select().from(quoteModules).where(
    eq(quoteModules.type, 'variable')
  );
  
  console.log(`Trovati ${variableModules.length} moduli variabili nel database`);
  
  // Recupera i preventivi condivisibili
  const shareableQuotes = await getShareableQuotes();
  
  // Mappa dei token di condivisione per quote ID
  const shareTokensByQuoteId = new Map();
  shareableQuotes.forEach(q => shareTokensByQuoteId.set(q.id, q.shareToken));
  
  for (const module of variableModules) {
    // Verifica se il preventivo associato è condivisibile
    const shareToken = shareTokensByQuoteId.get(module.quoteId);
    
    if (!shareToken) {
      addFrontendTest(
        {
          moduleId: module.id,
          moduleName: module.name,
          testName: 'Preventivo condivisibile'
        },
        'warning',
        `Il preventivo associato al modulo (ID: ${module.quoteId}) non è condivisibile, impossibile verificare i vincoli frontend`
      );
      continue;
    }
    
    try {
      // Recupera la pagina pubblica del preventivo
      const publicQuote = await fetchPublicQuotePage(shareToken);
      
      if (!publicQuote) {
        addFrontendTest(
          {
            moduleId: module.id,
            moduleName: module.name,
            shareUrl: `/quotes/share/${shareToken}`,
            testName: 'Accessibilità pagina pubblica'
          },
          'fail',
          `La pagina pubblica del preventivo (token: ${shareToken}) non è accessibile`
        );
        continue;
      }
      
      // Verifica che il modulo sia presente nella pagina pubblica
      const moduleInPublicPage = publicQuote.modules && publicQuote.modules.some(m => m.id === module.id);
      
      if (!moduleInPublicPage) {
        addFrontendTest(
          {
            moduleId: module.id,
            moduleName: module.name,
            shareUrl: `/quotes/share/${shareToken}`,
            testName: 'Presenza modulo in pagina pubblica'
          },
          'fail',
          `Il modulo non è presente nella pagina pubblica del preventivo`
        );
        continue;
      }
      
      const publicModule = publicQuote.modules.find(m => m.id === module.id);
      
      // Verifica minSelectCount
      if (module.minSelectCount !== null && module.minSelectCount !== undefined) {
        if (publicModule.minSelectCount === module.minSelectCount) {
          addFrontendTest(
            {
              moduleId: module.id,
              moduleName: module.name,
              shareUrl: `/quotes/share/${shareToken}`,
              testName: 'Corrispondenza minSelectCount'
            },
            'pass',
            `Il valore minSelectCount corrisponde tra backend e frontend: ${module.minSelectCount}`
          );
        } else {
          addFrontendTest(
            {
              moduleId: module.id,
              moduleName: module.name,
              shareUrl: `/quotes/share/${shareToken}`,
              testName: 'Corrispondenza minSelectCount',
              expectedValue: module.minSelectCount,
              actualValue: publicModule.minSelectCount
            },
            'fail',
            `Il valore minSelectCount non corrisponde tra backend (${module.minSelectCount}) e frontend (${publicModule.minSelectCount || 'non definito'})`
          );
        }
      }
      
      // Verifica maxSelectCount
      if (module.maxSelectCount !== null && module.maxSelectCount !== undefined) {
        if (publicModule.maxSelectCount === module.maxSelectCount) {
          addFrontendTest(
            {
              moduleId: module.id,
              moduleName: module.name,
              shareUrl: `/quotes/share/${shareToken}`,
              testName: 'Corrispondenza maxSelectCount'
            },
            'pass',
            `Il valore maxSelectCount corrisponde tra backend e frontend: ${module.maxSelectCount}`
          );
        } else {
          addFrontendTest(
            {
              moduleId: module.id,
              moduleName: module.name,
              shareUrl: `/quotes/share/${shareToken}`,
              testName: 'Corrispondenza maxSelectCount',
              expectedValue: module.maxSelectCount,
              actualValue: publicModule.maxSelectCount
            },
            'fail',
            `Il valore maxSelectCount non corrisponde tra backend (${module.maxSelectCount}) e frontend (${publicModule.maxSelectCount || 'non definito'})`
          );
        }
      }
      
      // Verifica obbligatorietà
      // Per i moduli variabili, l'obbligatorietà è determinata da minSelectCount > 0
      if (module.minSelectCount !== null && module.minSelectCount !== undefined && module.minSelectCount > 0) {
        if (publicModule.isRequired || publicModule.isRequired === undefined) {
          addFrontendTest(
            {
              moduleId: module.id,
              moduleName: module.name,
              shareUrl: `/quotes/share/${shareToken}`,
              testName: 'Obbligatorietà modulo'
            },
            'pass',
            `L'obbligatorietà del modulo è correttamente impostata nel frontend (minSelectCount: ${module.minSelectCount})`
          );
        } else {
          addFrontendTest(
            {
              moduleId: module.id,
              moduleName: module.name,
              shareUrl: `/quotes/share/${shareToken}`,
              testName: 'Obbligatorietà modulo',
              expectedValue: true,
              actualValue: publicModule.isRequired
            },
            'fail',
            `L'obbligatorietà del modulo non è correttamente impostata nel frontend (minSelectCount: ${module.minSelectCount}, isRequired: ${publicModule.isRequired})`
          );
        }
      }
      
      // Verifica che gli elementi del modulo siano presenti
      const moduleItems = await db.select().from(quoteModuleItems).where(
        eq(quoteModuleItems.moduleId, module.id)
      );
      
      if (moduleItems.length === 0) {
        addFrontendTest(
          {
            moduleId: module.id,
            moduleName: module.name,
            shareUrl: `/quotes/share/${shareToken}`,
            testName: 'Elementi modulo'
          },
          'warning',
          `Il modulo non ha elementi associati nel database`
        );
        continue;
      }
      
      const publicModuleItems = publicModule.items || [];
      
      if (publicModuleItems.length !== moduleItems.length) {
        addFrontendTest(
          {
            moduleId: module.id,
            moduleName: module.name,
            shareUrl: `/quotes/share/${shareToken}`,
            testName: 'Numero elementi modulo',
            expectedValue: moduleItems.length,
            actualValue: publicModuleItems.length
          },
          'fail',
          `Il numero di elementi del modulo non corrisponde tra backend (${moduleItems.length}) e frontend (${publicModuleItems.length})`
        );
      } else {
        addFrontendTest(
          {
            moduleId: module.id,
            moduleName: module.name,
            shareUrl: `/quotes/share/${shareToken}`,
            testName: 'Numero elementi modulo'
          },
          'pass',
          `Il numero di elementi del modulo corrisponde tra backend e frontend: ${moduleItems.length}`
        );
      }
    } catch (error) {
      addFrontendTest(
        {
          moduleId: module.id,
          moduleName: module.name,
          testName: 'Verifica frontend'
        },
        'fail',
        `Errore durante la verifica dei vincoli frontend: ${error.message}`
      );
    }
  }
}

/**
 * Funzione principale
 */
async function runDiagnostics() {
  console.log('🔍 Avvio diagnosi sistema moduli fissi e variabili...');
  ensureOutputDir();
  
  try {
    await testModuleConsistency();
    await testClausules();
    await testDiscounts();
    await testFrontendConstraints();
    
    // Salva i risultati come JSON
    const resultsFilePath = path.join(RESULTS_DIR, `modules-diagnostics-${Date.now()}.json`);
    fs.writeFileSync(resultsFilePath, JSON.stringify(diagnosticResults, null, 2));
    
    // Salva i risultati come markdown per una lettura più facile
    const markdownResults = generateMarkdownReport(diagnosticResults);
    const markdownFilePath = path.join(RESULTS_DIR, `modules-diagnostics-${Date.now()}.md`);
    fs.writeFileSync(markdownFilePath, markdownResults);
    
    console.log(`\n✅ Diagnosi completata con successo! Risultati salvati in ${resultsFilePath} e ${markdownFilePath}`);
    console.log(`Riepilogo: ${diagnosticResults.summary.passedTests} test passati, ${diagnosticResults.summary.failedTests} falliti, ${diagnosticResults.summary.warningTests} avvisi su un totale di ${diagnosticResults.summary.totalTests} test eseguiti.`);
    
    return diagnosticResults;
  } catch (err) {
    console.error('❌ Errore durante la diagnosi:', err);
    
    // Salva comunque i risultati parziali
    try {
      const resultsFilePath = path.join(RESULTS_DIR, `modules-diagnostics-partial-${Date.now()}.json`);
      fs.writeFileSync(resultsFilePath, JSON.stringify(diagnosticResults, null, 2));
      console.log(`Risultati parziali salvati in ${resultsFilePath}`);
    } catch (saveErr) {
      console.error('Errore nel salvataggio dei risultati parziali:', saveErr);
    }
    
    throw err;
  }
}

/**
 * Genera un report markdown dai risultati
 */
function generateMarkdownReport(results: DiagnosticResults): string {
  const passEmoji = '✅';
  const failEmoji = '❌';
  const warningEmoji = '⚠️';
  
  let markdown = `# Report Diagnostico Sistema Moduli\n\n`;
  markdown += `Timestamp: ${new Date(results.timestamp).toLocaleString()}\n\n`;
  
  markdown += `## Riepilogo\n\n`;
  markdown += `- **Totale test eseguiti**: ${results.summary.totalTests}\n`;
  markdown += `- **Test passati**: ${results.summary.passedTests} (${Math.round(results.summary.passedTests / results.summary.totalTests * 100)}%)\n`;
  markdown += `- **Test falliti**: ${results.summary.failedTests} (${Math.round(results.summary.failedTests / results.summary.totalTests * 100)}%)\n`;
  markdown += `- **Avvisi**: ${results.summary.warningTests} (${Math.round(results.summary.warningTests / results.summary.totalTests * 100)}%)\n\n`;
  
  markdown += `### Risultati per categoria\n\n`;
  markdown += `| Categoria | Totale | Passati | Falliti | Avvisi |\n`;
  markdown += `|-----------|--------|---------|---------|--------|\n`;
  markdown += `| Moduli | ${results.summary.testsByCategory.modules.total} | ${results.summary.testsByCategory.modules.passed} | ${results.summary.testsByCategory.modules.failed} | ${results.summary.testsByCategory.modules.warnings} |\n`;
  markdown += `| Clausole | ${results.summary.testsByCategory.clausules.total} | ${results.summary.testsByCategory.clausules.passed} | ${results.summary.testsByCategory.clausules.failed} | ${results.summary.testsByCategory.clausules.warnings} |\n`;
  markdown += `| Sconti | ${results.summary.testsByCategory.discounts.total} | ${results.summary.testsByCategory.discounts.passed} | ${results.summary.testsByCategory.discounts.failed} | ${results.summary.testsByCategory.discounts.warnings} |\n`;
  markdown += `| Frontend | ${results.summary.testsByCategory.frontend.total} | ${results.summary.testsByCategory.frontend.passed} | ${results.summary.testsByCategory.frontend.failed} | ${results.summary.testsByCategory.frontend.warnings} |\n\n`;
  
  if (results.moduleTests.length > 0) {
    markdown += `## Test Moduli\n\n`;
    markdown += `| ID | Nome | Tipo | Test | Risultato | Dettagli |\n`;
    markdown += `|----|------|------|------|-----------|----------|\n`;
    
    for (const test of results.moduleTests) {
      const emoji = test.result === 'pass' ? passEmoji : (test.result === 'fail' ? failEmoji : warningEmoji);
      markdown += `| ${test.id} | ${test.name} | ${test.type} | ${test.testName} | ${emoji} | ${test.details} |\n`;
    }
    
    markdown += `\n`;
  }
  
  if (results.clausuleTests.length > 0) {
    markdown += `## Test Clausole\n\n`;
    markdown += `| ID Modulo | Nome Modulo | Test | Risultato | Dettagli |\n`;
    markdown += `|-----------|-------------|------|-----------|----------|\n`;
    
    for (const test of results.clausuleTests) {
      const emoji = test.result === 'pass' ? passEmoji : (test.result === 'fail' ? failEmoji : warningEmoji);
      markdown += `| ${test.moduleId} | ${test.moduleName} | ${test.testName} | ${emoji} | ${test.details} |\n`;
    }
    
    markdown += `\n`;
  }
  
  if (results.discountTests.length > 0) {
    markdown += `## Test Sconti\n\n`;
    markdown += `| ID Modulo | Nome Modulo | Tipo Sconto | Valore Sconto | Test | Risultato | Dettagli |\n`;
    markdown += `|-----------|-------------|-------------|---------------|------|-----------|----------|\n`;
    
    for (const test of results.discountTests) {
      const emoji = test.result === 'pass' ? passEmoji : (test.result === 'fail' ? failEmoji : warningEmoji);
      markdown += `| ${test.moduleId} | ${test.moduleName} | ${test.discountType || 'N/A'} | ${test.discountValue || 'N/A'} | ${test.testName} | ${emoji} | ${test.details} |\n`;
    }
    
    markdown += `\n`;
  }
  
  if (results.frontendTests.length > 0) {
    markdown += `## Test Frontend\n\n`;
    markdown += `| ID Modulo | Nome Modulo | URL Condivisione | Test | Risultato | Dettagli |\n`;
    markdown += `|-----------|-------------|--------------------|------|-----------|----------|\n`;
    
    for (const test of results.frontendTests) {
      const emoji = test.result === 'pass' ? passEmoji : (test.result === 'fail' ? failEmoji : warningEmoji);
      markdown += `| ${test.moduleId} | ${test.moduleName} | ${test.shareUrl || 'N/A'} | ${test.testName} | ${emoji} | ${test.details} |\n`;
    }
    
    markdown += `\n`;
  }
  
  markdown += `## Conclusioni e Raccomandazioni\n\n`;
  
  // Genera conclusioni in base ai risultati
  if (results.summary.failedTests === 0 && results.summary.warningTests === 0) {
    markdown += `${passEmoji} **Sistema moduli perfettamente funzionante**. Tutti i test sono stati superati senza errori o avvisi.\n\n`;
  } else if (results.summary.failedTests === 0 && results.summary.warningTests > 0) {
    markdown += `${warningEmoji} **Sistema moduli generalmente funzionante, ma con avvisi**. Tutti i test critici sono stati superati, ma ci sono ${results.summary.warningTests} avvisi che potrebbero richiedere attenzione.\n\n`;
  } else if (results.summary.failedTests > 0) {
    markdown += `${failEmoji} **Problemi rilevati nel sistema moduli**. Sono stati trovati ${results.summary.failedTests} errori che richiedono intervento.\n\n`;
  }
  
  // Aggiungi raccomandazioni specifiche
  const failedClausuleTests = results.clausuleTests.filter(t => t.result === 'fail');
  const failedDiscountTests = results.discountTests.filter(t => t.result === 'fail');
  const failedFrontendTests = results.frontendTests.filter(t => t.result === 'fail');
  
  if (failedClausuleTests.length > 0) {
    markdown += `### Problemi con le Clausole\n\n`;
    markdown += `- **Descrizione**: Sono stati rilevati problemi nell'assegnazione o visualizzazione delle clausole nei moduli.\n`;
    markdown += `- **Impatto**: I clienti potrebbero non vedere tutte le clausole contrattuali necessarie durante la firma del preventivo.\n`;
    markdown += `- **Raccomandazione**: Verificare il processo di assegnazione delle clausole ai moduli e assicurarsi che vengano correttamente trasferite alla pagina di firma.\n\n`;
  }
  
  if (failedDiscountTests.length > 0) {
    markdown += `### Problemi con gli Sconti\n\n`;
    markdown += `- **Descrizione**: Sono stati rilevati problemi nel calcolo o nella visualizzazione degli sconti nei moduli.\n`;
    markdown += `- **Impatto**: I clienti potrebbero vedere importi errati o non vedere gli sconti applicati.\n`;
    markdown += `- **Raccomandazione**: Verificare la logica di calcolo degli sconti e assicurarsi che vengano correttamente applicati e visualizzati nella pagina di firma.\n\n`;
  }
  
  if (failedFrontendTests.length > 0) {
    markdown += `### Problemi con i Vincoli Frontend\n\n`;
    markdown += `- **Descrizione**: Sono stati rilevati problemi nei vincoli frontend dei moduli variabili (min/max prodotti selezionabili, obbligatorietà).\n`;
    markdown += `- **Impatto**: I clienti potrebbero selezionare un numero errato di prodotti o servizi, o evitare selezioni obbligatorie.\n`;
    markdown += `- **Raccomandazione**: Verificare che i vincoli configurati nel backend vengano correttamente applicati nel frontend della pagina di firma.\n\n`;
  }
  
  markdown += `---\n\n`;
  markdown += `Report generato automaticamente il ${new Date().toLocaleString()}\n`;
  
  return markdown;
}

// Esegui la diagnosi
runDiagnostics().catch(console.error);