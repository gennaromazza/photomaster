import { migrateAllCollaboratoriData } from "./migrate-collaboratori-data";
import { fileURLToPath } from 'url';
import path from 'path';

/**
 * Esegue la migrazione dei dati dai vecchi schemi in italiano a quelli nuovi in inglese.
 * Questa funzione può essere chiamata da un'utility temporanea o da un hook del server.
 */
export async function runMigration() {
  try {
    console.log("Inizio migrazione dei dati collaboratori...");
    await migrateAllCollaboratoriData();
    console.log("Migrazione dati collaboratori completata con successo");
    return true;
  } catch (error) {
    console.error("Errore durante la migrazione dei dati collaboratori:", error);
    return false;
  }
}

// Esegui la migrazione se questo file viene eseguito direttamente
// In ES modules dobbiamo determinare il file corrente in modo diverso da require.main === module
const currentFilePath = fileURLToPath(import.meta.url);
const currentFileName = path.basename(currentFilePath);

// Se stiamo eseguendo questo file direttamente (non importandolo)
if (process.argv[1] === currentFilePath) {
  console.log("Avvio migrazione dati collaboratori dal runner...");
  runMigration()
    .then(success => {
      if (success) {
        console.log("✅ Migrazione completata con successo");
        process.exit(0);
      } else {
        console.error("❌ Migrazione fallita");
        process.exit(1);
      }
    })
    .catch(error => {
      console.error("❌ Errore imprevisto durante la migrazione:", error);
      process.exit(1);
    });
}