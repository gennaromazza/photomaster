/**
 * Script di correzione: Associazione elementi del modulo
 * Risolve il problema dell'associazione tra elementi e moduli
 */
import { db } from '../server/db';
import { quoteModules, quoteModuleItems } from '../shared/schema';
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
 * Recupera tutti i moduli dal database
 */
async function getAllModules() {
  return await db.select().from(quoteModules);
}

/**
 * Verifica e corregge l'associazione degli elementi per un modulo
 */
async function fixModuleItems(module) {
  console.log(`📋 Analisi modulo ID ${module.id} (${module.name})...`);
  
  // Recupera gli elementi del modulo dal database
  const items = await db.select().from(quoteModuleItems)
    .where(eq(quoteModuleItems.moduleId, module.id));
  
  console.log(`📋 Trovati ${items.length} elementi associati al modulo ID ${module.id}`);
  
  // Se non ci sono elementi ma il modulo è di tipo 'variable', questo è un problema
  if (items.length === 0 && module.type === 'variable') {
    console.log(`⚠️ Il modulo variabile ID ${module.id} non ha elementi associati`);
    
    // Aggiungiamo elementi di esempio per i moduli variabili senza elementi
    if (module.minSelectCount && module.minSelectCount > 0) {
      console.log(`🔨 Creazione elementi di esempio per soddisfare il minimo di ${module.minSelectCount}...`);
      
      const elementsToCreate = module.minSelectCount;
      const createdItems = [];
      
      for (let i = 1; i <= elementsToCreate; i++) {
        try {
          const [newItem] = await db.insert(quoteModuleItems).values({
            moduleId: module.id,
            name: `Elemento ${i} (creato automaticamente)`,
            description: `Elemento generato automaticamente per soddisfare il minimo di selezioni richieste`,
            price: 100 * i, // Prezzo di esempio
            unitPrice: 100 * i, // Prezzo unitario obbligatorio
            quantity: 1,
            total: 100 * i,
            isSelected: false,
            isRequired: false,
            hasDiscount: false
          }).returning();
          
          createdItems.push(newItem);
          console.log(`✅ Creato elemento ID ${newItem.id} per il modulo ID ${module.id}`);
        } catch (error) {
          console.error(`❌ Errore nella creazione dell'elemento ${i} per il modulo ID ${module.id}:`, error.message);
        }
      }
      
      return {
        moduleId: module.id,
        moduleName: module.name,
        initialCount: items.length,
        createdItems: createdItems,
        currentCount: items.length + createdItems.length,
        minRequired: module.minSelectCount
      };
    }
  }
  
  return {
    moduleId: module.id,
    moduleName: module.name,
    initialCount: items.length,
    createdItems: [],
    currentCount: items.length,
    minRequired: module.minSelectCount
  };
}

/**
 * Verifica se un modulo ha clausole e le aggiunge se necessario
 */
async function ensureModuleHasClauses(module, contractId = null) {
  // Se non abbiamo un ID contratto, non possiamo aggiungere clausole
  if (!contractId) {
    return null;
  }
  
  console.log(`📋 Verifica clausole per il modulo ID ${module.id}...`);
  
  // TODO: Implementare quando avremo la tabella delle clausole
  return null;
}

/**
 * Funzione principale per la correzione
 */
async function fixModuleItemsAssociation() {
  console.log('🔨 Avvio script di correzione per l\'associazione degli elementi dei moduli...');
  ensureDirectories();
  
  try {
    // Recupera tutti i moduli
    const modules = await getAllModules();
    console.log(`📋 Trovati ${modules.length} moduli nel database`);
    
    const results = [];
    
    // Per ogni modulo, verifica e correggi l'associazione degli elementi
    for (const module of modules) {
      const result = await fixModuleItems(module);
      results.push(result);
    }
    
    // Calcola statistiche
    const totalModules = results.length;
    const modulesFixed = results.filter(r => r.createdItems.length > 0).length;
    const totalItemsCreated = results.reduce((sum, r) => sum + r.createdItems.length, 0);
    
    // Salva il report
    const report = {
      timestamp: new Date().toISOString(),
      totalModules,
      modulesFixed,
      totalItemsCreated,
      details: results
    };
    
    const reportFilePath = path.join(RESULTS_DIR, `module-items-fix-${Date.now()}.json`);
    fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2));
    
    // Genera e salva il report in formato markdown
    const markdownReport = generateMarkdownReport(report);
    const markdownFilePath = path.join(RESULTS_DIR, `module-items-fix-${Date.now()}.md`);
    fs.writeFileSync(markdownFilePath, markdownReport);
    
    console.log(`\n📊 Riepilogo: Corretti ${modulesFixed} moduli su ${totalModules}, creati ${totalItemsCreated} elementi`);
    console.log(`📝 Report salvato in ${reportFilePath} e ${markdownFilePath}`);
    
    return report;
  } catch (error) {
    console.error('❌ Errore durante la correzione dell\'associazione degli elementi:', error);
    throw error;
  }
}

/**
 * Genera un report markdown dai risultati
 */
function generateMarkdownReport(report) {
  let markdown = `# Correzione Associazione Elementi dei Moduli\n\n`;
  markdown += `Data: ${new Date(report.timestamp).toLocaleString()}\n\n`;
  
  markdown += `## Riepilogo\n\n`;
  markdown += `- **Moduli Analizzati**: ${report.totalModules}\n`;
  markdown += `- **Moduli Corretti**: ${report.modulesFixed}\n`;
  markdown += `- **Elementi Creati**: ${report.totalItemsCreated}\n\n`;
  
  if (report.modulesFixed === 0) {
    markdown += `✅ **Nessun modulo necessitava di correzioni!**\n\n`;
  } else {
    markdown += `## Dettagli delle Correzioni\n\n`;
    markdown += `| ID Modulo | Nome Modulo | Elementi Iniziali | Elementi Creati | Elementi Totali | Minimo Richiesto |\n`;
    markdown += `|-----------|-------------|-------------------|-----------------|-----------------|------------------|\n`;
    
    for (const result of report.details.filter(r => r.createdItems.length > 0)) {
      markdown += `| ${result.moduleId} | ${result.moduleName} | ${result.initialCount} | ${result.createdItems.length} | ${result.currentCount} | ${result.minRequired || '-'} |\n`;
    }
    
    markdown += `\n## Elementi Creati\n\n`;
    
    for (const result of report.details.filter(r => r.createdItems.length > 0)) {
      markdown += `### Modulo: ${result.moduleName} (ID: ${result.moduleId})\n\n`;
      markdown += `| ID Elemento | Nome | Prezzo |\n`;
      markdown += `|-------------|------|--------|\n`;
      
      for (const item of result.createdItems) {
        markdown += `| ${item.id} | ${item.name} | ${item.price ? `${item.price}€` : '-'} |\n`;
      }
      
      markdown += `\n`;
    }
  }
  
  markdown += `## Raccomandazioni\n\n`;
  
  if (report.modulesFixed > 0) {
    markdown += `- **Verificare gli elementi creati**: Sono stati generati automaticamente ${report.totalItemsCreated} elementi per soddisfare i requisiti di selezione minima. Controlla e modifica questi elementi secondo le tue esigenze.\n\n`;
    markdown += `- **Rivedere il processo di creazione degli elementi**: Il problema potrebbe essere nel controller che gestisce la creazione degli elementi o nelle relazioni del database.\n\n`;
  }
  
  markdown += `- **Test aggiuntivi**: Eseguire nuovamente i test di creazione moduli per verificare che il problema sia stato risolto.\n`;
  
  return markdown;
}

// Esegui la funzione di correzione
fixModuleItemsAssociation().catch(console.error);