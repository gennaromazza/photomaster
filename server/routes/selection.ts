import { Router } from 'express';
import * as selectionController from '../controllers/selection-controller';
import { isAuthenticated, isAdmin } from '../auth';

const router = Router();

// Rotte per le impostazioni di selezione (admin)
router.get('/settings/:galleryId', selectionController.getSelectionSettings);
router.put('/settings/:galleryId', isAuthenticated, isAdmin, selectionController.updateSelectionSettings);
router.post('/settings', isAuthenticated, isAdmin, selectionController.updateSelectionSettings);

// Rotte per le sessioni
router.post('/sessions', isAuthenticated, isAdmin, selectionController.createSelectionSession);
router.get('/sessions/key/:key', selectionController.getSessionByKey);
router.get('/sessions/:id', selectionController.getSession);
router.get('/sessions', isAuthenticated, isAdmin, selectionController.getSessionsByGallery);
router.post('/sessions/:id/complete', selectionController.completeSession);

// Rotte per le selezioni di foto
router.get('/sessions/:id/selections', selectionController.getSessionSelections);
router.get('/sessions/:id/comments', isAuthenticated, isAdmin, selectionController.getSessionComments);
router.get('/sessions/:id/photos/comment-counts', selectionController.getPhotoCommentsCount);
router.get('/sessions/:id/export', isAuthenticated, isAdmin, selectionController.exportSelections);

// Rotte per i commenti
router.get('/photos/:photoId/comments', selectionController.getPhotoComments);
router.post('/photos/:photoId', selectionController.togglePhotoSelection);
router.delete('/photos/:photoId', selectionController.togglePhotoSelection);
router.post('/comments', selectionController.addComment);
router.post('/comments/:id/reply', isAuthenticated, isAdmin, selectionController.replyToComment);
router.put('/comments/:id/read', isAuthenticated, isAdmin, selectionController.markCommentAsRead);

export default router;