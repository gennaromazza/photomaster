import express from 'express';
import { isAuthenticated } from '../auth';
import * as clausesController from '../controllers/clauses-controller';

const router = express.Router();

// Require authentication for all routes
router.use(isAuthenticated);

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