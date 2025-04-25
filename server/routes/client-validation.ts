import express from 'express';
import { checkExistingClient, searchClients } from '../controllers/client-validation-controller';
import { isAuthenticated } from '../auth';

const router = express.Router();

/**
 * @route GET /api/client-validation/check
 * @desc Controlla se esiste un cliente con email o telefono specificato
 * @access Public - Questo endpoint può essere utilizzato anche in form pubblici
 */
router.get('/check', checkExistingClient);

/**
 * @route GET /api/client-validation/search
 * @desc Ricerca clienti con paginazione e ricerca full-text
 * @access Private - Questo endpoint è usato solo nell'area admin
 */
router.get('/search', isAuthenticated, searchClients);

export default router;