import { Request, Response } from "express";
import { db } from "../db";
import { 
  transactions, 
  scheduledPayments, 
  quotes, 
  InsertTransaction, 
  Transaction,
  InsertScheduledPayment,
  ScheduledPayment
} from "@shared/schema";
import { eq, and, sql, desc, gte, lte, isNull, not } from "drizzle-orm";
import { sendEmail } from "../email";

// Ottieni tutte le transazioni finanziarie
export async function getAllTransactions(req: Request, res: Response) {
  try {
    // Possiamo filtrare per tipo, data, ecc.
    const { type, fromDate, toDate, quoteId } = req.query;
    
    let query = db.select().from(transactions);
    
    // Applica filtri se specificati
    if (type) {
      query = query.where(eq(transactions.type, type as string));
    }
    
    if (fromDate && toDate) {
      query = query.where(
        and(
          gte(transactions.date, fromDate as string),
          lte(transactions.date, toDate as string)
        )
      );
    } else if (fromDate) {
      query = query.where(gte(transactions.date, fromDate as string));
    } else if (toDate) {
      query = query.where(lte(transactions.date, toDate as string));
    }
    
    if (quoteId) {
      const quoteIdNum = parseInt(quoteId as string);
      if (!isNaN(quoteIdNum)) {
        query = query.where(eq(transactions.quoteId, quoteIdNum));
      }
    }
    
    // Ordina per data (più recenti prima)
    const results = await query.orderBy(desc(transactions.date));
    
    res.json(results);
  } catch (error) {
    console.error('Errore nel recupero delle transazioni:', error);
    res.status(500).json({ message: 'Errore nel recupero delle transazioni' });
  }
}

// Ottieni una transazione specifica
export async function getTransaction(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID transazione non valido' });
    }
    
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transazione non trovata' });
    }
    
    res.json(transaction);
  } catch (error) {
    console.error('Errore nel recupero della transazione:', error);
    res.status(500).json({ message: 'Errore nel recupero della transazione' });
  }
}

// Crea una nuova transazione
export async function createTransaction(req: Request, res: Response) {
  try {
    const transactionData: InsertTransaction = req.body;
    
    if (!req.user) {
      return res.status(401).json({ message: 'Utente non autenticato' });
    }
    
    // Assegna l'utente corrente come creatore della transazione
    transactionData.createdBy = req.user.id;
    
    // Validazione dei dati
    if (!transactionData.amount || !transactionData.date || !transactionData.type) {
      return res.status(400).json({ message: 'Dati transazione incompleti' });
    }
    
    // Controlla se è un pagamento associato a un preventivo
    if (transactionData.quoteId && transactionData.type === 'payment') {
      // Verifica che il preventivo esista
      const [quote] = await db
        .select()
        .from(quotes)
        .where(eq(quotes.id, transactionData.quoteId));
      
      if (!quote) {
        return res.status(404).json({ message: 'Preventivo non trovato' });
      }
      
      // Se il pagamento è associato a un pagamento programmato, aggiorniamo lo stato del pagamento programmato
      if (req.body.scheduledPaymentId) {
        const scheduledPaymentId = parseInt(req.body.scheduledPaymentId);
        
        if (!isNaN(scheduledPaymentId)) {
          // Crea prima la transazione
          const [transaction] = await db
            .insert(transactions)
            .values(transactionData)
            .returning();
          
          // Poi aggiorna il pagamento programmato
          await db
            .update(scheduledPayments)
            .set({
              status: 'paid',
              transactionId: transaction.id
            })
            .where(eq(scheduledPayments.id, scheduledPaymentId));
          
          // Recupera il pagamento programmato aggiornato
          const [updatedScheduledPayment] = await db
            .select()
            .from(scheduledPayments)
            .where(eq(scheduledPayments.id, scheduledPaymentId));
          
          // Invia email di notifica se non è già stata inviata
          if (!transaction.notificationSent) {
            await sendPaymentNotification(transaction, quote, updatedScheduledPayment);
            
            // Segna la transazione come notificata
            await db
              .update(transactions)
              .set({ notificationSent: true })
              .where(eq(transactions.id, transaction.id));
          }
          
          return res.status(201).json({
            transaction,
            scheduledPayment: updatedScheduledPayment
          });
        }
      }
      
      // Caso normale: inserisce solo la transazione
      const [transaction] = await db
        .insert(transactions)
        .values(transactionData)
        .returning();
      
      // Invia email di notifica se non è già stata inviata
      if (!transaction.notificationSent && transaction.type === 'payment') {
        await sendPaymentNotification(transaction, quote);
        
        // Segna la transazione come notificata
        await db
          .update(transactions)
          .set({ notificationSent: true })
          .where(eq(transactions.id, transaction.id));
      }
      
      return res.status(201).json(transaction);
    } else {
      // Transazione generica (non collegata a un pagamento programmato)
      const [transaction] = await db
        .insert(transactions)
        .values(transactionData)
        .returning();
      
      res.status(201).json(transaction);
    }
  } catch (error) {
    console.error('Errore nella creazione della transazione:', error);
    res.status(500).json({ message: 'Errore nella creazione della transazione' });
  }
}

// Aggiorna una transazione esistente
export async function updateTransaction(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID transazione non valido' });
    }
    
    const transactionData = req.body;
    
    // Rimuovi campi che non dovrebbero essere aggiornati
    delete transactionData.id;
    delete transactionData.createdAt;
    delete transactionData.createdBy;
    
    // Aggiorna la transazione
    await db
      .update(transactions)
      .set(transactionData)
      .where(eq(transactions.id, id));
    
    // Recupera la transazione aggiornata
    const [updatedTransaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    
    if (!updatedTransaction) {
      return res.status(404).json({ message: 'Transazione non trovata' });
    }
    
    res.json(updatedTransaction);
  } catch (error) {
    console.error('Errore nell\'aggiornamento della transazione:', error);
    res.status(500).json({ message: 'Errore nell\'aggiornamento della transazione' });
  }
}

// Elimina una transazione
export async function deleteTransaction(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID transazione non valido' });
    }
    
    // Verifica se la transazione è collegata a un pagamento programmato
    const scheduledPaymentsWithTransaction = await db
      .select()
      .from(scheduledPayments)
      .where(eq(scheduledPayments.transactionId, id));
    
    // Se ci sono pagamenti programmati collegati, aggiorna il loro stato
    if (scheduledPaymentsWithTransaction.length > 0) {
      await db
        .update(scheduledPayments)
        .set({
          status: 'pending',
          transactionId: null
        })
        .where(eq(scheduledPayments.transactionId, id));
    }
    
    // Elimina la transazione
    const deletedCount = await db
      .delete(transactions)
      .where(eq(transactions.id, id));
    
    if (deletedCount === 0) {
      return res.status(404).json({ message: 'Transazione non trovata' });
    }
    
    res.json({ message: 'Transazione eliminata con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione della transazione:', error);
    res.status(500).json({ message: 'Errore nell\'eliminazione della transazione' });
  }
}

// Ottieni i pagamenti programmati
export async function getScheduledPayments(req: Request, res: Response) {
  try {
    const { quoteId, status } = req.query;
    
    let query = db.select().from(scheduledPayments);
    
    if (quoteId) {
      const quoteIdNum = parseInt(quoteId as string);
      if (!isNaN(quoteIdNum)) {
        query = query.where(eq(scheduledPayments.quoteId, quoteIdNum));
      }
    }
    
    if (status) {
      query = query.where(eq(scheduledPayments.status, status as string));
    }
    
    // Ordina per data di scadenza (più imminenti prima)
    const results = await query.orderBy(scheduledPayments.dueDate);
    
    res.json(results);
  } catch (error) {
    console.error('Errore nel recupero dei pagamenti programmati:', error);
    res.status(500).json({ message: 'Errore nel recupero dei pagamenti programmati' });
  }
}

// Crea un nuovo pagamento programmato
export async function createScheduledPayment(req: Request, res: Response) {
  try {
    const scheduledPaymentData: InsertScheduledPayment = req.body;
    
    // Validazione dei dati
    if (!scheduledPaymentData.amount || !scheduledPaymentData.dueDate || !scheduledPaymentData.quoteId) {
      return res.status(400).json({ message: 'Dati pagamento programmato incompleti' });
    }
    
    // Verifica che il preventivo esista
    const [quote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, scheduledPaymentData.quoteId));
    
    if (!quote) {
      return res.status(404).json({ message: 'Preventivo non trovato' });
    }
    
    // Crea il pagamento programmato
    const [scheduledPayment] = await db
      .insert(scheduledPayments)
      .values(scheduledPaymentData)
      .returning();
    
    res.status(201).json(scheduledPayment);
  } catch (error) {
    console.error('Errore nella creazione del pagamento programmato:', error);
    res.status(500).json({ message: 'Errore nella creazione del pagamento programmato' });
  }
}

// Aggiorna un pagamento programmato
export async function updateScheduledPayment(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID pagamento programmato non valido' });
    }
    
    const scheduledPaymentData = req.body;
    
    // Rimuovi campi che non dovrebbero essere aggiornati
    delete scheduledPaymentData.id;
    
    // Aggiorna il pagamento programmato
    await db
      .update(scheduledPayments)
      .set(scheduledPaymentData)
      .where(eq(scheduledPayments.id, id));
    
    // Recupera il pagamento programmato aggiornato
    const [updatedScheduledPayment] = await db
      .select()
      .from(scheduledPayments)
      .where(eq(scheduledPayments.id, id));
    
    if (!updatedScheduledPayment) {
      return res.status(404).json({ message: 'Pagamento programmato non trovato' });
    }
    
    res.json(updatedScheduledPayment);
  } catch (error) {
    console.error('Errore nell\'aggiornamento del pagamento programmato:', error);
    res.status(500).json({ message: 'Errore nell\'aggiornamento del pagamento programmato' });
  }
}

// Elimina un pagamento programmato
export async function deleteScheduledPayment(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID pagamento programmato non valido' });
    }
    
    // Elimina il pagamento programmato
    const deletedCount = await db
      .delete(scheduledPayments)
      .where(eq(scheduledPayments.id, id));
    
    if (deletedCount === 0) {
      return res.status(404).json({ message: 'Pagamento programmato non trovato' });
    }
    
    res.json({ message: 'Pagamento programmato eliminato con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione del pagamento programmato:', error);
    res.status(500).json({ message: 'Errore nell\'eliminazione del pagamento programmato' });
  }
}

// Ottieni un riepilogo finanziario
export async function getFinancialSummary(req: Request, res: Response) {
  try {
    const { fromDate, toDate } = req.query;
    
    // Calcola l'intervallo di date predefinito (ultimi 30 giorni) se non specificato
    const today = new Date();
    const defaultFromDate = new Date();
    defaultFromDate.setDate(today.getDate() - 30);
    
    const startDate = fromDate ? new Date(fromDate as string) : defaultFromDate;
    const endDate = toDate ? new Date(toDate as string) : today;
    
    // Formatta le date per la query SQL
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];
    
    // Calcola le entrate totali
    const totalIncome = await db
      .select({ total: sql`COALESCE(SUM(amount), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'payment'),
          gte(transactions.date, formattedStartDate),
          lte(transactions.date, formattedEndDate)
        )
      );
    
    // Calcola le spese totali
    const totalExpenses = await db
      .select({ total: sql`COALESCE(SUM(amount), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'expense'),
          gte(transactions.date, formattedStartDate),
          lte(transactions.date, formattedEndDate)
        )
      );
    
    // Calcola i pagamenti in sospeso
    const pendingPayments = await db
      .select({ total: sql`COALESCE(SUM(amount), 0)` })
      .from(scheduledPayments)
      .where(
        and(
          eq(scheduledPayments.status, 'pending'),
          gte(scheduledPayments.dueDate, formattedStartDate),
          lte(scheduledPayments.dueDate, formattedEndDate)
        )
      );
    
    // Calcola i pagamenti in ritardo
    const overduePayments = await db
      .select({ total: sql`COALESCE(SUM(amount), 0)` })
      .from(scheduledPayments)
      .where(
        and(
          eq(scheduledPayments.status, 'pending'),
          lte(scheduledPayments.dueDate, formattedStartDate),
          isNull(scheduledPayments.transactionId)
        )
      );
    
    // Ottieni le statistiche mensili per gli ultimi 12 mesi
    const monthlyStats = await getMonthlyStats();
    
    res.json({
      totalIncome: totalIncome[0].total,
      totalExpenses: totalExpenses[0].total,
      netIncome: parseFloat(totalIncome[0].total) - parseFloat(totalExpenses[0].total),
      pendingPayments: pendingPayments[0].total,
      overduePayments: overduePayments[0].total,
      monthlyStats,
      fromDate: formattedStartDate,
      toDate: formattedEndDate
    });
  } catch (error) {
    console.error('Errore nel recupero del riepilogo finanziario:', error);
    res.status(500).json({ message: 'Errore nel recupero del riepilogo finanziario' });
  }
}

// Ottieni i pagamenti per un preventivo specifico
export async function getQuoteFinancials(req: Request, res: Response) {
  try {
    const quoteId = parseInt(req.params.quoteId);
    
    if (isNaN(quoteId)) {
      return res.status(400).json({ message: 'ID preventivo non valido' });
    }
    
    // Verifica che il preventivo esista
    const [quote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, quoteId));
    
    if (!quote) {
      return res.status(404).json({ message: 'Preventivo non trovato' });
    }
    
    // Ottieni tutti i pagamenti effettuati per questo preventivo
    const payments = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.quoteId, quoteId),
          eq(transactions.type, 'payment')
        )
      )
      .orderBy(desc(transactions.date));
    
    // Ottieni tutti i pagamenti programmati per questo preventivo
    const scheduledPaymentsData = await db
      .select()
      .from(scheduledPayments)
      .where(eq(scheduledPayments.quoteId, quoteId))
      .orderBy(scheduledPayments.dueDate);
    
    // Calcola il totale pagato
    const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
    
    // Calcola il totale rimanente (basato sui pagamenti programmati non ancora pagati)
    const totalRemaining = scheduledPaymentsData
      .filter(payment => payment.status === 'pending')
      .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
    
    res.json({
      payments,
      scheduledPayments: scheduledPaymentsData,
      totalPaid,
      totalRemaining,
    });
  } catch (error) {
    console.error('Errore nel recupero dei dati finanziari del preventivo:', error);
    res.status(500).json({ message: 'Errore nel recupero dei dati finanziari del preventivo' });
  }
}

// Verifica se un preventivo è stato firmato e rimuove la scadenza del token di condivisione
export async function handleQuoteSigningFinancialUpdates(req: Request, res: Response) {
  try {
    const quoteId = parseInt(req.params.quoteId);
    
    if (isNaN(quoteId)) {
      return res.status(400).json({ message: 'ID preventivo non valido' });
    }
    
    // Verifica che il preventivo esista
    const [quote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, quoteId));
    
    if (!quote) {
      return res.status(404).json({ message: 'Preventivo non trovato' });
    }
    
    // Se il preventivo è firmato (ha lo status "signed"), rimuovi la scadenza del token di condivisione
    if (quote.status === 'signed') {
      await db
        .update(quotes)
        .set({ shareTokenExpiry: null })
        .where(eq(quotes.id, quoteId));
      
      res.json({ message: 'Scadenza token di condivisione rimossa con successo' });
    } else {
      res.status(400).json({ message: 'Il preventivo non è stato firmato' });
    }
  } catch (error) {
    console.error('Errore nell\'aggiornamento dello stato finanziario del preventivo:', error);
    res.status(500).json({ message: 'Errore nell\'aggiornamento dello stato finanziario del preventivo' });
  }
}

// Funzione di utilità per inviare notifiche email per i pagamenti
async function sendPaymentNotification(
  transaction: Transaction, 
  quote: any, 
  scheduledPayment?: ScheduledPayment
) {
  try {
    // Ottieni i dati del cliente
    const [clientData] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, quote.id))
      .innerJoin('clients', eq(quotes.clientId, sql`clients.id`));
    
    if (!clientData) {
      console.error('Dati cliente non trovati per la notifica di pagamento');
      return;
    }
    
    // Ottieni le impostazioni (per email mittente, ecc.)
    const [settings] = await db
      .select()
      .from(sql`settings`);
    
    if (!settings) {
      console.error('Impostazioni non trovate per la notifica di pagamento');
      return;
    }
    
    const clientEmail = clientData.clients.email;
    const adminEmail = settings.companyEmail;
    
    // Formatta l'importo
    const formattedAmount = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(parseFloat(transaction.amount.toString()));
    
    const paymentDescription = transaction.description || 'Pagamento';
    const quoteTitle = quote.title;
    
    // Invia email all'amministratore
    await sendEmail('Nuovo pagamento ricevuto', {
      to: adminEmail,
      subject: `Nuovo pagamento ricevuto per ${quoteTitle}`,
      html: `
        <p>È stato registrato un nuovo pagamento per il preventivo "${quoteTitle}".</p>
        <p><strong>Importo:</strong> ${formattedAmount}</p>
        <p><strong>Data:</strong> ${new Date(transaction.date).toLocaleDateString('it-IT')}</p>
        <p><strong>Descrizione:</strong> ${paymentDescription}</p>
        <p><strong>Cliente:</strong> ${clientData.clients.firstName} ${clientData.clients.lastName}</p>
        ${scheduledPayment ? `<p><strong>Pagamento programmato:</strong> ${scheduledPayment.description || 'N/A'}</p>` : ''}
      `
    });
    
    // Invia email al cliente
    await sendEmail('Conferma pagamento', {
      to: clientEmail,
      subject: 'Conferma di pagamento ricevuto',
      html: `
        <p>Gentile ${clientData.clients.firstName} ${clientData.clients.lastName},</p>
        <p>Abbiamo ricevuto con successo il seguente pagamento:</p>
        <p><strong>Preventivo:</strong> ${quoteTitle}</p>
        <p><strong>Importo:</strong> ${formattedAmount}</p>
        <p><strong>Data:</strong> ${new Date(transaction.date).toLocaleDateString('it-IT')}</p>
        <p><strong>Descrizione:</strong> ${paymentDescription}</p>
        <p>Grazie per la tua fiducia.</p>
        <p>Cordiali saluti,<br>${settings.companyName}</p>
      `
    });
    
    return true;
  } catch (error) {
    console.error('Errore nell\'invio della notifica di pagamento:', error);
    return false;
  }
}

// Funzione di utilità per ottenere statistiche mensili
async function getMonthlyStats() {
  try {
    // Definiamo la query per ottenere statistiche mensili per entrate e uscite negli ultimi 12 mesi
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    const formattedStartDate = oneYearAgo.toISOString().split('T')[0];
    
    // Query per entrate mensili
    const monthlyIncome = await db
      .select({
        month: sql`TO_CHAR(date, 'YYYY-MM')`,
        total: sql`COALESCE(SUM(amount), 0)`
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'payment'),
          gte(transactions.date, formattedStartDate)
        )
      )
      .groupBy(sql`TO_CHAR(date, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(date, 'YYYY-MM')`);
    
    // Query per uscite mensili
    const monthlyExpenses = await db
      .select({
        month: sql`TO_CHAR(date, 'YYYY-MM')`,
        total: sql`COALESCE(SUM(amount), 0)`
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'expense'),
          gte(transactions.date, formattedStartDate)
        )
      )
      .groupBy(sql`TO_CHAR(date, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(date, 'YYYY-MM')`);
    
    // Combina i risultati
    const months = Array.from(new Set([
      ...monthlyIncome.map(item => item.month),
      ...monthlyExpenses.map(item => item.month)
    ])).sort();
    
    return months.map(month => {
      const incomeItem = monthlyIncome.find(item => item.month === month);
      const expenseItem = monthlyExpenses.find(item => item.month === month);
      
      return {
        month,
        income: incomeItem ? parseFloat(incomeItem.total.toString()) : 0,
        expenses: expenseItem ? parseFloat(expenseItem.total.toString()) : 0,
        net: (incomeItem ? parseFloat(incomeItem.total.toString()) : 0) - 
             (expenseItem ? parseFloat(expenseItem.total.toString()) : 0)
      };
    });
  } catch (error) {
    console.error('Errore nel recupero delle statistiche mensili:', error);
    return [];
  }
}