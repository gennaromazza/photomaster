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
    const [transaction] = await db.insert(transactions)
      .values({
        amount: data.amount,
        transactionType: data.transactionType,
        paymentMethod: data.paymentMethod,
        quoteId: data.quoteId,
        status: data.status || 'completed',
        date: data.date ? new Date(data.date) : new Date(),
        scheduledPaymentId: data.scheduledPaymentId,
        description: data.description,
        createdBy: data.createdBy
      })
      .returning();
    
    // Se questa transazione è collegata a un pagamento programmato, aggiorniamo lo stato
    if (data.scheduledPaymentId) {
      await db.update(scheduledPayments)
        .set({ 
          status: 'paid',
          transactionId: transaction.id
        })
        .where(eq(scheduledPayments.id, data.scheduledPaymentId));
    }
    
    return transaction;
  },
  
  async updateTransaction(id: number, data: any) {
    const [transaction] = await db.update(transactions)
      .set({
        amount: data.amount,
        transactionType: data.transactionType,
        paymentMethod: data.paymentMethod,
        status: data.status,
        date: data.date ? new Date(data.date) : undefined,
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
    const [payment] = await db.insert(scheduledPayments)
      .values({
        quoteId: data.quoteId,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        description: data.description,
        status: 'pending'
      })
      .returning();
    
    return payment;
  },
  
  async updateScheduledPayment(id: number, data: any) {
    // Verifica se il pagamento è già stato effettuato
    const [existingPayment] = await db.select()
      .from(scheduledPayments)
      .where(eq(scheduledPayments.id, id));
    
    if (existingPayment && existingPayment.status === 'paid') {
      throw new Error("Impossibile modificare un pagamento già effettuato");
    }
    
    const [payment] = await db.update(scheduledPayments)
      .set({
        amount: data.amount,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        description: data.description,
        status: data.status
      })
      .where(eq(scheduledPayments.id, id))
      .returning();
    
    return payment;
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
    
    // Calcola il prezzo totale del preventivo
    let totalAmount = quote.totalAmount || 0;
    
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
    
    return {
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
      status: quote.status
    };
  }
};

export default financeController;