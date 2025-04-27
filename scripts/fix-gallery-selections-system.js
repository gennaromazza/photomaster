// Script per risolvere problemi di incongruenza tra i sistemi di galleria e selezioni
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

// Configurazione dell'ambiente
dotenv.config();

// Ottieni dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurazione
const BASE_URL = 'http://localhost:5000/api';
const DB_URL = 'http://localhost:5000/api/debug/db'; // Endpoint per diagnostica DB

// Utility per i log colorati
function logInfo(message) {
  console.log(`[INFO] ${message}`);
}

function logSuccess(message) {
  console.log(`[SUCCESS] ${message}`);
}

function logWarning(message) {
  console.log(`[WARNING] ${message}`);
}

function logError(message, error = null) {
  console.error(`[ERROR] ${message}`);
  if (error) {
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.message) {
      console.error(`Message: ${error.message}`);
    } else {
      console.error(`${JSON.stringify(error, null, 2)}`);
    }
  }
}

// =============================================
// DIAGNOSI PROBLEMA DI INCOERENZA
// =============================================
async function diagnosePhotoSelectionsIssue() {
  logInfo('Avvio diagnosi del problema tra i sistemi di selezione...');

  try {
    // 1. Controllo struttura tabella photo_selections
    const tableStructure = await axios.post(DB_URL + '/structure', { tableName: 'photo_selections' });
    
    logInfo('Struttura attuale della tabella photo_selections:');
    console.table(tableStructure.data);
    
    // 2. Controllo se ci sono due tipi di record diversi
    const hasSessionIdAsText = await checkSessionIdType();
    if (hasSessionIdAsText.textFormat) {
      logWarning('Trovati record con sessionId in formato testo: ' + hasSessionIdAsText.textCount);
    }
    
    if (hasSessionIdAsText.intFormat) {
      logWarning('Trovati record con sessionId in formato intero: ' + hasSessionIdAsText.intCount);
    }
    
    // 3. Controllo dipendenze tabella
    const dependencies = await axios.post(DB_URL + '/dependencies', { tableName: 'photo_selections' });
    
    logInfo('Dipendenze della tabella photo_selections:');
    console.table(dependencies.data);
    
    return {
      hasTextSessionId: hasSessionIdAsText.textFormat,
      hasIntSessionId: hasSessionIdAsText.intFormat,
      tableStructure: tableStructure.data,
      dependencies: dependencies.data
    };
  } catch (error) {
    logError('Errore durante la diagnosi', error);
    return null;
  }
}

async function checkSessionIdType() {
  try {
    // Query per contare i record con sessionId come testo vs intero
    const response = await axios.post(DB_URL + '/execute', { 
      query: `
        SELECT 
          COUNT(CASE WHEN session_id ~ '^[0-9]+$' THEN 1 END) as int_format_count,
          COUNT(CASE WHEN session_id !~ '^[0-9]+$' THEN 1 END) as text_format_count
        FROM photo_selections
      `
    });
    
    const result = response.data[0];
    return {
      textFormat: result.text_format_count > 0,
      intFormat: result.int_format_count > 0,
      textCount: result.text_format_count,
      intCount: result.int_format_count
    };
  } catch (error) {
    logError('Errore nel controllo del tipo di sessionId', error);
    return {
      textFormat: false,
      intFormat: false,
      textCount: 0,
      intCount: 0
    };
  }
}

// =============================================
// SOLUZIONI PER CORREZIONE
// =============================================

// 1. Migra dati da vecchio a nuovo sistema
async function migrateOldToNewSelectionSystem() {
  logInfo('Inizio migrazione dal vecchio al nuovo sistema di selezione...');
  
  try {
    // 1. Crea sessioni di selezione per i dati vecchi
    const oldSelections = await getOldSelections();
    
    if (!oldSelections || oldSelections.length === 0) {
      logWarning('Nessuna selezione vecchia trovata da migrare');
      return true;
    }
    
    logInfo(`Trovate ${oldSelections.length} selezioni vecchie da migrare`);
    
    // Raggruppa per identificatore di sessione (sessionId o combinazione clientId/clientName)
    const groupedSelections = groupSelectionsForMigration(oldSelections);
    
    // Per ogni gruppo, crea una sessione e migra le selezioni
    for (const key in groupedSelections) {
      const group = groupedSelections[key];
      const result = await createSessionAndMigrateSelections(group);
      
      if (result) {
        logSuccess(`Gruppo ${key} migrato con successo`);
      } else {
        logError(`Errore nella migrazione del gruppo ${key}`);
      }
    }
    
    return true;
  } catch (error) {
    logError('Errore durante la migrazione', error);
    return false;
  }
}

async function getOldSelections() {
  try {
    const response = await axios.post(DB_URL + '/execute', { 
      query: `
        SELECT ps.*, g.id as gallery_id 
        FROM photo_selections ps
        JOIN photos p ON ps.photo_id = p.id
        JOIN galleries g ON p.gallery_id = g.id
        WHERE ps.session_id IS NOT NULL AND ps.session_id !~ '^[0-9]+$'
        OR (ps.client_id IS NOT NULL AND ps.session_id IS NULL)
      `
    });
    
    return response.data;
  } catch (error) {
    logError('Errore nel recupero delle selezioni vecchie', error);
    return [];
  }
}

function groupSelectionsForMigration(selections) {
  const groups = {};
  
  selections.forEach(selection => {
    let key = selection.session_id;
    
    if (!key && selection.client_id) {
      key = `client_${selection.client_id}`;
    }
    
    if (!key && selection.client_email) {
      key = `email_${selection.client_email}`;
    }
    
    if (!key) {
      key = `unnamed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    if (!groups[key]) {
      groups[key] = {
        key,
        galleryId: selection.gallery_id,
        clientId: selection.client_id,
        clientName: selection.client_name || 'Cliente',
        clientEmail: selection.client_email || null,
        selections: []
      };
    }
    
    groups[key].selections.push({
      photoId: selection.photo_id,
      selectionType: selection.selection_type || 'favorite',
      notes: selection.notes
    });
  });
  
  return groups;
}

async function createSessionAndMigrateSelections(group) {
  try {
    // 1. Crea una nuova sessione
    const sessionResponse = await axios.post(BASE_URL + '/selections/sessions/create', {
      galleryId: group.galleryId,
      clientId: group.clientId,
      clientName: group.clientName,
      clientEmail: group.clientEmail,
      sessionKey: `migrated_${group.key}`,
      notes: 'Sessione migrata dal vecchio sistema'
    });
    
    const sessionId = sessionResponse.data.id;
    logSuccess(`Creata nuova sessione con ID: ${sessionId}`);
    
    // 2. Aggiungi le selezioni alla nuova sessione
    for (const selection of group.selections) {
      await axios.post(BASE_URL + '/selections/photos/add', {
        photoId: selection.photoId,
        sessionId: sessionId,
        notes: selection.notes
      });
    }
    
    logSuccess(`Migrate ${group.selections.length} selezioni alla nuova sessione ${sessionId}`);
    return true;
  } catch (error) {
    logError('Errore nella creazione della sessione e migrazione selezioni', error);
    return false;
  }
}

// 2. Correzione strutturale (se necessario)
async function fixTableStructure() {
  logInfo('Controllo e correzione della struttura della tabella photo_selections...');
  
  try {
    // Verifica se la tabella ha la struttura corretta
    const tableStructure = await axios.post(DB_URL + '/structure', { tableName: 'photo_selections' });
    
    // Verifica se c'è sia session_id (testo) che session_id_int (intero)
    const hasSessionIdText = tableStructure.data.some(col => col.column_name === 'session_id' && col.data_type === 'text');
    const hasSessionIdInt = tableStructure.data.some(col => col.column_name === 'session_id' && col.data_type === 'integer');
    
    if (hasSessionIdInt) {
      logSuccess('La tabella photo_selections ha già una struttura corretta');
      return true;
    }
    
    if (hasSessionIdText) {
      logWarning('La tabella photo_selections ha session_id come testo, è necessaria una migrazione');
      
      // Esegui migrazione strutturale
      await executeSchemaUpdates();
      
      return true;
    }
    
    logWarning('Impossibile determinare la struttura della tabella photo_selections');
    return false;
  } catch (error) {
    logError('Errore nella correzione della struttura della tabella', error);
    return false;
  }
}

async function executeSchemaUpdates() {
  try {
    // Crea tabella temporanea e migraziome
    await axios.post(DB_URL + '/execute', { 
      query: `
        -- 1. Rinomina la tabella attuale
        ALTER TABLE photo_selections RENAME TO photo_selections_old;
        
        -- 2. Crea la nuova tabella con la struttura corretta
        CREATE TABLE photo_selections (
          id SERIAL PRIMARY KEY,
          photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
          session_id INTEGER NOT NULL REFERENCES selection_sessions(id) ON DELETE CASCADE,
          notes TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- 3. Migrazione dei dati avverrà tramite codice JavaScript
      `
    });
    
    logSuccess('Schema aggiornato con successo');
    return true;
  } catch (error) {
    logError('Errore nell\'aggiornamento dello schema', error);
    return false;
  }
}

// =============================================
// VERIFICA FINALE
// =============================================
async function verifyFix() {
  logInfo('Verifica della correzione...');
  
  try {
    // 1. Controllo struttura tabella photo_selections
    const tableStructure = await axios.post(DB_URL + '/structure', { tableName: 'photo_selections' });
    
    const hasCorrectStructure = tableStructure.data.some(col => 
      col.column_name === 'session_id' && col.data_type === 'integer'
    );
    
    if (hasCorrectStructure) {
      logSuccess('La tabella photo_selections ha la struttura corretta');
    } else {
      logWarning('La tabella photo_selections potrebbe non avere la struttura corretta');
    }
    
    // 2. Test funzionale delle API
    const galleryList = await axios.get(BASE_URL + '/galleries');
    
    if (galleryList.data && galleryList.data.length > 0) {
      const galleryId = galleryList.data[0].id;
      
      // Test creazione sessione
      const sessionResponse = await axios.post(BASE_URL + '/selections/sessions/create', {
        galleryId,
        clientName: 'Test Client',
        clientEmail: 'test@example.com',
        sessionKey: `test_${Date.now()}`,
        notes: 'Sessione di test per verifica correzione'
      });
      
      if (sessionResponse.data && sessionResponse.data.id) {
        logSuccess('API di creazione sessione funziona correttamente');
        
        // Trova una foto nella galleria
        const photosResponse = await axios.get(`${BASE_URL}/galleries/${galleryId}/photos`);
        
        if (photosResponse.data && photosResponse.data.photos && photosResponse.data.photos.length > 0) {
          const photoId = photosResponse.data.photos[0].id;
          
          // Test selezione foto
          const selectionResponse = await axios.post(BASE_URL + '/selections/photos/add', {
            photoId,
            sessionId: sessionResponse.data.id
          });
          
          if (selectionResponse.data) {
            logSuccess('API di selezione foto funziona correttamente');
          } else {
            logWarning('API di selezione foto potrebbe non funzionare correttamente');
          }
        } else {
          logWarning('Nessuna foto trovata per il test');
        }
      } else {
        logWarning('API di creazione sessione potrebbe non funzionare correttamente');
      }
    } else {
      logWarning('Nessuna galleria trovata per il test');
    }
    
    return true;
  } catch (error) {
    logError('Errore durante la verifica', error);
    return false;
  }
}

// =============================================
// MAIN
// =============================================
async function main() {
  logInfo('Avvio script di correzione sistema galleria e selezioni...');
  
  // 1. Diagnosi
  const diagnosis = await diagnosePhotoSelectionsIssue();
  
  if (!diagnosis) {
    logError('Impossibile completare la diagnosi');
    return;
  }
  
  // 2. Migrazione dei dati (se necessario)
  if (diagnosis.hasTextSessionId) {
    const migrationResult = await migrateOldToNewSelectionSystem();
    
    if (!migrationResult) {
      logError('Migrazione fallita');
      return;
    }
  } else {
    logSuccess('Nessuna migrazione dati necessaria');
  }
  
  // 3. Correzione strutturale (se necessario)
  const structureFixResult = await fixTableStructure();
  
  if (!structureFixResult) {
    logError('Correzione strutturale fallita');
    return;
  }
  
  // 4. Verifica finale
  const verificationResult = await verifyFix();
  
  if (verificationResult) {
    logSuccess('Correzione completata con successo!');
  } else {
    logError('Verifica finale fallita');
  }
}

// Esegui
main().catch(error => {
  logError('Errore nell\'esecuzione dello script', error);
});