import { Request, Response } from "express";
import { db } from "../db";
import { v4 as uuidv4 } from "uuid";
import { eq, and, desc, or, inArray, isNull } from "drizzle-orm";
import { 
  gallerySelectionSettings, 
  selectionSessions, 
  photoSelections,
  insertGallerySelectionSettingsSchema,
  insertSelectionSessionSchema
} from "../../shared/schema-gallery-selections";
import { galleries, photos } from "../../schema_gallery";
import { createObjectCsvStringifier } from "csv-writer";

// Ottieni o crea impostazioni di selezione per una galleria
export const getGallerySelectionSettings = async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;
    
    // Verifica che la galleria esista
    const gallery = await db.query.galleries.findFirst({
      where: eq(galleries.id, Number(galleryId))
    });
    
    if (!gallery) {
      return res.status(404).json({ error: "Galleria non trovata" });
    }
    
    // Cerca impostazioni esistenti
    const settings = await db.query.gallerySelectionSettings.findFirst({
      where: eq(gallerySelectionSettings.galleryId, Number(galleryId))
    });
    
    if (settings) {
      return res.json(settings);
    }
    
    // Se non esistono, crea impostazioni predefinite
    const defaultSettings = {
      galleryId: Number(galleryId),
      isEnabled: false,
      instructions: "<p>Seleziona le tue foto preferite facendo clic su di esse. Puoi selezionare qualsiasi numero di foto.</p>",
      minSelections: 0,
      maxSelections: 0,
      allowedSelectionTypes: ["favorite"],
      expiresAt: null
    };
    
    const [newSettings] = await db
      .insert(gallerySelectionSettings)
      .values(defaultSettings)
      .returning();
    
    return res.status(201).json(newSettings);
  } catch (error) {
    console.error("Errore nel recupero delle impostazioni di selezione:", error);
    res.status(500).json({ error: "Errore nel recupero delle impostazioni di selezione" });
  }
};

// Aggiorna impostazioni di selezione
export const updateGallerySelectionSettings = async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;
    
    // Verifica l'autorizzazione
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Non autorizzato a modificare le impostazioni" });
    }
    
    // Valida i dati in ingresso
    let validatedData;
    try {
      validatedData = insertGallerySelectionSettingsSchema.parse({
        ...req.body,
        galleryId: Number(galleryId)
      });
    } catch (validationError) {
      return res.status(400).json({ error: "Dati non validi", details: validationError });
    }
    
    // Verifica che le impostazioni esistano
    const existingSettings = await db.query.gallerySelectionSettings.findFirst({
      where: eq(gallerySelectionSettings.galleryId, Number(galleryId))
    });
    
    if (!existingSettings) {
      // Se non esistono, creiamo nuove impostazioni
      const [newSettings] = await db
        .insert(gallerySelectionSettings)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newSettings);
    }
    
    // Aggiorna le impostazioni esistenti
    const [updatedSettings] = await db
      .update(gallerySelectionSettings)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(gallerySelectionSettings.id, existingSettings.id))
      .returning();
    
    return res.json(updatedSettings);
  } catch (error) {
    console.error("Errore nell'aggiornamento delle impostazioni di selezione:", error);
    res.status(500).json({ error: "Errore nell'aggiornamento delle impostazioni di selezione" });
  }
};

// Crea nuova sessione di selezione
export const createSelectionSession = async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;
    const { clientName, clientEmail, clientId } = req.body;
    
    // Verifica che la galleria esista
    const gallery = await db.query.galleries.findFirst({
      where: eq(galleries.id, Number(galleryId))
    });
    
    if (!gallery) {
      return res.status(404).json({ error: "Galleria non trovata" });
    }
    
    // Verifica che le selezioni siano abilitate
    const settings = await db.query.gallerySelectionSettings.findFirst({
      where: eq(gallerySelectionSettings.galleryId, Number(galleryId))
    });
    
    if (!settings || !settings.isEnabled) {
      return res.status(403).json({ error: "Le selezioni non sono abilitate per questa galleria" });
    }
    
    // Genera una chiave di sessione unica
    const sessionKey = uuidv4();
    
    // Crea la sessione
    const [session] = await db
      .insert(selectionSessions)
      .values({
        galleryId: Number(galleryId),
        clientId: clientId ? Number(clientId) : null,
        sessionKey,
        clientName: clientName || null,
        clientEmail: clientEmail || null,
        status: "active"
      })
      .returning();
    
    return res.status(201).json({
      session,
      shareUrl: `${req.protocol}://${req.get('host')}/gallery/${gallery.slug}/select/${sessionKey}`
    });
  } catch (error) {
    console.error("Errore nella creazione della sessione di selezione:", error);
    res.status(500).json({ error: "Errore nella creazione della sessione di selezione" });
  }
};

// Ottieni dettagli della sessione di selezione
export const getSelectionSession = async (req: Request, res: Response) => {
  try {
    const { sessionKey } = req.params;
    
    // Recupera la sessione con le relazioni
    const session = await db.query.selectionSessions.findFirst({
      where: eq(selectionSessions.sessionKey, sessionKey),
      with: {
        gallery: true
      }
    });
    
    if (!session) {
      return res.status(404).json({ error: "Sessione di selezione non trovata" });
    }
    
    // Aggiorna l'ultimo accesso
    await db
      .update(selectionSessions)
      .set({ lastAccessedAt: new Date() })
      .where(eq(selectionSessions.id, session.id));
    
    // Verifica se la sessione è scaduta
    const settings = await db.query.gallerySelectionSettings.findFirst({
      where: eq(gallerySelectionSettings.galleryId, session.galleryId)
    });
    
    let isExpired = false;
    if (settings?.expiresAt && new Date(settings.expiresAt) < new Date()) {
      isExpired = true;
      
      // Aggiorna lo stato se necessario
      if (session.status !== "expired") {
        await db
          .update(selectionSessions)
          .set({ status: "expired" })
          .where(eq(selectionSessions.id, session.id));
        
        session.status = "expired";
      }
    }
    
    return res.json({
      session,
      settings,
      isExpired
    });
  } catch (error) {
    console.error("Errore nel recupero della sessione di selezione:", error);
    res.status(500).json({ error: "Errore nel recupero della sessione di selezione" });
  }
};

// Aggiungi o rimuovi una selezione
export const togglePhotoSelection = async (req: Request, res: Response) => {
  try {
    const { sessionKey, photoId } = req.params;
    const { selectionType = "favorite", notes } = req.body;
    
    // Recupera la sessione
    const session = await db.query.selectionSessions.findFirst({
      where: eq(selectionSessions.sessionKey, sessionKey)
    });
    
    if (!session) {
      return res.status(404).json({ error: "Sessione di selezione non trovata" });
    }
    
    // Controlla se la sessione è attiva
    if (session.status !== "active") {
      return res.status(403).json({ 
        error: `La sessione di selezione non è attiva (stato: ${session.status})` 
      });
    }
    
    // Recupera le impostazioni per verificare i limiti
    const settings = await db.query.gallerySelectionSettings.findFirst({
      where: eq(gallerySelectionSettings.galleryId, session.galleryId)
    });
    
    // Verifica se il tipo di selezione è consentito
    if (settings && settings.allowedSelectionTypes && 
        !settings.allowedSelectionTypes.includes(selectionType)) {
      return res.status(400).json({ 
        error: `Il tipo di selezione "${selectionType}" non è consentito` 
      });
    }
    
    // Controlla se la foto esiste
    const photo = await db.query.photos.findFirst({
      where: and(
        eq(photos.id, Number(photoId)),
        eq(photos.galleryId, session.galleryId)
      )
    });
    
    if (!photo) {
      return res.status(404).json({ error: "Foto non trovata o non appartiene a questa galleria" });
    }
    
    // Controlla se esiste già una selezione per questa foto nella sessione
    const existingSelection = await db.query.photoSelections.findFirst({
      where: and(
        eq(photoSelections.sessionId, session.id),
        eq(photoSelections.photoId, Number(photoId))
      )
    });
    
    // Se esiste, rimuovila (toggle off)
    if (existingSelection) {
      await db
        .delete(photoSelections)
        .where(eq(photoSelections.id, existingSelection.id));
      
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
        .from(photoSelections)
        .where(eq(photoSelections.sessionId, session.id))
        .then(result => Number(result[0]?.count || 0));
      
      if (currentSelectionsCount >= settings.maxSelections) {
        return res.status(400).json({ 
          error: `Hai raggiunto il limite massimo di ${settings.maxSelections} selezioni` 
        });
      }
    }
    
    // Aggiungi la nuova selezione
    const [newSelection] = await db
      .insert(photoSelections)
      .values({
        sessionId: session.id,
        photoId: Number(photoId),
        selectionType,
        notes: notes || null
      })
      .returning();
    
    return res.status(201).json({ 
      action: "added", 
      message: "Selezione aggiunta con successo",
      selection: newSelection
    });
  } catch (error) {
    console.error("Errore nella gestione della selezione:", error);
    res.status(500).json({ error: "Errore nella gestione della selezione" });
  }
};

// Recupera tutte le selezioni per una sessione
export const getSessionSelections = async (req: Request, res: Response) => {
  try {
    const { sessionKey } = req.params;
    
    // Recupera la sessione
    const session = await db.query.selectionSessions.findFirst({
      where: eq(selectionSessions.sessionKey, sessionKey)
    });
    
    if (!session) {
      return res.status(404).json({ error: "Sessione di selezione non trovata" });
    }
    
    // Recupera tutte le selezioni con i dati delle foto
    const selections = await db.query.photoSelections.findMany({
      where: eq(photoSelections.sessionId, session.id),
      with: {
        photo: true
      },
      orderBy: desc(photoSelections.createdAt)
    });
    
    return res.json({ 
      session, 
      selections,
      count: selections.length
    });
  } catch (error) {
    console.error("Errore nel recupero delle selezioni:", error);
    res.status(500).json({ error: "Errore nel recupero delle selezioni" });
  }
};

// Completa una sessione di selezione
export const completeSelectionSession = async (req: Request, res: Response) => {
  try {
    const { sessionKey } = req.params;
    const { feedbackNotes } = req.body;
    
    // Recupera la sessione
    const session = await db.query.selectionSessions.findFirst({
      where: eq(selectionSessions.sessionKey, sessionKey)
    });
    
    if (!session) {
      return res.status(404).json({ error: "Sessione di selezione non trovata" });
    }
    
    // Verifica che la sessione sia attiva
    if (session.status !== "active") {
      return res.status(400).json({ 
        error: `La sessione non può essere completata perché non è attiva (stato: ${session.status})` 
      });
    }
    
    // Recupera le impostazioni per il requisito minimo
    const settings = await db.query.gallerySelectionSettings.findFirst({
      where: eq(gallerySelectionSettings.galleryId, session.galleryId)
    });
    
    // Controlla se sono state effettuate abbastanza selezioni
    if (settings && settings.minSelections > 0) {
      const selectionsCount = await db
        .select({ count: sql`count(*)` })
        .from(photoSelections)
        .where(eq(photoSelections.sessionId, session.id))
        .then(result => Number(result[0]?.count || 0));
      
      if (selectionsCount < settings.minSelections) {
        return res.status(400).json({ 
          error: `È necessario selezionare almeno ${settings.minSelections} foto`,
          currentCount: selectionsCount
        });
      }
    }
    
    // Aggiorna lo stato della sessione
    const [updatedSession] = await db
      .update(selectionSessions)
      .set({
        status: "completed",
        completedAt: new Date(),
        feedbackNotes: feedbackNotes || null
      })
      .where(eq(selectionSessions.id, session.id))
      .returning();
    
    return res.json({
      success: true,
      message: "Sessione di selezione completata con successo",
      session: updatedSession
    });
  } catch (error) {
    console.error("Errore nel completamento della sessione di selezione:", error);
    res.status(500).json({ error: "Errore nel completamento della sessione di selezione" });
  }
};

// Ottieni tutte le sessioni per una galleria (admin)
export const getGallerySessions = async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;
    
    // Verifica l'autorizzazione
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Non autorizzato a visualizzare le sessioni" });
    }
    
    // Recupera tutte le sessioni per questa galleria
    const sessions = await db.query.selectionSessions.findMany({
      where: eq(selectionSessions.galleryId, Number(galleryId)),
      orderBy: desc(selectionSessions.startedAt)
    });
    
    // Per ogni sessione, recupera il conteggio delle selezioni
    const sessionsWithCounts = await Promise.all(
      sessions.map(async (session) => {
        const selectionsCount = await db
          .select({ count: sql`count(*)` })
          .from(photoSelections)
          .where(eq(photoSelections.sessionId, session.id))
          .then(result => Number(result[0]?.count || 0));
        
        return {
          ...session,
          selectionsCount
        };
      })
    );
    
    return res.json(sessionsWithCounts);
  } catch (error) {
    console.error("Errore nel recupero delle sessioni:", error);
    res.status(500).json({ error: "Errore nel recupero delle sessioni" });
  }
};

// Elimina una sessione di selezione (admin)
export const deleteSelectionSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    // Verifica l'autorizzazione
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Non autorizzato a eliminare le sessioni" });
    }
    
    // Elimina la sessione (le selezioni saranno eliminate a cascata)
    await db
      .delete(selectionSessions)
      .where(eq(selectionSessions.id, Number(sessionId)));
    
    return res.json({
      success: true,
      message: "Sessione di selezione eliminata con successo"
    });
  } catch (error) {
    console.error("Errore nell'eliminazione della sessione:", error);
    res.status(500).json({ error: "Errore nell'eliminazione della sessione" });
  }
};

// Esporta le selezioni in formato CSV (admin)
export const exportSelectionsCSV = async (req: Request, res: Response) => {
  try {
    const { galleryId, sessionId } = req.params;
    
    // Verifica l'autorizzazione
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Non autorizzato a esportare i dati" });
    }
    
    // Costruisci la query in base ai parametri
    let sessionsQuery = db.query.selectionSessions;
    let whereCondition;
    
    if (sessionId) {
      // Se è specificato un ID sessione, recupera solo quella
      whereCondition = eq(selectionSessions.id, Number(sessionId));
    } else if (galleryId) {
      // Altrimenti recupera tutte le sessioni per la galleria
      whereCondition = eq(selectionSessions.galleryId, Number(galleryId));
    } else {
      return res.status(400).json({ error: "È necessario specificare galleryId o sessionId" });
    }
    
    const sessions = await sessionsQuery.findMany({
      where: whereCondition,
      with: {
        gallery: true
      }
    });
    
    if (sessions.length === 0) {
      return res.status(404).json({ error: "Nessuna sessione trovata" });
    }
    
    // Ottieni tutte le selezioni per queste sessioni
    const sessionIds = sessions.map(s => s.id);
    const selections = await db.query.photoSelections.findMany({
      where: inArray(photoSelections.sessionId, sessionIds),
      with: {
        photo: true,
        session: true
      }
    });
    
    if (selections.length === 0) {
      return res.status(404).json({ error: "Nessuna selezione trovata" });
    }
    
    // Formatta i dati per il CSV
    const csvData = selections.map(selection => ({
      SessionID: selection.sessionId,
      GalleryID: selection.session.galleryId,
      GalleryName: selection.session.gallery?.name || "N/A",
      ClientName: selection.session.clientName || "Anonimo",
      ClientEmail: selection.session.clientEmail || "N/A",
      SessionStatus: selection.session.status,
      PhotoID: selection.photoId,
      PhotoFilename: selection.photo?.filename || "N/A",
      PhotoTitle: selection.photo?.title || "N/A",
      SelectionType: selection.selectionType,
      Notes: selection.notes || "",
      CreatedAt: selection.createdAt.toISOString()
    }));
    
    // Crea il CSV
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'SessionID', title: 'ID Sessione' },
        { id: 'GalleryID', title: 'ID Galleria' },
        { id: 'GalleryName', title: 'Nome Galleria' },
        { id: 'ClientName', title: 'Nome Cliente' },
        { id: 'ClientEmail', title: 'Email Cliente' },
        { id: 'SessionStatus', title: 'Stato Sessione' },
        { id: 'PhotoID', title: 'ID Foto' },
        { id: 'PhotoFilename', title: 'Filename' },
        { id: 'PhotoTitle', title: 'Titolo Foto' },
        { id: 'SelectionType', title: 'Tipo Selezione' },
        { id: 'Notes', title: 'Note' },
        { id: 'CreatedAt', title: 'Data Creazione' }
      ]
    });
    
    const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(csvData);
    
    // Imposta gli header per il download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition', 
      `attachment; filename="selezioni-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    
    // Invia il contenuto CSV
    res.send(csvContent);
  } catch (error) {
    console.error("Errore nell'esportazione delle selezioni:", error);
    res.status(500).json({ error: "Errore nell'esportazione delle selezioni" });
  }
};