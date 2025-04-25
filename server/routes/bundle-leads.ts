import express from "express";
import { createBundleQuote, getBundleLeadByEmail } from "../controllers/bundle-leads-controller";

const router = express.Router();

// Rotta per creare una richiesta di preventivo da pacchetto
router.post("/create-quote", createBundleQuote);

// Rotta per recuperare una richiesta di preventivo per email
router.get("/by-email/:email", getBundleLeadByEmail);

export default router;