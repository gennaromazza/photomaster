/**
 * Route di debug per collaboratori
 */
import express from 'express';
import { 
  verificaIntegrazioneFinanziaria, 
  verificaStatistichePagamenti,
  getMontaggiConRelazioni,
  verificaIntegrazionePreventivi
} from '../controllers/debug-collaboratori-controller';
import { isAdmin, isAuthenticated } from '../auth';

export function registerDebugCollaboratoriRoutes(app: express.Express): void {
  const router = express.Router();

  // Proteggiamo queste rotte con autenticazione e ruolo admin
  router.use(isAuthenticated);
  router.use(isAdmin);

  // Endpoint di debug per verificare l'integrazione finanziaria
  router.get('/collaboratori-finanza/verifica', verificaIntegrazioneFinanziaria);
  
  // Endpoint per statistiche sui pagamenti
  router.get('/collaboratori-finanza/statistiche', verificaStatistichePagamenti);
  
  // Endpoint per ottenere tutti i montaggi con relazioni
  router.get('/collaboratori-montaggi/relazioni', getMontaggiConRelazioni);
  
  // Endpoint per verificare l'integrazione con i preventivi
  router.get('/collaboratori-preventivi/verifica', verificaIntegrazionePreventivi);

  app.use('/api/debug', router);
}