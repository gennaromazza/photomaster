import express from "express";
import multer from "multer";
import { isAuthenticated, checkGalleryAccess } from "../auth";
import { db } from "../db";
import { galleries } from "../../schema_gallery";
import { desc, eq } from "drizzle-orm";
import {
  getAllGalleries,
  getGalleryById,
  getGalleryBySlug,
  createGallery,
  updateGallery,
  deleteGallery,
  getGalleryChapters,
  createChapter,
  deleteChapter,
  getGalleryPhotos,
  uploadPhoto,
  updatePhoto,
  deletePhoto,
  generateGalleryQRCode,
  subscribeToGallery,
  trackSocialShare,
  togglePhotoSelection,
  getClientSelections
} from "../controllers/gallery-controller";

const router = express.Router();

// Configurazione multer per il caricamento delle immagini
const storage = multer.memoryStorage(); // Salva i file in memoria per elaborarli
const upload = multer({ 
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // limite 20MB
  },
  fileFilter: (_req, file, cb) => {
    // Accetta solo immagini
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
router.get("/public/galleries/:slug", checkGalleryAccess, getGalleryBySlug);

// Autentica per una galleria protetta da password
router.post("/public/galleries/:slug/authenticate", async (req, res) => {
  try {
    const { slug } = req.params;
    const { password } = req.body;
    
    // Verifica se la galleria esiste e se la password è corretta
    const [gallery] = await db
      .select()
      .from(galleries)
      .where(eq(galleries.slug, slug));
    
    if (!gallery) {
      return res.status(404).json({ error: "Galleria non trovata" });
    }
    
    // Se la galleria non ha password, non è necessaria l'autenticazione
    if (!gallery.password) {
      return res.status(200).json({ authenticated: true });
    }
    
    // Verifica la password
    if (gallery.password !== password) {
      return res.status(401).json({ error: "Password non valida" });
    }
    
    // Genera un token di accesso temporaneo (JWT o cookie sessione)
    // Per semplicità, qui usiamo un cookie di sessione
    req.session.galleryAccess = req.session.galleryAccess || {};
    req.session.galleryAccess[gallery.id] = true;
    
    res.status(200).json({ authenticated: true });
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

// Crea un nuovo capitolo (richiede autenticazione)
router.post("/chapters", isAuthenticated, createChapter);

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

export default router;