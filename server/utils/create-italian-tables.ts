/**
 * Script per creare le tabelle italiane mancanti necessarie per la migrazione
 */

import { db } from "../db";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// Ottieni il percorso del file corrente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Crea le tabelle italiane necessarie per la migrazione
 */
export async function createItalianTables() {
  try {
    console.log("Inizio creazione tabelle italiane...");
    
    // Leggi il file SQL
    const sqlFilePath = path.join(__dirname, "create-italian-tables.sql");
    const sqlContent = fs.readFileSync(sqlFilePath, "utf-8");
    
    // Esegui gli statement SQL
    await db.execute(sqlContent);
    
    console.log("Tabelle italiane create con successo!");
    return true;
  } catch (error) {
    console.error("Errore durante la creazione delle tabelle italiane:", error);
    return false;
  }
}

// Se eseguito direttamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createItalianTables()
    .then((success) => {
      if (success) {
        console.log("✅ Creazione tabelle italiane completata");
        process.exit(0);
      } else {
        console.error("❌ Creazione tabelle italiane fallita");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("❌ Errore imprevisto:", error);
      process.exit(1);
    });
}