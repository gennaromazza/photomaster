import { Request, Response } from 'express';
import { db } from '../db';
import { 
  gallerySelectionSettings, 
  selectionSessions, 
  photoSelections,
  photoComments 
} from '@shared/schema-gallery-selections';
import { photos, galleries } from '../schema_gallery';
import { eq, and, isNull, sql, desc, lt, or, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { createObjectCsvWriter } from 'csv-writer';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

export const getSelectionSettings = async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;
    
    const settings = await db.query.gallerySelectionSettings.findFirst({
      where: eq(gallerySelectionSettings.galleryId, Number(galleryId))
    });
    
    // Se non ci sono impostazioni, restituisci quelle predefinite
    if (!settings) {
      return res.json({
        galleryId: Number(galleryId),
        isEnabled: false,
        instructions: null,
        minSelections: 0,
        maxSelections: 0,
        expiresAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    return res.json(settings);
  } catch (error: any) {
    console.error('Errore nel recupero delle impostazioni di selezione:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const updateSelectionSettings = async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;
    const { isEnabled, instructions, minSelections, maxSelections, expiresAt } = req.body;
    
    // Verifica che la galleria esista
    const gallery = await db.query.galleries.findFirst({
      where: eq(galleries.id, Number(galleryId))
    });
    
    if (!gallery) {
      return res.status(404).json({ error: 'Galleria non trovata' });
    }
    
    // Verifica se esistono già impostazioni
    const existingSettings = await db.query.gallerySelectionSettings.findFirst({
      where: eq(gallerySelectionSettings.galleryId, Number(galleryId))
    });
    
    const now = new Date();
    
    if (existingSettings) {
      // Aggiorna le impostazioni esistenti
      const [updated] = await db
        .update(gallerySelectionSettings)
        .set({
          isEnabled,
          instructions,
          minSelections,
          maxSelections,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          updatedAt: now
        })
        .where(eq(gallerySelectionSettings.id, existingSettings.id))
        .returning();
      
      return res.json(updated);
    } else {
      // Crea nuove impostazioni
      const [created] = await db
        .insert(gallerySelectionSettings)
        .values({
          galleryId: Number(galleryId),
          isEnabled,
          instructions,
          minSelections,
          maxSelections,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdAt: now,
          updatedAt: now
        })
        .returning();
      
      return res.json(created);
    }
  } catch (error: any) {
    console.error('Errore nell\'aggiornamento delle impostazioni di selezione:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const createSelectionSession = async (req: Request, res: Response) => {
  try {
    const { galleryId, clientName, clientEmail, clientId } = req.body;
    
    // Verifica che la galleria esista
    const gallery = await db.query.galleries.findFirst({
      where: eq(galleries.id, Number(galleryId))
    });
    
    if (!gallery) {
      return res.status(404).json({ error: 'Galleria non trovata' });
    }
    
    // Verifica che la selezione sia abilitata per questa galleria
    const settings = await db.query.gallerySelectionSettings.findFirst({
      where: and(
        eq(gallerySelectionSettings.galleryId, Number(galleryId)),
        eq(gallerySelectionSettings.isEnabled, true)
      )
    });
    
    if (!settings) {
      return res.status(400).json({ error: 'La selezione non è abilitata per questa galleria' });
    }
    
    // Verifica che non sia scaduta
    if (settings.expiresAt && new Date(settings.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Il periodo di selezione per questa galleria è scaduto' });
    }
    
    // Genera una chiave univoca per la sessione
    const sessionKey = uuidv4();
    
    // Crea una nuova sessione
    const [session] = await db
      .insert(selectionSessions)
      .values({
        galleryId: Number(galleryId),
        clientId: clientId ? Number(clientId) : null,
        clientName,
        clientEmail,
        sessionKey,
        status: 'active',
        startedAt: new Date(),
        notes: null
      })
      .returning();
    
    return res.status(201).json(session);
  } catch (error: any) {
    console.error('Errore nella creazione della sessione di selezione:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getSessionByKey = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    const session = await db.query.selectionSessions.findFirst({
      where: eq(selectionSessions.sessionKey, key)
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    // Verifica se la sessione è scaduta (se lo stato è active)
    if (session.status === 'active') {
      const settings = await db.query.gallerySelectionSettings.findFirst({
        where: eq(gallerySelectionSettings.galleryId, session.galleryId)
      });
      
      if (settings?.expiresAt && new Date(settings.expiresAt) < new Date()) {
        // Aggiorna lo stato della sessione a expired
        await db
          .update(selectionSessions)
          .set({ status: 'expired' })
          .where(eq(selectionSessions.id, session.id));
        
        session.status = 'expired';
      }
    }
    
    return res.json(session);
  } catch (error: any) {
    console.error('Errore nel recupero della sessione di selezione:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const session = await db.query.selectionSessions.findFirst({
      where: eq(selectionSessions.id, Number(id))
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    return res.json(session);
  } catch (error: any) {
    console.error('Errore nel recupero della sessione di selezione:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getSessionsByGallery = async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.query;
    
    const baseQuery = galleryId
      ? and(eq(selectionSessions.galleryId, Number(galleryId)))
      : sql`1=1`;
    
    // Ottieni le sessioni con conteggio di selezioni e commenti
    const sessions = await db
      .select({
        ...selectionSessions,
        _count: {
          selections: db
            .select({ count: sql`count(*)` })
            .from(photoSelections)
            .where(eq(photoSelections.sessionId, selectionSessions.id))
            .limit(1) as any,
          comments: db
            .select({ count: sql`count(*)` })
            .from(photoComments)
            .where(eq(photoComments.sessionId, selectionSessions.id))
            .limit(1) as any,
        },
      })
      .from(selectionSessions)
      .where(baseQuery)
      .orderBy(desc(selectionSessions.startedAt));
    
    // Trasforma i risultati in un formato più leggibile
    const formattedSessions = sessions.map(session => ({
      ...session,
      _count: {
        selections: Number(session._count.selections),
        comments: Number(session._count.comments),
      }
    }));
    
    return res.json(formattedSessions);
  } catch (error: any) {
    console.error('Errore nel recupero delle sessioni di selezione:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const completeSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const session = await db.query.selectionSessions.findFirst({
      where: eq(selectionSessions.id, Number(id))
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    if (session.status !== 'active') {
      return res.status(400).json({ error: 'La sessione non è attiva' });
    }
    
    // Verifica se ci sono selezioni sufficienti
    const settings = await db.query.gallerySelectionSettings.findFirst({
      where: eq(gallerySelectionSettings.galleryId, session.galleryId)
    });
    
    if (settings && settings.minSelections > 0) {
      const selectionsCount = await db
        .select({ count: sql`count(*)` })
        .from(photoSelections)
        .where(eq(photoSelections.sessionId, Number(id)))
        .then(result => Number(result[0]?.count || 0));
      
      if (selectionsCount < settings.minSelections) {
        return res.status(400).json({ 
          error: `Devi selezionare almeno ${settings.minSelections} foto per completare la selezione` 
        });
      }
    }
    
    // Aggiorna lo stato della sessione
    const [updated] = await db
      .update(selectionSessions)
      .set({ 
        status: 'completed', 
        completedAt: new Date(),
        notes: notes || null
      })
      .where(eq(selectionSessions.id, Number(id)))
      .returning();
    
    return res.json(updated);
  } catch (error: any) {
    console.error('Errore nel completamento della sessione di selezione:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getSessionSelections = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const selections = await db.query.photoSelections.findMany({
      where: eq(photoSelections.sessionId, Number(id)),
      with: {
        photo: true
      },
      orderBy: desc(photoSelections.createdAt)
    });
    
    return res.json(selections);
  } catch (error: any) {
    console.error('Errore nel recupero delle selezioni della sessione:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getSessionComments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const comments = await db.query.photoComments.findMany({
      where: eq(photoComments.sessionId, Number(id)),
      with: {
        photo: true,
        user: true
      },
      orderBy: desc(photoComments.createdAt)
    });
    
    return res.json(comments);
  } catch (error: any) {
    console.error('Errore nel recupero dei commenti della sessione:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getPhotoComments = async (req: Request, res: Response) => {
  try {
    const { photoId } = req.params;
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'ID sessione richiesto' });
    }
    
    const comments = await db.query.photoComments.findMany({
      where: and(
        eq(photoComments.photoId, Number(photoId)),
        eq(photoComments.sessionId, Number(sessionId))
      ),
      with: {
        user: true
      },
      orderBy: desc(photoComments.createdAt)
    });
    
    return res.json(comments);
  } catch (error: any) {
    console.error('Errore nel recupero dei commenti della foto:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getPhotoCommentsCount = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    // Ottieni il conteggio dei commenti per ogni foto in questa sessione
    const counts = await db
      .select({
        photoId: photoComments.photoId,
        count: sql`count(*)`.as('count')
      })
      .from(photoComments)
      .where(eq(photoComments.sessionId, Number(sessionId)))
      .groupBy(photoComments.photoId);
    
    return res.json(counts.map(c => ({
      photoId: c.photoId,
      count: Number(c.count)
    })));
  } catch (error: any) {
    console.error('Errore nel recupero dei conteggi commenti:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    const { photoId, sessionId, content, clientName } = req.body;
    const userId = req.user?.id;
    
    if (!photoId || !sessionId || !content) {
      return res.status(400).json({ error: 'Mancano campi obbligatori' });
    }
    
    // Verifica che la foto esista
    const photo = await db.query.photos.findFirst({
      where: eq(photos.id, Number(photoId))
    });
    
    if (!photo) {
      return res.status(404).json({ error: 'Foto non trovata' });
    }
    
    // Verifica che la sessione esista e sia attiva
    const session = await db.query.selectionSessions.findFirst({
      where: eq(selectionSessions.id, Number(sessionId))
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    if (session.status !== 'active') {
      return res.status(400).json({ error: 'La sessione non è attiva' });
    }
    
    // Se non c'è un userId, ci deve essere un clientName
    if (!userId && !clientName) {
      return res.status(400).json({ error: 'Autore del commento non specificato' });
    }
    
    // Aggiungi il commento
    const [comment] = await db
      .insert(photoComments)
      .values({
        photoId: Number(photoId),
        sessionId: Number(sessionId),
        userId: userId || null,
        clientName: clientName || null,
        content,
        isRead: false,
        createdAt: new Date()
      })
      .returning();
    
    return res.status(201).json(comment);
  } catch (error: any) {
    console.error('Errore nell\'aggiunta del commento:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const replyToComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Solo lo staff può rispondere ai commenti' });
    }
    
    // Recupera il commento originale
    const originalComment = await db.query.photoComments.findFirst({
      where: eq(photoComments.id, Number(id)),
      with: {
        photo: true,
      }
    });
    
    if (!originalComment) {
      return res.status(404).json({ error: 'Commento non trovato' });
    }
    
    // Aggiungi il commento di risposta
    const [reply] = await db
      .insert(photoComments)
      .values({
        photoId: originalComment.photoId,
        sessionId: originalComment.sessionId,
        userId,
        clientName: null,
        content,
        isRead: true, // Lo staff ha già letto il proprio commento
        createdAt: new Date()
      })
      .returning();
    
    return res.status(201).json(reply);
  } catch (error: any) {
    console.error('Errore nell\'aggiunta della risposta al commento:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const markCommentAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verifica che l'utente sia uno staff/admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorizzato' });
    }
    
    // Aggiorna lo stato del commento
    const [updated] = await db
      .update(photoComments)
      .set({ isRead: true })
      .where(eq(photoComments.id, Number(id)))
      .returning();
    
    return res.json(updated);
  } catch (error: any) {
    console.error('Errore nell\'aggiornamento dello stato del commento:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const togglePhotoSelection = async (req: Request, res: Response) => {
  try {
    const { photoId } = req.params;
    const { sessionId, notes } = req.body;
    
    // Verifica che la foto esista
    const photo = await db.query.photos.findFirst({
      where: eq(photos.id, Number(photoId))
    });
    
    if (!photo) {
      return res.status(404).json({ error: 'Foto non trovata' });
    }
    
    // Verifica che la sessione esista e sia attiva
    const session = await db.query.selectionSessions.findFirst({
      where: eq(selectionSessions.id, Number(sessionId))
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    if (session.status !== 'active') {
      return res.status(400).json({ error: 'La sessione non è attiva' });
    }
    
    // Controlla se la selezione è abilitata e se ci sono limitazioni
    const settings = await db.query.gallerySelectionSettings.findFirst({
      where: eq(gallerySelectionSettings.galleryId, session.galleryId)
    });
    
    if (!settings || !settings.isEnabled) {
      return res.status(400).json({ error: 'La selezione non è abilitata per questa galleria' });
    }
    
    // Verifica che non sia scaduta
    if (settings.expiresAt && new Date(settings.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Il periodo di selezione per questa galleria è scaduto' });
    }
    
    // Controlla se esiste già una selezione per questa foto nella sessione
    const existingSelection = await db.query.photoSelections.findFirst({
      where: and(
        eq(photoSelections.sessionId, Number(sessionId)),
        eq(photoSelections.photoId, Number(photoId))
      )
    });
    
    // Se esiste, rimuovila (toggle off)
    if (existingSelection) {
      await db
        .delete(photoSelections)
        .where(eq(photoSelections.id, existingSelection.id));
      
      return res.json({ 
        action: 'removed', 
        message: 'Selezione rimossa con successo' 
      });
    }
    
    // Altrimenti, aggiungi la selezione (toggle on)
    // Prima verifica se abbiamo raggiunto il limite massimo
    if (settings.maxSelections > 0) {
      const currentSelectionsCount = await db
        .select({ count: sql`count(*)` })
        .from(photoSelections)
        .where(eq(photoSelections.sessionId, Number(sessionId)))
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
        sessionId: Number(sessionId),
        photoId: Number(photoId),
        notes: notes || null,
        createdAt: new Date()
      })
      .returning();
    
    return res.status(201).json({ 
      action: 'added',
      selection: newSelection,
      message: 'Foto selezionata con successo' 
    });
  } catch (error: any) {
    console.error('Errore nella gestione della selezione foto:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const exportSelections = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'csv', quality = 'medium' } = req.query;
    
    // Recupera le selezioni con le foto
    const session = await db.query.selectionSessions.findFirst({
      where: eq(selectionSessions.id, Number(id))
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    const selections = await db.query.photoSelections.findMany({
      where: eq(photoSelections.sessionId, Number(id)),
      with: {
        photo: true
      }
    });
    
    if (selections.length === 0) {
      return res.status(404).json({ error: 'Nessuna selezione trovata' });
    }
    
    // Esportazione in CSV
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=selezioni_${id}_${new Date().toISOString().split('T')[0]}.csv`);
      
      const csvWriter = createObjectCsvWriter({
        path: 'stdout',
        header: [
          { id: 'id', title: 'ID' },
          { id: 'filename', title: 'Nome File' },
          { id: 'title', title: 'Titolo' },
          { id: 'originalUrl', title: 'URL Originale' },
          { id: 'chapterId', title: 'ID Capitolo' },
          { id: 'notes', title: 'Note Cliente' },
          { id: 'createdAt', title: 'Data Selezione' }
        ],
        fieldDelimiter: ',',
      });
      
      const records = selections.map(s => ({
        id: s.photo.id,
        filename: s.photo.filename,
        title: s.photo.title || '',
        originalUrl: s.photo.originalUrl,
        chapterId: s.photo.chapterId || '',
        notes: s.notes || '',
        createdAt: new Date(s.createdAt).toISOString()
      }));
      
      // Scrivi direttamente alla risposta
      await csvWriter.writeRecords(records)
        .then(() => {
          res.end();
        });
      
      return;
    }
    
    // Esportazione in ZIP (archivio di foto)
    if (format === 'zip') {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=selezioni_${id}_${new Date().toISOString().split('T')[0]}.zip`);
      
      const archive = archiver('zip', {
        zlib: { level: 9 } // Livello massimo di compressione
      });
      
      archive.pipe(res);
      
      // Aggiungi il file CSV con i metadati
      const csvContent = [
        'ID,Nome File,Titolo,URL Originale,ID Capitolo,Note Cliente,Data Selezione',
        ...selections.map(s => [
          s.photo.id,
          s.photo.filename,
          s.photo.title || '',
          s.photo.originalUrl,
          s.photo.chapterId || '',
          s.notes || '',
          new Date(s.createdAt).toISOString()
        ].join(','))
      ].join('\n');
      
      archive.append(csvContent, { name: 'metadati.csv' });
      
      // Aggiungi le foto in base alla qualità richiesta
      const uploadDir = path.resolve('./uploads');
      
      for (const selection of selections) {
        const photo = selection.photo;
        let filePath;
        
        // Determina quale versione della foto aggiungere
        if (quality === 'original') {
          // Usa il file originale
          const filename = photo.filename;
          filePath = path.join(uploadDir, filename);
        } else if (quality === 'medium') {
          // Usa la versione media se disponibile, altrimenti la thumbnail
          const mediumFilename = photo.filename.replace(/\.\w+$/, '_medium$&');
          const mediumPath = path.join(uploadDir, mediumFilename);
          
          if (fs.existsSync(mediumPath)) {
            filePath = mediumPath;
          } else {
            // Fallback alla thumbnail
            const thumbnailFilename = photo.filename.replace(/\.\w+$/, '_thumbnail$&');
            filePath = path.join(uploadDir, thumbnailFilename);
          }
        } else {
          // 'thumbnail' o default
          const thumbnailFilename = photo.filename.replace(/\.\w+$/, '_thumbnail$&');
          filePath = path.join(uploadDir, thumbnailFilename);
        }
        
        // Verifica che il file esista
        if (fs.existsSync(filePath)) {
          // Usa il nome originale nel file zip
          let destFilename = photo.filename;
          
          // Aggiungi le note nel nome file se presenti
          if (selection.notes) {
            const ext = path.extname(destFilename);
            const base = path.basename(destFilename, ext);
            destFilename = `${base}_${selection.notes.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}${ext}`;
          }
          
          archive.file(filePath, { name: `foto/${destFilename}` });
        }
      }
      
      // Finalizza l'archivio e invia la risposta
      archive.finalize();
      return;
    }
    
    // Formato non supportato
    return res.status(400).json({ error: 'Formato di esportazione non supportato' });
  } catch (error: any) {
    console.error('Errore nell\'esportazione delle selezioni:', error);
    return res.status(500).json({ error: error.message });
  }
};