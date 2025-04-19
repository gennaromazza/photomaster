import { Router } from 'express';
import { financeController } from '../controllers/finance-controller';
import { isAuthenticated } from '../auth';

const router = Router();

// Middleware di autenticazione per tutte le rotte
router.use(isAuthenticated);

// ROTTE PER LE TRANSAZIONI

// Ottieni tutte le transazioni
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await financeController.getTransactions();
    res.json(transactions);
  } catch (error) {
    console.error('Errore nel recupero delle transazioni:', error);
    res.status(500).json({ error: 'Errore nel recupero delle transazioni' });
  }
});

// Ottieni una transazione specifica
router.get('/transactions/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID non valido' });
    }
    
    const transaction = await financeController.getTransactionById(id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transazione non trovata' });
    }
    
    res.json(transaction);
  } catch (error) {
    console.error(`Errore nel recupero della transazione ${req.params.id}:`, error);
    res.status(500).json({ error: 'Errore nel recupero della transazione' });
  }
});

// Crea una nuova transazione
router.post('/transactions', async (req, res) => {
  try {
    // Verifica se il preventivo è confermato
    if (req.body.quoteId) {
      const quoteId = parseInt(req.body.quoteId);
      const [quote] = await financeController.db.select()
        .from(financeController.quotes)
        .where(financeController.eq(financeController.quotes.id, quoteId));

      if (quote && quote.status !== "confermato" && quote.status !== "approved") {
        return res.status(400).json({ error: "Operazione consentita solo su preventivi confermati" });
      }
    }
    
    // Aggiungiamo l'utente corrente come creatore
    const data = {
      ...req.body,
      createdBy: req.user?.id
    };
    
    const transaction = await financeController.createTransaction(data);
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Errore nella creazione della transazione:', error);
    res.status(500).json({ error: 'Errore nella creazione della transazione' });
  }
});

// Aggiorna una transazione esistente
router.put('/transactions/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID non valido' });
    }
    
    const transaction = await financeController.updateTransaction(id, req.body);
    res.json(transaction);
  } catch (error) {
    console.error(`Errore nell'aggiornamento della transazione ${req.params.id}:`, error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento della transazione' });
  }
});

// Elimina una transazione
router.delete('/transactions/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID non valido' });
    }
    
    const transaction = await financeController.deleteTransaction(id);
    res.json(transaction);
  } catch (error) {
    console.error(`Errore nell'eliminazione della transazione ${req.params.id}:`, error);
    res.status(500).json({ error: 'Errore nell\'eliminazione della transazione' });
  }
});

// Ottieni le transazioni per un preventivo
router.get('/quotes/:quoteId/transactions', async (req, res) => {
  try {
    const quoteId = parseInt(req.params.quoteId);
    if (isNaN(quoteId)) {
      return res.status(400).json({ error: 'ID preventivo non valido' });
    }
    
    const transactions = await financeController.getTransactionsByQuoteId(quoteId);
    res.json(transactions);
  } catch (error) {
    console.error(`Errore nel recupero delle transazioni per il preventivo ${req.params.quoteId}:`, error);
    res.status(500).json({ error: 'Errore nel recupero delle transazioni per il preventivo' });
  }
});

// ROTTE PER I PAGAMENTI PROGRAMMATI

// Ottieni tutti i pagamenti programmati
router.get('/scheduled-payments', async (req, res) => {
  try {
    const payments = await financeController.getScheduledPayments();
    res.json(payments);
  } catch (error) {
    console.error('Errore nel recupero dei pagamenti programmati:', error);
    res.status(500).json({ error: 'Errore nel recupero dei pagamenti programmati' });
  }
});

// Ottieni i pagamenti programmati per un preventivo
router.get('/quotes/:quoteId/scheduled', async (req, res) => {
  try {
    const quoteId = parseInt(req.params.quoteId);
    if (isNaN(quoteId)) {
      return res.status(400).json({ error: 'ID preventivo non valido' });
    }
    
    const payments = await financeController.getScheduledPaymentsByQuoteId(quoteId);
    res.json(payments);
  } catch (error) {
    console.error(`Errore nel recupero dei pagamenti programmati per il preventivo ${req.params.quoteId}:`, error);
    res.status(500).json({ error: 'Errore nel recupero dei pagamenti programmati per il preventivo' });
  }
});

// Crea un nuovo pagamento programmato
router.post('/scheduled-payments', async (req, res) => {
  try {
    // Verifica se il preventivo è confermato
    if (req.body.quoteId) {
      const quoteId = parseInt(req.body.quoteId);
      const [quote] = await financeController.db.select()
        .from(financeController.quotes)
        .where(financeController.eq(financeController.quotes.id, quoteId));

      if (quote && quote.status !== "confermato" && quote.status !== "approved") {
        return res.status(400).json({ error: "Operazione consentita solo su preventivi confermati" });
      }
    }
    
    const payment = await financeController.createScheduledPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    console.error('Errore nella creazione del pagamento programmato:', error);
    res.status(500).json({ error: 'Errore nella creazione del pagamento programmato' });
  }
});

// Aggiorna un pagamento programmato esistente
router.put('/scheduled-payments/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID non valido' });
    }
    
    const payment = await financeController.updateScheduledPayment(id, req.body);
    res.json(payment);
  } catch (error) {
    console.error(`Errore nell'aggiornamento del pagamento programmato ${req.params.id}:`, error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del pagamento programmato' });
  }
});

// Elimina un pagamento programmato
router.delete('/scheduled-payments/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID non valido' });
    }
    
    const payment = await financeController.deleteScheduledPayment(id);
    res.json(payment);
  } catch (error) {
    console.error(`Errore nell'eliminazione del pagamento programmato ${req.params.id}:`, error);
    res.status(500).json({ error: 'Errore nell\'eliminazione del pagamento programmato' });
  }
});

// Invia un promemoria per un pagamento programmato
router.post('/scheduled-payments/:id/reminder', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID non valido' });
    }
    
    const payment = await financeController.sendPaymentReminder(id);
    res.json(payment);
  } catch (error) {
    console.error(`Errore nell'invio del promemoria per il pagamento ${req.params.id}:`, error);
    res.status(500).json({ error: 'Errore nell\'invio del promemoria' });
  }
});

// ROTTE PER LE STATISTICHE FINANZIARIE

// Ottieni le statistiche finanziarie generali
router.get('/stats', async (req, res) => {
  try {
    const { period, year, month } = req.query;
    
    // Converto i parametri al formato corretto
    const params: {
      period?: string,
      year?: number,
      month?: number
    } = {};
    
    if (period && typeof period === 'string') {
      params.period = period;
    }
    
    if (year && typeof year === 'string') {
      params.year = parseInt(year);
    }
    
    if (month && typeof month === 'string') {
      params.month = parseInt(month);
    }
    
    const stats = await financeController.getFinancialStats(params);
    res.json(stats);
  } catch (error) {
    console.error('Errore nel recupero delle statistiche finanziarie:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche finanziarie' });
  }
});

// Ottieni i dati finanziari per un preventivo specifico
router.get('/quotes/:quoteId', async (req, res) => {
  try {
    const quoteId = parseInt(req.params.quoteId);
    if (isNaN(quoteId)) {
      return res.status(400).json({ error: 'ID preventivo non valido' });
    }
    
    const data = await financeController.getQuoteFinancialData(quoteId);
    res.json(data);
  } catch (error) {
    console.error(`Errore nel recupero dei dati finanziari per il preventivo ${req.params.quoteId}:`, error);
    res.status(500).json({ error: 'Errore nel recupero dei dati finanziari per il preventivo' });
  }
});

export default router;