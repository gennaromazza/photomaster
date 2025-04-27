/**
 * Routing unificato per il sistema di gallerie e selezioni
 */

import { Router } from "express";
import * as unifiedController from "../controllers/unified-gallery-selections-controller";
import { isAuthenticated, csrfProtection } from "../auth";

const router = Router();

// ==============================================
// ROUTES PER LE IMPOSTAZIONI DI SELEZIONE
// ==============================================

// Ottieni impostazioni per una galleria
router.get(
  "/settings/:galleryId",
  unifiedController.getSelectionSettings
);

// Crea o aggiorna impostazioni
router.post(
  "/settings/:galleryId", 
  isAuthenticated,
  csrfProtection,
  unifiedController.createOrUpdateSelectionSettings
);

// Aggiorna impostazioni
router.put(
  "/settings/:galleryId", 
  isAuthenticated,
  csrfProtection,
  unifiedController.createOrUpdateSelectionSettings
);

// ==============================================
// ROUTES PER LE SESSIONI DI SELEZIONE
// ==============================================

// Crea sessione
router.post(
  "/sessions", 
  csrfProtection,
  unifiedController.createSelectionSession
);

// Per supportare la creazione da parte di admin
router.post(
  "/sessions/admin-create", 
  isAuthenticated,
  csrfProtection,
  unifiedController.createSelectionSession
);

// Ottieni dettagli sessione
router.get(
  "/sessions/:sessionId", 
  unifiedController.getSelectionSession
);

// Aggiorna sessione
router.put(
  "/sessions/:sessionId", 
  csrfProtection,
  unifiedController.updateSelectionSession
);

// Completa sessione (stessa funzione di update ma per chiarezza)
router.put(
  "/sessions/:sessionId/complete", 
  csrfProtection,
  unifiedController.updateSelectionSession
);

// Ottieni tutte le sessioni per una galleria
router.get(
  "/gallery/:galleryId/sessions", 
  isAuthenticated,
  unifiedController.getGallerySessions
);

// ==============================================
// ROUTES PER LE SELEZIONI FOTO
// ==============================================

// Seleziona/deseleziona foto (toggle)
router.post(
  "/photos/:photoId/toggle", 
  csrfProtection,
  unifiedController.togglePhotoSelection
);

// Alias per semplicità d'uso
router.post(
  "/toggle-selection", 
  csrfProtection,
  (req, res) => {
    req.params.photoId = req.body.photoId;
    unifiedController.togglePhotoSelection(req, res);
  }
);

// Ottieni selezioni per una sessione
router.get(
  "/sessions/:sessionId/selections", 
  unifiedController.getSessionSelections
);

// ==============================================
// ROUTES PER I COMMENTI
// ==============================================

// Aggiungi commento
router.post(
  "/photos/:photoId/comments", 
  csrfProtection,
  unifiedController.addPhotoComment
);

// Ottieni commenti per una foto
router.get(
  "/photos/:photoId/comments", 
  unifiedController.getPhotoComments
);

// ==============================================
// ROUTES PER I REPORT
// ==============================================

// Genera report selezioni per galleria
router.get(
  "/gallery/:galleryId/report", 
  isAuthenticated,
  unifiedController.generateSelectionsReport
);

// ==============================================
// ROUTES PER LA MIGRAZIONE
// ==============================================

// Rotta per la migrazione al nuovo sistema (solo admin)
router.post(
  "/migrate/:galleryId", 
  isAuthenticated,
  csrfProtection,
  unifiedController.migrateGallerySelections
);

export default router;