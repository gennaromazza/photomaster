/**
 * Script di test per l'assegnazione automatica delle clausole ai moduli
 * 
 * Questo script simula la creazione di un preventivo, l'aggiunta di moduli
 * e l'assegnazione automatica delle clausole in base al tipo di evento.
 */

import { db } from "../server/db";
import { quoteModules, quotes, contractClauses } from "../shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import fs from 'fs';
import path from 'path';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

interface TestLog {
  timestamp: string;
  testCase: string;
  result: TestResult;
}

// Directory per i risultati
const RESULTS_DIR = path.join(__dirname, '..', 'diagnostics-results');

// Assicurati che la directory di output esista
function ensureOutputDir() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

/**
 * Registra i risultati del test in un file Markdown
 */
function logTestResults(logs: TestLog[]) {
  const timestamp = new Date().toISOString();
  const formattedDate = new Date().toLocaleString();
  const filename = `clause-assignment-auto-${Date.now()}.md`;
  const filePath = path.join(RESULTS_DIR, filename);
  
  let content = `# Test Assegnazione Automatica Clausole ai Moduli\n\n`;
  content += `Data: ${formattedDate}\n\n`;
  content += `## Riepilogo\n\n`;
  
  const success = logs.filter(log => log.result.success).length;
  const failure = logs.length - success;
  
  content += `- **Test completati**: ${logs.length}\n`;
  content += `- **Test riusciti**: ${success}\n`;
  content += `- **Test falliti**: ${failure}\n\n`;
  
  content += `## Dettagli dei Test\n\n`;
  
  for (const log of logs) {
    content += `### ${log.testCase}\n\n`;
    content += `**Risultato**: ${log.result.success ? '✅ Successo' : '❌ Fallimento'}\n\n`;
    content += `**Messaggio**: ${log.result.message}\n\n`;
    
    if (log.result.details) {
      content += `**Dettagli**:\n\`\`\`json\n${JSON.stringify(log.result.details, null, 2)}\n\`\`\`\n\n`;
    }
    
    content += `---\n\n`;
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Risultati del test salvati in ${filePath}`);
}

/**
 * Test 1: Crea un preventivo di tipo "Matrimonio" e verifica l'assegnazione automatica delle clausole
 */
async function testWeddingQuoteClauseAssignment() {
  const testCase = "Assegnazione Clausole Preventivo Matrimonio";
  console.log(`\n🔍 Test: ${testCase}...`);
  
  try {
    // 1. Crea un preventivo di tipo Matrimonio
    const [newQuote] = await db.insert(quotes)
      .values({
        title: "Test Matrimonio Auto-Clause",
        clientId: 1, // Usa un cliente esistente
        status: "draft",
        eventType: "Matrimonio",
        createdAt: new Date()
      })
      .returning();
    
    console.log(`Preventivo creato con ID ${newQuote.id}`);
    
    // 2. Crea due moduli per il preventivo (fisso e variabile)
    const [fixedModule] = await db.insert(quoteModules)
      .values({
        quoteId: newQuote.id,
        name: "Modulo Fisso Test",
        type: "fixed",
        status: "draft",
        createdAt: new Date()
      })
      .returning();
      
    const [variableModule] = await db.insert(quoteModules)
      .values({
        quoteId: newQuote.id,
        name: "Modulo Variabile Test",
        type: "variable",
        status: "draft",
        createdAt: new Date(),
        minSelectCount: 1,
        maxSelectCount: 3
      })
      .returning();
    
    console.log(`Moduli creati: Fisso ID ${fixedModule.id}, Variabile ID ${variableModule.id}`);
    
    // 3. Ottieni le clausole per il tipo di evento "Matrimonio"
    // Costruisci condizioni per trovare clausole appropriate
    let clausesConditions = [];
    
    // 1. Clausole generiche (senza tipo evento o categoria)
    clausesConditions.push(
      and(
        isNull(contractClauses.eventType),
        isNull(contractClauses.categoryId)
      )
    );
    
    // 2. Clausole specifiche per il tipo di evento
    clausesConditions.push(
      and(
        eq(contractClauses.eventType, "Matrimonio"),
        isNull(contractClauses.categoryId)
      )
    );
    
    // Recupera tutte le clausole applicabili
    let applicableClauses = [];
    
    for (const condition of clausesConditions) {
      const clauses = await db.query.contractClauses.findMany({
        where: and(
          condition,
          eq(contractClauses.isActive, true)
        )
      });
      
      if (clauses && clauses.length > 0) {
        applicableClauses = [...applicableClauses, ...clauses];
      }
    }
    
    console.log(`Trovate ${applicableClauses.length} clausole applicabili`);
    
    // 4. Esegui l'API per assegnare le clausole automaticamente
    const response = await fetch(`http://localhost:5000/api/contract-clauses/assign-to-quote/${newQuote.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    console.log('Risultato API assegnazione clausole:', result);
    
    // 5. Verifica che i moduli abbiano le clausole assegnate
    const updatedFixedModule = await db.query.quoteModules.findFirst({
      where: eq(quoteModules.id, fixedModule.id)
    });
    
    const updatedVariableModule = await db.query.quoteModules.findFirst({
      where: eq(quoteModules.id, variableModule.id)
    });
    
    const fixedModuleClauses = updatedFixedModule.clauses || [];
    const variableModuleClauses = updatedVariableModule.clauses || [];
    
    console.log(`Clausole assegnate al modulo fisso: ${Array.isArray(fixedModuleClauses) ? fixedModuleClauses.length : 0}`);
    console.log(`Clausole assegnate al modulo variabile: ${Array.isArray(variableModuleClauses) ? variableModuleClauses.length : 0}`);
    
    // 6. Pulizia: rimuovi i moduli e il preventivo di test
    await db.delete(quoteModules).where(eq(quoteModules.id, fixedModule.id));
    await db.delete(quoteModules).where(eq(quoteModules.id, variableModule.id));
    await db.delete(quotes).where(eq(quotes.id, newQuote.id));
    
    // 7. Determina il risultato del test
    const success = 
      Array.isArray(fixedModuleClauses) && fixedModuleClauses.length > 0 && 
      Array.isArray(variableModuleClauses) && variableModuleClauses.length > 0;
    
    return {
      success,
      message: success ? 
        `Le clausole sono state assegnate correttamente ai moduli del preventivo` : 
        `Le clausole non sono state assegnate correttamente ai moduli`,
      details: {
        quoteId: newQuote.id,
        eventType: "Matrimonio",
        clausesExpected: applicableClauses.length,
        fixedModuleClausesCount: Array.isArray(fixedModuleClauses) ? fixedModuleClauses.length : 0,
        variableModuleClausesCount: Array.isArray(variableModuleClauses) ? variableModuleClauses.length : 0,
        apiResponse: result
      }
    };
    
  } catch (error) {
    console.error(`Errore durante il test ${testCase}:`, error);
    return {
      success: false,
      message: `Errore durante il test: ${error.message}`,
      details: { error: String(error) }
    };
  }
}

/**
 * Esegui tutti i test e registra i risultati
 */
async function runAllTests() {
  ensureOutputDir();
  const logs: TestLog[] = [];
  
  // Test 1: Assegnazione clausole a preventivo di matrimonio
  const result1 = await testWeddingQuoteClauseAssignment();
  logs.push({
    timestamp: new Date().toISOString(),
    testCase: "Assegnazione Clausole Preventivo Matrimonio",
    result: result1
  });
  
  // Puoi aggiungere altri test qui...
  
  // Registra i risultati
  logTestResults(logs);
}

// Esegui i test
runAllTests()
  .catch(err => {
    console.error("Errore durante l'esecuzione dei test:", err);
  })
  .finally(async () => {
    // Chiudi la connessione al database
    await db.pool.end();
    console.log("Test completati e connessione chiusa.");
  });