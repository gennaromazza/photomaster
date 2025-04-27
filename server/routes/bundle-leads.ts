import express from "express";
import { 
  createBundleQuote, 
  getBundleLeadByEmail, 
  convertBundleLeadToQuote,
  getAllBundleLeads,
  getBundleLeadById
} from "../controllers/bundle-leads-controller";

const router = express.Router();

// Rotta per creare una richiesta di preventivo da pacchetto
router.post("/create-quote", createBundleQuote);

// Rotta per recuperare tutte le richieste di preventivo
router.get("/", getAllBundleLeads);

// Rotta per recuperare una richiesta di preventivo per ID
router.get("/:id", getBundleLeadById);

// Rotta per recuperare una richiesta di preventivo per email
router.get("/by-email/:email", getBundleLeadByEmail);

// Rotta per convertire una richiesta di preventivo in un preventivo completo
router.post("/convert-to-quote/:leadId", convertBundleLeadToQuote);

export default router;