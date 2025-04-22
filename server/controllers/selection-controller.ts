import { Request, Response } from 'express';
import { db } from '../db';
import { 
  gallerySelectionSettings, 
  selectionSessions, 
  photoSelections, 
  photoComments,
  insertGallerySelectionSettingsSchema,
  insertSelectionSessionSchema,
  insertPhotoSelectionSchema,
  insertPhotoCommentSchema
} from '@shared/schema-gallery-selections';
import { photos, galleries } from '@shared/schema';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

// Funzioni stub temporanee
// Queste verranno implementate correttamente in seguito

export const getSelectionSettings = async (req: Request, res: Response) => {
  try {
    const galleryId = parseInt(req.params.galleryId);
    
    if (isNaN(galleryId)) {
      return res.status(400).json({ error: 'ID galleria non valido' });
    }
    
    // Verifica se la galleria esiste
    const [gallery] = await db.select().from(galleries).where(eq(galleries.id, galleryId));
    
    if (!gallery) {
      return res.status(404).json({ error: 'Galleria non trovata' });
    }
    
    // Cerca le impostazioni esistenti
    const [settings] = await db.select()
      .from(gallerySelectionSettings)
      .where(eq(gallerySelectionSettings.galleryId, galleryId));
    
    if (settings) {
      return res.status(200).json(settings);
    }
    
    // Se non esistono impostazioni, crea delle impostazioni di default
    const [newSettings] = await db.insert(gallerySelectionSettings)
      .values({
        galleryId,
        isEnabled: false,
        instructions: 'Seleziona le foto che preferisci',
        minSelections: 0,
        maxSelections: 0
      })
      .returning();
    
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
    const [existingSettings] = await db.select()
      .from(gallerySelectionSettings)
      .where(eq(gallerySelectionSettings.galleryId, galleryId));
    
    if (existingSettings) {
      // Aggiorna le impostazioni esistenti
      const [updatedSettings] = await db.update(gallerySelectionSettings)
        .set({
          ...parseResult.data,
          updatedAt: new Date()
        })
        .where(eq(gallerySelectionSettings.galleryId, galleryId))
        .returning();
      
      return res.status(200).json(updatedSettings);
    } else {
      // Crea nuove impostazioni
      const [newSettings] = await db.insert(gallerySelectionSettings)
        .values(parseResult.data)
        .returning();
      
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
    const [gallery] = await db.select().from(galleries).where(eq(galleries.id, galleryId));
    
    if (!gallery) {
      return res.status(404).json({ error: 'Galleria non trovata' });
    }
    
    // Verificare se le selezioni sono abilitate per questa galleria
    const [settings] = await db.select()
      .from(gallerySelectionSettings)
      .where(eq(gallerySelectionSettings.galleryId, galleryId));
      
    if (!settings || !settings.isEnabled) {
      return res.status(403).json({ error: 'Le selezioni non sono abilitate per questa galleria' });
    }
    
    // Creare la sessione
    const [session] = await db.insert(selectionSessions)
      .values(parseResult.data)
      .returning();
    
    // Aggiungere _count per mantenere compatibilità con l'interfaccia frontend
    const result = {
      ...session,
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
    const [gallery] = await db.select().from(galleries).where(eq(galleries.id, galleryId));
    
    if (!gallery) {
      return res.status(404).json({ error: 'Galleria non trovata' });
    }
    
    // Ottenere tutte le sessioni per questa galleria
    const sessions = await db.select().from(selectionSessions)
      .where(eq(selectionSessions.galleryId, galleryId))
      .orderBy(selectionSessions.startedAt);
    
    // Per ogni sessione, contare le selezioni e i commenti
    const sessionsWithCounts = await Promise.all(sessions.map(async (session) => {
      const [selectionsCount] = await db.select({
        count: sql`count(*)`
      }).from(photoSelections)
        .where(eq(photoSelections.sessionId, session.id));
        
      const [commentsCount] = await db.select({
        count: sql`count(*)`
      }).from(photoComments)
        .where(eq(photoComments.sessionId, session.id));
        
      return {
        ...session,
        _count: {
          selections: Number(selectionsCount?.count || 0),
          comments: Number(commentsCount?.count || 0)
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
    const [session] = await db.select().from(selectionSessions).where(eq(selectionSessions.id, id));
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    // Conta il numero di selezioni e commenti
    const [selectionsCount] = await db.select({
      count: sql`count(*)`
    }).from(photoSelections)
      .where(eq(photoSelections.sessionId, id));
      
    const [commentsCount] = await db.select({
      count: sql`count(*)`
    }).from(photoComments)
      .where(eq(photoComments.sessionId, id));
      
    // Ottieni la galleria associata
    const [gallery] = await db.select().from(galleries)
      .where(eq(galleries.id, session.galleryId));
    
    const result = {
      ...session,
      _count: {
        selections: Number(selectionsCount?.count || 0),
        comments: Number(commentsCount?.count || 0)
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
    const [session] = await db.select().from(selectionSessions)
      .where(eq(selectionSessions.sessionKey, key));
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    // Controlla se la sessione è scaduta
    const [settings] = await db.select().from(gallerySelectionSettings)
      .where(eq(gallerySelectionSettings.galleryId, session.galleryId));
      
    if (settings?.expiresAt && new Date(settings.expiresAt) < new Date() && session.status !== 'completed') {
      return res.status(403).json({ error: 'La sessione è scaduta' });
    }
    
    // Ottieni la galleria associata
    const [gallery] = await db.select().from(galleries)
      .where(eq(galleries.id, session.galleryId));
    
    // Conta il numero di selezioni e commenti
    const [selectionsCount] = await db.select({
      count: sql`count(*)`
    }).from(photoSelections)
      .where(eq(photoSelections.sessionId, session.id));
      
    const [commentsCount] = await db.select({
      count: sql`count(*)`
    }).from(photoComments)
      .where(eq(photoComments.sessionId, session.id));
    
    const result = {
      ...session,
      _count: {
        selections: Number(selectionsCount?.count || 0),
        comments: Number(commentsCount?.count || 0)
      },
      gallery: gallery ? {
        id: gallery.id,
        name: gallery.name,
        slug: gallery.slug
      } : null,
      settings: settings || null
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
    // Implementazione temporanea - risposta vuota
    res.status(200).send('');
  } catch (error: any) {
    console.error('Error in exportSelections:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};