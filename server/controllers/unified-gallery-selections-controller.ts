/**
 * Controller unificato per la gestione di gallerie e selezioni
 * Questo controller risolve i problemi di incoerenza tra i due sistemi di selezione
 */

import { Request, Response } from "express";
import { db } from "../db";
import { v4 as uuidv4 } from "uuid";
import { eq, and, desc, or, inArray, isNull, sql } from "drizzle-orm";
import { 
  gallerySelectionSettings, 
  selectionSessions, 
  photoSelections as newPhotoSelections,
  photoComments,
  insertGallerySelectionSettingsSchema,
  insertSelectionSessionSchema
} from "../../shared/schema-gallery-selections";
import { 
  galleries, 
  photos,
  photoSelections as oldPhotoSelections
} from "../../schema_gallery";
import { createObjectCsvStringifier } from "csv-writer";

// =============================================
// FUNZIONI DI SUPPORTO
// =============================================

/**
 * Verifica quale sistema di selezione è in uso per una galleria
 * @param galleryId - ID della galleria
 * @returns true se è in uso il nuovo sistema, false se è in uso il vecchio sistema
 */
async function isUsingNewSelectionSystem(galleryId: number): Promise<boolean> {
  // Verifica se esiste un record nelle impostazioni del nuovo sistema
  const settings = await db.query.gallerySelectionSettings.findFirst({
    where: eq(gallerySelectionSettings.galleryId, galleryId)
  });
  
  return !!settings;
}

/**
 * Ottiene o crea le impostazioni di selezione per una galleria
 * @param galleryId - ID della galleria
 */
async function getOrCreateSelectionSettings(galleryId: number) {
  // Cerca le impostazioni esistenti
  let settings = await db.query.gallerySelectionSettings.findFirst({
    where: eq(gallerySelectionSettings.galleryId, galleryId)
  });
  
  // Se non esistono, crea nuove impostazioni di default
  if (!settings) {
    const [newSettings] = await db
      .insert(gallerySelectionSettings)
      .values({
        galleryId,
        isEnabled: true,
        maxSelections: 0, // 0 = nessun limite
        allowComments: true,
        customMessage: "Seleziona le tue foto preferite!",
        instructions: "Clicca sulle foto per selezionarle."
      })
      .returning();
    
    settings = newSettings;
  }
  
  return settings;
}

/**
 * Ottiene o crea una sessione di selezione
 * @param galleryId - ID della galleria
 * @param clientName - Nome del cliente
 * @param clientEmail - Email del cliente (opzionale)
 * @param clientId - ID del cliente registrato (opzionale)
 */
async function getOrCreateSession(
  galleryId: number,
  clientName: string,
  clientEmail?: string,
  clientId?: number,
  sessionKey?: string
) {
  // Cerca una sessione esistente per lo stesso cliente/galleria
  let session;
  
  if (clientId) {
    session = await db.query.selectionSessions.findFirst({
      where: and(
        eq(selectionSessions.galleryId, galleryId),
        eq(selectionSessions.clientId, clientId),
        eq(selectionSessions.status, 'active')
      )
    });
  } else if (clientEmail) {
    session = await db.query.selectionSessions.findFirst({
      where: and(
        eq(selectionSessions.galleryId, galleryId),
        eq(selectionSessions.clientEmail, clientEmail),
        eq(selectionSessions.status, 'active')
      )
    });
  }
  
  // Se non esiste, crea una nuova sessione
  if (!session) {
    const [newSession] = await db
      .insert(selectionSessions)
      .values({
        galleryId,
        clientId: clientId || null,
        clientName,
        clientEmail: clientEmail || null,
        sessionKey: sessionKey || uuidv4(),
        status: 'active'
      })
      .returning();
    
    session = newSession;
  }
  
  return session;
}

// =============================================
// CONTROLLER API
// =============================================

/**
 * Ottiene le impostazioni di selezione per una galleria
 */
export const getSelectionSettings = async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;
    
    const settings = await db.query.gallerySelectionSettings.findFirst({
      where: eq(gallerySelectionSettings.galleryId, Number(galleryId))
    });
    
    // Se non esistono impostazioni, restituisci i valori predefiniti
    if (!settings) {
      return res.json({
        galleryId: Number(galleryId),
        isEnabled: true,
        maxSelections: 0,
        allowComments: true,
        expiresAt: null,
        customMessage: null,
        instructions: null
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error("Errore nel recupero delle impostazioni di selezione:", error);
    res.status(500).json({ error: "Errore nel recupero delle impostazioni di selezione" });
  }
};

/**
 * Crea o aggiorna le impostazioni di selezione per una galleria
 */
export const createOrUpdateSelectionSettings = async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;
    const data = req.body;
    
    // Valida i dati
    const validData = insertGallerySelectionSettingsSchema.parse({
      ...data,
      galleryId: Number(galleryId)
    });
    
    // Cerca impostazioni esistenti
    const existingSettings = await db.query.gallerySelectionSettings.findFirst({
      where: eq(gallerySelectionSettings.galleryId, Number(galleryId))
    });
    
    if (existingSettings) {
      // Aggiorna impostazioni esistenti
      const [updated] = await db
        .update(gallerySelectionSettings)
        .set({
          ...validData,
          updatedAt: new Date()
        })
        .where(eq(gallerySelectionSettings.id, existingSettings.id))
        .returning();
      
      res.json(updated);
    } else {
      // Crea nuove impostazioni
      const [newSettings] = await db
        .insert(gallerySelectionSettings)
        .values({
          ...validData,
          galleryId: Number(galleryId)
        })
        .returning();
      
      res.status(201).json(newSettings);
    }
  } catch (error) {
    console.error("Errore nella creazione/aggiornamento delle impostazioni di selezione:", error);
    res.status(500).json({ error: "Errore nella creazione/aggiornamento delle impostazioni di selezione" });
  }
};

/**
 * Crea una nuova sessione di selezione
 */
export const createSelectionSession = async (req: Request, res: Response) => {
  try {
    const { galleryId, clientName, clientEmail, clientId, sessionKey, notes } = req.body;
    
    // Verifica che la galleria esista
    const gallery = await db.query.galleries.findFirst({
      where: eq(galleries.id, Number(galleryId))
    });
    
    if (!gallery) {
      return res.status(404).json({ error: "Galleria non trovata" });
    }
    
    // Verifica che le selezioni siano abilitate per questa galleria
    const settings = await getOrCreateSelectionSettings(Number(galleryId));
    
    if (!settings.isEnabled) {
      return res.status(403).json({ error: "Le selezioni non sono abilitate per questa galleria" });
    }
    
    // Verifica se la galleria è scaduta
    if (settings.expiresAt && new Date(settings.expiresAt) < new Date()) {
      return res.status(403).json({ error: "Il periodo di selezione per questa galleria è scaduto" });
    }
    
    // Crea la sessione
    const [session] = await db
      .insert(selectionSessions)
      .values({
        galleryId: Number(galleryId),
        clientId: clientId ? Number(clientId) : null,
        clientName,
        clientEmail: clientEmail || null,
        sessionKey: sessionKey || uuidv4(),
        notes: notes || null,
        status: 'active'
      })
      .returning();
    
    res.status(201).json(session);
  } catch (error) {
    console.error("Errore nella creazione della sessione di selezione:", error);
    res.status(500).json({ error: "Errore nella creazione della sessione di selezione" });
  }
};

/**
 * Ottiene i dettagli di una sessione di selezione
 */
export const getSelectionSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const session = await db.query.selectionSessions.findFirst({
      where: eq(selectionSessions.id, Number(sessionId)),
      with: {
        gallery: true
      }
    });
    
    if (!session) {
      return res.status(404).json({ error: "Sessione non trovata" });
    }
    
    // Conta le selezioni
    const selectionsCount = await db
      .select({ count: sql`count(*)` })
      .from(newPhotoSelections)
      .where(eq(newPhotoSelections.sessionId, Number(sessionId)))
      .then(result => Number(result[0]?.count || 0));
    
    // Conta i commenti
    const commentsCount = await db
      .select({ count: sql`count(*)` })
      .from(photoComments)
      .where(eq(photoComments.sessionId, Number(sessionId)))
      .then(result => Number(result[0]?.count || 0));
    
    res.json({
      ...session,
      _count: {
        selections: selectionsCount,
        comments: commentsCount
      }
    });
  } catch (error) {
    console.error("Errore nel recupero della sessione:", error);
    res.status(500).json({ error: "Errore nel recupero della sessione" });
  }
};

/**
 * Aggiorna una sessione di selezione
 */
export const updateSelectionSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { status, notes, completedAt } = req.body;
    
    const session = await db.query.selectionSessions.findFirst({
      where: eq(selectionSessions.id, Number(sessionId))
    });
    
    if (!session) {
      return res.status(404).json({ error: "Sessione non trovata" });
    }
    
    const [updated] = await db
      .update(selectionSessions)
      .set({
        status: status || session.status,
        notes: notes !== undefined ? notes : session.notes,
        completedAt: completedAt ? new Date(completedAt) : (status === 'completed' ? new Date() : session.completedAt)
      })
      .where(eq(selectionSessions.id, Number(sessionId)))
      .returning();
    
    res.json(updated);
  } catch (error) {
    console.error("Errore nell'aggiornamento della sessione:", error);
    res.status(500).json({ error: "Errore nell'aggiornamento della sessione" });
  }
};

/**
 * Seleziona o deseleziona una foto
 * Implementa un comportamento di toggle - aggiunge o rimuove la selezione
 */
export const togglePhotoSelection = async (req: Request, res: Response) => {
  try {
    const { photoId } = req.params;
    const { sessionId, notes } = req.body;
    
    if (!photoId || !sessionId) {
      return res.status(400).json({ error: "ID foto e ID sessione sono obbligatori" });
    }
    
    // Verifica che la foto esista
    const photo = await db.query.photos.findFirst({
      where: eq(photos.id, Number(photoId))
    });
    
    if (!photo) {
      return res.status(404).json({ error: "Foto non trovata" });
    }
    
    // Verifica che la sessione esista
    const session = await db.query.selectionSessions.findFirst({
      where: eq(selectionSessions.id, Number(sessionId))
    });
    
    if (!session) {
      return res.status(404).json({ error: "Sessione non trovata" });
    }
    
    // Verifica che la foto appartenga alla stessa galleria della sessione
    if (photo.galleryId !== session.galleryId) {
      return res.status(400).json({ error: "La foto non appartiene alla stessa galleria della sessione" });
    }
    
    // Recupera le impostazioni della galleria
    const settings = await db.query.gallerySelectionSettings.findFirst({
      where: eq(gallerySelectionSettings.galleryId, session.galleryId)
    });
    
    // Controlla se esiste già una selezione per questa foto nella sessione
    const existingSelection = await db.query.photoSelections.findFirst({
      where: and(
        eq(newPhotoSelections.sessionId, Number(sessionId)),
        eq(newPhotoSelections.photoId, Number(photoId))
      )
    });
    
    // Se esiste, rimuovila (toggle off)
    if (existingSelection) {
      await db
        .delete(newPhotoSelections)
        .where(eq(newPhotoSelections.id, existingSelection.id));
      
      return res.json({ 
        action: "removed", 
        message: "Selezione rimossa con successo" 
      });
    }
    
    // Altrimenti, aggiungi la selezione (toggle on)
    // Prima verifica se abbiamo raggiunto il limite massimo
    if (settings && settings.maxSelections > 0) {
      const currentSelectionsCount = await db
        .select({ count: sql`count(*)` })
        .from(newPhotoSelections)
        .where(eq(newPhotoSelections.sessionId, Number(sessionId)))
        .then(result => Number(result[0]?.count || 0));
      
      if (currentSelectionsCount >= settings.maxSelections) {
        return res.status(400).json({ 
          error: `Hai raggiunto il limite massimo di ${settings.maxSelections} selezioni` 
        });
      }
    }
    
    // Aggiungi la nuova selezione
    const [newSelection] = await db
      .insert(newPhotoSelections)
      .values({
        sessionId: Number(sessionId),
        photoId: Number(photoId),
        notes: notes || null
      })
      .returning();
    
    res.status(201).json({ 
      action: "added", 
      selection: newSelection,
      message: "Foto selezionata con successo" 
    });
  } catch (error) {
    console.error("Errore nella gestione della selezione:", error);
    res.status(500).json({ error: "Errore nella gestione della selezione" });
  }
};

/**
 * Ottiene tutte le selezioni per una sessione
 */
export const getSessionSelections = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    // Verifica che la sessione esista
    const session = await db.query.selectionSessions.findFirst({
      where: eq(selectionSessions.id, Number(sessionId))
    });
    
    if (!session) {
      return res.status(404).json({ error: "Sessione non trovata" });
    }
    
    // Recupera tutte le selezioni con i dati delle foto
    const selections = await db.query.newPhotoSelections.findMany({
      where: eq(newPhotoSelections.sessionId, Number(sessionId)),
      with: {
        photo: true
      },
      orderBy: desc(newPhotoSelections.createdAt)
    });
    
    res.json(selections);
  } catch (error) {
    console.error("Errore nel recupero delle selezioni:", error);
    res.status(500).json({ error: "Errore nel recupero delle selezioni" });
  }
};

/**
 * Ottiene tutte le sessioni di selezione per una galleria
 */
export const getGallerySessions = async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;
    
    // Verifica che la galleria esista
    const gallery = await db.query.galleries.findFirst({
      where: eq(galleries.id, Number(galleryId))
    });
    
    if (!gallery) {
      return res.status(404).json({ error: "Galleria non trovata" });
    }
    
    // Recupera tutte le sessioni con conteggi
    const sessions = await db.query.selectionSessions.findMany({
      where: eq(selectionSessions.galleryId, Number(galleryId)),
      orderBy: desc(selectionSessions.startedAt)
    });
    
    // Recupera i conteggi per ogni sessione
    const sessionsWithCounts = await Promise.all(sessions.map(async (session) => {
      const selectionsCount = await db
        .select({ count: sql`count(*)` })
        .from(newPhotoSelections)
        .where(eq(newPhotoSelections.sessionId, session.id))
        .then(result => Number(result[0]?.count || 0));
      
      const commentsCount = await db
        .select({ count: sql`count(*)` })
        .from(photoComments)
        .where(eq(photoComments.sessionId, session.id))
        .then(result => Number(result[0]?.count || 0));
      
      return {
        ...session,
        _count: {
          selections: selectionsCount,
          comments: commentsCount
        }
      };
    }));
    
    res.json(sessionsWithCounts);
  } catch (error) {
    console.error("Errore nel recupero delle sessioni:", error);
    res.status(500).json({ error: "Errore nel recupero delle sessioni" });
  }
};

/**
 * Aggiunge un commento a una foto
 */
export const addPhotoComment = async (req: Request, res: Response) => {
  try {
    const { photoId } = req.params;
    const { sessionId, content, clientName } = req.body;
    
    if (!photoId || !sessionId || !content) {
      return res.status(400).json({ 
        error: "ID foto, ID sessione e contenuto commento sono obbligatori" 
      });
    }
    
    // Verifica che la foto esista
    const photo = await db.query.photos.findFirst({
      where: eq(photos.id, Number(photoId))
    });
    
    if (!photo) {
      return res.status(404).json({ error: "Foto non trovata" });
    }
    
    // Verifica che la sessione esista
    const session = await db.query.selectionSessions.findFirst({
      where: eq(selectionSessions.id, Number(sessionId))
    });
    
    if (!session) {
      return res.status(404).json({ error: "Sessione non trovata" });
    }
    
    // Verifica che la foto appartenga alla stessa galleria della sessione
    if (photo.galleryId !== session.galleryId) {
      return res.status(400).json({ 
        error: "La foto non appartiene alla stessa galleria della sessione" 
      });
    }
    
    // Aggiungi il commento
    const [comment] = await db
      .insert(photoComments)
      .values({
        photoId: Number(photoId),
        sessionId: Number(sessionId),
        content,
        clientName: clientName || session.clientName,
        userId: req.user?.id || null
      })
      .returning();
    
    res.status(201).json(comment);
  } catch (error) {
    console.error("Errore nell'aggiunta del commento:", error);
    res.status(500).json({ error: "Errore nell'aggiunta del commento" });
  }
};

/**
 * Ottiene tutti i commenti per una foto
 */
export const getPhotoComments = async (req: Request, res: Response) => {
  try {
    const { photoId } = req.params;
    
    // Verifica che la foto esista
    const photo = await db.query.photos.findFirst({
      where: eq(photos.id, Number(photoId))
    });
    
    if (!photo) {
      return res.status(404).json({ error: "Foto non trovata" });
    }
    
    // Recupera tutti i commenti
    const comments = await db.query.photoComments.findMany({
      where: eq(photoComments.photoId, Number(photoId)),
      orderBy: desc(photoComments.createdAt)
    });
    
    res.json(comments);
  } catch (error) {
    console.error("Errore nel recupero dei commenti:", error);
    res.status(500).json({ error: "Errore nel recupero dei commenti" });
  }
};

/**
 * Genera un report delle selezioni per una galleria
 */
export const generateSelectionsReport = async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;
    const { format = "json" } = req.query;
    
    // Verifica che la galleria esista
    const gallery = await db.query.galleries.findFirst({
      where: eq(galleries.id, Number(galleryId))
    });
    
    if (!gallery) {
      return res.status(404).json({ error: "Galleria non trovata" });
    }
    
    // Recupera tutte le sessioni per questa galleria
    const sessions = await db.query.selectionSessions.findMany({
      where: eq(selectionSessions.galleryId, Number(galleryId))
    });
    
    // Recupera tutte le selezioni con i dati delle foto e delle sessioni
    const selections = await Promise.all(sessions.map(async (session) => {
      const sessionSelections = await db.query.newPhotoSelections.findMany({
        where: eq(newPhotoSelections.sessionId, session.id),
        with: {
          photo: true
        }
      });
      
      return sessionSelections.map(selection => ({
        ...selection,
        session: {
          id: session.id,
          clientName: session.clientName,
          clientEmail: session.clientEmail,
          status: session.status
        }
      }));
    }));
    
    // Appiattisci l'array di array
    const flatSelections = selections.flat();
    
    // Se il formato richiesto è CSV, genera un file CSV
    if (format === "csv") {
      const csvStringifier = createObjectCsvStringifier({
        header: [
          { id: 'photoId', title: 'ID Foto' },
          { id: 'filename', title: 'Nome File' },
          { id: 'title', title: 'Titolo Foto' },
          { id: 'clientName', title: 'Nome Cliente' },
          { id: 'clientEmail', title: 'Email Cliente' },
          { id: 'status', title: 'Stato Sessione' },
          { id: 'date', title: 'Data Selezione' }
        ]
      });
      
      const records = flatSelections.map(selection => ({
        photoId: selection.photoId,
        filename: selection.photo.filename,
        title: selection.photo.title || '',
        clientName: selection.session.clientName,
        clientEmail: selection.session.clientEmail || '',
        status: selection.session.status,
        date: new Date(selection.createdAt).toLocaleString()
      }));
      
      const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="gallery-${galleryId}-selections.csv"`);
      return res.send(csvContent);
    }
    
    // Altrimenti, restituisci JSON
    res.json({
      gallery,
      sessions: sessions.length,
      selections: flatSelections.length,
      data: flatSelections
    });
  } catch (error) {
    console.error("Errore nella generazione del report:", error);
    res.status(500).json({ error: "Errore nella generazione del report" });
  }
};

// =============================================
// FUNZIONI DI MIGRAZIONE
// =============================================

/**
 * Migra dal vecchio al nuovo sistema di selezione 
 * Questa funzione è per uso interno e non esposta come API
 */
export const migrateToNewSelectionSystem = async (galleryId: number) => {
  try {
    console.log(`Inizio migrazione al nuovo sistema per galleria ${galleryId}...`);
    
    // 1. Crea le impostazioni di selezione per la galleria
    const [settings] = await db
      .insert(gallerySelectionSettings)
      .values({
        galleryId,
        isEnabled: true,
        maxSelections: 0, // Nessun limite
        allowComments: true,
        customMessage: "Seleziona le tue foto preferite!",
        instructions: "Clicca sulle foto per selezionarle."
      })
      .onConflictDoNothing()
      .returning();
    
    console.log(`Impostazioni create o già esistenti`, settings);
    
    // 2. Recupera tutte le vecchie selezioni per questa galleria
    const oldSelections = await db.query.oldPhotoSelections.findMany({
      where: eq(oldPhotoSelections.galleryId, galleryId)
    });
    
    console.log(`Trovate ${oldSelections.length} vecchie selezioni`);
    
    if (oldSelections.length === 0) {
      return { 
        success: true, 
        migrated: 0, 
        message: "Nessuna selezione da migrare"
      };
    }
    
    // 3. Raggruppa le selezioni per clientId o sessionId
    const selectionGroups: Record<string, any[]> = {};
    
    oldSelections.forEach(selection => {
      let key = selection.sessionId || '';
      
      if (!key && selection.clientId) {
        key = `client_${selection.clientId}`;
      }
      
      if (!key && selection.clientEmail) {
        key = `email_${selection.clientEmail}`;
      }
      
      if (!key) {
        key = `unnamed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      if (!selectionGroups[key]) {
        selectionGroups[key] = [];
      }
      
      selectionGroups[key].push(selection);
    });
    
    console.log(`Raggruppate selezioni in ${Object.keys(selectionGroups).length} gruppi`);
    
    // 4. Per ogni gruppo, crea una sessione e migra le selezioni
    let totalMigrated = 0;
    
    for (const key of Object.keys(selectionGroups)) {
      const group = selectionGroups[key];
      const firstSelection = group[0];
      
      // Crea una nuova sessione
      const [session] = await db
        .insert(selectionSessions)
        .values({
          galleryId,
          clientId: firstSelection.clientId,
          clientName: firstSelection.clientName || 'Cliente',
          clientEmail: firstSelection.clientEmail,
          sessionKey: key,
          status: 'active'
        })
        .returning();
      
      console.log(`Creata sessione ${session.id} per il gruppo ${key}`);
      
      // Aggiungi le selezioni
      const newSelectionsData = group.map(selection => ({
        photoId: selection.photoId,
        sessionId: session.id,
        notes: selection.notes
      }));
      
      const insertedSelections = await db
        .insert(newPhotoSelections)
        .values(newSelectionsData)
        .returning();
      
      console.log(`Migrate ${insertedSelections.length} selezioni alla sessione ${session.id}`);
      
      totalMigrated += insertedSelections.length;
    }
    
    return { 
      success: true, 
      migrated: totalMigrated,
      message: `Migrate ${totalMigrated} selezioni con successo`
    };
  } catch (error) {
    console.error("Errore nella migrazione al nuovo sistema:", error);
    return { 
      success: false, 
      migrated: 0,
      error: String(error)
    };
  }
};

/**
 * API per avviare la migrazione dal vecchio al nuovo sistema 
 * Solo per amministratori
 */
export const migrateGallerySelections = async (req: Request, res: Response) => {
  try {
    // Verifica che l'utente sia un amministratore
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Solo gli amministratori possono eseguire la migrazione" });
    }
    
    const { galleryId } = req.params;
    
    // Verifica che la galleria esista
    const gallery = await db.query.galleries.findFirst({
      where: eq(galleries.id, Number(galleryId))
    });
    
    if (!gallery) {
      return res.status(404).json({ error: "Galleria non trovata" });
    }
    
    // Verifica se il sistema nuovo è già in uso
    const isNewSystem = await isUsingNewSelectionSystem(Number(galleryId));
    
    if (isNewSystem) {
      return res.json({ 
        success: true, 
        migrated: 0,
        message: "La galleria utilizza già il nuovo sistema di selezione"
      });
    }
    
    // Esegui la migrazione
    const result = await migrateToNewSelectionSystem(Number(galleryId));
    
    res.json(result);
  } catch (error) {
    console.error("Errore nell'API di migrazione:", error);
    res.status(500).json({ 
      success: false, 
      error: "Errore nella migrazione",
      details: String(error)
    });
  }
};