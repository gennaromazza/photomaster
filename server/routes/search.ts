import { Router } from "express";
import { SearchController } from "../controllers/search-controller";
import { isAuthenticated } from "../auth";

const router = Router();

/**
 * @route GET /api/search
 * @desc Ricerca globale su clienti, eventi, preventivi, contratti e gallerie
 * @access Privato (richiede autenticazione)
 * @query q - Testo da cercare
 */
router.get("/", isAuthenticated, SearchController.searchGlobal);

export default router;