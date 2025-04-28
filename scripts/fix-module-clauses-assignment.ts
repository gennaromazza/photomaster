/**
 * Script di correzione: Assegnazione Clausole ai Moduli
 * Verifica e corregge l'assegnazione delle clausole dei contratti ai moduli
 */
import { db } from '../server/db';
import { contracts, quoteModules } from '../shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// Configurazione
const RESULTS_DIR = path.join(process.cwd(), 'diagnostics-results');
const FIXES_DIR = path.join(process.cwd(), 'fixes');

/**
 * Assicura che le directory esistano
 */
function ensureDirectories() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(FIXES_DIR)) {
    fs.mkdirSync(FIXES_DIR, { recursive: true });
  }
}

/**
 * Recupera tutti i contratti con clausole e preventivo associato
 */
async function getContractsWithClauses() {
  const allContracts = await db.select().from(contracts);
  
  // Filtriamo qui in JavaScript
  return allContracts.filter(contract => 
    contract.clauses && 
    Array.isArray(contract.clauses) && 
    contract.clauses.length > 0 &&
    contract.quoteId !== null
  );
}

/**
 * Recupera tutti i moduli associati a un preventivo
 */
async function getModulesByQuoteId(quoteId: number) {
  return await db.select().from(quoteModules)
    .where(eq(quoteModules.quoteId, quoteId));
}

/**
 * Aggiorna un modulo con le clausole del contratto
 */
async function updateModuleWithClauses(moduleId: number, clauses: any[]) {
  try {
    const [updatedModule] = await db.update(quoteModules)
      .set({ clauses })
      .where(eq(quoteModules.id, moduleId))
      .returning();
    
    return updatedModule;
  } catch (error) {
    console.error(`❌ Errore nell'aggiornamento del modulo ${moduleId} con clausole:`, error.message);
    return null;
  }
}

/**
 * Funzione principale per la correzione
 */
async function fixModuleClausesAssignment() {
  console.log('🔨 Avvio script di correzione per l\'assegnazione delle clausole ai moduli...');
  ensureDirectories();
  
  try {
    // Recupera tutti i contratti con clausole
    const contractsWithClauses = await getContractsWithClauses();
    console.log(`📋 Trovati ${contractsWithClauses.length} contratti con clausole nel database`);
    
    if (contractsWithClauses.length === 0) {
      console.log('⚠️ Nessun contratto con clausole trovato, non è possibile procedere con le correzioni');
      
      // Creiamo comunque un report
      const emptyReport = {
        timestamp: new Date().toISOString(),
        contractsProcessed: 0,
        modulesUpdated: 0,
        details: []
      };
      
      const reportFilePath = path.join(RESULTS_DIR, `module-clauses-fix-${Date.now()}.json`);
      fs.writeFileSync(reportFilePath, JSON.stringify(emptyReport, null, 2));
      
      // Genera e salva il report in formato markdown
      const markdownReport = generateMarkdownReport(emptyReport);
      const markdownFilePath = path.join(RESULTS_DIR, `module-clauses-fix-${Date.now()}.md`);
      fs.writeFileSync(markdownFilePath, markdownReport);
      
      console.log(`\n📊 Riepilogo: Nessun contratto con clausole trovato`);
      console.log(`📝 Report salvato in ${reportFilePath} e ${markdownFilePath}`);
      
      return emptyReport;
    }
    
    const results = [];
    
    // Per ogni contratto con clausole, assegna le clausole ai moduli associati
    for (const contract of contractsWithClauses) {
      console.log(`\n📋 Elaborazione contratto ID ${contract.id} con ${contract.clauses.length} clausole...`);
      console.log(`📋 Preventivo associato: ID ${contract.quoteId}`);
      
      // Recupera i moduli associati al preventivo
      const modules = await getModulesByQuoteId(contract.quoteId);
      console.log(`📋 Trovati ${modules.length} moduli associati al preventivo ID ${contract.quoteId}`);
      
      if (modules.length === 0) {
        console.log(`⚠️ Nessun modulo trovato per il preventivo ID ${contract.quoteId}, non è possibile assegnare clausole`);
        continue;
      }
      
      const contractResult = {
        contractId: contract.id,
        quoteId: contract.quoteId,
        clausesCount: contract.clauses.length,
        modulesUpdated: 0,
        moduleDetails: []
      };
      
      // Per ogni modulo, assegna le clausole del contratto
      for (const module of modules) {
        console.log(`📋 Aggiornamento modulo ID ${module.id} (${module.name})...`);
        
        // Verifica se il modulo ha già le clausole
        if (module.clauses && Array.isArray(module.clauses) && module.clauses.length > 0) {
          console.log(`✅ Il modulo ID ${module.id} ha già ${module.clauses.length} clausole assegnate`);
          
          contractResult.moduleDetails.push({
            moduleId: module.id,
            moduleName: module.name,
            initialClausesCount: module.clauses.length,
            finalClausesCount: module.clauses.length,
            updated: false
          });
          
          continue;
        }
        
        // Assegna le clausole del contratto al modulo
        console.log(`🔨 Assegnazione di ${contract.clauses.length} clausole al modulo ID ${module.id}...`);
        
        try {
          const updatedModule = await updateModuleWithClauses(module.id, contract.clauses);
          
          if (updatedModule) {
            console.log(`✅ Modulo ID ${module.id} aggiornato con ${contract.clauses.length} clausole`);
            
            contractResult.modulesUpdated++;
            contractResult.moduleDetails.push({
              moduleId: module.id,
              moduleName: module.name,
              initialClausesCount: 0,
              finalClausesCount: contract.clauses.length,
              updated: true
            });
          } else {
            console.log(`❌ Impossibile aggiornare il modulo ID ${module.id}`);
            
            contractResult.moduleDetails.push({
              moduleId: module.id,
              moduleName: module.name,
              initialClausesCount: 0,
              finalClausesCount: 0,
              updated: false,
              error: "Impossibile aggiornare il modulo"
            });
          }
        } catch (error) {
          console.error(`❌ Errore nell'aggiornamento del modulo ID ${module.id}:`, error.message);
          
          contractResult.moduleDetails.push({
            moduleId: module.id,
            moduleName: module.name,
            initialClausesCount: 0,
            finalClausesCount: 0,
            updated: false,
            error: error.message
          });
        }
      }
      
      results.push(contractResult);
    }
    
    // Calcola statistiche
    const contractsProcessed = results.length;
    const modulesUpdated = results.reduce((sum, r) => sum + r.modulesUpdated, 0);
    
    // Salva il report
    const report = {
      timestamp: new Date().toISOString(),
      contractsProcessed,
      modulesUpdated,
      details: results
    };
    
    const reportFilePath = path.join(RESULTS_DIR, `module-clauses-fix-${Date.now()}.json`);
    fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2));
    
    // Genera e salva il report in formato markdown
    const markdownReport = generateMarkdownReport(report);
    const markdownFilePath = path.join(RESULTS_DIR, `module-clauses-fix-${Date.now()}.md`);
    fs.writeFileSync(markdownFilePath, markdownReport);
    
    console.log(`\n📊 Riepilogo: Elaborati ${contractsProcessed} contratti, aggiornati ${modulesUpdated} moduli`);
    console.log(`📝 Report salvato in ${reportFilePath} e ${markdownFilePath}`);
    
    return report;
  } catch (error) {
    console.error('❌ Errore durante la correzione dell\'assegnazione delle clausole:', error);
    throw error;
  }
}

/**
 * Genera un report markdown dai risultati
 */
function generateMarkdownReport(report) {
  let markdown = `# Correzione Assegnazione Clausole ai Moduli\n\n`;
  markdown += `Data: ${new Date(report.timestamp).toLocaleString()}\n\n`;
  
  markdown += `## Riepilogo\n\n`;
  markdown += `- **Contratti Elaborati**: ${report.contractsProcessed}\n`;
  markdown += `- **Moduli Aggiornati**: ${report.modulesUpdated}\n\n`;
  
  if (report.contractsProcessed === 0) {
    markdown += `⚠️ **Nessun contratto con clausole trovato nel database.**\n\n`;
    markdown += `Per risolvere questo problema, è necessario:\n`;
    markdown += `1. Creare contratti con clausole valide\n`;
    markdown += `2. Assicurarsi che i contratti siano associati a preventivi\n`;
    markdown += `3. Assicurarsi che i preventivi abbiano moduli associati\n\n`;
    
    return markdown;
  }
  
  if (report.modulesUpdated === 0) {
    markdown += `✅ **Nessun modulo necessitava di aggiornamenti!**\n\n`;
  } else {
    markdown += `## Dettagli per Contratto\n\n`;
    
    for (const contractResult of report.details) {
      markdown += `### Contratto ID ${contractResult.contractId}\n\n`;
      markdown += `- **Preventivo ID**: ${contractResult.quoteId}\n`;
      markdown += `- **Clausole**: ${contractResult.clausesCount}\n`;
      markdown += `- **Moduli Aggiornati**: ${contractResult.modulesUpdated} su ${contractResult.moduleDetails.length}\n\n`;
      
      if (contractResult.moduleDetails.length > 0) {
        markdown += `| ID Modulo | Nome Modulo | Clausole Iniziali | Clausole Finali | Aggiornato | Note |\n`;
        markdown += `|-----------|-------------|-------------------|-----------------|------------|------|\n`;
        
        for (const moduleDetail of contractResult.moduleDetails) {
          const statusIcon = moduleDetail.updated ? '✅' : (moduleDetail.error ? '❌' : '⚠️');
          const note = moduleDetail.error ? moduleDetail.error : (moduleDetail.initialClausesCount > 0 ? 'Già aggiornato' : '');
          
          markdown += `| ${moduleDetail.moduleId} | ${moduleDetail.moduleName} | ${moduleDetail.initialClausesCount} | ${moduleDetail.finalClausesCount} | ${statusIcon} | ${note} |\n`;
        }
        
        markdown += `\n`;
      }
    }
  }
  
  markdown += `## Raccomandazioni\n\n`;
  
  if (report.modulesUpdated > 0) {
    markdown += `- **Verificare l'assegnazione delle clausole**: Controlla che le clausole siano state correttamente assegnate ai moduli e che vengano visualizzate nella pagina di firma.\n\n`;
    markdown += `- **Rivedere il processo di creazione dei contratti**: Assicurarsi che quando viene creato un contratto, le clausole vengano automaticamente assegnate a tutti i moduli del preventivo associato.\n\n`;
  } else if (report.contractsProcessed > 0) {
    markdown += `- **Verifica completata**: Tutti i moduli hanno già le clausole assegnate correttamente.\n\n`;
  }
  
  markdown += `- **Test aggiuntivi**: Eseguire nuovamente i test di assegnazione clausole per verificare che il problema sia stato risolto.\n`;
  
  return markdown;
}

// Esporta la funzione per l'uso in altri script
export { fixModuleClausesAssignment };

// Se il file viene eseguito direttamente, esegui la funzione principale
if (require.main === module) {
  fixModuleClausesAssignment().catch(console.error);
}