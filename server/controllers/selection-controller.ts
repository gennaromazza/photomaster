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

    // Query ottimizzata che conta le selezioni e i commenti per ogni sessione in una sola query
    const sessionsResult = await pool.query(`
      SELECT 
        s.*,
        COUNT(DISTINCT ps.id) as selections_count,
        COUNT(DISTINCT pc.id) as comments_count
      FROM 
        selection_sessions s
        LEFT JOIN photo_selections ps ON s.id = ps.session_id
        LEFT JOIN photo_comments pc ON s.id = pc.session_id
      WHERE 
        s.gallery_id = $1
      GROUP BY 
        s.id
      ORDER BY 
        s.started_at
    `, [galleryId]);

    // Converti i nomi delle colonne da snake_case a camelCase
    const sessionsWithCounts = sessionsResult.rows.map(session => ({
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
        selections: parseInt(session.selections_count),
        comments: parseInt(session.comments_count)
      }
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
    const sessionResult = await pool.query(
      'SELECT * FROM selection_sessions WHERE id = $1',
      [id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    // Aggiorna la sessione come completata
    const updatedSessionResult = await pool.query(
      `UPDATE selection_sessions 
       SET status = $1, completed_at = $2
       WHERE id = $3
       RETURNING *`,
      ['completed', new Date(), id]
    );

    const session = updatedSessionResult.rows[0];

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
      notes: session.notes
    };

    res.status(200).json(result);
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
    const sessionResult = await pool.query(
      'SELECT * FROM selection_sessions WHERE id = $1',
      [id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    // Elimina tutte le selezioni e i commenti associati
    await pool.query(
      'DELETE FROM photo_selections WHERE session_id = $1',
      [id]
    );

    await pool.query(
      'DELETE FROM photo_comments WHERE session_id = $1',
      [id]
    );

    // Elimina la sessione
    await pool.query(
      'DELETE FROM selection_sessions WHERE id = $1',
      [id]
    );

    res.status(200).json({ success: true, message: 'Sessione eliminata con successo' });
  } catch (error: any) {
    console.error('Error in deleteSession:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const togglePhotoSelection = async (req: Request, res: Response) => {
  try {
    // Validare i dati in ingresso
    const parseResult = insertPhotoSelectionSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Dati non validi',
        details: parseResult.error.format()
      });
    }

    const { photoId, sessionId } = parseResult.data;

    // Verificare se la foto esiste
    const photoResult = await pool.query(
      'SELECT id FROM photos WHERE id = $1',
      [photoId]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Foto non trovata' });
    }

    // Verificare se la sessione esiste e non è completata
    const sessionResult = await pool.query(
      'SELECT id, status, gallery_id FROM selection_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    const session = sessionResult.rows[0];

    if (session.status === 'completed') {
      return res.status(403).json({ error: 'La sessione è stata completata e non può essere modificata' });
    }

    // Verificare se la foto è già selezionata
    const existingSelectionResult = await pool.query(
      'SELECT id FROM photo_selections WHERE photo_id = $1 AND session_id = $2',
      [photoId, sessionId]
    );

    let action = '';

    if (existingSelectionResult.rows.length > 0) {
      // Rimuovere la selezione
      await pool.query(
        'DELETE FROM photo_selections WHERE photo_id = $1 AND session_id = $2',
        [photoId, sessionId]
      );

      action = 'removed';
    } else {
      // Verificare eventuali limiti sulle selezioni
      const settingsResult = await pool.query(
        'SELECT max_selections FROM gallery_selection_settings WHERE gallery_id = $1',
        [session.gallery_id]
      );

      const settings = settingsResult.rows.length > 0 ? settingsResult.rows[0] : null;

      if (settings && settings.max_selections > 0) {
        // Contare le selezioni attuali
        const selectionsCountResult = await pool.query(
          'SELECT COUNT(*) FROM photo_selections WHERE session_id = $1',
          [sessionId]
        );

        const currentSelectionsCount = parseInt(selectionsCountResult.rows[0].count);

        if (currentSelectionsCount >= settings.max_selections) {
          return res.status(403).json({ 
            error: 'Numero massimo di selezioni raggiunto',
            max: settings.max_selections,
            current: currentSelectionsCount
          });
        }
      }

      // Ottieni gallery_id dalla foto
      const photoInfoResult = await pool.query(
        'SELECT gallery_id FROM photos WHERE id = $1',
        [photoId]
      );

      if (photoInfoResult.rows.length === 0) {
        return res.status(404).json({ error: 'Foto non trovata' });
      }

      const galleryId = photoInfoResult.rows[0].gallery_id;

      // Aggiungere la selezione
      await pool.query(
        'INSERT INTO photo_selections (photo_id, session_id, gallery_id) VALUES ($1, $2, $3)',
        [photoId, sessionId, galleryId]
      );

      action = 'added';
    }

    res.status(200).json({ 
      success: true, 
      action,
      photoId,
      sessionId
    });
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

    // Verificare se la sessione esiste
    const sessionResult = await pool.query(
      'SELECT * FROM selection_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    // Ottieni tutte le selezioni con i dettagli delle foto
    const selectionsResult = await pool.query(
      `SELECT ps.*, p.filename, p.title, p.caption, p.chapter_id 
       FROM photo_selections ps
       JOIN photos p ON ps.photo_id = p.id
       WHERE ps.session_id = $1
       ORDER BY ps.created_at DESC`,
      [sessionId]
    );

    // Converti i nomi delle colonne da snake_case a camelCase
    const selections = selectionsResult.rows.map(row => ({
      id: row.id,
      photoId: row.photo_id,
      sessionId: row.session_id,
      createdAt: row.created_at,
      photo: {
        filename: row.filename,
        title: row.title,
        description: row.caption, // Usiamo il campo caption come description
        chapterId: row.chapter_id
      }
    }));

    res.status(200).json(selections);
  } catch (error: any) {
    console.error('Error in getSessionSelections:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getPhotoCommentsCount = async (req: Request, res: Response) => {
  try {
    const photoId = parseInt(req.params.photoId);

    if (isNaN(photoId)) {
      return res.status(400).json({ error: 'ID foto non valido' });
    }

    // Conta i commenti per questa foto
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM photo_comments WHERE photo_id = $1',
      [photoId]
    );

    res.status(200).json({ count: parseInt(countResult.rows[0].count) });
  } catch (error: any) {
    console.error('Error in getPhotoCommentsCount:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    // Validare i dati in ingresso
    const parseResult = insertPhotoCommentSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Dati non validi',
        details: parseResult.error.format()
      });
    }

    const { photoId, sessionId, content, userId, clientName } = parseResult.data;

    // Verificare se la foto esiste
    const photoResult = await pool.query(
      'SELECT id FROM photos WHERE id = $1',
      [photoId]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Foto non trovata' });
    }

    // Verificare se la sessione esiste e non è completata
    const sessionResult = await pool.query(
      'SELECT id, status, gallery_id FROM selection_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    const session = sessionResult.rows[0];

    if (session.status === 'completed') {
      return res.status(403).json({ error: 'La sessione è stata completata e non può essere modificata' });
    }

    // Verificare se i commenti sono abilitati per questa galleria
    const settingsResult = await pool.query(
      'SELECT allow_comments FROM gallery_selection_settings WHERE gallery_id = $1',
      [session.gallery_id]
    );

    const settings = settingsResult.rows.length > 0 ? settingsResult.rows[0] : null;

    if (settings && !settings.allow_comments) {
      return res.status(403).json({ error: 'I commenti non sono abilitati per questa galleria' });
    }

    // Aggiungere il commento
    const commentResult = await pool.query(
      `INSERT INTO photo_comments 
       (photo_id, session_id, content, user_id, client_name, is_read, name, email, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [photoId, sessionId, content, userId, clientName, false, clientName || 'Guest', 'no-reply@example.com', content || '']
    );

    // Converti i nomi delle colonne da snake_case a camelCase
    const comment = commentResult.rows[0];
    const result = {
      id: comment.id,
      photoId: comment.photo_id,
      sessionId: comment.session_id,
      content: comment.content,
      userId: comment.user_id,
      clientName: comment.client_name,
      isRead: comment.is_read,
      createdAt: comment.created_at
    };

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error in addComment:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const replyToComment = async (req: Request, res: Response) => {
  try {
    // Validare i dati in ingresso
    const schema = z.object({
      photoId: z.number(),
      sessionId: z.number(),
      content: z.string(),
      parentId: z.number(),
      userId: z.number().nullable().optional()
    });

    const parseResult = schema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Dati nonvalidi',
        details: parseResult.error.format()
      });
    }

    const { photoId, sessionId, content, parentId, userId } = parseResult.data;

    // Verificare se la foto esiste
    const photoResult = await pool.query(
      'SELECT id FROM photos WHERE id = $1',
      [photoId]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Foto non trovata' });
    }

    // Verificare se la sessione esiste e non è completata
    const sessionResult = await pool.query(
      'SELECT id, status, gallery_id FROM selection_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    const session = sessionResult.rows[0];

    if (session.status === 'completed') {
      return res.status(403).json({ error: 'La sessione è stata completata e non può essere modificata' });
    }

    // Verificare se il commento padre esiste
    const parentCommentResult = await pool.query(
      'SELECT id FROM photo_comments WHERE id = $1',
      [parentId]
    );

    if (parentCommentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Commento padre non trovato' });
    }

    // Ottieni l'username o altre informazioni dell'utente se disponibili
    let userInfo = null;
    if (userId) {
      const userResult = await pool.query(
        'SELECT username, full_name FROM users WHERE id = $1',
        [userId]
      );
      if (userResult.rows.length > 0) {
        userInfo = userResult.rows[0];
      }
    }

    // Aggiungere la risposta
    const commentResult = await pool.query(
      `INSERT INTO photo_comments 
       (photo_id, session_id, content, user_id, parent_id, is_read, name, email, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        photoId, 
        sessionId, 
        content, 
        userId, 
        parentId, 
        false, 
        userInfo ? userInfo.full_name || userInfo.username : 'Staff',
        'staff@example.com',
        content || ''
      ]
    );

    // Converti i nomi delle colonne da snake_case a camelCase
    const comment = commentResult.rows[0];
    const result = {
      id: comment.id,
      photoId: comment.photo_id,
      sessionId: comment.session_id,
      content: comment.content,
      userId: comment.user_id,
      parentId: comment.parent_id,
      isRead: comment.is_read,
      createdAt: comment.created_at
    };

    res.status(201).json(result);
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

    // Verificare se la sessione esiste
    const sessionResult = await pool.query(
      'SELECT * FROM selection_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    // Ottieni tutti i commenti per questa sessione
    const commentsResult = await pool.query(
      `SELECT pc.*, u.full_name as user_full_name, u.username as user_username
       FROM photo_comments pc
       LEFT JOIN users u ON pc.user_id = u.id
       WHERE pc.session_id = $1
       ORDER BY pc.created_at ASC`,
      [sessionId]
    );

    // Converti e organizza i commenti
    const comments = commentsResult.rows.map(row => ({
      id: row.id,
      photoId: row.photo_id,
      sessionId: row.session_id,
      content: row.content,
      userId: row.user_id,
      clientName: row.client_name,
      parentId: row.parent_id,
      isRead: row.is_read,
      createdAt: row.created_at,
      user: row.user_id ? {
        fullName: row.user_full_name,
        username: row.user_username
      } : null
    }));

    res.status(200).json(comments);
  } catch (error: any) {
    console.error('Error in getSessionComments:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getPhotoComments = async (req: Request, res: Response) => {
  try {
    const photoId = parseInt(req.params.photoId);

    if (isNaN(photoId)) {
      return res.status(400).json({ error: 'ID foto non valido' });
    }

    // Verificare se la foto esiste
    const photoResult = await pool.query(
      'SELECT id FROM photos WHERE id = $1',
      [photoId]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Foto non trovata' });
    }

    // Ottieni sessionId dai parametri query se disponibile
    const sessionId = req.query.sessionId ? parseInt(req.query.sessionId as string) : null;

    // Se sessionId è fornito, verificare se la sessione esiste
    if (sessionId) {
      const sessionResult = await pool.query(
        'SELECT * FROM selection_sessions WHERE id = $1',
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ error: 'Sessione non trovata' });
      }
    }

    // Costruire la query in base a se sessionId è fornito
    let commentsResult;
    if (sessionId) {
      commentsResult = await pool.query(
        `SELECT pc.*, u.full_name as user_full_name, u.username as user_username
         FROM photo_comments pc
         LEFT JOIN users u ON pc.user_id = u.id
         WHERE pc.photo_id = $1 AND pc.session_id = $2
         ORDER BY pc.created_at ASC`,
        [photoId, sessionId]
      );
    } else {
      commentsResult = await pool.query(
        `SELECT pc.*, u.full_name as user_full_name, u.username as user_username
         FROM photo_comments pc
         LEFT JOIN users u ON pc.user_id = u.id
         WHERE pc.photo_id = $1
         ORDER BY pc.created_at ASC`,
        [photoId]
      );
    }

    // Converti e organizza i commenti
    const comments = commentsResult.rows.map(row => ({
      id: row.id,
      photoId: row.photo_id,
      sessionId: row.session_id,
      content: row.content,
      userId: row.user_id,
      clientName: row.client_name,
      parentId: row.parent_id,
      isRead: row.is_read,
      createdAt: row.created_at,
      user: row.user_id ? {
        fullName: row.user_full_name,
        username: row.user_username
      } : null
    }));

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

    // Verificare se il commento esiste
    const commentResult = await pool.query(
      'SELECT * FROM photo_comments WHERE id = $1',
      [id]
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Commento non trovato' });
    }

    // Aggiornare il commento
    const updatedCommentResult = await pool.query(
      `UPDATE photo_comments 
       SET is_read = true
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Converti i nomi delle colonne da snake_case a camelCase
    const comment = updatedCommentResult.rows[0];
    const result = {
      id: comment.id,
      photoId: comment.photo_id,
      sessionId: comment.session_id,
      content: comment.content,
      userId: comment.user_id,
      clientName: comment.client_name,
      parentId: comment.parent_id,
      isRead: comment.is_read,
      createdAt: comment.created_at
    };

    res.status(200).json(result);
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

    // Verificare se la sessione esiste
    const sessionResult = await pool.query(
      'SELECT * FROM selection_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    const session = sessionResult.rows[0];

    // Ottieni tutte le selezioni con i dettagli delle foto
    const selectionsResult = await pool.query(
      `SELECT ps.id as selection_id, p.id as photo_id, p.filename, p.title, p.caption as description, p.chapter_id,
              g.name as gallery_name, g.description as gallery_description,
              gc.title as chapter_title
       FROM photo_selections ps
       JOIN photos p ON ps.photo_id = p.id
       JOIN galleries g ON p.gallery_id = g.id
       LEFT JOIN gallery_chapters gc ON p.chapter_id = gc.id
       WHERE ps.session_id = $1
       ORDER BY gc.title, p.filename`,
      [sessionId]
    );

    // Organizza i dati
    const gallery = {
      id: session.gallery_id,
      name: selectionsResult.rows.length > 0 ? selectionsResult.rows[0].gallery_name : null,
      description: selectionsResult.rows.length > 0 ? selectionsResult.rows[0].gallery_description : null
    };

    // Organizza le foto per capitolo
    const selectionsByChapter = selectionsResult.rows.reduce((acc, row) => {
      const chapterId = row.chapter_id;
      const chapterTitle = row.chapter_title || 'Senza capitolo';

      if (!acc[chapterTitle]) {
        acc[chapterTitle] = [];
      }

      acc[chapterTitle].push({
        id: row.selection_id,
        photoId: row.photo_id,
        filename: row.filename,
        title: row.title,
        description: row.description
      });

      return acc;
    }, {});

    // Prepara il risultato
    const result = {
      session: {
        id: session.id,
        clientName: session.client_name,
        clientEmail: session.client_email,
        status: session.status,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        notes: session.notes
      },
      gallery,
      selectionsCount: selectionsResult.rows.length,
      selectionsByChapter
    };

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in exportSelections:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};