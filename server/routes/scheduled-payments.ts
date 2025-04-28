import express from "express";
import { financeController } from "../controllers/finance-controller";

const router = express.Router();

/**
 * Ottiene tutti i pagamenti programmati
 */
router.get("/", async (req, res) => {
  try {
    const payments = await financeController.getScheduledPayments();
    res.json(payments);
  } catch (error) {
    console.error("Errore nel recupero dei pagamenti programmati:", error);
    res.status(500).json({ error: "Errore nel recupero dei pagamenti programmati" });
  }
});

/**
 * Ottiene i pagamenti programmati per un preventivo specifico
 */
router.get("/by-quote/:quoteId", async (req, res) => {
  try {
    const quoteId = parseInt(req.params.quoteId);
    if (isNaN(quoteId)) {
      return res.status(400).json({ error: "ID preventivo non valido" });
    }
    
    const payments = await financeController.getScheduledPaymentsByQuoteId(quoteId);
    res.json(payments);
  } catch (error) {
    console.error(`Errore nel recupero dei pagamenti programmati per il preventivo ${req.params.quoteId}:`, error);
    res.status(500).json({ error: "Errore nel recupero dei pagamenti programmati per il preventivo" });
  }
});

/**
 * Crea un nuovo pagamento programmato
 */
router.post("/", async (req, res) => {
  try {
    // Validare i dati in ingresso
    if (!req.body.quoteId || !req.body.amount || !req.body.dueDate) {
      return res.status(400).json({ error: "Mancano dati obbligatori: quoteId, amount, dueDate" });
    }

    // Verifica se il preventivo esiste
    const quoteId = parseInt(req.body.quoteId);
    const [quote] = await financeController.db.select()
      .from(financeController.quotes)
      .where(financeController.eq(financeController.quotes.id, quoteId));

    if (!quote) {
      return res.status(400).json({ error: "Preventivo non trovato" });
    }
    
    const payment = await financeController.createScheduledPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    console.error("Errore nella creazione del pagamento programmato:", error);
    res.status(500).json({ error: "Errore nella creazione del pagamento programmato" });
  }
});

/**
 * Aggiorna un pagamento programmato esistente
 */
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID pagamento non valido" });
    }
    
    // Verifica che il pagamento esista
    const [existingPayment] = await financeController.db.select()
      .from(financeController.scheduledPayments)
      .where(financeController.eq(financeController.scheduledPayments.id, id));
    
    if (!existingPayment) {
      return res.status(404).json({ error: "Pagamento programmato non trovato" });
    }
    
    // Se il pagamento è già stato effettuato, non permettere modifiche
    if (existingPayment.status === 'paid') {
      return res.status(400).json({ error: "Impossibile modificare un pagamento già effettuato" });
    }
    
    const payment = await financeController.updateScheduledPayment(id, req.body);
    res.json(payment);
  } catch (error) {
    console.error(`Errore nell'aggiornamento del pagamento programmato ${req.params.id}:`, error);
    res.status(500).json({ error: "Errore nell'aggiornamento del pagamento programmato" });
  }
});

/**
 * Elimina un pagamento programmato
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID pagamento non valido" });
    }
    
    const payment = await financeController.deleteScheduledPayment(id);
    if (!payment) {
      return res.status(404).json({ error: "Pagamento programmato non trovato" });
    }
    
    res.json(payment);
  } catch (error) {
    if (error.message === "Impossibile eliminare un pagamento già effettuato") {
      return res.status(400).json({ error: error.message });
    }
    
    console.error(`Errore nell'eliminazione del pagamento programmato ${req.params.id}:`, error);
    res.status(500).json({ error: "Errore nell'eliminazione del pagamento programmato" });
  }
});

/**
 * Invia un promemoria per un pagamento programmato
 */
router.post("/:id/send-reminder", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID pagamento non valido" });
    }
    
    const result = await financeController.sendPaymentReminder(id);
    res.json(result);
  } catch (error) {
    console.error(`Errore nell'invio del promemoria per il pagamento ${req.params.id}:`, error);
    res.status(500).json({ error: "Errore nell'invio del promemoria" });
  }
});

export default router;