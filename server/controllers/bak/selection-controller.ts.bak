import { Request, Response } from 'express';
import { 
  GallerySelectionSettings, 
  SelectionSession, 
  PhotoSelection, 
  PhotoComment,
  InsertGallerySelectionSettings,
  InsertSelectionSession,
  InsertPhotoSelection,
  InsertPhotoComment,
  PhotoSelectionWithPhotoDetails,
  PhotoCommentWithUser,
  SelectionSessionWithCounts
} from '@shared/selection-schema';
import { z } from 'zod';
import { pool } from '../db';

// Schemi di validazione
const insertGallerySelectionSettingsSchema = z.object({
  galleryId: z.number(),
  isEnabled: z.boolean().optional().default(false),
  maxSelections: z.number().optional().default(0),
  allowComments: z.boolean().optional().default(true),
  expiresAt: z.date().nullable().optional(),
  customMessage: z.string().nullable().optional()
});

const insertSelectionSessionSchema = z.object({
  galleryId: z.number(),
  clientId: z.number().nullable().optional(),
  clientName: z.string(),
  clientEmail: z.string().nullable().optional(),
  sessionKey: z.string(),
  notes: z.string().nullable().optional()
});

const insertPhotoSelectionSchema = z.object({
  photoId: z.number(),
  sessionId: z.number()
});

const insertPhotoCommentSchema = z.object({
  photoId: z.number(),
  sessionId: z.number(),
  content: z.string(),
  userId: z.number().nullable().optional(),
  clientName: z.string().nullable().optional()
});

// Implementazione delle funzioni controller

export const getSelectionSettings = async (req: Request, res: Response) => {
  try {
    const galleryId = parseInt(req.params.galleryId);
    
    if (isNaN(galleryId)) {
      return res.status(400).json({ error: 'ID galleria non valido' });
    }
    
    // Verifica se la galleria esiste
    const galleryResult = await pool.query(
      'SELECT id, name FROM galleries WHERE id = $1',
      [galleryId]
    );
    
    if (galleryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Galleria non trovata' });
    }
    
    // Cerca le impostazioni esistenti
    const settingsResult = await pool.query(
      'SELECT * FROM gallery_selection_settings WHERE gallery_id = $1',
      [galleryId]
    );
    
    if (settingsResult.rows.length > 0) {
      // Converti i nomi delle colonne da snake_case a camelCase
      const settings = {
        id: settingsResult.rows[0].id,
        galleryId: settingsResult.rows[0].gallery_id,
        isEnabled: settingsResult.rows[0].is_enabled,
        maxSelections: settingsResult.rows[0].max_selections,
        allowComments: settingsResult.rows[0].allow_comments,
        expiresAt: settingsResult.rows[0].expires_at,
        customMessage: settingsResult.rows[0].custom_message,
        createdAt: settingsResult.rows[0].created_at,
        updatedAt: settingsResult.rows[0].updated_at
      };
      
      return res.status(200).json(settings);
    }
    
    // Se non esistono impostazioni, crea delle impostazioni di default
    const newSettingsResult = await pool.query(
      `INSERT INTO gallery_selection_settings 
       (gallery_id, is_enabled, max_selections, allow_comments, custom_message) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [galleryId, false, 0, true, 'Seleziona le foto che preferisci']
    );
    
    // Converti i nomi delle colonne da snake_case a camelCase
    const newSettings = {
      id: newSettingsResult.rows[0].id,
      galleryId: newSettingsResult.rows[0].gallery_id,
      isEnabled: newSettingsResult.rows[0].is_enabled,
      maxSelections: newSettingsResult.rows[0].max_selections,
      allowComments: newSettingsResult.rows[0].allow_comments,
      expiresAt: newSettingsResult.rows[0].expires_at,
      customMessage: newSettingsResult.rows[0].custom_message,
      createdAt: newSettingsResult.rows[0].created_at,
      updatedAt: newSettingsResult.rows[0].updated_at
    };
    
    res.status(200).json(newSettings);
  } catch (error: any) {
    console.error('Error in getSelectionSettings:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const updateSelectionSettings = async (req: Request, res: Response) => {
  try {
    const galleryId = parseInt(req.params.galleryId);
    
    if (isNaN(galleryId)) {
      return res.status(400).json({ error: 'ID galleria non valido' });
    }
    
    // Verifica la validità dei dati ricevuti
    const parseResult = insertGallerySelectionSettingsSchema.safeParse({
      ...req.body,
      galleryId
    });
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Dati non validi',
        details: parseResult.error.format()
      });
    }
    
    // Cerca le impostazioni esistenti
    const existingSettingsResult = await pool.query(
      'SELECT * FROM gallery_selection_settings WHERE gallery_id = $1',
      [galleryId]
    );
    
    if (existingSettingsResult.rows.length > 0) {
      // Aggiorna le impostazioni esistenti
      const updatedSettingsResult = await pool.query(
        `UPDATE gallery_selection_settings 
         SET is_enabled = $1, max_selections = $2, allow_comments = $3, 
             expires_at = $4, custom_message = $5, updated_at = $6
         WHERE gallery_id = $7
         RETURNING *`,
        [
          parseResult.data.isEnabled, 
          parseResult.data.maxSelections, 
          parseResult.data.allowComments,
          parseResult.data.expiresAt, 
          parseResult.data.customMessage, 
          new Date(), 
          galleryId
        ]
      );
      
      // Converti i nomi delle colonne da snake_case a camelCase
      const updatedSettings = {
        id: updatedSettingsResult.rows[0].id,
        galleryId: updatedSettingsResult.rows[0].gallery_id,
        isEnabled: updatedSettingsResult.rows[0].is_enabled,
        maxSelections: updatedSettingsResult.rows[0].max_selections,
        allowComments: updatedSettingsResult.rows[0].allow_comments,
        expiresAt: updatedSettingsResult.rows[0].expires_at,
        customMessage: updatedSettingsResult.rows[0].custom_message,
        createdAt: updatedSettingsResult.rows[0].created_at,
        updatedAt: updatedSettingsResult.rows[0].updated_at
      };
      
      return res.status(200).json(updatedSettings);
    } else {
      // Crea nuove impostazioni
      const newSettingsResult = await pool.query(
        `INSERT INTO gallery_selection_settings 
         (gallery_id, is_enabled, max_selections, allow_comments, expires_at, custom_message) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [
          galleryId, 
          parseResult.data.isEnabled, 
          parseResult.data.maxSelections, 
          parseResult.data.allowComments,
          parseResult.data.expiresAt, 
          parseResult.data.customMessage
        ]
      );
      
      // Converti i nomi delle colonne da snake_case a camelCase
      const newSettings = {
        id: newSettingsResult.rows[0].id,
        galleryId: newSettingsResult.rows[0].gallery_id,
        isEnabled: newSettingsResult.rows[0].is_enabled,
        maxSelections: newSettingsResult.rows[0].max_selections,
        allowComments: newSettingsResult.rows[0].allow_comments,
        expiresAt: newSettingsResult.rows[0].expires_at,
        customMessage: newSettingsResult.rows[0].custom_message,
        createdAt: newSettingsResult.rows[0].created_at,
        updatedAt: newSettingsResult.rows[0].updated_at
      };
      
      return res.status(201).json(newSettings);
    }
  } catch (error: any) {
    console.error('Error in updateSelectionSettings:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const createSelectionSession = async (req: Request, res: Response) => {
  try {
    // Generare una chiave di sessione unica
    const sessionKey = 'session_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    
    // Validare i dati in ingresso
    const parseResult = insertSelectionSessionSchema.safeParse({
      ...req.body,
      sessionKey
    });
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Dati non validi',
        details: parseResult.error.format()
      });
    }
    
    // Verificare se la galleria esiste
    const galleryId = parseResult.data.galleryId;
    const galleryResult = await pool.query(
      'SELECT id, name FROM galleries WHERE id = $1',
      [galleryId]
    );
    
    if (galleryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Galleria non trovata' });
    }
    
    // Verificare se le selezioni sono abilitate per questa galleria
    const settingsResult = await pool.query(
      'SELECT * FROM gallery_selection_settings WHERE gallery_id = $1',
      [galleryId]
    );
    
    const settings = settingsResult.rows.length > 0 ? settingsResult.rows[0] : null;
    
    if (!settings || !settings.is_enabled) {
      return res.status(403).json({ error: 'Le selezioni non sono abilitate per questa galleria' });
    }
    
    // Creare la sessione
    const sessionResult = await pool.query(
      `INSERT INTO selection_sessions 
       (gallery_id, client_id, client_name, client_email, session_key, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        parseResult.data.galleryId,
        parseResult.data.clientId,
        parseResult.data.clientName,
        parseResult.data.clientEmail,
        parseResult.data.sessionKey,
        parseResult.data.notes
      ]
    );
    
    // Converti i nomi delle colonne da snake_case a camelCase
    const session = sessionResult.rows[0];
    const result = {
      id: session.id,
      galleryId: session.gallery_id,
      clientId: session.client_id,
      clientName: session.client_name,
      clientEmail: session.client_email,
      sessionKey: session.session_key,
      status: session.status,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      notes: session.notes,
      _count: {
        selections: 0,
        comments: 0
      }
    };
    
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error in createSelectionSession:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getSessionsByGallery = async (req: Request, res: Response) => {
  try {
    const galleryId = parseInt(req.params.galleryId);
    
    if (isNaN(galleryId)) {
      return res.status(400).json({ error: 'ID galleria non valido' });
    }
    
    // Verificare se la galleria esiste
    const galleryResult = await pool.query(
      'SELECT id, name FROM galleries WHERE id = $1',
      [galleryId]
    );
    
    if (galleryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Galleria non trovata' });
    }
    
    // Ottenere tutte le sessioni per questa galleria
    const sessionsResult = await pool.query(
      'SELECT * FROM selection_sessions WHERE gallery_id = $1 ORDER BY started_at',
      [galleryId]
    );
    
    // Per ogni sessione, contare le selezioni e i commenti
    const sessionsWithCounts = await Promise.all(sessionsResult.rows.map(async (session) => {
      const selectionsCountResult = await pool.query(
        'SELECT COUNT(*) FROM photo_selections WHERE session_id = $1',
        [session.id]
      );
      
      const commentsCountResult = await pool.query(
        'SELECT COUNT(*) FROM photo_comments WHERE session_id = $1',
        [session.id]
      );
      
      // Converti i nomi delle colonne da snake_case a camelCase
      return {
        id: session.id,
        galleryId: session.gallery_id,
        clientId: session.client_id,
        clientName: session.client_name,
        clientEmail: session.client_email,
        sessionKey: session.session_key,
        status: session.status,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        notes: session.notes,
        _count: {
          selections: parseInt(selectionsCountResult.rows[0].count),
          comments: parseInt(commentsCountResult.rows[0].count)
        }
      };
    }));
    
    res.status(200).json(sessionsWithCounts);
  } catch (error: any) {
    console.error('Error in getSessionsByGallery:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getSession = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID sessione non valido' });
    }
    
    // Ottieni la sessione
    const sessionResult = await pool.query(
      'SELECT * FROM selection_sessions WHERE id = $1',
      [id]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    const session = sessionResult.rows[0];
    
    // Conta il numero di selezioni e commenti
    const selectionsCountResult = await pool.query(
      'SELECT COUNT(*) FROM photo_selections WHERE session_id = $1',
      [id]
    );
    
    const commentsCountResult = await pool.query(
      'SELECT COUNT(*) FROM photo_comments WHERE session_id = $1',
      [id]
    );
    
    // Ottieni la galleria associata
    const galleryResult = await pool.query(
      'SELECT id, name, slug FROM galleries WHERE id = $1',
      [session.gallery_id]
    );
    
    const gallery = galleryResult.rows.length > 0 ? galleryResult.rows[0] : null;
    
    // Converti i nomi delle colonne da snake_case a camelCase
    const result = {
      id: session.id,
      galleryId: session.gallery_id,
      clientId: session.client_id,
      clientName: session.client_name,
      clientEmail: session.client_email,
      sessionKey: session.session_key,
      status: session.status,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      notes: session.notes,
      _count: {
        selections: parseInt(selectionsCountResult.rows[0].count),
        comments: parseInt(commentsCountResult.rows[0].count)
      },
      gallery: gallery ? {
        id: gallery.id,
        name: gallery.name,
        slug: gallery.slug
      } : null
    };
    
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in getSession:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getSessionByKey = async (req: Request, res: Response) => {
  try {
    const key = req.params.key;
    
    if (!key) {
      return res.status(400).json({ error: 'Chiave sessione non valida' });
    }
    
    // Ottieni la sessione
    const sessionResult = await pool.query(
      'SELECT * FROM selection_sessions WHERE session_key = $1',
      [key]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    const session = sessionResult.rows[0];
    
    // Controlla se la sessione è scaduta
    const settingsResult = await pool.query(
      'SELECT * FROM gallery_selection_settings WHERE gallery_id = $1',
      [session.gallery_id]
    );
    
    const settings = settingsResult.rows.length > 0 ? settingsResult.rows[0] : null;
    
    if (settings?.expires_at && new Date(settings.expires_at) < new Date() && session.status !== 'completed') {
      return res.status(403).json({ error: 'La sessione è scaduta' });
    }
    
    // Ottieni la galleria associata
    const galleryResult = await pool.query(
      'SELECT id, name, slug FROM galleries WHERE id = $1',
      [session.gallery_id]
    );
    
    const gallery = galleryResult.rows.length > 0 ? galleryResult.rows[0] : null;
    
    // Conta il numero di selezioni e commenti
    const selectionsCountResult = await pool.query(
      'SELECT COUNT(*) FROM photo_selections WHERE session_id = $1',
      [session.id]
    );
    
    const commentsCountResult = await pool.query(
      'SELECT COUNT(*) FROM photo_comments WHERE session_id = $1',
      [session.id]
    );
    
    // Converti i nomi delle colonne da snake_case a camelCase
    const result = {
      id: session.id,
      galleryId: session.gallery_id,
      clientId: session.client_id,
      clientName: session.client_name,
      clientEmail: session.client_email,
      sessionKey: session.session_key,
      status: session.status,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      notes: session.notes,
      _count: {
        selections: parseInt(selectionsCountResult.rows[0].count),
        comments: parseInt(commentsCountResult.rows[0].count)
      },
      gallery: gallery ? {
        id: gallery.id,
        name: gallery.name,
        slug: gallery.slug
      } : null,
      settings: settings ? {
        id: settings.id,
        galleryId: settings.gallery_id,
        isEnabled: settings.is_enabled,
        maxSelections: settings.max_selections,
        allowComments: settings.allow_comments,
        expiresAt: settings.expires_at,
        customMessage: settings.custom_message,
        createdAt: settings.created_at,
        updatedAt: settings.updated_at
      } : null
    };
    
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in getSessionByKey:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const completeSession = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID sessione non valido' });
    }
    
    // Verifica se la sessione esiste
    const [session] = await db.select().from(selectionSessions).where(eq(selectionSessions.id, id));
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    // Aggiorna lo stato della sessione
    const [updatedSession] = await db.update(selectionSessions)
      .set({
        status: 'completed',
        completedAt: new Date()
      })
      .where(eq(selectionSessions.id, id))
      .returning();
    
    res.status(200).json(updatedSession);
  } catch (error: any) {
    console.error('Error in completeSession:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const deleteSession = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID sessione non valido' });
    }
    
    // Verifica se la sessione esiste
    const [session] = await db.select().from(selectionSessions).where(eq(selectionSessions.id, id));
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    // Elimina prima tutte le selezioni e i commenti associati (cascade non è sempre affidabile)
    await db.delete(photoSelections).where(eq(photoSelections.sessionId, id));
    await db.delete(photoComments).where(eq(photoComments.sessionId, id));
    
    // Elimina la sessione
    await db.delete(selectionSessions).where(eq(selectionSessions.id, id));
    
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error in deleteSession:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const togglePhotoSelection = async (req: Request, res: Response) => {
  try {
    const photoId = parseInt(req.params.photoId);
    const { sessionId } = req.body;
    
    if (isNaN(photoId) || !sessionId) {
      return res.status(400).json({ error: 'Dati non validi' });
    }
    
    // Verifica se la foto esiste
    const [photo] = await db.select().from(photos).where(eq(photos.id, photoId));
    
    if (!photo) {
      return res.status(404).json({ error: 'Foto non trovata' });
    }
    
    // Verifica se la sessione esiste
    const [session] = await db.select().from(selectionSessions).where(eq(selectionSessions.id, sessionId));
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    // Verifica se la sessione è completata
    if (session.status === 'completed') {
      return res.status(403).json({ error: 'La sessione è completata, non è possibile modificare le selezioni' });
    }
    
    // Verifica se la galleria della foto corrisponde a quella della sessione
    if (photo.galleryId !== session.galleryId) {
      return res.status(403).json({ error: 'La foto non appartiene alla galleria della sessione' });
    }
    
    // Verifica se la selezione esiste già
    const [existingSelection] = await db.select()
      .from(photoSelections)
      .where(and(
        eq(photoSelections.photoId, photoId),
        eq(photoSelections.sessionId, sessionId)
      ));
    
    let action: 'added' | 'removed';
    
    if (existingSelection) {
      // Rimuovi la selezione esistente
      await db.delete(photoSelections)
        .where(and(
          eq(photoSelections.photoId, photoId),
          eq(photoSelections.sessionId, sessionId)
        ));
      action = 'removed';
    } else {
      // Aggiungi una nuova selezione
      const [settings] = await db.select()
        .from(gallerySelectionSettings)
        .where(eq(gallerySelectionSettings.galleryId, session.galleryId));
      
      // Verifica limiti di selezione (se presenti)
      if (settings && settings.maxSelections > 0) {
        const [selectionsCount] = await db.select({
          count: sql`count(*)`
        }).from(photoSelections)
          .where(eq(photoSelections.sessionId, sessionId));
          
        if (Number(selectionsCount?.count || 0) >= settings.maxSelections) {
          return res.status(403).json({ 
            error: `È stato raggiunto il limite massimo di ${settings.maxSelections} foto selezionate`
          });
        }
      }
      
      // Crea la nuova selezione
      await db.insert(photoSelections)
        .values({
          photoId,
          sessionId,
        });
      action = 'added';
    }
    
    res.status(200).json({ photoId, sessionId, action });
  } catch (error: any) {
    console.error('Error in togglePhotoSelection:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getSessionSelections = async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'ID sessione non valido' });
    }
    
    // Verifica se la sessione esiste
    const [session] = await db.select().from(selectionSessions).where(eq(selectionSessions.id, sessionId));
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    // Ottieni tutte le selezioni per questa sessione
    const selections = await db.select({
      id: photoSelections.id,
      photoId: photoSelections.photoId,
      sessionId: photoSelections.sessionId,
      createdAt: photoSelections.createdAt,
    })
      .from(photoSelections)
      .where(eq(photoSelections.sessionId, sessionId))
      .orderBy(photoSelections.createdAt);
    
    // Ottieni i dettagli delle foto selezionate
    const photoDetails = await db.select({
      id: photos.id,
      filename: photos.filename,
      title: photos.title,
      chapterId: photos.chapterId
    })
      .from(photos)
      .where(inArray(photos.id, selections.map(s => s.photoId)));
    
    // Combina i risultati
    const result = selections.map(selection => {
      const photo = photoDetails.find(p => p.id === selection.photoId);
      return {
        ...selection,
        photo
      };
    });
    
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in getSessionSelections:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getPhotoCommentsCount = async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'ID sessione non valido' });
    }
    
    // Verifica se la sessione esiste
    const [session] = await db.select().from(selectionSessions).where(eq(selectionSessions.id, sessionId));
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    // Ottieni il conteggio dei commenti per ogni foto
    const comments = await db.select({
      photoId: photoComments.photoId,
      count: sql`count(*)`,
      unreadCount: sql`sum(case when is_read = false then 1 else 0 end)::int`
    })
      .from(photoComments)
      .where(eq(photoComments.sessionId, sessionId))
      .groupBy(photoComments.photoId);
    
    res.status(200).json(comments);
  } catch (error: any) {
    console.error('Error in getPhotoCommentsCount:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    // Valida i dati in ingresso
    const parseResult = insertPhotoCommentSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Dati non validi',
        details: parseResult.error.format()
      });
    }
    
    const { photoId, sessionId, content, clientName } = parseResult.data;
    
    // Verifica se la foto esiste
    const [photo] = await db.select().from(photos).where(eq(photos.id, photoId));
    
    if (!photo) {
      return res.status(404).json({ error: 'Foto non trovata' });
    }
    
    // Verifica se la sessione esiste
    const [session] = await db.select().from(selectionSessions).where(eq(selectionSessions.id, sessionId));
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    // Verifica se la sessione è completata
    if (session.status === 'completed') {
      return res.status(403).json({ error: 'La sessione è completata, non è possibile aggiungere commenti' });
    }
    
    // Verifica se la galleria della foto corrisponde a quella della sessione
    if (photo.galleryId !== session.galleryId) {
      return res.status(403).json({ error: 'La foto non appartiene alla galleria della sessione' });
    }
    
    // Crea il commento
    const [comment] = await db.insert(photoComments)
      .values({
        photoId,
        sessionId,
        content,
        userId: null, // Commento del cliente
        clientName: clientName || session.clientName,
        isRead: false
      })
      .returning();
    
    res.status(201).json(comment);
  } catch (error: any) {
    console.error('Error in addComment:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const replyToComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }
    
    // Valida i dati in ingresso
    const { photoId, sessionId, content } = req.body;
    
    if (!photoId || !sessionId || !content) {
      return res.status(400).json({ error: 'Dati mancanti o non validi' });
    }
    
    // Verifica se la foto esiste
    const [photo] = await db.select().from(photos).where(eq(photos.id, photoId));
    
    if (!photo) {
      return res.status(404).json({ error: 'Foto non trovata' });
    }
    
    // Verifica se la sessione esiste
    const [session] = await db.select().from(selectionSessions).where(eq(selectionSessions.id, sessionId));
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    // Crea il commento di risposta
    const [comment] = await db.insert(photoComments)
      .values({
        photoId,
        sessionId,
        content,
        userId: req.user.id,
        clientName: null,
        isRead: true // La risposta dell'utente è già letta
      })
      .returning();
    
    // Ottieni i dettagli dell'utente
    comment.user = {
      username: req.user.username,
    };
    
    res.status(201).json(comment);
  } catch (error: any) {
    console.error('Error in replyToComment:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getSessionComments = async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'ID sessione non valido' });
    }
    
    // Verifica se la sessione esiste
    const [session] = await db.select().from(selectionSessions).where(eq(selectionSessions.id, sessionId));
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    // Ottieni tutti i commenti per questa sessione
    const comments = await db.select({
      id: photoComments.id,
      photoId: photoComments.photoId,
      sessionId: photoComments.sessionId,
      content: photoComments.content,
      userId: photoComments.userId,
      clientName: photoComments.clientName,
      isRead: photoComments.isRead,
      createdAt: photoComments.createdAt
    })
      .from(photoComments)
      .where(eq(photoComments.sessionId, sessionId))
      .orderBy(photoComments.createdAt);
    
    // Ottieni gli utenti associati ai commenti
    const userIds = comments.filter(c => c.userId !== null).map(c => c.userId as number);
    
    if (userIds.length > 0) {
      const users = await db.select({
        id: users.id,
        username: users.username
      })
        .from(users)
        .where(inArray(users.id, userIds));
      
      // Aggiungi le informazioni degli utenti ai commenti
      const commentsWithUsers = comments.map(comment => {
        if (comment.userId) {
          const user = users.find(u => u.id === comment.userId);
          if (user) {
            return {
              ...comment,
              user: {
                username: user.username
              }
            };
          }
        }
        return comment;
      });
      
      return res.status(200).json(commentsWithUsers);
    }
    
    res.status(200).json(comments);
  } catch (error: any) {
    console.error('Error in getSessionComments:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getPhotoComments = async (req: Request, res: Response) => {
  try {
    const photoId = parseInt(req.params.photoId);
    const sessionId = parseInt(req.params.sessionId);
    
    if (isNaN(photoId) || isNaN(sessionId)) {
      return res.status(400).json({ error: 'ID foto o sessione non validi' });
    }
    
    // Verifica se la foto esiste
    const [photo] = await db.select().from(photos).where(eq(photos.id, photoId));
    
    if (!photo) {
      return res.status(404).json({ error: 'Foto non trovata' });
    }
    
    // Verifica se la sessione esiste
    const [session] = await db.select().from(selectionSessions).where(eq(selectionSessions.id, sessionId));
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    // Ottieni tutti i commenti per questa foto in questa sessione
    const comments = await db.select({
      id: photoComments.id,
      photoId: photoComments.photoId,
      sessionId: photoComments.sessionId,
      content: photoComments.content,
      userId: photoComments.userId,
      clientName: photoComments.clientName,
      isRead: photoComments.isRead,
      createdAt: photoComments.createdAt
    })
      .from(photoComments)
      .where(and(
        eq(photoComments.photoId, photoId),
        eq(photoComments.sessionId, sessionId)
      ))
      .orderBy(photoComments.createdAt);
    
    // Ottieni gli utenti associati ai commenti
    const userIds = comments.filter(c => c.userId !== null).map(c => c.userId as number);
    
    if (userIds.length > 0) {
      const users = await db.select({
        id: users.id,
        username: users.username
      })
        .from(users)
        .where(inArray(users.id, userIds));
      
      // Aggiungi le informazioni degli utenti ai commenti
      const commentsWithUsers = comments.map(comment => {
        if (comment.userId) {
          const user = users.find(u => u.id === comment.userId);
          if (user) {
            return {
              ...comment,
              user: {
                username: user.username
              }
            };
          }
        }
        return comment;
      });
      
      return res.status(200).json(commentsWithUsers);
    }
    
    res.status(200).json(comments);
  } catch (error: any) {
    console.error('Error in getPhotoComments:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const markCommentAsRead = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID commento non valido' });
    }
    
    // Verifica se il commento esiste
    const [comment] = await db.select().from(photoComments).where(eq(photoComments.id, id));
    
    if (!comment) {
      return res.status(404).json({ error: 'Commento non trovato' });
    }
    
    // Aggiorna lo stato del commento
    const [updatedComment] = await db.update(photoComments)
      .set({ isRead: true })
      .where(eq(photoComments.id, id))
      .returning();
    
    res.status(200).json(updatedComment);
  } catch (error: any) {
    console.error('Error in markCommentAsRead:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const exportSelections = async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'ID sessione non valido' });
    }
    
    // Verifica se la sessione esiste
    const [session] = await db.select().from(selectionSessions).where(eq(selectionSessions.id, sessionId));
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    // Ottieni tutte le selezioni per questa sessione
    const selections = await db.select({
      id: photoSelections.id,
      photoId: photoSelections.photoId,
      sessionId: photoSelections.sessionId,
      createdAt: photoSelections.createdAt,
    })
      .from(photoSelections)
      .where(eq(photoSelections.sessionId, sessionId))
      .orderBy(photoSelections.createdAt);
    
    if (selections.length === 0) {
      return res.status(404).json({ error: 'Nessuna selezione trovata per questa sessione' });
    }
    
    // Ottieni i dettagli delle foto selezionate
    const photoDetails = await db.select({
      id: photos.id,
      filename: photos.filename,
      title: photos.title,
      description: photos.description,
      chapterId: photos.chapterId,
      galleryId: photos.galleryId,
      uploadedAt: photos.uploadedAt
    })
      .from(photos)
      .where(inArray(photos.id, selections.map(s => s.photoId)));
    
    // Ottieni dettagli capitoli (se presenti)
    const chapterIds = photoDetails
      .filter(p => p.chapterId !== null)
      .map(p => p.chapterId as number);
    
    let chapters: Record<number, string> = {};
    
    if (chapterIds.length > 0) {
      const chapterDetails = await db.select({
        id: galleryChapters.id,
        title: galleryChapters.title
      })
        .from(galleryChapters)
        .where(inArray(galleryChapters.id, chapterIds));
      
      chapters = chapterDetails.reduce((acc, chapter) => {
        acc[chapter.id] = chapter.title;
        return acc;
      }, {} as Record<number, string>);
    }
    
    // Ottieni dettagli galleria
    const [gallery] = await db.select({
      id: galleries.id,
      name: galleries.name,
      slug: galleries.slug
    })
      .from(galleries)
      .where(eq(galleries.id, photoDetails[0].galleryId));
      
    // Prepara i dati per l'esportazione in formato CSV
    const csvData = photoDetails.map(photo => {
      return {
        ID: photo.id,
        Filename: photo.filename,
        Title: photo.title || '',
        Description: photo.description || '',
        Chapter: photo.chapterId ? chapters[photo.chapterId] || '' : '',
        UploadedAt: photo.uploadedAt ? new Date(photo.uploadedAt).toLocaleDateString() : '',
        Gallery: gallery.name,
        SelectedBy: session.clientName,
        SelectionDate: new Date(selections.find(s => s.photoId === photo.id)?.createdAt || new Date()).toLocaleDateString()
      };
    });
    
    // Converti in CSV
    const csvRows = [];
    const headers = Object.keys(csvData[0]);
    
    // Intestazioni
    csvRows.push(headers.join(','));
    
    // Righe di dati
    for (const row of csvData) {
      const values = headers.map(header => {
        const value = row[header as keyof typeof row] || '';
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csv = csvRows.join('\n');
    
    // Invia la risposta
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="selections_${session.clientName.replace(/\s+/g, '_')}_${sessionId}.csv"`);
    res.status(200).send(csv);
  } catch (error: any) {
    console.error('Error in exportSelections:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};