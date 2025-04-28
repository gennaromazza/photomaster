/**
 * Router per le clausole contrattuali e la loro assegnazione ai moduli
 */
import express from 'express';
import { 
  getAllClauses, 
  getClausesByEventType, 
  assignClausesToQuoteModules,
  getModuleClauses,
  updateModuleClauses 
} from '../controllers/contract-clause-controller';

const router = express.Router();

// Recupera tutte le clausole contrattuali
router.get('/', getAllClauses);

// Recupera le clausole per un tipo di evento specifico
router.get('/by-event-type', getClausesByEventType);

// Assegna le clausole a tutti i moduli di un preventivo
router.post('/assign-to-quote/:quoteId', assignClausesToQuoteModules);

// Recupera le clausole associate a un modulo specifico
router.get('/module/:moduleId', getModuleClauses);

// Aggiorna le clausole di un modulo specifico
router.put('/module/:moduleId', updateModuleClauses);

export default router;