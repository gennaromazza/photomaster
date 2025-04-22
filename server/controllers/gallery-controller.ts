import { Request, Response } from "express";
import { db } from "../db";
import { 
  galleries, insertGallerySchema, galleryChapters, insertGalleryChapterSchema,
  photos, insertPhotoSchema, photoSelections, gallerySubscriptions, insertGallerySubscriptionSchema,
  socialShares, insertSocialShareSchema, photoLikes, photoComments,
  galleryVideos, insertGalleryVideoSchema
} from "../../schema_gallery";
import { eq, and, desc, sql, inArray, isNull, isNotNull } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import archiver from "archiver";
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

// Configurazioni di compressione
const COMPRESSION_QUALITY = {
  jpeg: 85,    // Qualità JPEG (0-100)
  webp: 80,    // Qualità WebP (0-100)
  png: 9       // Livello di compressione PNG (0-9)
};

// Impostazioni per dimensioni massime
const MAX_IMAGE_DIMENSIONS = {
  width: 2500,
  height: 2500
};

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
    
    // Verifica sessione e accesso
    console.log(`DEBUG getGalleryBySlug - Gallery ID: ${gallery.id}, Require password: ${!!gallery.password}`);
    console.log(`DEBUG getGalleryBySlug - Session access: ${req.session?.galleryAccess?.[gallery.id] ? 'Sì' : 'No'}`);
    
    // Se la galleria richiede password e l'utente non è autorizzato
    if (gallery.password && !req.query.token && !req.session?.galleryAccess?.[gallery.id]) {
      console.log(`DEBUG getGalleryBySlug - Accesso limitato, password richiesta`);
      // Restituisci solo informazioni di base senza contenuti
      return res.json({
        id: gallery.id,
        name: gallery.name,
        slug: gallery.slug,
        requiresPassword: true,
        coverImage: gallery.coverImage,
        description: gallery.description,
        passwordRequired: true  // Flag esplicito per il frontend
      });
    }

    console.log(`DEBUG getGalleryBySlug - Accesso completo alla galleria`);
    
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
      requiresPassword: false,
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

    // Prepariamo i dati per la galleria
    let password = null;
    
    // Se la galleria è protetta da password, prepariamo il valore della password (con hash se fornita)
    if (req.body.isPasswordProtected === 'true' || req.body.isPasswordProtected === true) {
      if (req.body.password) {
        try {
          // Hashiamo la password
          const bcrypt = require('bcrypt');
          password = await bcrypt.hash(req.body.password, 12);
          console.log("Password hashata con successo");
        } catch (hashError) {
          console.error("Errore durante l'hash della password:", hashError);
          // Fallback alla password in chiaro in caso di errore
          password = req.body.password;
        }
      }
    }
    
    // Creiamo un oggetto con i dati del form
    const galleryData: any = {
      name: req.body.name,
      description: req.body.description || null,
      isPublic: req.body.isPublic === 'true' || req.body.isPublic === true,
      password: password,
      eventId: req.body.eventId && req.body.eventId !== "0" ? parseInt(req.body.eventId, 10) : null,
      viewCount: 0,
      userId: req.user.id, // Assicuriamoci che l'userId sia incluso
    };

    // Verifica che l'immagine di copertina sia presente
    if (!req.file) {
      return res.status(400).json({ error: "Immagine di copertina mancante" });
    }
    
    // Elaborazione dell'immagine di copertina
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
    let baseSlug = slugify(galleryData.name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    
    // Verifica l'unicità dello slug in modo iterativo
    while ((await db.select().from(galleries).where(eq(galleries.slug, slug))).length > 0) {
      slug = `${baseSlug}-${counter++}`;
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

// Aggiorna una galleria - senza validazione Zod per permettere aggiornamenti parziali
export const updateGallery = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Gestione della password con hash se necessario
    let passwordField = {};
    if (req.body.password !== undefined) {
      // Se la password è una stringa vuota, la salviamo come null
      if (!req.body.password) {
        passwordField = { password: null };
      } 
      // Altrimenti hashiamo la password se necessario
      else {
        try {
          const bcrypt = require('bcrypt');
          // Controlla se la password è già hashata (inizia con $2b$)
          if (!req.body.password.startsWith('$2b$')) {
            const hashedPassword = await bcrypt.hash(req.body.password, 12);
            passwordField = { password: hashedPassword };
          } else {
            // La password è già hashata, la manteniamo così com'è
            passwordField = { password: req.body.password };
          }
        } catch (hashError) {
          console.error("Errore durante l'hash della password:", hashError);
          // Fallback alla password in chiaro
          passwordField = { password: req.body.password };
        }
      }
    }

    // Ottieni i campi aggiornabili dalla richiesta
    const galleryData = {
      ...req.body,
      ...passwordField, // Aggiungiamo il campo password elaborato
      // Se c'è una data di scadenza in formato stringa, convertiamola in Date
      ...(req.body.expiryDate && typeof req.body.expiryDate === 'string' 
        ? { expiryDate: new Date(req.body.expiryDate) } 
        : {}),
      updatedAt: new Date()
    };

    // Elimina campi che potrebbero causare problemi
    delete galleryData.id;
    delete galleryData.createdAt;

    // Verifica che la galleria esista prima dell'aggiornamento
    const existingGallery = await db
      .select()
      .from(galleries)
      .where(eq(galleries.id, Number(id)))
      .limit(1);

    if (existingGallery.length === 0) {
      return res.status(404).json({ error: "Galleria non trovata" });
    }

    // Aggiorna la galleria
    const [updatedGallery] = await db
      .update(galleries)
      .set(galleryData)
      .where(eq(galleries.id, Number(id)))
      .returning();

    res.json(updatedGallery);
  } catch (error) {
    console.error("Errore nell'aggiornamento della galleria:", error);
    if (error instanceof Error) {
      res.status(500).json({ error: `Errore nell'aggiornamento della galleria: ${error.message}` });
    } else {
      res.status(500).json({ error: "Errore nell'aggiornamento della galleria" });
    }
  }
};

// Elimina una galleria
export const deleteGallery = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const galleryId = Number(id);

    // Verifica che la galleria esista
    const [gallery] = await db.select().from(galleries).where(eq(galleries.id, galleryId));
    if (!gallery) {
      return res.status(404).json({ error: "Galleria non trovata" });
    }

    // Recupera tutte le foto associate
    const allPhotos = await db
      .select()
      .from(photos)
      .where(eq(photos.galleryId, galleryId));

    console.log(`Eliminazione galleria ${galleryId}: trovate ${allPhotos.length} foto da eliminare`);

    // Elimina i file dal filesystem
    for (const photo of allPhotos) {
      try {
        // Elimina tutti i formati dell'immagine
        if (photo.path && fs.existsSync(photo.path)) {
          fs.unlinkSync(photo.path);
          console.log(`File eliminato: ${photo.path}`);
        }
        if (photo.thumbnailPath && fs.existsSync(photo.thumbnailPath)) {
          fs.unlinkSync(photo.thumbnailPath);
          console.log(`Thumbnail eliminata: ${photo.thumbnailPath}`);
        }
        if (photo.mediumPath && fs.existsSync(photo.mediumPath)) {
          fs.unlinkSync(photo.mediumPath);
          console.log(`Medium eliminata: ${photo.mediumPath}`);
        }
        if (photo.largePath && fs.existsSync(photo.largePath)) {
          fs.unlinkSync(photo.largePath);
          console.log(`Large eliminata: ${photo.largePath}`);
        }
        if (photo.webpPath && fs.existsSync(photo.webpPath)) {
          fs.unlinkSync(photo.webpPath);
          console.log(`WebP eliminata: ${photo.webpPath}`);
        }
      } catch (err) {
        console.error(`Errore nell'eliminazione del file ${photo.filename}:`, err);
      }
    }

    // Elimina tutti i dati correlati (a cascata)
    console.log(`Eliminazione dati dal database per galleria ${galleryId}`);

    // Elimina selezioni di foto
    await db.delete(photoSelections)
      .where(eq(photoSelections.galleryId, galleryId));
    
    // Elimina like e commenti
    for (const photo of allPhotos) {
      await db.delete(photoLikes)
        .where(eq(photoLikes.photoId, photo.id));
      await db.delete(photoComments)
        .where(eq(photoComments.photoId, photo.id));
    }
    
    // Elimina iscrizioni e condivisioni
    await db.delete(gallerySubscriptions)
      .where(eq(gallerySubscriptions.galleryId, galleryId));
    await db.delete(socialShares)
      .where(eq(socialShares.galleryId, galleryId));
    
    // Elimina le foto
    await db.delete(photos)
      .where(eq(photos.galleryId, galleryId));
    
    // Elimina i capitoli
    await db.delete(galleryChapters)
      .where(eq(galleryChapters.galleryId, galleryId));
    
    // Infine elimina la galleria
    await db.delete(galleries)
      .where(eq(galleries.id, galleryId));

    console.log(`Galleria ${galleryId} eliminata con successo`);
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

// Ottieni un capitolo per ID
export const getChapterById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [chapter] = await db
      .select()
      .from(galleryChapters)
      .where(eq(galleryChapters.id, Number(id)));
    
    if (!chapter) {
      return res.status(404).json({ error: "Capitolo non trovato" });
    }
    
    res.json(chapter);
  } catch (error) {
    console.error("Errore nel recupero del capitolo:", error);
    res.status(500).json({ error: "Errore nel recupero del capitolo" });
  }
};

// Aggiorna un capitolo
export const updateChapter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const chapterData = req.body;
    
    // Verifica che il capitolo esista
    const [existingChapter] = await db
      .select()
      .from(galleryChapters)
      .where(eq(galleryChapters.id, Number(id)));
    
    if (!existingChapter) {
      return res.status(404).json({ error: "Capitolo non trovato" });
    }
    
    // Aggiorna il capitolo
    const [updatedChapter] = await db
      .update(galleryChapters)
      .set({
        ...chapterData,
        updatedAt: new Date(),
      })
      .where(eq(galleryChapters.id, Number(id)))
      .returning();
    
    res.json(updatedChapter);
  } catch (error) {
    console.error("Errore nell'aggiornamento del capitolo:", error);
    res.status(500).json({ error: "Errore nell'aggiornamento del capitolo" });
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

    // Percorso base per tutti gli URL
    const baseWebPath = "/uploads/galleries";

    // Aggiungi gli URL per le immagini, normalizzando tutti i percorsi
    const photosWithUrls = photoList.map((p: typeof photos.$inferSelect) => {
      // Estrai solo il nome del file da ogni percorso
      const filename = p.filename;
      const webpFilename = p.webpPath ? path.basename(p.webpPath) : null;

      // Crea URL coerenti con la struttura delle directory
      return {
        ...p,
        // URLs per il frontend
        url: `${baseWebPath}/medium/${filename}`,
        thumbnailUrl: `${baseWebPath}/thumbnails/${filename}`,
        largeUrl: `${baseWebPath}/large/${filename}`,
        webpUrl: webpFilename ? `${baseWebPath}/webp/${webpFilename}` : null,
        originalUrl: `${baseWebPath}/${filename}`,
      };
    });

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

    // Forza chapterId a number o null con validazione
    const formattedChapterId = chapterId && !isNaN(Number(chapterId)) ? Number(chapterId) : null;
    
    // Verifica se esiste già un file con lo stesso nome nella galleria
    const existingPhoto = await db
      .select()
      .from(photos)
      .where(eq(photos.galleryId, Number(galleryId)))
      .where(eq(photos.originalFilename, req.file.originalname))
      .limit(1);
      
    if (existingPhoto.length > 0) {
      return res.status(409).json({
        error: "File duplicato",
        message: `Un'immagine con il nome "${req.file.originalname}" è già presente in questa galleria.`
      });
    }

    // Genera un nome file unico senza estensione duplicata (alcuni browser inviano .jpg.jpg)
    const cleanOriginalName = req.file.originalname.replace(/\.+/g, '.').toLowerCase();
    const extension = path.extname(cleanOriginalName);
    const timestamp = Date.now();
    const uuid = uuidv4();
    const uniqueFilename = `${timestamp}-${uuid}${extension}`;

    // Definisci i percorsi assoluti per il filesystem
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);
    const thumbnailPath = path.join(THUMBNAILS_DIR, uniqueFilename);
    const mediumPath = path.join(MEDIUM_DIR, uniqueFilename);
    const largePath = path.join(LARGE_DIR, uniqueFilename);
    const webpFilename = `${timestamp}-${uuid}.webp`;
    const webpPath = path.join(WEBP_DIR, webpFilename);

    // Validazione formato
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: "Formato non supportato",
        message: 'Formato file non supportato. Sono consentiti solo JPEG, JPG, PNG e WebP.'
      });
    }
    
    // Controllo dimensione massima del file (20MB)
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: "File troppo grande",
        message: `Il file supera la dimensione massima consentita di ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
      });
    }

    console.log("Caricamento foto con percorsi:", {
      filePath,
      thumbnailPath,
      mediumPath,
      largePath,
      webpPath
    });

    // Assicurati che le directory esistano
    [UPLOAD_DIR, THUMBNAILS_DIR, MEDIUM_DIR, LARGE_DIR, WEBP_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Salva il file originale in modo sicuro
    await fs.promises.writeFile(filePath, req.file.buffer);

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

    try {
      // Limita le dimensioni massime se necessario
      let imageBuffer = req.file.buffer;
      
      // Ottieni le dimensioni dell'immagine
      const metadata = await sharp(imageBuffer).metadata();
      
      // Se l'immagine è più grande delle dimensioni massime consentite, ridimensionala prima di elaborarla
      if (metadata.width && metadata.height && 
          (metadata.width > MAX_IMAGE_DIMENSIONS.width || metadata.height > MAX_IMAGE_DIMENSIONS.height)) {
        imageBuffer = await sharp(imageBuffer)
          .resize({
            width: MAX_IMAGE_DIMENSIONS.width,
            height: MAX_IMAGE_DIMENSIONS.height,
            fit: 'inside',
            withoutEnlargement: true
          })
          .toBuffer();
      }
      
      // Determina il formato di output in base al formato di input
      const isJpg = metadata.format === 'jpeg' || metadata.format === 'jpg';
      const isPng = metadata.format === 'png';
      
      // Ottimizza l'immagine in base al formato
      
      // Crea thumbnail (sempre ottimizzata)
      await sharp(imageBuffer)
        .resize({
          width: THUMBNAIL_SIZE,
          height: THUMBNAIL_SIZE,
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ 
          quality: COMPRESSION_QUALITY.jpeg, 
          mozjpeg: true,     // Usa mozjpeg per una migliore compressione
          progressive: true  // JPEG progressivo carica meglio sul web
        })
        .toFile(thumbnailPath);

      // Crea versione media
      if (isJpg) {
        await sharp(imageBuffer)
          .resize({
            width: MEDIUM_SIZE,
            height: MEDIUM_SIZE,
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ 
            quality: COMPRESSION_QUALITY.jpeg, 
            mozjpeg: true,
            progressive: true
          })
          .toFile(mediumPath);
      } else if (isPng) {
        await sharp(imageBuffer)
          .resize({
            width: MEDIUM_SIZE,
            height: MEDIUM_SIZE,
            fit: 'inside',
            withoutEnlargement: true
          })
          .png({ 
            compressionLevel: COMPRESSION_QUALITY.png,
            adaptiveFiltering: true  // Filtraggio adattivo per una migliore compressione
          })
          .toFile(mediumPath);
      } else {
        // Per altri formati, usa la compressione predefinita
        await sharp(imageBuffer)
          .resize({
            width: MEDIUM_SIZE,
            height: MEDIUM_SIZE,
            fit: 'inside',
            withoutEnlargement: true
          })
          .toFile(mediumPath);
      }

      // Crea versione grande con le stesse ottimizzazioni
      if (isJpg) {
        await sharp(imageBuffer)
          .resize({
            width: LARGE_SIZE,
            height: LARGE_SIZE,
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ 
            quality: COMPRESSION_QUALITY.jpeg, 
            mozjpeg: true,
            progressive: true
          })
          .toFile(largePath);
      } else if (isPng) {
        await sharp(imageBuffer)
          .resize({
            width: LARGE_SIZE,
            height: LARGE_SIZE,
            fit: 'inside',
            withoutEnlargement: true
          })
          .png({ 
            compressionLevel: COMPRESSION_QUALITY.png,
            adaptiveFiltering: true
          })
          .toFile(largePath);
      } else {
        await sharp(imageBuffer)
          .resize({
            width: LARGE_SIZE,
            height: LARGE_SIZE,
            fit: 'inside',
            withoutEnlargement: true
          })
          .toFile(largePath);
      }

      // Crea versione WebP per browser moderni (sempre ottimizzata)
      await sharp(imageBuffer)
        .resize({
          width: MEDIUM_SIZE,
          height: MEDIUM_SIZE,
          fit: 'inside',
            withoutEnlargement: true
        })
        .webp({ 
          quality: COMPRESSION_QUALITY.webp,
          lossless: false,  // La modalità con perdita è più efficiente per le foto
          nearLossless: false,
          smartSubsample: true  // Migliora la compressione delle aree colorate
        })
        .toFile(webpPath);
    } catch (err) {
      console.error("Errore nell'elaborazione dell'immagine con sharp:", err);
      throw new Error(`Errore nell'elaborazione dell'immagine: ${err instanceof Error ? err.message : 'sconosciuto'}`);
    }

    // Crea URL relativi per il frontend
    const baseWebPath = "/uploads/galleries";
    const relativeURLs = {
      original: `${baseWebPath}/${uniqueFilename}`,
      thumbnail: `${baseWebPath}/thumbnails/${uniqueFilename}`,
      medium: `${baseWebPath}/medium/${uniqueFilename}`,
      large: `${baseWebPath}/large/${uniqueFilename}`,
      webp: `${baseWebPath}/webp/${webpFilename}`
    };

    console.log("URL relativi creati:", relativeURLs);

    // Salva nel database
    const [photo] = await db.insert(photos).values({
      galleryId: Number(galleryId),
      chapterId: formattedChapterId,
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

    // Aggiungi gli URL per facilitare il rendering nel frontend
    const photoWithUrls = {
      ...photo,
      url: relativeURLs.medium,
      thumbnailUrl: relativeURLs.thumbnail,
      largeUrl: relativeURLs.large,
      webpUrl: relativeURLs.webp,
      originalUrl: relativeURLs.original
    };

    res.status(201).json(photoWithUrls);
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

    // Gestisci correttamente chapterId, permettendo di impostarlo su null
    let chapterIdValue = undefined;
    if (chapterId === null || chapterId === 'null') {
      chapterIdValue = null;
    } else if (chapterId !== undefined) {
      chapterIdValue = Number(chapterId);
    }

    console.log(`Aggiornamento foto ${id} con chapterId:`, chapterIdValue);
    
    const updateData = {
      ...(title !== undefined ? { title } : {}),
      ...(caption !== undefined ? { caption } : {}),
      ...(isFeatured !== undefined ? { isFeatured: isFeatured === true || isFeatured === 'true' } : {}),
      ...(isHidden !== undefined ? { isHidden: isHidden === true || isHidden === 'true' } : {}),
      ...(chapterId !== undefined ? { chapterId: chapterIdValue } : {}),
      ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
      ...(tags !== undefined ? { tags: typeof tags === 'string' ? JSON.parse(tags) : tags } : {})
    };
    
    console.log('Dati aggiornamento:', updateData);

    const [updatedPhoto] = await db
      .update(photos)
      .set(updateData)
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
    const galleryUrl = `${req.protocol}://${req.get('host')}/public/galleries/${gallery.slug}`;

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

// GESTIONE DELLA COMPRESSIONE IMMAGINI

// Ricomprimi le immagini esistenti
export const recompressGalleryImages = async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;
    const { quality, mode = 'all' } = req.body;

    // Verifica permessi utente
    if (!req.user?.id) {
      return res.status(401).json({ error: "Non autorizzato" });
    }

    // Ottieni le foto della galleria
    const photoList = await db
      .select()
      .from(photos)
      .where(eq(photos.galleryId, Number(galleryId)));

    if (photoList.length === 0) {
      return res.status(404).json({ error: "Nessuna foto trovata" });
    }

    // Configura la qualità della compressione
    const compressionSettings = {
      jpeg: quality && Number(quality) >= 0 && Number(quality) <= 100 ? Number(quality) : COMPRESSION_QUALITY.jpeg,
      webp: quality && Number(quality) >= 0 && Number(quality) <= 100 ? Number(quality) : COMPRESSION_QUALITY.webp,
      png: quality && Number(quality) >= 0 && Number(quality) <= 9 ? Number(quality) : COMPRESSION_QUALITY.png
    };

    // Stati elaborazione
    const stats = {
      total: photoList.length,
      processed: 0,
      success: 0,
      errors: 0,
      details: []
    };

    // Ricomprime ogni immagine
    for (const photo of photoList) {
      try {
        stats.processed++;

        if (!photo.path || !fs.existsSync(photo.path)) {
          stats.errors++;
          stats.details.push({ id: photo.id, error: "File originale non trovato" });
          continue;
        }

        // Leggi il file originale
        const imageBuffer = fs.readFileSync(photo.path);
        
        // Ottieni metadati
        const metadata = await sharp(imageBuffer).metadata();
        const isJpg = metadata.format === 'jpeg' || metadata.format === 'jpg';
        const isPng = metadata.format === 'png';

        // Processa in base alla modalità selezionata
        if (mode === 'all' || mode === 'thumbnails') {
          // Ricomprimi thumbnail
          await sharp(imageBuffer)
            .resize({
              width: THUMBNAIL_SIZE,
              height: THUMBNAIL_SIZE,
              fit: 'inside',
            withoutEnlargement: true
            })
            .jpeg({ 
              quality: compressionSettings.jpeg, 
              mozjpeg: true,
              progressive: true
            })
            .toFile(photo.thumbnailPath);
        }

        if (mode === 'all' || mode === 'medium') {
          // Ricomprimi versione media
          if (isJpg) {
            await sharp(imageBuffer)
              .resize({
                width: MEDIUM_SIZE,
                height: MEDIUM_SIZE,
                fit: 'inside',
            withoutEnlargement: true
              })
              .jpeg({ 
                quality: compressionSettings.jpeg, 
                mozjpeg: true,
                progressive: true
              })
              .toFile(photo.mediumPath);
          } else if (isPng) {
            await sharp(imageBuffer)
              .resize({
                width: MEDIUM_SIZE,
                height: MEDIUM_SIZE,
                fit: 'inside',
            withoutEnlargement: true
              })
              .png({ 
                compressionLevel: compressionSettings.png,
                adaptiveFiltering: true
              })
              .toFile(photo.mediumPath);
          } else {
            await sharp(imageBuffer)
              .resize({
                width: MEDIUM_SIZE,
                height: MEDIUM_SIZE,
                fit: 'inside',
            withoutEnlargement: true
              })
              .toFile(photo.mediumPath);
          }
        }

        if (mode === 'all' || mode === 'large') {
          // Ricomprimi versione grande
          if (isJpg) {
            await sharp(imageBuffer)
              .resize({
                width: LARGE_SIZE,
                height: LARGE_SIZE,
                fit: 'inside',
            withoutEnlargement: true
              })
              .jpeg({ 
                quality: compressionSettings.jpeg, 
                mozjpeg: true,
                progressive: true
              })
              .toFile(photo.largePath);
          } else if (isPng) {
            await sharp(imageBuffer)
              .resize({
                width: LARGE_SIZE,
                height: LARGE_SIZE,
                fit: 'inside',
            withoutEnlargement: true
              })
              .png({ 
                compressionLevel: compressionSettings.png,
                adaptiveFiltering: true
              })
              .toFile(photo.largePath);
          } else {
            await sharp(imageBuffer)
              .resize({
                width: LARGE_SIZE,
                height: LARGE_SIZE,
                fit: 'inside',
            withoutEnlargement: true
              })
              .toFile(photo.largePath);
          }
        }

        if (mode === 'all' || mode === 'webp') {
          // Genera o aggiorna la versione WebP
          const webpFilename = path.basename(photo.path, path.extname(photo.path)) + ".webp";
          const webpPath = path.join(WEBP_DIR, webpFilename);
          
          await sharp(imageBuffer)
            .resize({
              width: MEDIUM_SIZE,
              height: MEDIUM_SIZE,
              fit: 'inside',
            withoutEnlargement: true
            })
            .webp({ 
              quality: compressionSettings.webp,
              lossless: false,
              nearLossless: false,
              smartSubsample: true
            })
            .toFile(webpPath);
            
          // Aggiorna il percorso WebP nel database se necessario
          if (!photo.webpPath || photo.webpPath !== webpPath) {
            await db.update(photos)
              .set({ webpPath })
              .where(eq(photos.id, photo.id));
          }
        }

        stats.success++;
      } catch (error) {
        console.error(`Errore nella ricompressione della foto ${photo.id}:`, error);
        stats.errors++;
        stats.details.push({ 
          id: photo.id, 
          error: error instanceof Error ? error.message : "Errore sconosciuto" 
        });
      }
    }

    res.json({
      message: `Elaborazione completata. ${stats.success} immagini ricompresse su ${stats.total}.`,
      stats
    });
  } catch (error) {
    console.error("Errore nella ricompressione delle immagini:", error);
    res.status(500).json({ 
      error: "Errore nella ricompressione delle immagini", 
      details: error instanceof Error ? error.message : "Errore sconosciuto" 
    });
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
    const { galleryId, selectionType, notes, clientEmail, clientName } = req.body;

    // Ottieni informazioni sulla sessione / utente
    const sessionId = req.sessionID || uuidv4();

    // Controlla se è fornito un ID cliente tramite body
    const clientId = req.user?.id || (req.body.clientId ? Number(req.body.clientId) : null);

    // Raccoglie dati di contatto del cliente se forniti
    let contactInfo = {};
    if (clientEmail || clientName) {
      contactInfo = {
        clientEmail: clientEmail || null,
        clientName: clientName || null
      };
    }

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
            notes: notes || null,
            ...contactInfo
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
          ...contactInfo,
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

// Salva le selezioni foto tutte insieme
export const createPhotoSelections = async (req: Request, res: Response) => {
  try {
    const { galleryId, photoIds, clientName, clientEmail, sessionId, selectionType = "favorite", notes } = req.body;

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: "Nessuna foto selezionata", message: "È necessario selezionare almeno una foto" });
    }

    if (!galleryId) {
      return res.status(400).json({ error: "ID galleria mancante" });
    }

    // Ottieni informazioni sulla sessione / utente
    const actualSessionId = sessionId || req.sessionID || uuidv4();

    // Controlla se è fornito un ID cliente tramite body o tramite l'utente loggato
    const clientId = req.user?.id || (req.body.clientId ? Number(req.body.clientId) : null);

    // Preparare i dati per l'inserimento
    const insertData = photoIds.map(photoId => ({
      photoId: Number(photoId),
      galleryId: Number(galleryId),
      clientId,
      sessionId: clientId ? null : actualSessionId,
      clientEmail: clientEmail || null,
      clientName: clientName || null,
      selectionType,
      notes: notes || null,
      createdAt: new Date()
    }));

    // Elimina eventuali selezioni esistenti
    await db
      .delete(photoSelections)
      .where(and(
        eq(photoSelections.galleryId, Number(galleryId)),
        clientId ? eq(photoSelections.clientId, clientId) : eq(photoSelections.sessionId, actualSessionId)
      ));

    // Inserisci le nuove selezioni
    const insertedSelections = await db
      .insert(photoSelections)
      .values(insertData)
      .returning();

    res.status(201).json({ 
      success: true, 
      message: `${insertedSelections.length} selezioni salvate con successo`,
      selections: insertedSelections 
    });
  } catch (error) {
    console.error("Errore nel salvataggio delle selezioni:", error);
    res.status(500).json({ error: "Errore nel salvataggio delle selezioni" });
  }
};

// Download di una singola foto
export async function downloadPhoto(req: Request, res: Response) {
  const photoId = Number(req.params.id);
  const quality = req.query.quality as string || 'large'; // Opzioni: original, large, medium, thumbnail
  
  try {
    // Ottieni la foto con la relativa galleria per controllare i permessi
    const photo = await db.query.photos.findFirst({
      where: eq(photos.id, photoId),
      with: {
        gallery: true
      }
    });
    
    if (!photo) {
      return res.status(404).json({ error: "Foto non trovata" });
    }
    
    // Verifica che il download sia abilitato per questa galleria
    if (!photo.gallery.downloadEnabled) {
      return res.status(403).json({ error: "Download non consentito per questa galleria" });
    }

    // Determina quale versione dell'immagine usare in base alla qualità richiesta
    let filePath = '';
    
    switch (quality) {
      case 'original':
        filePath = photo.path;
        break;
      case 'large':
        filePath = photo.largePath || photo.path;
        break;
      case 'medium':
        filePath = photo.mediumPath || photo.largePath || photo.path;
        break;
      case 'thumbnail':
        filePath = photo.thumbnailPath || photo.mediumPath || photo.path;
        break;
      default:
        filePath = photo.largePath || photo.path;
    }
    
    console.log(`Download foto con qualità: ${quality}, percorso selezionato: ${filePath}`);
    
    // Se il percorso è già assoluto (contiene workspace), usiamo direttamente quello
    if (filePath.includes('/home/runner/workspace/')) {
      // Usa direttamente il percorso assoluto
      console.log(`Tentativo di download - Usando percorso assoluto: ${filePath}`);
    } 
    // Se il percorso inizia con /uploads, costruisci un percorso completo
    else if (filePath.startsWith('/uploads/')) {
      filePath = path.join(process.cwd(), filePath);
      console.log(`Tentativo di download - Costruito percorso da relativo: ${filePath}`);
    }
    // Altrimenti, assumiamo che sia un percorso relativo dentro uploads
    else {
      filePath = path.join(process.cwd(), 'uploads', filePath);
      console.log(`Tentativo di download - Costruito percorso da relativo semplice: ${filePath}`);
    }
    
    if (!fs.existsSync(filePath)) {
      console.error(`File non trovato: ${filePath}`);
      return res.status(404).json({ error: "File non trovato" });
    }
    
    // Imposta gli header per il download
    res.setHeader('Content-Disposition', `attachment; filename="${photo.originalFilename}"`);
    res.setHeader('Content-Type', photo.mimeType);
    
    // Invia il file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Errore nel download della foto:', error);
    res.status(500).json({ error: "Errore durante il download" });
  }
}

// Download di tutte le foto di una galleria o di un capitolo
// GESTIONE VIDEO

// Aggiungi un nuovo video alla galleria
export const addGalleryVideo = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Utente non autorizzato" });
    }

    const { galleryId } = req.params;
    
    // Valida i dati del video
    const videoData = {
      ...req.body,
      galleryId: Number(galleryId),
      addedBy: req.user.id,
      // Converti il chapterId in numero se presente
      chapterId: req.body.chapterId ? Number(req.body.chapterId) : null,
    };

    // Se è fornita un'immagine di anteprima, salviamola
    if (req.file) {
      try {
        // Genera un nome file unico per la thumbnail
        const uniqueFilename = `video-thumb-${Date.now()}-${uuidv4().substring(0, 8)}${path.extname(req.file.originalname)}`;
        const filePath = path.join(THUMBNAILS_DIR, uniqueFilename);

        // Salva il file
        fs.writeFileSync(filePath, req.file.buffer);

        // Aggiungi il percorso alla thumbnail (usa slash per URL)
        videoData.thumbnailPath = `/uploads/galleries/thumbnails/${uniqueFilename}`;
      } catch (fileError) {
        console.error("Errore nel salvataggio della thumbnail del video:", fileError);
      }
    }

    // Per video di YouTube o Vimeo, recupera la thumbnail se non è stata caricata
    if ((videoData.videoType === 'youtube' || videoData.videoType === 'vimeo') && 
        videoData.videoId && !videoData.thumbnailUrl && !videoData.thumbnailPath) {
      if (videoData.videoType === 'youtube') {
        videoData.thumbnailUrl = `https://img.youtube.com/vi/${videoData.videoId}/maxresdefault.jpg`;
      } else if (videoData.videoType === 'vimeo') {
        // Nota: per Vimeo sarebbe necessario chiamare l'API per ottenere la thumbnail
        // Qui impostiamo un placeholder
        videoData.thumbnailUrl = null;
      }
    }

    // Salva il video nel database
    const [newVideo] = await db
      .insert(galleryVideos)
      .values(videoData)
      .returning();

    res.status(201).json(newVideo);
  } catch (error) {
    console.error("Errore nell'aggiunta del video alla galleria:", error);
    if (error instanceof Error) {
      res.status(500).json({ error: `Errore nell'aggiunta del video: ${error.message}` });
    } else {
      res.status(500).json({ error: "Errore nell'aggiunta del video" });
    }
  }
};

// Ottieni tutti i video di una galleria
export const getGalleryVideos = async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;
    const { chapterId } = req.query;

    let query = db
      .select()
      .from(galleryVideos)
      .where(eq(galleryVideos.galleryId, Number(galleryId)))
      .orderBy(galleryVideos.sortOrder);

    // Se è specificato un capitolo, filtra per quel capitolo
    if (chapterId) {
      query = query.where(eq(galleryVideos.chapterId, Number(chapterId)));
    }

    const videos = await query;

    res.json({ videos });
  } catch (error) {
    console.error("Errore nel recupero dei video:", error);
    res.status(500).json({ error: "Errore nel recupero dei video" });
  }
};

// Aggiorna un video
export const updateGalleryVideo = async (req: Request, res: Response) => {
  try {
    const { galleryId, videoId } = req.params;

    // Verifica che il video esista prima dell'aggiornamento
    const existingVideo = await db
      .select()
      .from(galleryVideos)
      .where(and(
        eq(galleryVideos.id, Number(videoId)),
        eq(galleryVideos.galleryId, Number(galleryId))
      ))
      .limit(1);

    if (existingVideo.length === 0) {
      return res.status(404).json({ error: "Video non trovato" });
    }

    // Gestisci l'upload della thumbnail se presente
    let thumbnailData = {};
    if (req.file) {
      try {
        // Genera un nome file unico per la thumbnail
        const uniqueFilename = `video-thumb-${Date.now()}-${uuidv4().substring(0, 8)}${path.extname(req.file.originalname)}`;
        const filePath = path.join(THUMBNAILS_DIR, uniqueFilename);

        // Salva il file
        fs.writeFileSync(filePath, req.file.buffer);

        // Aggiungi il percorso alla thumbnail
        thumbnailData = { 
          thumbnailPath: `/uploads/galleries/thumbnails/${uniqueFilename}`,
          thumbnailUrl: null // Azzeriamo l'URL esterno se carichiamo un'immagine
        };
      } catch (fileError) {
        console.error("Errore nel salvataggio della thumbnail del video:", fileError);
      }
    }

    // Aggiorna il video
    const [updatedVideo] = await db
      .update(galleryVideos)
      .set({
        ...req.body,
        ...thumbnailData,
        // Converti il chapterId in numero se presente, altrimenti null
        chapterId: req.body.chapterId ? Number(req.body.chapterId) : null,
      })
      .where(and(
        eq(galleryVideos.id, Number(videoId)),
        eq(galleryVideos.galleryId, Number(galleryId))
      ))
      .returning();

    res.json(updatedVideo);
  } catch (error) {
    console.error("Errore nell'aggiornamento del video:", error);
    if (error instanceof Error) {
      res.status(500).json({ error: `Errore nell'aggiornamento del video: ${error.message}` });
    } else {
      res.status(500).json({ error: "Errore nell'aggiornamento del video" });
    }
  }
};

// Elimina un video
export const deleteGalleryVideo = async (req: Request, res: Response) => {
  try {
    const { galleryId, videoId } = req.params;

    // Ottieni i dettagli del video prima di eliminarlo (per eliminare eventuali file locali)
    const [video] = await db
      .select()
      .from(galleryVideos)
      .where(and(
        eq(galleryVideos.id, Number(videoId)),
        eq(galleryVideos.galleryId, Number(galleryId))
      ));

    if (!video) {
      return res.status(404).json({ error: "Video non trovato" });
    }

    // Elimina i file locali se presenti
    if (video.thumbnailPath) {
      const thumbnailFile = path.join(process.cwd(), video.thumbnailPath.replace(/^\//, ''));
      if (fs.existsSync(thumbnailFile)) {
        fs.unlinkSync(thumbnailFile);
      }
    }

    // Elimina il video dal database
    await db
      .delete(galleryVideos)
      .where(and(
        eq(galleryVideos.id, Number(videoId)),
        eq(galleryVideos.galleryId, Number(galleryId))
      ));

    res.json({ message: "Video eliminato con successo" });
  } catch (error) {
    console.error("Errore nell'eliminazione del video:", error);
    res.status(500).json({ error: "Errore nell'eliminazione del video" });
  }
};

// Imposta un video come featured
export const setGalleryVideoAsFeatured = async (req: Request, res: Response) => {
  try {
    const { galleryId, videoId } = req.params;
    const { isFeatured } = req.body;

    // Aggiorna lo stato featured del video
    const [updatedVideo] = await db
      .update(galleryVideos)
      .set({ isFeatured: !!isFeatured })
      .where(and(
        eq(galleryVideos.id, Number(videoId)),
        eq(galleryVideos.galleryId, Number(galleryId))
      ))
      .returning();

    if (!updatedVideo) {
      return res.status(404).json({ error: "Video non trovato" });
    }

    res.json(updatedVideo);
  } catch (error) {
    console.error("Errore nell'aggiornamento dello stato featured del video:", error);
    res.status(500).json({ error: "Errore nell'aggiornamento dello stato featured" });
  }
};

export async function downloadAllPhotos(req: Request, res: Response) {
  const galleryId = Number(req.params.id);
  const chapterId = req.query.chapter ? Number(req.query.chapter) : undefined;
  const quality = req.query.quality as string || 'large'; // Opzioni: original, large, medium, thumbnail
  
  try {
    // Verifica che la galleria esista
    const gallery = await db.query.galleries.findFirst({
      where: eq(galleries.id, galleryId)
    });
    
    if (!gallery) {
      return res.status(404).json({ error: "Galleria non trovata" });
    }
    
    // Verifica che il download sia abilitato per questa galleria
    if (!gallery.downloadEnabled) {
      return res.status(403).json({ error: "Download non consentito per questa galleria" });
    }

    // Query per ottenere le foto
    let photosQuery: any = { where: eq(photos.galleryId, galleryId) };
    
    if (chapterId) {
      photosQuery = { 
        where: and(
          eq(photos.galleryId, galleryId),
          eq(photos.chapterId, chapterId)
        ) 
      };
    }
    
    const photosToDownload = await db.query.photos.findMany(photosQuery);
    
    if (photosToDownload.length === 0) {
      return res.status(404).json({ error: "Nessuna foto trovata" });
    }

    // Crea un nome per l'archivio che include informazioni sulla qualità
    const qualitySuffix = quality === 'original' ? 'originale' : quality === 'large' ? 'alta' : quality === 'medium' ? 'media' : 'bassa';
    const archiveName = `${gallery.name.replace(/[^a-z0-9]/gi, '_')}_${qualitySuffix}_${Date.now()}.zip`;
    const zipPath = path.join(process.cwd(), 'uploads', 'temp', archiveName);
    
    // Assicurati che la directory temp esista
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Crea lo stream ZIP
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 5 } // Livello di compressione
    });
    
    // Gestione degli errori
    archive.on('error', (err) => {
      console.error('Errore nella creazione dello ZIP:', err);
      res.status(500).json({ error: "Errore nella creazione dell'archivio" });
    });
    
    // Finalizzazione
    output.on('close', () => {
      console.log(`Archivio creato: ${archive.pointer()} bytes`);
      
      // Imposta gli header per il download
      res.setHeader('Content-Disposition', `attachment; filename="${archiveName}"`);
      res.setHeader('Content-Type', 'application/zip');
      
      // Invia il file ZIP
      const zipStream = fs.createReadStream(zipPath);
      zipStream.pipe(res);
      
      // Elimina il file ZIP dopo l'invio
      zipStream.on('end', () => {
        fs.unlinkSync(zipPath);
      });
    });
    
    // Pipe archive data to the output file
    archive.pipe(output);
    
    // Aggiungi ogni foto all'archivio
    for (const photo of photosToDownload) {
      // Determina quale versione dell'immagine usare in base alla qualità richiesta
      let filePath = '';
      
      // Selezione del percorso in base alla qualità richiesta
      switch (quality) {
        case 'original':
          filePath = photo.path;
          break;
        case 'large':
          filePath = photo.largePath || photo.path;
          break;
        case 'medium':
          filePath = photo.mediumPath || photo.largePath || photo.path;
          break;
        case 'thumbnail':
          filePath = photo.thumbnailPath || photo.mediumPath || photo.path;
          break;
        default:
          filePath = photo.largePath || photo.path;
      }
      
      console.log(`Download multiplo - Foto ${photo.id} con qualità: ${quality}, percorso selezionato: ${filePath}`);
      
      // Determina il percorso assoluto per il file
      // Se il percorso è già assoluto (contiene workspace), usiamo direttamente quello
      if (filePath.includes('/home/runner/workspace/')) {
        // Usa direttamente il percorso assoluto
        console.log(`Tentativo di aggiungere allo ZIP - Usando percorso assoluto: ${filePath}`);
      } 
      // Se il percorso inizia con /uploads, costruisci un percorso completo
      else if (filePath.startsWith('/uploads/')) {
        filePath = path.join(process.cwd(), filePath);
        console.log(`Tentativo di aggiungere allo ZIP - Costruito percorso da relativo: ${filePath}`);
      }
      // Altrimenti, assumiamo che sia un percorso relativo dentro uploads
      else {
        filePath = path.join(process.cwd(), 'uploads', filePath);
        console.log(`Tentativo di aggiungere allo ZIP - Costruito percorso da relativo semplice: ${filePath}`);
      }
      
      // Se il file compresso non esiste, prova con l'originale come fallback
      if (!fs.existsSync(filePath) && photo.path) {
        let originalPath = photo.path;
        if (originalPath.includes('/home/runner/workspace/')) {
          filePath = originalPath;
        } else if (originalPath.startsWith('/uploads/')) {
          filePath = path.join(process.cwd(), originalPath);
        } else {
          filePath = path.join(process.cwd(), 'uploads', originalPath);
        }
        console.log(`File compresso non trovato, utilizzo originale: ${filePath}`);
      }
      
      console.log(`Tentativo di aggiungere allo ZIP - File: ${photo.originalFilename}, Percorso finale: ${filePath}`);
      
      if (fs.existsSync(filePath)) {
        // Usa il nome originale del file se disponibile
        const fileName = photo.originalFilename || path.basename(photo.path);
        archive.file(filePath, { name: fileName });
      } else {
        console.error(`File non trovato durante la creazione dello ZIP: ${filePath}`);
      }
    }
    
    // Finalizza l'archivio
    await archive.finalize();
  } catch (error) {
    console.error('Errore nel download di tutte le foto:', error);
    res.status(500).json({ error: "Errore durante il download" });
  }
};

