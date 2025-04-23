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
  exportSelections
} from '../controllers/selection-controller';
import { csrfProtection } from '../auth';

const router = Router();

// Impostazioni di selezione
// Rimuoviamo temporaneamente queste rotte in attesa di implementazione
/*
router.get('/settings/:galleryId', getSelectionSettings);
router.put('/settings/:galleryId', csrfProtection, updateSelectionSettings);
*/

// Sessioni
// Rimuoviamo temporaneamente queste rotte in attesa di implementazione
/*
router.post('/sessions', csrfProtection, createSelectionSession);
router.get('/sessions/gallery/:galleryId', getSessionsByGallery);
router.get('/sessions/:id', getSession);
router.get('/sessions/key/:key', getSessionByKey);
router.put('/sessions/:id/complete', csrfProtection, completeSession);
router.delete('/sessions/:id', csrfProtection, deleteSession);
*/

// Selezioni
router.post('/selections/toggle', csrfProtection, togglePhotoSelection);
router.get('/selections/session/:sessionId', getSessionSelections);

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