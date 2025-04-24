/**
 * Script per aggiungere le colonne mancanti alla tabella event_collaborators
 */

import { db } from "../db";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// Ottieni il percorso del file corrente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Aggiorna la tabella event_collaborators aggiungendo le colonne mancanti
 */
export async function updateEventCollaboratorsTable() {
  try {
    console.log("Inizio aggiornamento tabella event_collaborators...");
    
    // Leggi il file SQL
    const sqlFilePath = path.join(__dirname, "update-event-collaborators.sql");
    const sqlContent = fs.readFileSync(sqlFilePath, "utf-8");
    
    // Esegui gli statement SQL
    await db.execute(sqlContent);
    
    console.log("Tabella event_collaborators aggiornata con successo!");
    return true;
  } catch (error) {
    console.error("Errore durante l'aggiornamento della tabella event_collaborators:", error);
    return false;
  }
}

// Se eseguito direttamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateEventCollaboratorsTable()
    .then((success) => {
      if (success) {
        console.log("✅ Aggiornamento tabella event_collaborators completato");
        process.exit(0);
      } else {
        console.error("❌ Aggiornamento tabella event_collaborators fallito");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("❌ Errore imprevisto:", error);
      process.exit(1);
    });
}