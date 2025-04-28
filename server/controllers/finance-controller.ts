import { db } from '../db';
import { transactions, scheduledPayments, quotes } from '@shared/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { isAfter, isBefore, isEqual, format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export const financeController = {
  // Esportiamo db e operatori per uso interno
  db,
  eq,
  quotes,
  transactions,
  scheduledPayments,
  
  // TRANSAZIONI
  
  async getTransactions() {
    return db.select().from(transactions).orderBy(desc(transactions.date));
  },
  
  async getTransactionById(id: number) {
    const [transaction] = await db.select()
      .from(transactions)
      .where(eq(transactions.id, id));
    
    return transaction;
  },
  
  async getTransactionsByQuoteId(quoteId: number) {
    return db.select()
      .from(transactions)
      .where(eq(transactions.quoteId, quoteId))
      .orderBy(desc(transactions.date));
  },
  
  async createTransaction(data: any) {
    try {
      console.log("Creazione transazione con dati:", {
        amount: data.amount,
        transactionType: data.transactionType,
        paymentMethod: data.paymentMethod,
        quoteId: data.quoteId,
        date: data.date,
        description: data.description
      });
      
      // Assicuriamoci che la data sia formattata correttamente per Postgres
      let dateValue;
      if (data.date) {
        if (data.date instanceof Date) {
          // Convertiamo Date in stringa ISO
          dateValue = format(data.date, 'yyyy-MM-dd');
        } else {
          // Se è già una stringa, la formatiamo in un formato che Postgres accetta sicuramente
          try {
            dateValue = format(new Date(data.date), 'yyyy-MM-dd');
          } catch (e) {
            console.error("Errore nel formato data:", e);
            dateValue = format(new Date(), 'yyyy-MM-dd');
          }
        }
      } else {
        dateValue = format(new Date(), 'yyyy-MM-dd');
      }
      
      console.log(`Data formattata per transazione: ${dateValue}`);
      
      const [transaction] = await db.insert(transactions)
        .values({
          amount: data.amount,
          transactionType: data.transactionType,
          paymentMethod: data.paymentMethod,
          quoteId: data.quoteId,
          status: data.status || 'completed',
          date: dateValue,
          scheduledPaymentId: data.scheduledPaymentId,
          description: data.description,
          createdBy: data.createdBy
        })
        .returning();
      
      console.log("Transazione creata con successo:", transaction);
      
      // Se questa transazione è collegata a un pagamento programmato, aggiorniamo lo stato
      if (data.scheduledPaymentId) {
        await db.update(scheduledPayments)
          .set({ 
            status: 'paid',
            transactionId: transaction.id
          })
          .where(eq(scheduledPayments.id, data.scheduledPaymentId));
          
        console.log(`Aggiornato stato pagamento programmato ID: ${data.scheduledPaymentId} a 'paid'`);
      }
      
      return transaction;
    } catch (error) {
      console.error("Errore dettagliato nella creazione della transazione:", error);
      throw error;
    }
  },
  
  async updateTransaction(id: number, data: any) {
    try {
      console.log(`Aggiornamento transazione ${id} con dati:`, {
        amount: data.amount,
        transactionType: data.transactionType,
        paymentMethod: data.paymentMethod,
        status: data.status,
        date: data.date,
        description: data.description
      });
      
      // Gestiamo la data in modo simile a createTransaction, con lo stesso formato
      let dateValue;
      if (data.date) {
        if (data.date instanceof Date) {
          // Convertiamo Date in stringa formato YYYY-MM-DD
          dateValue = format(data.date, 'yyyy-MM-dd');
        } else {
          // Se è già una stringa, la formatiamo in un formato che Postgres accetta sicuramente
          try {
            dateValue = format(new Date(data.date), 'yyyy-MM-dd');
          } catch (e) {
            console.error("Errore nel formato data:", e);
            dateValue = format(new Date(), 'yyyy-MM-dd');
          }
        }
      } else {
        dateValue = undefined;
      }
      
      console.log(`Data formattata per aggiornamento transazione: ${dateValue}`);
      
      const [transaction] = await db.update(transactions)
        .set({
          amount: data.amount,
          transactionType: data.transactionType,
          paymentMethod: data.paymentMethod,
          status: data.status,
          date: dateValue,
          description: data.description
        })
        .where(eq(transactions.id, id))
        .returning();
      
      // Se c'è un pagamento programmato associato, aggiorniamo lo stato
      if (transaction.scheduledPaymentId) {
        await db.update(scheduledPayments)
          .set({ 
            status: 'paid'
          })
          .where(eq(scheduledPayments.id, transaction.scheduledPaymentId));
      }
      
      return transaction;
    } catch (error) {
      console.error(`Errore dettagliato nell'aggiornamento della transazione ${id}:`, error);
      throw error;
    }
  },
  
  async deleteTransaction(id: number) {
    // Controlla se la transazione è associata a un pagamento programmato
    const [transaction] = await db.select()
      .from(transactions)
      .where(eq(transactions.id, id));
    
    if (transaction?.scheduledPaymentId) {
      // Reimposta lo stato del pagamento programmato a 'pending'
      await db.update(scheduledPayments)
        .set({ 
          status: 'pending',
          transactionId: null
        })
        .where(eq(scheduledPayments.id, transaction.scheduledPaymentId));
    }
    
    const [deleted] = await db.delete(transactions)
      .where(eq(transactions.id, id))
      .returning();
    
    return deleted;
  },
  
  // PAGAMENTI PROGRAMMATI
  
  async getScheduledPayments() {
    return db.select().from(scheduledPayments).orderBy(desc(scheduledPayments.dueDate));
  },
  
  async getScheduledPaymentsByQuoteId(quoteId: number) {
    return db.select()
      .from(scheduledPayments)
      .where(eq(scheduledPayments.quoteId, quoteId))
      .orderBy(desc(scheduledPayments.dueDate));
  },
  
  async createScheduledPayment(data: any) {
    try {
      console.log("Creazione pagamento programmato con dati:", {
        quoteId: data.quoteId,
        amount: data.amount,
        dueDate: data.dueDate,
        description: data.description,
        paymentMethod: data.paymentMethod
      });
      
      // Gestione sicura della data nel formato corretto per Postgres
      let dueDateValue;
      if (data.dueDate) {
        if (data.dueDate instanceof Date) {
          dueDateValue = format(data.dueDate, 'yyyy-MM-dd');
        } else {
          try {
            dueDateValue = format(new Date(data.dueDate), 'yyyy-MM-dd');
          } catch (e) {
            console.error("Errore nel formato data:", e);
            throw new Error("Formato data non valido");
          }
        }
      } else {
        throw new Error("Data di scadenza obbligatoria");
      }
      
      console.log(`Data formattata per pagamento programmato: ${dueDateValue}`);
      
      const [payment] = await db.insert(scheduledPayments)
        .values({
          quoteId: data.quoteId,
          amount: data.amount,
          dueDate: dueDateValue,
          description: data.description,
          paymentMethod: data.paymentMethod,
          status: 'pending'
        })
        .returning();
      
      return payment;
    } catch (error) {
      console.error("Errore dettagliato nella creazione del pagamento programmato:", error);
      throw error;
    }
  },
  
  async updateScheduledPayment(id: number, data: any) {
    try {
      // Verifica se il pagamento è già stato effettuato
      const [existingPayment] = await db.select()
        .from(scheduledPayments)
        .where(eq(scheduledPayments.id, id));
      
      if (existingPayment && existingPayment.status === 'paid') {
        throw new Error("Impossibile modificare un pagamento già effettuato");
      }
      
      // Gestione sicura della data
      let dueDateValue;
      if (data.dueDate) {
        if (data.dueDate instanceof Date) {
          dueDateValue = data.dueDate.toISOString();
        } else {
          dueDateValue = new Date(data.dueDate);
        }
      } else {
        dueDateValue = undefined;
      }
      
      const [payment] = await db.update(scheduledPayments)
        .set({
          amount: data.amount,
          dueDate: dueDateValue,
          description: data.description,
          status: data.status
        })
        .where(eq(scheduledPayments.id, id))
        .returning();
      
      return payment;
    } catch (error) {
      console.error(`Errore dettagliato nell'aggiornamento del pagamento programmato ${id}:`, error);
      throw error;
    }
  },
  
  async deleteScheduledPayment(id: number) {
    // Verifica se il pagamento è già stato effettuato
    const [existingPayment] = await db.select()
      .from(scheduledPayments)
      .where(eq(scheduledPayments.id, id));
    
    if (existingPayment && existingPayment.status === 'paid') {
      throw new Error("Impossibile eliminare un pagamento già effettuato");
    }
    
    const [payment] = await db.delete(scheduledPayments)
      .where(eq(scheduledPayments.id, id))
      .returning();
    
    return payment;
  },
  
  async sendPaymentReminder(id: number) {
    // Implementazione per inviare un promemoria al cliente
    // Per ora è solo un placeholder, la vera implementazione invierebbe una email
    
    const [payment] = await db.select()
      .from(scheduledPayments)
      .leftJoin(quotes, eq(scheduledPayments.quoteId, quotes.id))
      .where(eq(scheduledPayments.id, id));
    
    if (!payment) {
      throw new Error("Pagamento non trovato");
    }
    
    // Qui andrebbe l'invio dell'email
    console.log(`[REMINDER] Inviato promemoria per il pagamento ID ${id}`);
    
    return { success: true, message: 'Promemoria inviato' };
  },
  
  // STATISTICHE FINANZIARIE
  
  async getFinancialStats({ period = 'year', year, month }: { period?: string, year?: number, month?: number } = {}) {
    const now = new Date();
    const currentYear = year || now.getFullYear();
    const currentMonth = month || now.getMonth() + 1;
    
    let startDate: Date;
    let endDate: Date;
    
    if (period === 'month') {
      startDate = startOfMonth(new Date(currentYear, currentMonth - 1));
      endDate = endOfMonth(new Date(currentYear, currentMonth - 1));
    } else if (period === 'year') {
      startDate = startOfYear(new Date(currentYear, 0));
      endDate = endOfYear(new Date(currentYear, 0));
    } else if (period === 'last3months') {
      endDate = now;
      startDate = subMonths(now, 3);
    } else {
      // Default: tutto
      startDate = new Date(0); // Jan 1, 1970
      endDate = now;
    }
    
    // Calcolo delle entrate totali
    const incomeResult = await db.select({
      total: sql<number>`sum(${transactions.amount})`.mapWith(Number)
    })
    .from(transactions)
    .where(and(
      eq(transactions.transactionType, 'income'),
      eq(transactions.status, 'completed'),
      gte(transactions.date, startDate),
      lte(transactions.date, endDate)
    ));
    
    // Calcolo delle uscite totali
    const expenseResult = await db.select({
      total: sql<number>`sum(${transactions.amount})`.mapWith(Number)
    })
    .from(transactions)
    .where(and(
      eq(transactions.transactionType, 'expense'),
      eq(transactions.status, 'completed'),
      gte(transactions.date, startDate),
      lte(transactions.date, endDate)
    ));
    
    // Calcolo dei pagamenti in sospeso
    const pendingResult = await db.select({
      total: sql<number>`sum(${scheduledPayments.amount})`.mapWith(Number)
    })
    .from(scheduledPayments)
    .where(and(
      eq(scheduledPayments.status, 'pending'),
      lte(scheduledPayments.dueDate, now)
    ));
    
    // Calcolo dei pagamenti futuri
    const upcomingResult = await db.select({
      total: sql<number>`sum(${scheduledPayments.amount})`.mapWith(Number)
    })
    .from(scheduledPayments)
    .where(and(
      eq(scheduledPayments.status, 'pending'),
      gte(scheduledPayments.dueDate, now)
    ));
    
    return {
      income: incomeResult[0]?.total || 0,
      expenses: expenseResult[0]?.total || 0,
      pendingPayments: pendingResult[0]?.total || 0,
      upcomingPayments: upcomingResult[0]?.total || 0,
      netProfit: (incomeResult[0]?.total || 0) - (expenseResult[0]?.total || 0),
      period,
      year: currentYear,
      month: period === 'month' ? currentMonth : undefined,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    };
  },
  
  async getQuoteFinancialData(quoteId: number) {
    // Ottieni dettagli preventivo
    const [quote] = await db.select()
      .from(quotes)
      .where(eq(quotes.id, quoteId));
    
    if (!quote) {
      throw new Error("Preventivo non trovato");
    }
    
    // Calcola il prezzo totale del preventivo considerando tutte le possibili fonti
    // Priorità: totalAmount (se esiste) -> quoteTotal -> modulesSum -> 0
    // Nota: Queste potrebbero essere proprietà virtuali calcolate al volo o memorizzate nel DB
    let totalAmount = quote.totalAmount || quote.quoteTotal || quote.modulesSum || 0;
    
    console.log("Finance controller - Quote financial data:", {
      quoteId,
      totalAmount,
      quoteData: {
        totalAmount: quote.totalAmount,
        quoteTotal: quote.quoteTotal,
        modulesSum: quote.modulesSum
      }
    });
    
    // Ottieni tutte le transazioni legate al preventivo
    const transactionsList = await db.select()
      .from(transactions)
      .where(and(
        eq(transactions.quoteId, quoteId),
        eq(transactions.status, 'completed')
      ));
    
    // Calcola l'importo incassato
    const totalPaid = transactionsList
      .filter(t => t.transactionType === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Ottieni i pagamenti programmati
    const scheduledPaymentsList = await db.select()
      .from(scheduledPayments)
      .where(eq(scheduledPayments.quoteId, quoteId))
      .orderBy(scheduledPayments.dueDate);
    
    // Calcola importi pendenti e futuri
    const now = new Date();
    const pendingPayments = scheduledPaymentsList
      .filter(p => p.status === 'pending' && isBefore(p.dueDate, now))
      .reduce((sum, p) => sum + p.amount, 0);
    
    const upcomingPayments = scheduledPaymentsList
      .filter(p => p.status === 'pending' && !isBefore(p.dueDate, now))
      .reduce((sum, p) => sum + p.amount, 0);
    
    // Prepara il risultato includendo anche la proprietà summary per retrocompatibilità
    const result = {
      quoteId,
      quoteTitle: quote.title,
      totalAmount,
      totalPaid,
      remainingAmount: totalAmount - totalPaid,
      pendingPayments,
      upcomingPayments,
      paidPercentage: totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0,
      transactions: transactionsList,
      scheduledPayments: scheduledPaymentsList,
      status: quote.status,
      // Aggiungiamo una struttura summary per la retrocompatibilità
      summary: {
        quoteTotal: totalAmount,
        totalPaid,
        remainingBalance: totalAmount - totalPaid,
        pendingPayments,
        upcomingPayments
      }
    };
    
    console.log("Finance controller - Returning quote financial data:", {
      quoteId, 
      totalAmount, 
      summaryTotal: result.summary.quoteTotal
    });
    
    return result;
  }
};

export default financeController;