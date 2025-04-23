import express from 'express';
import { isAuthenticated } from '../auth';
import * as clausesController from '../controllers/clauses-controller';

const router = express.Router();

// Require authentication for all routes
// Rimuoviamo l'autenticazione per l'endpoint quote clauses in modo che possa essere 
// accessibile anche dalla pagina pubblica
router.use((req, res, next) => {
  // Saltiamo l'autenticazione per le route di quote clauses
  if (req.path.includes('/quote/') && req.method === 'GET') {
    return next();
  }
  // Saltiamo l'autenticazione per l'accettazione delle clausole
  if (req.path.includes('/quote/') && req.path.includes('/accept') && req.method === 'POST') {
    return next();
  }
  // Per tutte le altre route, richiediamo l'autenticazione
  isAuthenticated(req, res, next);
});

// Routes for managing contract clauses
router.get('/', clausesController.getAllClauses);
router.get('/categories', clausesController.getCategories);
router.get('/event-types', clausesController.getEventTypes);
router.get('/:id', clausesController.getClauseById);
router.post('/', clausesController.createClause);
router.put('/:id', clausesController.updateClause);
router.delete('/:id', clausesController.deleteClause);

// Routes for quote clauses
router.get('/quote/:quoteId', clausesController.getQuoteClauses);
router.get('/quote/:quoteId/available', clausesController.getAvailableClausesForQuote);
router.post('/quote/:quoteId/associate', clausesController.associateClausesToQuote);
router.post('/quote/:quoteId/accept', clausesController.acceptQuoteClauses);

export default router;