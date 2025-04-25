import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Array di pattern di conversione da cercare
const conversionPatterns = [
  // Moltiplicazioni
  /price\s*\*\s*100/g,
  /amount\s*\*\s*100/g,
  /total\s*\*\s*100/g,
  /price\s*\*\s*10/g,
  /amount\s*\*\s*10/g, 
  /total\s*\*\s*10/g,
  /value\s*\*\s*100/g,
  /value\s*\*\s*10/g,
  
  // Divisioni (per la visualizzazione)
  /price\s*\/\s*100/g,
  /amount\s*\/\s*100/g,
  /total\s*\/\s*100/g,
  /price\s*\/\s*10/g,
  /amount\s*\/\s*10/g,
  /total\s*\/\s*10/g,
  /value\s*\/\s*100/g,
  /value\s*\/\s*10/g,
  
  // Formule di arrotondamento con moltiplicazione/divisione
  /Math\.round\s*\(\s*.*\s*\*\s*100\s*\)/g,
  /Math\.round\s*\(\s*.*\s*\*\s*10\s*\)/g,
  /Math\.round\s*\(\s*.*\s*\/\s*100\s*\)/g,
  /Math\.round\s*\(\s*.*\s*\/\s*10\s*\)/g,
  
  // toFixed con moltiplicazione/divisione
  /toFixed\s*\(\s*.*\s*\*\s*100\s*\)/g,
  /toFixed\s*\(\s*.*\s*\*\s*10\s*\)/g,
  /toFixed\s*\(\s*.*\s*\/\s*100\s*\)/g,
  /toFixed\s*\(\s*.*\s*\/\s*10\s*\)/g,
];

// Tipi di file da analizzare
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

// Cartelle da escludere
const excludeDirs = ['node_modules', 'dist', '.git', 'scripts'];

// Funzione per processare un file e cercare pattern di conversione
async function processFile(filePath: string): Promise<{file: string, matches: {line: number, content: string, pattern: string}[]}> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  const matches: {line: number, content: string, pattern: string}[] = [];
  let lineNumber = 0;
  
  for await (const line of rl) {
    lineNumber++;
    for (const pattern of conversionPatterns) {
      if (pattern.test(line)) {
        matches.push({
          line: lineNumber,
          content: line.trim(),
          pattern: pattern.toString().replace(/\//g, '')
        });
      }
    }
  }
  
  return { file: filePath, matches };
}

// Funzione ricorsiva per attraversare directory
async function walkDir(dir: string, results: {file: string, matches: {line: number, content: string, pattern: string}[]}[] = []): Promise<{file: string, matches: {line: number, content: string, pattern: string}[]}[]> {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !excludeDirs.includes(file)) {
      await walkDir(filePath, results);
    } else if (stat.isFile() && extensions.includes(path.extname(filePath))) {
      const fileResults = await processFile(filePath);
      if (fileResults.matches.length > 0) {
        results.push(fileResults);
      }
    }
  }
  
  return results;
}

async function main() {
  console.log("🔍 Ricerca di conversioni di prezzo nel codice...");
  console.log(`Cerco i seguenti pattern: ${conversionPatterns.map(p => p.toString()).join(', ')}`);
  
  const clientDir = path.join(process.cwd(), 'client');
  const serverDir = path.join(process.cwd(), 'server');
  const sharedDir = path.join(process.cwd(), 'shared');
  
  console.log("\n📂 Analisi cartella client...");
  const clientResults = await walkDir(clientDir);
  
  console.log("\n📂 Analisi cartella server...");
  const serverResults = await walkDir(serverDir);
  
  console.log("\n📂 Analisi cartella shared...");
  const sharedResults = await walkDir(sharedDir);
  
  const allResults = [...clientResults, ...serverResults, ...sharedResults];
  
  console.log("\n🔍 RISULTATI DELLA RICERCA:");
  console.log("==========================\n");
  
  if (allResults.length === 0) {
    console.log("✅ Nessuna conversione di prezzo trovata nel codice!");
  } else {
    console.log(`⚠️ Trovate ${allResults.length} file con conversioni di prezzo:\n`);
    
    allResults.forEach(fileResult => {
      console.log(`📄 ${fileResult.file}`);
      fileResult.matches.forEach(match => {
        console.log(`  - Linea ${match.line}: ${match.content}`);
        console.log(`    Pattern trovato: ${match.pattern}`);
      });
      console.log('');
    });
    
    console.log("⚠️ ATTENZIONE: Questi file contengono moltiplicatori o divisori di prezzo che potrebbero causare inconsistenze.");
    console.log("   Questi moltiplicatori dovrebbero essere rimossi dopo aver eseguito lo script di standardizzazione.");
  }
}

main().catch(error => {
  console.error("Errore durante l'analisi:", error);
  process.exit(1);
});