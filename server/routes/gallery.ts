import express from "express";
import multer from "multer";
import { isAuthenticated, checkGalleryAccess } from "../auth";
import { db } from "../db";
import { galleries } from "../../schema_gallery";
import bcrypt from "bcrypt";
import { desc, eq } from "drizzle-orm";
import {
  getAllGalleries,
  getGalleryById,
  getGalleryBySlug,
  createGallery,
  updateGallery,
  deleteGallery,
  getGalleryChapters,
  getChapterById,
  createChapter,
  updateChapter,
  deleteChapter,
  getGalleryPhotos,
  getAllGallerySelections,
  generateSelectionsReport,
  deleteClientSelections,
  uploadPhoto,
  updatePhoto,
  deletePhoto,
  generateGalleryQRCode,
  subscribeToGallery,
  trackSocialShare,
  togglePhotoSelection,
  getClientSelections,
  createPhotoSelections,
  recompressGalleryImages,
  downloadPhoto,
  downloadAllPhotos,
  // Controller per i video
  addGalleryVideo,
  getGalleryVideos,
  updateGalleryVideo,
  deleteGalleryVideo,
  setGalleryVideoAsFeatured
} from "../controllers/gallery-controller";
import { cleanupGalleries } from "../controllers/gallery-cleanup-controller";

const router = express.Router();

// Configurazione multer per il caricamento delle immagini
const storage = multer.memoryStorage(); // Salva i file in memoria per elaborarli
const upload = multer({ 
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // limite 20MB
  },
  fileFilter: (_req, file, cb) => {
    // Accetta solo immagini con estensioni specifiche
    if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
      return cb(new Error("Formato immagine non valido. Solo JPG, PNG, WEBP."), false);
    }
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error("Tipo di file non supportato. Sono accettate solo immagini."));
    }
  }
});

// Evitando duplicazione import

// ROUTES PER GALLERIE

// Ottieni tutte le gallerie
router.get("/galleries", async (req, res) => {
  try {
    const { eventId } = req.query;
    
    let query = db.select().from(galleries).orderBy(desc(galleries.createdAt));
    
    if (eventId) {
      query = query.where(eq(galleries.eventId, Number(eventId)));
    }
    
    const allGalleries = await query;
    return res.json(allGalleries || []);
  } catch (error) {
    console.error("Errore nel recupero delle gallerie:", error);
    return res.status(500).json({ error: "Errore nel recupero delle gallerie" });
  }
});

// Ottieni una galleria tramite ID (admin)
router.get("/galleries/:id", getGalleryById);

// Ottieni una galleria tramite slug (pubblico)
import rateLimit from 'express-rate-limit';

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100 // limite richieste
});

router.get("/public/galleries/:slug", 
  publicLimiter,
  checkGalleryAccess, 
  getGalleryBySlug
);

// Autentica per una galleria protetta da password
router.post("/public/galleries/:slug/authenticate", async (req, res) => {
  try {
    const { slug } = req.params;
    const { password } = req.body;
    
    console.log(`DEBUG - Tentativo di autenticazione per galleria slug: ${slug}`);
    console.log(`DEBUG - Password fornita: ${password ? '✓' : '✗'}`);
    console.log(`DEBUG - ID sessione: ${req.session.id}`);
    
    // Verifica se la galleria esiste e se la password è corretta
    const [gallery] = await db
      .select()
      .from(galleries)
      .where(eq(galleries.slug, slug));
    
    if (!gallery) {
      console.log(`DEBUG - Autenticazione fallita: galleria non trovata per slug ${slug}`);
      return res.status(404).json({ error: "Galleria non trovata" });
    }
    
    console.log(`DEBUG - Galleria trovata ID: ${gallery.id}, richiede password: ${!!gallery.password}`);
    
    // Se la galleria non ha password, non è necessaria l'autenticazione
    if (!gallery.password) {
      console.log(`DEBUG - Autenticazione bypass: galleria non richiede password`);
      return res.status(200).json({ authenticated: true });
    }
    
    // Verifica la password
    let passwordMatches = false;
    
    // Controlliamo se è una password hashata (inizia con $2b$)
    if (gallery.password.startsWith('$2b$')) {
      // Utilizziamo bcrypt per confrontare
      passwordMatches = await bcrypt.compare(password, gallery.password);
      console.log(`DEBUG - Confronto password bcrypt: ${passwordMatches ? 'valida' : 'non valida'}`);
    } else {
      // Compatibilità con vecchie password non hashate
      passwordMatches = gallery.password === password;
      console.log(`DEBUG - Confronto password in chiaro: ${passwordMatches ? 'valida' : 'non valida'}`);
      
      // Se corrisponde, aggiorniamo con la versione hashata per le prossime volte
      if (passwordMatches) {
        try {
          const hashedPassword = await bcrypt.hash(password, 12);
          await db.update(galleries)
            .set({ password: hashedPassword })
            .where(eq(galleries.id, gallery.id));
          console.log(`DEBUG - Password aggiornata con hash per galleria ID: ${gallery.id}`);
        } catch (hashError) {
          console.error(`DEBUG - Errore nell'aggiornamento hash password: ${hashError}`);
          // Continuiamo comunque, non è un errore critico
        }
      }
    }
    
    if (!passwordMatches) {
      console.log(`DEBUG - Autenticazione fallita: password non valida`);
      return res.status(401).json({ error: "Password non valida" });
    }
    
    // Genera un token di accesso temporaneo (JWT o cookie sessione)
    // Per semplicità, qui usiamo un cookie di sessione
    req.session.galleryAccess = req.session.galleryAccess || {};
    req.session.galleryAccess[gallery.id] = true;
    
    console.log(`DEBUG - Autenticazione riuscita per galleria ID: ${gallery.id}`);
    console.log(`DEBUG - Sessione aggiornata, gallerie con accesso: ${Object.keys(req.session.galleryAccess).join(', ')}`);
    
    // Assicuriamoci che la sessione venga salvata
    req.session.save((err) => {
      if (err) {
        console.error(`DEBUG - Errore nel salvare la sessione: ${err.message}`);
        return res.status(500).json({ error: "Errore nel salvare la sessione" });
      } else {
        console.log(`DEBUG - Sessione salvata con successo`);
      }
      
      res.status(200).json({ authenticated: true });
    });
  } catch (error) {
    console.error("Errore nell'autenticazione alla galleria:", error);
    res.status(500).json({ error: "Errore nell'autenticazione" });
  }
});

// Crea una nuova galleria (richiede autenticazione)
router.post("/galleries", 
  (req, res, next) => {
    console.log("DEBUG - Richiesta creazione galleria ricevuta");
    console.log("Headers:", req.headers);
    console.log("Autenticato:", req.isAuthenticated());
    console.log("Utente:", req.user);
    next();
  },
  isAuthenticated, 
  (req, res, next) => {
    console.log("DEBUG - Autenticazione verificata, procedendo con upload");
    next();
  },
  upload.single("coverImage"), 
  (req, res, next) => {
    console.log("DEBUG - Upload completato, file ricevuto:", req.file ? "Sì" : "No");
    next();
  },
  createGallery
);

// Aggiorna una galleria (richiede autenticazione)
router.put("/galleries/:id", isAuthenticated, updateGallery);

// Elimina una galleria (richiede autenticazione)
router.delete("/galleries/:id", isAuthenticated, deleteGallery);

// ROUTES PER CAPITOLI

// Ottieni tutti i capitoli di una galleria
router.get("/galleries/:galleryId/chapters", getGalleryChapters);

// Ottieni un capitolo specifico
router.get("/chapters/:id", getChapterById);

// Crea un nuovo capitolo (richiede autenticazione)
router.post("/chapters", isAuthenticated, createChapter);

// Aggiorna un capitolo esistente (richiede autenticazione)
router.put("/chapters/:id", isAuthenticated, updateChapter);

// Aggiorna parzialmente un capitolo (richiede autenticazione)
router.patch("/chapters/:id", isAuthenticated, updateChapter);

// Elimina un capitolo (richiede autenticazione)
router.delete("/chapters/:id", isAuthenticated, deleteChapter);

// ROUTES PER FOTO

// Ottieni le foto di una galleria
router.get("/galleries/:galleryId/photos", getGalleryPhotos);

// Carica una nuova foto (richiede autenticazione)
router.post("/photos", isAuthenticated, upload.single("photo"), uploadPhoto);

// Aggiorna una foto (richiede autenticazione)
router.put("/photos/:id", isAuthenticated, updatePhoto);

// Elimina una foto (richiede autenticazione)
router.delete("/photos/:id", isAuthenticated, deletePhoto);

// Genera QR code per una galleria
router.get("/galleries/:id/qr", generateGalleryQRCode);

// ROUTES PER COMPRESSIONE IMMAGINI

// Ricomprimi le immagini di una galleria
router.post("/galleries/:galleryId/recompress", isAuthenticated, recompressGalleryImages);

// ROUTES PER SOTTOSCRIZIONI

// Sottoscrivi per aggiornamenti sulla galleria
router.post("/galleries/subscribe", subscribeToGallery);

// ROUTES PER CONDIVISIONI SOCIAL

// Registra una condivisione sui social
router.post("/social-share", trackSocialShare);

// ROUTES PER SELEZIONI

// Seleziona o deseleziona una foto
router.post("/photos/:photoId/select", togglePhotoSelection);

// Ottieni tutte le selezioni di un cliente per una galleria
router.get("/galleries/:galleryId/selections", getClientSelections);

// Ottieni tutte le selezioni per una galleria (admin)
router.get("/galleries/:galleryId/selections/all", isAuthenticated, getAllGallerySelections);

// Genera report CSV delle selezioni (admin)
router.get("/galleries/:galleryId/selections/report", isAuthenticated, generateSelectionsReport);

// Elimina le selezioni di un cliente per una galleria (admin)
router.delete("/galleries/:galleryId/selections/client/:clientEmail", isAuthenticated, deleteClientSelections);

// Salva tutte le selezioni in batch
router.post("/galleries/selections/batch", createPhotoSelections);

// ROUTES PER DOWNLOAD

// Download di una singola foto
router.get("/photos/:id/download", downloadPhoto);

// Download di tutte le foto di una galleria
router.get("/galleries/:id/download-all", downloadAllPhotos);

// ROUTES PER VIDEO

// Ottieni tutti i video di una galleria
router.get("/galleries/:galleryId/video", getGalleryVideos);

// Aggiungi un nuovo video (richiede autenticazione)
router.post(
  "/galleries/:galleryId/video", 
  isAuthenticated, 
  addGalleryVideo
);

// Aggiorna un video (richiede autenticazione)
router.patch(
  "/galleries/:galleryId/video/:videoId", 
  isAuthenticated, 
  updateGalleryVideo
);

// Elimina un video (richiede autenticazione)
router.delete(
  "/galleries/:galleryId/video/:videoId", 
  isAuthenticated, 
  deleteGalleryVideo
);

// Imposta un video come in evidenza (richiede autenticazione)
router.patch(
  "/galleries/:galleryId/videos/:videoId/featured", 
  isAuthenticated, 
  setGalleryVideoAsFeatured
);

// ROUTE PER AMMINISTRAZIONE

// Pulizia completa gallerie (solo per amministratori)
router.delete("/cleanup", isAuthenticated, cleanupGalleries);

// Duplica una galleria (richiede autenticazione)
router.post("/galleries/:id/duplicate", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const [original] = await db.select().from(galleries).where(eq(galleries.id, Number(id)));
    
    if (!original) {
      return res.status(404).json({ error: "Galleria non trovata" });
    }
    
    // Genera un nuovo slug univoco
    const newSlug = `${original.slug}-${Date.now()}`;
    
    // Duplica la galleria con un nuovo ID
    const duplicatedGallery = {
      ...original,
      id: undefined,  // Assicura che venga generato un nuovo ID
      slug: newSlug,
      name: `${original.name} (copia)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Salva la nuova galleria
    const [newGallery] = await db.insert(galleries)
      .values(duplicatedGallery)
      .returning();
      
    res.status(201).json(newGallery);
  } catch (error) {
    console.error("Errore durante la duplicazione della galleria:", error);
    res.status(500).json({ error: "Errore durante la duplicazione della galleria" });
  }
});

// Fine routes

export default router;