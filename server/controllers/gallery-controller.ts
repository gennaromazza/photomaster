import { Request, Response } from "express";
import { db } from "../db";
import { 
  galleries, insertGallerySchema, galleryChapters, insertGalleryChapterSchema,
  photos, insertPhotoSchema, photoSelections, gallerySubscriptions, insertGallerySubscriptionSchema,
  socialShares, insertSocialShareSchema
} from "../../schema_gallery";
import { eq, and, desc, sql, inArray, isNull, isNotNull } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import slugify from "slugify";
import QRCode from "qrcode";

// Directory per file caricati
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "galleries");
const THUMBNAILS_DIR = path.join(UPLOAD_DIR, "thumbnails");
const MEDIUM_DIR = path.join(UPLOAD_DIR, "medium");
const LARGE_DIR = path.join(UPLOAD_DIR, "large");
const WEBP_DIR = path.join(UPLOAD_DIR, "webp");
const QR_DIR = path.join(UPLOAD_DIR, "qr");

// Assicurati che le directory esistano
[UPLOAD_DIR, THUMBNAILS_DIR, MEDIUM_DIR, LARGE_DIR, WEBP_DIR, QR_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Dimensioni delle immagini
const THUMBNAIL_SIZE = 250;
const MEDIUM_SIZE = 800;
const LARGE_SIZE = 1600;

// GESTIONE GALLERIE

// Ottieni tutte le gallerie
export const getAllGalleries = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.query;

    let query = db.select().from(galleries).orderBy(desc(galleries.createdAt));

    if (eventId) {
      query = query.where(eq(galleries.eventId, Number(eventId)));
    }

    const allGalleries = await query;

    res.json(allGalleries);
  } catch (error) {
    console.error("Errore nel recupero delle gallerie:", error);
    res.status(500).json({ error: "Errore nel recupero delle gallerie" });
  }
};

// Ottieni una galleria per ID
export const getGalleryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [gallery] = await db
      .select()
      .from(galleries)
      .where(eq(galleries.id, Number(id)));

    if (!gallery) {
      return res.status(404).json({ error: "Galleria non trovata" });
    }

    res.json(gallery);
  } catch (error) {
    console.error("Errore nel recupero della galleria:", error);
    res.status(500).json({ error: "Errore nel recupero della galleria" });
  }
};

// Ottieni una galleria tramite slug
export const getGalleryBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const [gallery] = await db
      .select()
      .from(galleries)
      .where(eq(galleries.slug, slug));

    if (!gallery) {
      return res.status(404).json({ error: "Galleria non trovata" });
    }

    // Se la galleria richiede password e non è stato fornito il token
    if (gallery.password && !req.query.token) {
      // Restituisci solo informazioni di base senza contenuti
      return res.json({
        id: gallery.id,
        name: gallery.name,
        slug: gallery.slug,
        requiresPassword: true,
        coverImage: gallery.coverImage
      });
    }

    // Aggiorna il contatore visualizzazioni
    await db
      .update(galleries)
      .set({ viewCount: sql`${galleries.viewCount} + 1` })
      .where(eq(galleries.id, gallery.id));

    // Ottieni capitoli, foto in evidenza, ecc.
    const chapters = await db
      .select()
      .from(galleryChapters)
      .where(eq(galleryChapters.galleryId, gallery.id))
      .orderBy(galleryChapters.sortOrder);

    const featuredPhotos = await db
      .select()
      .from(photos)
      .where(and(
        eq(photos.galleryId, gallery.id),
        eq(photos.isFeatured, true),
        eq(photos.isHidden, false)
      ))
      .limit(10);

    res.json({
      ...gallery,
      chapters,
      featuredPhotos
    });
  } catch (error) {
    console.error("Errore nel recupero della galleria:", error);
    res.status(500).json({ error: "Errore nel recupero della galleria" });
  }
};

// Crea una nuova galleria
export const createGallery = async (req: Request, res: Response) => {
  try {
    console.log("Dati ricevuti nella richiesta:", req.body);
    console.log("File caricato:", req.file);

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Utente non autorizzato" });
    }

    // Creiamo un oggetto con i dati del form
    const galleryData: any = {
      name: req.body.name,
      description: req.body.description || null,
      isPublic: req.body.isPublic === 'true' || req.body.isPublic === true,
      password: req.body.isPasswordProtected === 'true' || req.body.isPasswordProtected === true ? 
                req.body.password || null : null,
      eventId: req.body.eventId && req.body.eventId !== "0" ? parseInt(req.body.eventId, 10) : null,
      viewCount: 0,
      userId: req.user.id, // Assicuriamoci che l'userId sia incluso
    };

    // Se c'è un file caricato, aggiungiamo il percorso all'oggetto dati
    if (req.file) {
      try {
        // Definisci le directory per i file
        const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'galleries');

        console.log("Directory upload:", UPLOAD_DIR);

        // Assicurati che la directory esista
        if (!fs.existsSync(UPLOAD_DIR)) {
          fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }

        // Genera un nome file unico per l'immagine di copertina
        const uniqueFilename = `cover-${Date.now()}-${uuidv4().substring(0, 8)}${path.extname(req.file.originalname)}`;
        const filePath = path.join(UPLOAD_DIR, uniqueFilename);

        console.log("Salvando il file in:", filePath);

        // Salva il file
        fs.writeFileSync(filePath, req.file.buffer);

        // Aggiungi il percorso alla galleria (usa slash per URL)
        galleryData.coverImage = `/uploads/galleries/${uniqueFilename}`;

        console.log("URL immagine di copertina:", galleryData.coverImage);
      } catch (fileError) {
        console.error("Errore nel salvataggio del file:", fileError);
      }
    }

    console.log("Dati della galleria elaborati:", galleryData);

    // Genera uno slug unico basato sul nome
    let slug = slugify(galleryData.name, { lower: true, strict: true });

    // Controlla se lo slug esiste già
    const existingSlug = await db
      .select()
      .from(galleries)
      .where(eq(galleries.slug, slug));

    if (existingSlug.length > 0) {
      // Aggiungi un UUID breve allo slug per renderlo unico
      slug = `${slug}-${uuidv4().substring(0, 8)}`;
    }

    const [newGallery] = await db
      .insert(galleries)
      .values({
        ...galleryData,
        slug,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json(newGallery);
  } catch (error) {
    console.error("Errore nella creazione della galleria:", error);
    if (error instanceof Error) {
      res.status(500).json({ error: `Errore nella creazione della galleria: ${error.message}` });
    } else {
      res.status(500).json({ error: "Errore nella creazione della galleria" });
    }
  }
};

// Aggiorna una galleria
export const updateGallery = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const galleryData = insertGallerySchema.parse(req.body);

    const [updatedGallery] = await db
      .update(galleries)
      .set({
        ...galleryData,
        updatedAt: new Date(),
      })
      .where(eq(galleries.id, Number(id)))
      .returning();

    if (!updatedGallery) {
      return res.status(404).json({ error: "Galleria non trovata" });
    }

    res.json(updatedGallery);
  } catch (error) {
    console.error("Errore nell'aggiornamento della galleria:", error);
    res.status(500).json({ error: "Errore nell'aggiornamento della galleria" });
  }
};

// Elimina una galleria
export const deleteGallery = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Prima ottieni tutti i file associati per eliminarli
    const allPhotos = await db
      .select()
      .from(photos)
      .where(eq(photos.galleryId, Number(id)));

    // Elimina i file dal filesystem
    for (const photo of allPhotos) {
      try {
        // Elimina tutti i formati dell'immagine
        if (photo.path && fs.existsSync(photo.path)) fs.unlinkSync(photo.path);
        if (photo.thumbnailPath && fs.existsSync(photo.thumbnailPath)) fs.unlinkSync(photo.thumbnailPath);
        if (photo.mediumPath && fs.existsSync(photo.mediumPath)) fs.unlinkSync(photo.mediumPath);
        if (photo.largePath && fs.existsSync(photo.largePath)) fs.unlinkSync(photo.largePath);
        if (photo.webpPath && fs.existsSync(photo.webpPath)) fs.unlinkSync(photo.webpPath);
      } catch (err) {
        console.error(`Errore nell'eliminazione del file ${photo.filename}:`, err);
      }
    }

    // Elimina tutti i dati correlati (l'eliminazione a cascata gestirà le relazioni)
    await db.delete(galleries).where(eq(galleries.id, Number(id)));

    res.json({ success: true, message: "Galleria eliminata con successo" });
  } catch (error) {
    console.error("Errore nell'eliminazione della galleria:", error);
    res.status(500).json({ error: "Errore nell'eliminazione della galleria" });
  }
};

// GESTIONE CAPITOLI

// Ottieni tutti i capitoli di una galleria
export const getGalleryChapters = async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;

    const chapters = await db
      .select()
      .from(galleryChapters)
      .where(eq(galleryChapters.galleryId, Number(galleryId)))
      .orderBy(galleryChapters.sortOrder);

    res.json(chapters);
  } catch (error) {
    console.error("Errore nel recupero dei capitoli:", error);
    res.status(500).json({ error: "Errore nel recupero dei capitoli" });
  }
};

// Crea un nuovo capitolo
export const createChapter = async (req: Request, res: Response) => {
  try {
    const chapterData = insertGalleryChapterSchema.parse(req.body);

    // Genera uno slug basato sul titolo
    let slug = slugify(chapterData.title, { lower: true, strict: true });

    const [newChapter] = await db
      .insert(galleryChapters)
      .values({
        ...chapterData,
        slug,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json(newChapter);
  } catch (error) {
    console.error("Errore nella creazione del capitolo:", error);
    res.status(500).json({ error: "Errore nella creazione del capitolo" });
  }
};

// Elimina un capitolo
export const deleteChapter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.delete(galleryChapters).where(eq(galleryChapters.id, Number(id)));
    return result ? res.status(204).send() : res.status(404).json({ error: "Capitolo non trovato" });
  } catch (error) {
    console.error("Errore nell'eliminazione del capitolo:", error);
    return res.status(500).json({ error: "Errore nell'eliminazione del capitolo" });
  }
};

// GESTIONE FOTO

// Ottieni le foto di una galleria con supporto per paginazione
export const getGalleryPhotos = async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;
    const { chapter, page = 1, limit = 50, featured } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = db
      .select()
      .from(photos)
      .where(eq(photos.galleryId, Number(galleryId)));

    // Filtra per capitolo se specificato
    if (chapter) {
      query = query.where(eq(photos.chapterId, Number(chapter)));
    }

    // Filtra solo le foto in evidenza se richiesto
    if (featured === 'true') {
      query = query.where(eq(photos.isFeatured, true));
    }

    // Non mostrare le foto nascoste
    query = query.where(eq(photos.isHidden, false));

    // Ordina per posizione e poi per data di upload
    query = query.orderBy(photos.sortOrder, desc(photos.uploadedAt));

    // Applica paginazione
    query = query.limit(Number(limit)).offset(offset);

    const photoList = await query;

    // Ottieni il conteggio totale per la paginazione
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(photos)
      .where(eq(photos.galleryId, Number(galleryId)));

    // Aggiungi gli URL per le immagini
    const basePath = "/uploads";
    const photosWithUrls = photoList.map(p => ({
      ...p,
      url: `${basePath}/galleries/medium-${p.filename}`,
      thumbnailUrl: `${basePath}/galleries/thumbnails/thumb-${p.filename}`,
    }));

    res.json({
      photos: photosWithUrls,
      pagination: {
        total: Number(count),
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(Number(count) / Number(limit))
      }
    });
  } catch (error) {
    console.error("Errore nel recupero delle foto:", error);
    res.status(500).json({ error: "Errore nel recupero delle foto" });
  }
};

// Carica una foto
export const uploadPhoto = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nessun file caricato" });
    }

    const { galleryId, chapterId, title, caption, isFeatured } = req.body;

    // Genera un nome file unico
    const uniqueFilename = `${Date.now()}-${uuidv4()}${path.extname(req.file.originalname)}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);

    // Salva il file originale
    fs.writeFileSync(filePath, req.file.buffer);

    // Elabora l'immagine con sharp
    const metadata = await sharp(req.file.buffer).metadata();

    // Determina l'orientamento
    let orientation = 'landscape';
    if (metadata.width && metadata.height) {
      if (metadata.width < metadata.height) {
        orientation = 'portrait';
      } else if (metadata.width === metadata.height) {
        orientation = 'square';
      }
    }

    // Crea thumbnail
    const thumbnailFilename = `thumb-${uniqueFilename}`;
    const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFilename);
    await sharp(req.file.buffer)
      .resize({
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        fit: 'inside'
      })
      .toFile(thumbnailPath);

    // Crea versione media
    const mediumFilename = `medium-${uniqueFilename}`;
    const mediumPath = path.join(MEDIUM_DIR, mediumFilename);
    await sharp(req.file.buffer)
      .resize({
        width: MEDIUM_SIZE,
        height: MEDIUM_SIZE,
        fit: 'inside'
      })
      .toFile(mediumPath);

    // Crea versione grande
    const largeFilename = `large-${uniqueFilename}`;
    const largePath = path.join(LARGE_DIR, largeFilename);
    await sharp(req.file.buffer)
      .resize({
        width: LARGE_SIZE,
        height: LARGE_SIZE,
        fit: 'inside'
      })
      .toFile(largePath);

    // Crea versione WebP per browser moderni
    const webpFilename = `${path.parse(uniqueFilename).name}.webp`;
    const webpPath = path.join(WEBP_DIR, webpFilename);
    await sharp(req.file.buffer)
      .resize({
        width: MEDIUM_SIZE,
        height: MEDIUM_SIZE,
        fit: 'inside'
      })
      .webp({ quality: 80 })
      .toFile(webpPath);

    // Salva nel database
    const [photo] = await db.insert(photos).values({
      galleryId: Number(galleryId),
      chapterId: chapterId ? Number(chapterId) : null,
      filename: uniqueFilename,
      originalFilename: req.file.originalname,
      path: filePath,
      thumbnailPath,
      mediumPath,
      largePath,
      webpPath,
      size: req.file.size,
      width: metadata.width,
      height: metadata.height,
      mimeType: req.file.mimetype,
      title: title || null,
      caption: caption || null,
      isFeatured: isFeatured === 'true',
      uploadedAt: new Date(),
      uploadedBy: req.user?.id,
      orientation
    }).returning();

    res.status(201).json(photo);
  } catch (error) {
    console.error("Errore nel caricamento della foto:", error);
    res.status(500).json({ 
      error: "Errore nel caricamento della foto",
      details: error instanceof Error ? error.message : "Errore sconosciuto"
    });
  }
};

// Aggiorna i dettagli di una foto
export const updatePhoto = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, caption, isFeatured, isHidden, chapterId, sortOrder, tags } = req.body;

    const [updatedPhoto] = await db
      .update(photos)
      .set({
        title,
        caption,
        isFeatured: isFeatured === true || isFeatured === 'true',
        isHidden: isHidden === true || isHidden === 'true',
        chapterId: chapterId ? Number(chapterId) : null,
        sortOrder: sortOrder ? Number(sortOrder) : undefined,
        tags: tags ? JSON.parse(tags) : undefined
      })
      .where(eq(photos.id, Number(id)))
      .returning();

    if (!updatedPhoto) {
      return res.status(404).json({ error: "Foto non trovata" });
    }

    res.json(updatedPhoto);
  } catch (error) {
    console.error("Errore nell'aggiornamento della foto:", error);
    res.status(500).json({ error: "Errore nell'aggiornamento della foto" });
  }
};

// Elimina una foto
export const deletePhoto = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Prima recupera le informazioni della foto
    const [photo] = await db
      .select()
      .from(photos)
      .where(eq(photos.id, Number(id)));

    if (!photo) {
      return res.status(404).json({ error: "Foto non trovata" });
    }

    // Elimina i file dal filesystem
    try {
      if (photo.path && fs.existsSync(photo.path)) fs.unlinkSync(photo.path);
      if (photo.thumbnailPath && fs.existsSync(photo.thumbnailPath)) fs.unlinkSync(photo.thumbnailPath);
      if (photo.mediumPath && fs.existsSync(photo.mediumPath)) fs.unlinkSync(photo.mediumPath);
      if (photo.largePath && fs.existsSync(photo.largePath)) fs.unlinkSync(photo.largePath);
      if (photo.webpPath && fs.existsSync(photo.webpPath)) fs.unlinkSync(photo.webpPath);
    } catch (err) {
      console.error(`Errore nell'eliminazione del file ${photo.filename}:`, err);
    }

    // Elimina dal database
    await db.delete(photos).where(eq(photos.id, Number(id)));

    res.json({ success: true, message: "Foto eliminata con successo" });
  } catch (error) {
    console.error("Errore nell'eliminazione della foto:", error);
    res.status(500).json({ error: "Errore nell'eliminazione della foto" });
  }
};

// Genera QR code per una galleria
export const generateGalleryQRCode = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { size = 300 } = req.query;

    // Recupera lo slug della galleria
    const [gallery] = await db
      .select()
      .from(galleries)
      .where(eq(galleries.id, Number(id)));

    if (!gallery) {
      return res.status(404).json({ error: "Galleria non trovata" });
    }

    // URL della galleria
    const galleryUrl = `${req.protocol}://${req.get('host')}/gallery/${gallery.slug}`;

    // Nome del file QR
    const qrFilename = `gallery-${gallery.id}-qr.png`;
    const qrPath = path.join(QR_DIR, qrFilename);

    // Genera il QR code
    await QRCode.toFile(qrPath, galleryUrl, {
      width: Number(size),
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Invia il file
    res.sendFile(qrPath);
  } catch (error) {
    console.error("Errore nella generazione del QR code:", error);
    res.status(500).json({ error: "Errore nella generazione del QR code" });
  }
};

// GESTIONE SOTTOSCRIZIONI

// Sottoscrivi per aggiornamenti sulla galleria
export const subscribeToGallery = async (req: Request, res: Response) => {
  try {
    const subscriptionData = insertGallerySubscriptionSchema.parse(req.body);

    // Controlla se l'email è già sottoscritta
    const existingSubscription = await db
      .select()
      .from(gallerySubscriptions)
      .where(and(
        eq(gallerySubscriptions.galleryId, subscriptionData.galleryId),
        eq(gallerySubscriptions.email, subscriptionData.email)
      ));

    if (existingSubscription.length > 0) {
      return res.status(400).json({ error: "Questa email è già sottoscritta agli aggiornamenti" });
    }

    const [newSubscription] = await db
      .insert(gallerySubscriptions)
      .values({
        ...subscriptionData,
        token: uuidv4(),
        createdAt: new Date(),
        isConfirmed: false
      })
      .returning();

    // Qui si invierebbe un'email di conferma

    res.status(201).json({ success: true, message: "Sottoscrizione creata con successo" });
  } catch (error) {
    console.error("Errore nella creazione della sottoscrizione:", error);
    res.status(500).json({ error: "Errore nella creazione della sottoscrizione" });
  }
};

// GESTIONE SOCIAL SHARES

// Registra una condivisione sui social
export const trackSocialShare = async (req: Request, res: Response) => {
  try {
    const { galleryId, photoId, platform, tagged, postUrl } = req.body;

    // Ottieni informazioni sulla sessione / utente
    const sessionId = req.sessionID || uuidv4();
    const userId = req.user?.id;
    const clientId = req.body.clientId || null;

    const [socialShare] = await db
      .insert(socialShares)
      .values({
        galleryId: Number(galleryId),
        photoId: photoId ? Number(photoId) : null,
        platform,
        sharedBy: userId || null,
        clientId: clientId ? Number(clientId) : null,
        sessionId,
        sharedAt: new Date(),
        postUrl: postUrl || null,
        tagged: tagged === true || tagged === 'true',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer
      })
      .returning();

    res.status(201).json({ success: true, socialShare });
  } catch (error) {
    console.error("Errore nel tracciamento della condivisione social:", error);
    res.status(500).json({ error: "Errore nel tracciamento della condivisione social" });
  }
};

// SELEZIONI CLIENTI

// Seleziona o deseleziona una foto
export const togglePhotoSelection = async (req: Request, res: Response) => {
  try {
    const { photoId } = req.params;
    const { galleryId, selectionType, notes } = req.body;

    // Ottieni informazioni sulla sessione / utente
    const sessionId = req.sessionID || uuidv4();
    const clientId = req.user?.id || (req.body.clientId ? Number(req.body.clientId) : null);

    // Controlla se esiste già una selezione
    const existingSelection = await db
      .select()
      .from(photoSelections)
      .where(and(
        eq(photoSelections.photoId, Number(photoId)),
        eq(photoSelections.galleryId, Number(galleryId)),
        clientId ? eq(photoSelections.clientId, clientId) : eq(photoSelections.sessionId, sessionId)
      ));

    // Se esiste, aggiorna o elimina
    if (existingSelection.length > 0) {
      if (selectionType === 'none') {
        // Elimina la selezione
        await db
          .delete(photoSelections)
          .where(eq(photoSelections.id, existingSelection[0].id));

        return res.json({ success: true, action: 'removed' });
      } else {
        // Aggiorna il tipo di selezione
        const [updatedSelection] = await db
          .update(photoSelections)
          .set({
            selectionType,
            notes: notes || null
          })
          .where(eq(photoSelections.id, existingSelection[0].id))
          .returning();

        return res.json({ success: true, action: 'updated', selection: updatedSelection });
      }
    } else if (selectionType !== 'none') {
      // Crea una nuova selezione
      const [newSelection] = await db
        .insert(photoSelections)
        .values({
          photoId: Number(photoId),
          galleryId: Number(galleryId),
          clientId,
          sessionId: clientId ? null : sessionId,
          selectionType,
          notes: notes || null,
          createdAt: new Date()
        })
        .returning();

      return res.status(201).json({ success: true, action: 'added', selection: newSelection });
    }

    res.json({ success: true, action: 'none' });
  } catch (error) {
    console.error("Errore nella gestione della selezione:", error);
    res.status(500).json({ error: "Errore nella gestione della selezione" });
  }
};

// Ottieni tutte le selezioni di un cliente per una galleria
export const getClientSelections = async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;

    // Ottieni informazioni sulla sessione / utente
    const sessionId = req.sessionID;
    const clientId = req.user?.id || (req.query.clientId ? Number(req.query.clientId) : null);

    let query = db
      .select()
      .from(photoSelections)
      .where(eq(photoSelections.galleryId, Number(galleryId)));

    if (clientId) {
      query = query.where(eq(photoSelections.clientId, clientId));
    } else if (sessionId) {
      query = query.where(eq(photoSelections.sessionId, sessionId));
    } else {
      return res.status(400).json({ error: "È necessario un ID cliente o una sessione" });
    }

    const selections = await query;

    res.json(selections);
  } catch (error) {
    console.error("Errore nel recupero delle selezioni:", error);
    res.status(500).json({ error: "Errore nel recupero delle selezioni" });
  }
};