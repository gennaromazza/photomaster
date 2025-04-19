import express from "express";
import multer from "multer";
import { isAuthenticated } from "../auth"; // Importa il middleware di autenticazione globale
import {
  getAllGalleries,
  getGalleryById,
  getGalleryBySlug,
  createGallery,
  updateGallery,
  deleteGallery,
  getGalleryChapters,
  createChapter,
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

// Middleware per verificare l'autorizzazione per le gallerie pubbliche
const checkGalleryAccess = async (req, res, next) => {
  // Per le route pubbliche, controlla la password se necessario
  // Implementazione qui...
  next();
};

// ROUTES PER GALLERIE

// Ottieni tutte le gallerie
router.get("/galleries", getAllGalleries);

// Ottieni una galleria tramite ID (admin)
router.get("/galleries/:id", getGalleryById);

// Ottieni una galleria tramite slug (pubblico)
router.get("/public/galleries/:slug", checkGalleryAccess, getGalleryBySlug);

// Crea una nuova galleria (richiede autenticazione)
router.post("/galleries", isAuthenticated, upload.single("coverImage"), createGallery);

// Aggiorna una galleria (richiede autenticazione)
router.put("/galleries/:id", isAuthenticated, updateGallery);

// Elimina una galleria (richiede autenticazione)
router.delete("/galleries/:id", isAuthenticated, deleteGallery);

// ROUTES PER CAPITOLI

// Ottieni tutti i capitoli di una galleria
router.get("/galleries/:galleryId/chapters", getGalleryChapters);

// Crea un nuovo capitolo (richiede autenticazione)
router.post("/chapters", isAuthenticated, createChapter);

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