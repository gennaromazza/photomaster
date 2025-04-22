import express from 'express';
import { isAuthenticated } from '../auth';
import * as selectionController from '../controllers/selection-controller';

const router = express.Router();

// ---- Rotte per impostazioni di selezione ----

// Ottenere le impostazioni di una galleria
// router.get('/settings/:galleryId', selectionController.getSelectionSettings);

// Aggiornare le impostazioni di una galleria
// router.put('/settings/:galleryId', isAuthenticated, selectionController.updateSelectionSettings);

// ---- Rotte per sessioni di selezione ----

// Creare una nuova sessione
// router.post('/sessions', isAuthenticated, selectionController.createSelectionSession);

// Ottenere sessioni filtrate per galleria
// router.get('/sessions', isAuthenticated, selectionController.getSessionsByGallery);

// Ottenere una sessione specifica tramite ID
// router.get('/sessions/:id', isAuthenticated, selectionController.getSession);

// Ottenere una sessione tramite chiave
// router.get('/sessions/key/:key', selectionController.getSessionByKey);

// Completare una sessione
// router.post('/sessions/:id/complete', selectionController.completeSession);

// Eliminare una sessione - commentata temporaneamente in attesa del controller
// router.delete('/sessions/:id', isAuthenticated, selectionController.deleteSession);

// ---- Rotte per selezioni di foto ----

// Selezionare/deselezionare una foto
// router.post('/photos/:photoId', selectionController.togglePhotoSelection);

// Ottenere le selezioni di una sessione
// router.get('/sessions/:id/selections', selectionController.getSessionSelections);

// Ottenere il conteggio di commenti per foto in una sessione
// router.get('/sessions/:id/photos/comment-counts', selectionController.getPhotoCommentsCount);

// ---- Rotte per commenti ----

// Aggiungere un commento a una foto
// router.post('/comments', selectionController.addComment);

// Rispondere a un commento (solo staff)
// router.post('/comments/:id/reply', isAuthenticated, selectionController.replyToComment);

// Ottenere i commenti di una sessione
// router.get('/sessions/:id/comments', selectionController.getSessionComments);

// Ottenere i commenti di una foto specifica
// router.get('/photos/:photoId/comments', selectionController.getPhotoComments);

// Segnare un commento come letto
// router.patch('/comments/:id/read', isAuthenticated, selectionController.markCommentAsRead);

// ---- Rotte per esportazione ----

// Esportare selezioni (CSV o ZIP di foto)
// router.post('/sessions/:id/export', isAuthenticated, selectionController.exportSelections);

export default router;