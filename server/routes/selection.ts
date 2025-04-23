import { Router } from 'express';
import { 
  togglePhotoSelection,
  getSessionSelections,
  getPhotoCommentsCount,
  addComment,
  replyToComment,
  getSessionComments,
  getPhotoComments,
  markCommentAsRead,
  exportSelections,
  getSelectionSettings,
  updateSelectionSettings,
  createSelectionSession,
  getSessionsByGallery,
  getSession,
  getSessionByKey,
  completeSession,
  deleteSession
} from '../controllers/selection-controller';
import { csrfProtection } from '../auth';

const router = Router();

// Impostazioni di selezione
router.get('/settings/:galleryId', getSelectionSettings);
router.put('/settings/:galleryId', csrfProtection, updateSelectionSettings);

// Sessioni
router.post('/sessions', csrfProtection, createSelectionSession);
router.get('/sessions/gallery/:galleryId', getSessionsByGallery);
router.get('/sessions/:id', getSession);
router.get('/sessions/key/:key', getSessionByKey);
router.put('/sessions/:id/complete', csrfProtection, completeSession);
router.post('/sessions/:id/complete', csrfProtection, completeSession); // Aggiunto per compatibilità con il frontend
router.delete('/sessions/:id', csrfProtection, deleteSession);

// Selezioni
router.post('/selections/toggle', csrfProtection, togglePhotoSelection);
router.post('/photos/:photoId', csrfProtection, togglePhotoSelection); // Aggiunto per compatibilità con il frontend
router.get('/selections/session/:sessionId', getSessionSelections);
router.get('/sessions/:sessionId/selections', getSessionSelections); // Aggiunto per compatibilità con il frontend

// Commenti
router.get('/comments/count/:photoId', getPhotoCommentsCount);
router.post('/comments', csrfProtection, addComment);
router.post('/comments/reply', csrfProtection, replyToComment);
router.get('/comments/session/:sessionId', getSessionComments);
router.get('/comments/photo/:photoId', getPhotoComments);
router.put('/comments/:id/read', csrfProtection, markCommentAsRead);

// Export
router.get('/export/:sessionId', exportSelections);

export default router;