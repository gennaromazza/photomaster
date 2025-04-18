import express from "express";
import { isAuthenticated, isAdmin } from "../auth";
import {
  getAllTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getScheduledPayments,
  createScheduledPayment,
  updateScheduledPayment,
  deleteScheduledPayment,
  getFinancialSummary,
  getQuoteFinancials,
  handleQuoteSigningFinancialUpdates
} from "../controllers/finance-controller";

const router = express.Router();

// Middleware di autenticazione per tutte le route finanziarie
router.use(isAuthenticated);

// Rotte per le transazioni
router.get("/transactions", getAllTransactions);
router.get("/transactions/:id", getTransaction);
router.post("/transactions", createTransaction);
router.put("/transactions/:id", updateTransaction);
router.delete("/transactions/:id", deleteTransaction);

// Rotte per i pagamenti programmati
router.get("/scheduled-payments", getScheduledPayments);
router.post("/scheduled-payments", createScheduledPayment);
router.put("/scheduled-payments/:id", updateScheduledPayment);
router.delete("/scheduled-payments/:id", deleteScheduledPayment);

// Rotta per il riepilogo finanziario
router.get("/summary", getFinancialSummary);

// Rotte per i dati finanziari di un preventivo specifico
router.get("/quotes/:quoteId", getQuoteFinancials);

// Rotta per aggiornare lo stato del token di condivisione quando un preventivo viene firmato
router.post("/quotes/:quoteId/signing-update", handleQuoteSigningFinancialUpdates);

export default router;