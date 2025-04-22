import express from 'express';
import * as selectionController from '../controllers/selection-controller';
import { isAuthenticated } from '../auth';

const router = express.Router();

// Impostazioni selezione
router.get('/settings/:galleryId', selectionController.getSelectionSettings);
router.put('/settings/:galleryId', isAuthenticated, selectionController.updateSelectionSettings);

// Sessioni di selezione
router.post('/sessions', selectionController.createSelectionSession);
router.get('/sessions/gallery/:galleryId', isAuthenticated, selectionController.getSessionsByGallery);
router.get('/sessions/:id', isAuthenticated, selectionController.getSession);
router.get('/sessions/key/:key', selectionController.getSessionByKey);
router.put('/sessions/:id/complete', selectionController.completeSession);
router.delete('/sessions/:id', isAuthenticated, selectionController.deleteSession);

// Selezioni di foto
router.post('/photo/:photoId/toggle', selectionController.togglePhotoSelection);
router.get('/sessions/:sessionId/selections', selectionController.getSessionSelections);
router.get('/sessions/:sessionId/comments-count', selectionController.getPhotoCommentsCount);

// Commenti
router.post('/comments', selectionController.addComment);
router.post('/comments/reply', isAuthenticated, selectionController.replyToComment);
router.get('/sessions/:sessionId/comments', selectionController.getSessionComments);
router.get('/photo/:photoId/comments/:sessionId', selectionController.getPhotoComments);
router.put('/comments/:id/mark-read', isAuthenticated, selectionController.markCommentAsRead);

// Esportazione
router.get('/sessions/:sessionId/export', isAuthenticated, selectionController.exportSelections);

export default router;