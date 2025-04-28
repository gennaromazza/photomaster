/**
 * Script principale di correzione per tutti i problemi dei moduli
 * Esegue in sequenza tutti gli script di correzione specifici
 */
import { fixModuleItemsAssociation } from './fix-module-items-association';
import { fixModuleClausesAssignment } from './fix-module-clauses-assignment';
import { fixModuleDuplicates } from './fix-module-duplicates';
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
 * Funzione principale per la correzione di tutti i problemi
 */
async function fixAllModuleIssues() {
  console.log('🔨 Avvio script di correzione per tutti i problemi dei moduli...');
  ensureDirectories();
  
  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    steps: []
  };
  
  try {
    // Step 1: Correggi i moduli duplicati
    console.log('\n🔄 Step 1: Correzione moduli duplicati...');
    try {
      const duplicatesResult = await fixModuleDuplicates();
      
      results.steps.push({
        name: 'Correzione moduli duplicati',
        status: 'success',
        details: duplicatesResult
      });
      
      console.log('✅ Step 1 completato con successo');
    } catch (error) {
      console.error('❌ Errore nello Step 1:', error.message);
      
      results.steps.push({
        name: 'Correzione moduli duplicati',
        status: 'error',
        error: error.message
      });
    }
    
    // Step 2: Correggi l'associazione degli elementi dei moduli
    console.log('\n🔄 Step 2: Correzione associazione elementi dei moduli...');
    try {
      const itemsResult = await fixModuleItemsAssociation();
      
      results.steps.push({
        name: 'Correzione associazione elementi',
        status: 'success',
        details: itemsResult
      });
      
      console.log('✅ Step 2 completato con successo');
    } catch (error) {
      console.error('❌ Errore nello Step 2:', error.message);
      
      results.steps.push({
        name: 'Correzione associazione elementi',
        status: 'error',
        error: error.message
      });
    }
    
    // Step 3: Correggi l'assegnazione delle clausole
    console.log('\n🔄 Step 3: Correzione assegnazione clausole...');
    try {
      const clausesResult = await fixModuleClausesAssignment();
      
      results.steps.push({
        name: 'Correzione assegnazione clausole',
        status: 'success',
        details: clausesResult
      });
      
      console.log('✅ Step 3 completato con successo');
    } catch (error) {
      console.error('❌ Errore nello Step 3:', error.message);
      
      results.steps.push({
        name: 'Correzione assegnazione clausole',
        status: 'error',
        error: error.message
      });
    }
    
    // Calcola statistiche
    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000; // in secondi
    
    const successSteps = results.steps.filter(s => s.status === 'success').length;
    const failedSteps = results.steps.filter(s => s.status === 'error').length;
    
    results.executionTime = executionTime;
    results.successSteps = successSteps;
    results.failedSteps = failedSteps;
    
    // Salva il report
    const reportFilePath = path.join(RESULTS_DIR, `all-modules-fix-${Date.now()}.json`);
    fs.writeFileSync(reportFilePath, JSON.stringify(results, null, 2));
    
    // Genera e salva il report in formato markdown
    const markdownReport = generateMarkdownReport(results);
    const markdownFilePath = path.join(RESULTS_DIR, `all-modules-fix-${Date.now()}.md`);
    fs.writeFileSync(markdownFilePath, markdownReport);
    
    console.log(`\n📊 Riepilogo: ${successSteps} step completati con successo, ${failedSteps} falliti`);
    console.log(`⏱️ Tempo di esecuzione: ${executionTime.toFixed(2)} secondi`);
    console.log(`📝 Report salvato in ${reportFilePath} e ${markdownFilePath}`);
    
    return results;
  } catch (error) {
    console.error('❌ Errore durante la correzione di tutti i problemi dei moduli:', error);
    throw error;
  }
}

/**
 * Genera un report markdown dai risultati
 */
function generateMarkdownReport(results) {
  let markdown = `# Correzione Completa dei Problemi dei Moduli\n\n`;
  markdown += `Data: ${new Date(results.timestamp).toLocaleString()}\n\n`;
  
  markdown += `## Riepilogo\n\n`;
  markdown += `- **Step Completati con Successo**: ${results.successSteps} su ${results.steps.length}\n`;
  markdown += `- **Step Falliti**: ${results.failedSteps}\n`;
  markdown += `- **Tempo di Esecuzione**: ${results.executionTime?.toFixed(2) || 'N/A'} secondi\n\n`;
  
  markdown += `## Dettagli per Step\n\n`;
  
  for (let i = 0; i < results.steps.length; i++) {
    const step = results.steps[i];
    const stepNumber = i + 1;
    
    markdown += `### Step ${stepNumber}: ${step.name}\n\n`;
    markdown += `- **Stato**: ${step.status === 'success' ? '✅ Completato con successo' : '❌ Fallito'}\n`;
    
    if (step.status === 'error') {
      markdown += `- **Errore**: ${step.error}\n\n`;
      continue;
    }
    
    // Aggiungi dettagli specifici per ogni step
    if (step.name === 'Correzione moduli duplicati') {
      if (step.details?.modulesRenamed) {
        markdown += `- **Moduli Rinominati**: ${step.details.modulesRenamed}\n`;
        
        if (step.details?.moduleDetails?.length > 0) {
          markdown += `\n| Preventivo ID | Modulo Originale | Nuovo Nome |\n`;
          markdown += `|--------------|-----------------|------------|\n`;
          
          for (const detail of step.details.moduleDetails) {
            markdown += `| ${detail.quoteId} | ${detail.originalName} | ${detail.newName} |\n`;
          }
          
          markdown += `\n`;
        }
      } else {
        markdown += `- **Nessun modulo duplicato trovato**\n\n`;
      }
    } else if (step.name === 'Correzione associazione elementi') {
      markdown += `- **Moduli Analizzati**: ${step.details?.totalModules || 0}\n`;
      markdown += `- **Moduli Corretti**: ${step.details?.modulesFixed || 0}\n`;
      markdown += `- **Elementi Creati**: ${step.details?.totalItemsCreated || 0}\n\n`;
      
      if (step.details?.modulesFixed > 0 && step.details?.details) {
        markdown += `#### Moduli Corretti\n\n`;
        markdown += `| ID Modulo | Nome Modulo | Elementi Iniziali | Elementi Creati | Elementi Totali | Minimo Richiesto |\n`;
        markdown += `|-----------|-------------|-------------------|-----------------|-----------------|------------------|\n`;
        
        for (const result of step.details.details.filter(r => r.createdItems?.length > 0)) {
          markdown += `| ${result.moduleId} | ${result.moduleName} | ${result.initialCount} | ${result.createdItems.length} | ${result.currentCount} | ${result.minRequired || '-'} |\n`;
        }
      }
    } else if (step.name === 'Correzione assegnazione clausole') {
      markdown += `- **Contratti Elaborati**: ${step.details?.contractsProcessed || 0}\n`;
      markdown += `- **Moduli Aggiornati**: ${step.details?.modulesUpdated || 0}\n\n`;
      
      if (step.details?.details?.length > 0) {
        for (const contractResult of step.details.details) {
          if (contractResult.modulesUpdated > 0) {
            markdown += `#### Contratto ID ${contractResult.contractId}\n\n`;
            markdown += `- **Preventivo ID**: ${contractResult.quoteId}\n`;
            markdown += `- **Clausole**: ${contractResult.clausesCount}\n`;
            markdown += `- **Moduli Aggiornati**: ${contractResult.modulesUpdated}\n\n`;
            
            if (contractResult.moduleDetails?.length > 0) {
              markdown += `| ID Modulo | Nome Modulo | Clausole Iniziali | Clausole Finali | Aggiornato |\n`;
              markdown += `|-----------|-------------|-------------------|-----------------|------------|\n`;
              
              for (const moduleDetail of contractResult.moduleDetails) {
                const statusIcon = moduleDetail.updated ? '✅' : '⚠️';
                
                markdown += `| ${moduleDetail.moduleId} | ${moduleDetail.moduleName} | ${moduleDetail.initialClausesCount} | ${moduleDetail.finalClausesCount} | ${statusIcon} |\n`;
              }
              
              markdown += `\n`;
            }
          }
        }
      } else if (step.details?.contractsProcessed === 0) {
        markdown += `⚠️ **Nessun contratto con clausole trovato nel database**\n\n`;
      }
    }
    
    markdown += `\n`;
  }
  
  markdown += `## Conclusioni\n\n`;
  
  if (results.failedSteps === 0) {
    markdown += `✅ **Tutte le correzioni sono state completate con successo!**\n\n`;
  } else {
    markdown += `⚠️ **Alcune correzioni non sono state completate con successo.** Si consiglia di verificare i log per maggiori dettagli.\n\n`;
  }
  
  markdown += `## Raccomandazioni\n\n`;
  
  markdown += `- **Eseguire i test di verifica**: Esegui nuovamente tutti i test diagnostici per verificare che i problemi siano stati risolti.\n\n`;
  
  markdown += `- **Verificare le modifiche manualmente**: Controlla alcuni moduli nel frontend per assicurarti che le correzioni abbiano avuto effetto.\n\n`;
  
  markdown += `- **Aggiornare il codice sorgente**: Identifica e correggi la causa principale dei problemi nel codice sorgente per evitare che si ripresentino in futuro.\n`;
  
  return markdown;
}

// Esporta le funzioni per l'uso in altri script
export { fixAllModuleIssues };

// Se il file viene eseguito direttamente, esegui la funzione principale
// In ES modules, we can check if this is the main file by comparing import.meta.url
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  fixAllModuleIssues().catch(console.error);
}