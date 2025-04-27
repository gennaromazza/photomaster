/**
 * Script per correggere l'incoerenza tra i diversi schemi delle selezioni
 * 
 * Questo script genera un endpoint temporaneo per la diagnosi e correzione delle tabelle
 * Eseguire solo in ambiente di sviluppo!
 */

const { Pool } = require('pg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configurazione database con DATABASE_URL
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Logging colorato
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function main() {
  try {
    log('🔍 Analisi delle tabelle di selezione...', colors.blue);
    
    // Verifica l'esistenza delle tabelle
    const tableCheck = await verifyTables();
    if (!tableCheck.success) {
      log(tableCheck.message, colors.red);
      return;
    }
    
    log(tableCheck.message, colors.green);
    
    // Analizza l'incoerenza tra le tabelle
    const analysis = await analyzeSelectionTables();
    logAnalysisResults(analysis);
    
    // Se abbiamo risultati incoerenti, proponiamo una soluzione
    if (analysis.hasIssues) {
      log('🔧 Avvio della correzione...', colors.blue);
      
      // Backup delle tabelle prima di modificarle
      await backupTables();
      log('✅ Backup creato con successo', colors.green);
      
      // Esegui la migrazione
      const migrationResult = await migrateSelections(analysis);
      
      if (migrationResult.success) {
        log(`✅ Migrazione completata con successo: ${migrationResult.migratedCount} record migrati`, colors.green);
      } else {
        log(`❌ Errore durante la migrazione: ${migrationResult.error}`, colors.red);
      }
    } else {
      log('✅ Nessun problema rilevato, non è necessaria alcuna correzione', colors.green);
    }
    
  } catch (error) {
    log(`❌ Errore durante l'esecuzione dello script: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    // Chiudi la connessione al database
    await pool.end();
  }
}

/**
 * Verifica l'esistenza delle tabelle necessarie
 */
async function verifyTables() {
  try {
    const tables = [
      'photo_selections',
      'selection_sessions',
      'gallery_selection_settings'
    ];
    
    // Controlla se le tabelle esistono
    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1);
    `;
    
    const result = await pool.query(query, [tables]);
    const existingTables = result.rows.map(row => row.table_name);
    
    const missingTables = tables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      return {
        success: false,
        message: `Tabelle mancanti: ${missingTables.join(', ')}`
      };
    }
    
    return {
      success: true,
      message: `Tutte le tabelle necessarie esistono: ${existingTables.join(', ')}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Errore durante la verifica delle tabelle: ${error.message}`
    };
  }
}

/**
 * Analizza le tabelle di selezione per rilevare incoerenze
 */
async function analyzeSelectionTables() {
  // Verifica la struttura della tabella photo_selections
  const columnsQuery = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'photo_selections'
    ORDER BY ordinal_position;
  `;
  
  const columns = await pool.query(columnsQuery);
  
  // Cerca se session_id è un intero o una stringa
  const sessionIdColumn = columns.rows.find(col => col.column_name === 'session_id');
  const sessionIdType = sessionIdColumn ? sessionIdColumn.data_type : null;
  
  // Controlla se è presente una colonna galleryId nella tabella photo_selections
  const hasGalleryIdColumn = columns.rows.some(col => col.column_name === 'gallery_id');
  
  // Controlla se ci sono dati inconsistenti nella tabella photo_selections
  let photoSelectionsCountWithTextSession = 0;
  let photoSelectionsCountWithIntSession = 0;
  let photoSelectionsWithGalleryId = 0;
  
  if (sessionIdColumn) {
    // Se session_id è una stringa, controlla quanti record hanno valori numerici vs non numerici
    if (sessionIdType === 'text' || sessionIdType === 'character varying') {
      const countQuery = `
        SELECT 
          COUNT(CASE WHEN session_id ~ '^[0-9]+$' THEN 1 END) as int_session_count,
          COUNT(CASE WHEN session_id !~ '^[0-9]+$' THEN 1 END) as text_session_count
        FROM photo_selections;
      `;
      
      const countResult = await pool.query(countQuery);
      photoSelectionsCountWithIntSession = parseInt(countResult.rows[0].int_session_count || 0);
      photoSelectionsCountWithTextSession = parseInt(countResult.rows[0].text_session_count || 0);
    } else if (sessionIdType === 'integer') {
      // Se session_id è un intero, conta quanti record ci sono
      const countQuery = `SELECT COUNT(*) FROM photo_selections WHERE session_id IS NOT NULL;`;
      const countResult = await pool.query(countQuery);
      photoSelectionsCountWithIntSession = parseInt(countResult.rows[0].count || 0);
    }
  }
  
  // Conta i record con gallery_id se la colonna esiste
  if (hasGalleryIdColumn) {
    const galleryCountQuery = `SELECT COUNT(*) FROM photo_selections WHERE gallery_id IS NOT NULL;`;
    const galleryCountResult = await pool.query(galleryCountQuery);
    photoSelectionsWithGalleryId = parseInt(galleryCountResult.rows[0].count || 0);
  }
  
  // Conta le sessioni esistenti
  const sessionCountQuery = `SELECT COUNT(*) FROM selection_sessions;`;
  const sessionCountResult = await pool.query(sessionCountQuery);
  const sessionCount = parseInt(sessionCountResult.rows[0].count || 0);
  
  // Conta le impostazioni di selezione esistenti
  const settingsCountQuery = `SELECT COUNT(*) FROM gallery_selection_settings;`;
  const settingsCountResult = await pool.query(settingsCountQuery);
  const settingsCount = parseInt(settingsCountResult.rows[0].count || 0);
  
  // Determina se ci sono problemi
  const hasIssues = (
    (sessionIdType === 'text' || sessionIdType === 'character varying') && 
    (photoSelectionsCountWithIntSession > 0 || photoSelectionsCountWithTextSession > 0)
  ) || (
    hasGalleryIdColumn && photoSelectionsWithGalleryId > 0 && sessionIdType === 'integer'
  );
  
  return {
    photoSelectionsColumns: columns.rows,
    sessionIdType,
    hasGalleryIdColumn,
    photoSelectionsCountWithTextSession,
    photoSelectionsCountWithIntSession,
    photoSelectionsWithGalleryId,
    sessionCount,
    settingsCount,
    hasIssues
  };
}

/**
 * Mostra i risultati dell'analisi
 */
function logAnalysisResults(analysis) {
  log('\n📊 Risultati dell\'analisi:', colors.blue);
  log(`Tipo di session_id in photo_selections: ${analysis.sessionIdType || 'non trovato'}`, colors.cyan);
  log(`Colonna gallery_id presente: ${analysis.hasGalleryIdColumn ? 'Sì' : 'No'}`, colors.cyan);
  log(`Selezioni con session_id di tipo testo: ${analysis.photoSelectionsCountWithTextSession}`, colors.cyan);
  log(`Selezioni con session_id di tipo intero: ${analysis.photoSelectionsCountWithIntSession}`, colors.cyan);
  log(`Selezioni con gallery_id: ${analysis.photoSelectionsWithGalleryId}`, colors.cyan);
  log(`Numero di sessioni nella tabella selection_sessions: ${analysis.sessionCount}`, colors.cyan);
  log(`Numero di impostazioni nella tabella gallery_selection_settings: ${analysis.settingsCount}`, colors.cyan);
  
  if (analysis.hasIssues) {
    log('\n⚠️ Problemi rilevati:', colors.yellow);
    
    if ((analysis.sessionIdType === 'text' || analysis.sessionIdType === 'character varying') && 
        (analysis.photoSelectionsCountWithIntSession > 0 || analysis.photoSelectionsCountWithTextSession > 0)) {
      log('- La colonna session_id è di tipo testo ma ci sono dati in essa', colors.yellow);
    }
    
    if (analysis.hasGalleryIdColumn && analysis.photoSelectionsWithGalleryId > 0 && analysis.sessionIdType === 'integer') {
      log('- La tabella ha sia gallery_id che session_id di tipo intero, possibile duplicazione di funzionalità', colors.yellow);
    }
  } else {
    log('\n✅ Nessun problema rilevato', colors.green);
  }
}

/**
 * Crea un backup delle tabelle prima di modificarle
 */
async function backupTables() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups');
  
  // Assicurati che la directory dei backup esista
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Tabelle da backuppare
  const tables = ['photo_selections', 'selection_sessions', 'gallery_selection_settings'];
  
  for (const table of tables) {
    // Ottieni tutti i dati dalla tabella
    const query = `SELECT * FROM ${table};`;
    const result = await pool.query(query);
    
    // Scrivi i dati su un file JSON
    const backupFile = path.join(backupDir, `${table}_${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(result.rows, null, 2));
    
    log(`Backup di ${table} salvato in ${backupFile}`, colors.green);
  }
}

/**
 * Migra i dati tra le tabelle per risolvere l'incoerenza
 */
async function migrateSelections(analysis) {
  try {
    // Inizia una transazione per garantire l'atomicità delle operazioni
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let migratedCount = 0;
      
      // Se session_id è di tipo testo, dobbiamo migrare i dati al nuovo sistema
      if (analysis.sessionIdType === 'text' || analysis.sessionIdType === 'character varying') {
        // Crea una tabella temporanea per i dati vecchi
        await client.query(`
          CREATE TEMP TABLE old_photo_selections AS
          SELECT * FROM photo_selections;
        `);
        
        // Elimina la tabella originale
        await client.query(`DROP TABLE photo_selections;`);
        
        // Crea la nuova tabella con la struttura corretta
        await client.query(`
          CREATE TABLE photo_selections (
            id SERIAL PRIMARY KEY,
            photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
            session_id INTEGER NOT NULL REFERENCES selection_sessions(id) ON DELETE CASCADE,
            notes TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
        
        // Recupera i dati vecchi
        const oldSelectionsResult = await client.query(`
          SELECT * FROM old_photo_selections;
        `);
        
        const oldSelections = oldSelectionsResult.rows;
        
        // Raggruppa le selezioni per gallery_id e session_id (se di tipo testo)
        const selectionGroups = {};
        
        for (const selection of oldSelections) {
          const key = selection.gallery_id 
            ? `gallery_${selection.gallery_id}`
            : (selection.session_id || `unnamed_${Date.now()}`);
          
          if (!selectionGroups[key]) {
            selectionGroups[key] = {
              galleryId: selection.gallery_id,
              clientId: selection.client_id,
              clientName: selection.client_name || 'Cliente',
              clientEmail: selection.client_email,
              selections: []
            };
          }
          
          selectionGroups[key].selections.push({
            photoId: selection.photo_id,
            notes: selection.notes,
            createdAt: selection.created_at
          });
        }
        
        // Per ogni gruppo, crea una sessione e migra le selezioni
        for (const [key, group] of Object.entries(selectionGroups)) {
          // Crea una sessione se esiste almeno una selezione nel gruppo
          if (group.selections.length > 0) {
            // Verifica se la galleria esiste
            const galleryResult = await client.query(`
              SELECT id FROM galleries WHERE id = $1;
            `, [group.galleryId]);
            
            if (galleryResult.rows.length === 0) {
              log(`⚠️ Galleria con ID ${group.galleryId} non trovata, salta questo gruppo`, colors.yellow);
              continue;
            }
            
            // Crea una nuova sessione
            const sessionResult = await client.query(`
              INSERT INTO selection_sessions (
                gallery_id, client_id, client_name, client_email, session_key, 
                status, started_at, notes
              ) VALUES (
                $1, $2, $3, $4, $5, 
                'active', NOW(), 'Sessione migrata automaticamente'
              ) RETURNING id;
            `, [
              group.galleryId,
              group.clientId,
              group.clientName,
              group.clientEmail,
              `migrated_${key}`
            ]);
            
            const sessionId = sessionResult.rows[0].id;
            
            // Inserisci le selezioni nella nuova tabella
            for (const selection of group.selections) {
              await client.query(`
                INSERT INTO photo_selections (
                  photo_id, session_id, notes, created_at
                ) VALUES (
                  $1, $2, $3, $4
                );
              `, [
                selection.photoId,
                sessionId,
                selection.notes,
                selection.createdAt || new Date()
              ]);
              
              migratedCount++;
            }
          }
        }
        
        // Elimina la tabella temporanea
        await client.query(`DROP TABLE old_photo_selections;`);
      } else if (analysis.hasGalleryIdColumn && analysis.photoSelectionsWithGalleryId > 0) {
        // Se abbiamo gallery_id ma session_id è già un intero, probabilmente abbiamo
        // una situazione ibrida. In questo caso, dobbiamo decidere caso per caso.
        log('⚠️ Situazione ibrida rilevata: session_id è già un intero ma abbiamo anche gallery_id', colors.yellow);
        log('⚠️ Questo caso richiede una migrazione manuale più complessa', colors.yellow);
        
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'Situazione ibrida rilevata, richiede intervento manuale'
        };
      }
      
      // Commit delle modifiche
      await client.query('COMMIT');
      
      return {
        success: true,
        migratedCount
      };
    } catch (error) {
      // Rollback in caso di errore
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Rilascia il client
      client.release();
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Esegui lo script
main().catch(console.error);