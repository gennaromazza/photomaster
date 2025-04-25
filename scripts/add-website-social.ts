import { pool } from "../server/db";

async function addWebsiteUrlToSettings() {
  try {
    console.log("Verifico colonna website_url nella tabella settings...");
    
    // Controlla se la colonna esiste già
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'settings' 
      AND column_name = 'website_url'
    `;
    
    const checkResult = await pool.query(checkColumnQuery);
    
    if (checkResult.rows.length === 0) {
      console.log("Colonna website_url non trovata, aggiungo la colonna...");
      
      // Aggiungi la colonna
      const addColumnQuery = `
        ALTER TABLE settings 
        ADD COLUMN website_url TEXT
      `;
      
      await pool.query(addColumnQuery);
      console.log("✅ Colonna website_url aggiunta con successo alla tabella settings");
    } else {
      console.log("✅ Colonna website_url già presente nella tabella settings");
    }
    
    // Rinomina i campi per allinearli con lo schema
    console.log("Controllo mappatura dei campi social media...");
    
    const updateQuery = `
      DO $$ 
      BEGIN
        BEGIN
          UPDATE settings 
          SET 
            instagram_url = COALESCE(instagram_url, instagramUrl),
            facebook_url = COALESCE(facebook_url, facebookUrl),
            twitter_url = COALESCE(twitter_url, twitterUrl),
            youtube_url = COALESCE(youtube_url, youtubeUrl)
          WHERE id = 1;
        EXCEPTION WHEN OTHERS THEN
          -- Ignora errori nel caso le colonne non esistano
          RAISE NOTICE 'Errore durante aggiornamento campi: %', SQLERRM;
        END;
      END $$;
    `;
    
    await pool.query(updateQuery);
    console.log("✅ Migrazione campi social media completata");
    
    console.log("Migrazione completata con successo");
  } catch (error) {
    console.error("❌ Errore durante la migrazione:", error);
  } finally {
    // Non chiudere il pool qui se è usato altrove nell'applicazione
  }
}

addWebsiteUrlToSettings()
  .then(() => console.log("Script terminato"))
  .catch(error => console.error("Errore non gestito:", error));