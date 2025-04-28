import express from "express";
import { financeController } from "../controllers/finance-controller";

const router = express.Router();

/**
 * Ottiene tutte le transazioni
 */
router.get("/", async (req, res) => {
  try {
    const transactions = await financeController.getTransactions();
    res.json(transactions);
  } catch (error) {
    console.error("Errore nel recupero delle transazioni:", error);
    res.status(500).json({ error: "Errore nel recupero delle transazioni" });
  }
});

/**
 * Ottiene una transazione specifica
 */
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID transazione non valido" });
    }
    
    const transaction = await financeController.getTransactionById(id);
    if (!transaction) {
      return res.status(404).json({ error: "Transazione non trovata" });
    }
    
    res.json(transaction);
  } catch (error) {
    console.error(`Errore nel recupero della transazione ${req.params.id}:`, error);
    res.status(500).json({ error: "Errore nel recupero della transazione" });
  }
});

/**
 * Ottiene le transazioni per un preventivo specifico
 */
router.get("/by-quote/:quoteId", async (req, res) => {
  try {
    const quoteId = parseInt(req.params.quoteId);
    if (isNaN(quoteId)) {
      return res.status(400).json({ error: "ID preventivo non valido" });
    }
    
    const transactions = await financeController.getTransactionsByQuoteId(quoteId);
    res.json(transactions);
  } catch (error) {
    console.error(`Errore nel recupero delle transazioni per il preventivo ${req.params.quoteId}:`, error);
    res.status(500).json({ error: "Errore nel recupero delle transazioni per il preventivo" });
  }
});

/**
 * Crea una nuova transazione
 */
router.post("/", async (req, res) => {
  try {
    // Validazione dei dati in ingresso
    if (!req.body.amount || !req.body.transactionType) {
      return res.status(400).json({ error: "Mancano dati obbligatori: amount, transactionType" });
    }
    
    // Se la transazione è associata a un preventivo, verifica che esista
    if (req.body.quoteId) {
      const quoteId = parseInt(req.body.quoteId);
      const [quote] = await financeController.db.select()
        .from(financeController.quotes)
        .where(financeController.eq(financeController.quotes.id, quoteId));
        
      if (!quote) {
        return res.status(400).json({ error: "Preventivo non trovato" });
      }
    }
    
    // Se la transazione è associata a un pagamento programmato, verifica che esista
    if (req.body.scheduledPaymentId) {
      const scheduledPaymentId = parseInt(req.body.scheduledPaymentId);
      const [payment] = await financeController.db.select()
        .from(financeController.scheduledPayments)
        .where(financeController.eq(financeController.scheduledPayments.id, scheduledPaymentId));
        
      if (!payment) {
        return res.status(400).json({ error: "Pagamento programmato non trovato" });
      }
      
      // Verifica che il pagamento non sia già stato pagato
      if (payment.status === 'paid') {
        return res.status(400).json({ error: "Questo pagamento programmato è già stato pagato" });
      }
    }
    
    const transaction = await financeController.createTransaction(req.body);
    res.status(201).json(transaction);
  } catch (error) {
    console.error("Errore nella creazione della transazione:", error);
    res.status(500).json({ error: "Errore nella creazione della transazione" });
  }
});

/**
 * Aggiorna una transazione esistente
 */
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID transazione non valido" });
    }
    
    // Verifica che la transazione esista
    const transaction = await financeController.getTransactionById(id);
    if (!transaction) {
      return res.status(404).json({ error: "Transazione non trovata" });
    }
    
    const updatedTransaction = await financeController.updateTransaction(id, req.body);
    res.json(updatedTransaction);
  } catch (error) {
    console.error(`Errore nell'aggiornamento della transazione ${req.params.id}:`, error);
    res.status(500).json({ error: "Errore nell'aggiornamento della transazione" });
  }
});

/**
 * Elimina una transazione
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID transazione non valido" });
    }
    
    const deleted = await financeController.deleteTransaction(id);
    if (!deleted) {
      return res.status(404).json({ error: "Transazione non trovata" });
    }
    
    res.json(deleted);
  } catch (error) {
    console.error(`Errore nell'eliminazione della transazione ${req.params.id}:`, error);
    res.status(500).json({ error: "Errore nell'eliminazione della transazione" });
  }
});

export default router;