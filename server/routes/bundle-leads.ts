import { Router } from "express";
import { createQuoteFromBundle } from "../controllers/bundle-leads-controller";
import { isAuthenticated, csrfProtection } from "../auth";

const router = Router();

// La rotta per creare un preventivo da un pacchetto non richiede autenticazione
// perché è destinata ai clienti che visitano la pagina pubblica del pacchetto
router.post("/create-quote", csrfProtection, createQuoteFromBundle);

export default router;