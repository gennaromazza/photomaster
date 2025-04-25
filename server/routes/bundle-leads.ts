import { Router } from "express";
import { 
  createBundleLead, 
  createQuoteFromBundleLead, 
  getBundleLeads, 
  getAllBundleLeads 
} from "../controllers/bundle-leads-controller";
import { isAuthenticated, csrfProtection } from "../auth";

const router = Router();

// Rotte pubbliche (non richiedono autenticazione)
// Queste rotte sono accessibili ai clienti che visitano le pagine pubbliche
router.post("/", csrfProtection, createBundleLead);
router.post("/create-quote", csrfProtection, createQuoteFromBundleLead);

// Rotte protette (richiedono autenticazione di amministratore)
router.get("/", isAuthenticated, getAllBundleLeads);
router.get("/:bundleId", isAuthenticated, getBundleLeads);

export default router;