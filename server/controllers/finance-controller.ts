import { db } from "../db";
import { eq, and, or, sql, sum, count, isNull, desc, asc, SQL, between } from "drizzle-orm";
import { transactions, quotes, scheduledPayments, clients } from "@shared/schema";
import { format, parseISO, isAfter, isBefore, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { sendPaymentNotification } from "../services/email-service";

/**
 * Controller per la gestione delle finanze:
 * - transazioni (incassi e spese)
 * - pagamenti programmati
 * - dashboard finanziaria
 */
export const financeController = {
  // TRANSAZIONI
  
  /**
   * Ottiene tutte le transazioni
   */
  async getTransactions() {
    try {
      const result = await db.select().from(transactions)
        .orderBy(desc(transactions.date));
      
      return result;
    } catch (error) {
      console.error("Errore nel recupero delle transazioni:", error);
      throw error;
    }
  },
  
  /**
   * Ottiene una transazione per ID
   */
  async getTransactionById(id: number) {
    try {
      const [transaction] = await db.select()
        .from(transactions)
        .where(eq(transactions.id, id));
      
      if (!transaction) {
        throw new Error("Transazione non trovata");
      }
      
      return transaction;
    } catch (error) {
      console.error(`Errore nel recupero della transazione ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Crea una nuova transazione
   */
  async createTransaction(data: any) {
    try {
      // Verifico se è collegata a un pagamento programmato
      if (data.scheduledPaymentId) {
        // Aggiorno lo stato del pagamento programmato
        await db.update(scheduledPayments)
          .set({ 
            status: "paid",
            transactionId: null // Sarà aggiornato dopo che avremo l'ID della transazione
          })
          .where(eq(scheduledPayments.id, data.scheduledPaymentId));
      }
      
      // Creo la transazione
      const [transaction] = await db.insert(transactions)
        .values({
          type: data.type,
          amount: data.amount.toString(),
          date: new Date(data.date),
          description: data.description || null,
          // Nota: la colonna 'source' non esiste nella tabella transactions
          // usiamo direttamente quote_id per tracciare l'origine
          quote_id: data.sourceId || null,
          status: data.status || "completed",
          payment_method: data.paymentMethod || null,
          reference: data.reference || null,
          notes: data.notes || null,
          createdBy: data.createdBy || null,
          category: data.category || null,
          attachmentPath: data.attachmentPath || null,
          notificationSent: false,
          scheduledPaymentId: data.scheduledPaymentId || null
        })
        .returning();
      
      // Se collegata a un pagamento programmato, aggiorno il riferimento
      if (data.scheduledPaymentId) {
        await db.update(scheduledPayments)
          .set({ transactionId: transaction.id })
          .where(eq(scheduledPayments.id, data.scheduledPaymentId));
      }
      
      // Se è una transazione di tipo "income" e associata a un preventivo, invio una notifica
      if (data.type === "income" && data.sourceId) {
        // Recupero i dati del preventivo e cliente
        const [quote] = await db.select()
          .from(quotes)
          .where(eq(quotes.id, data.sourceId));
        
        if (quote) {
          // Recupero il cliente
          const [client] = await db.select()
            .from(clients)
            .where(eq(clients.id, quote.clientId));
          
          if (client && client.email) {
            // Invio notifica
            try {
              await sendPaymentNotification({
                clientEmail: client.email,
                clientName: `${client.firstName} ${client.lastName}`,
                amount: data.amount,
                description: data.description || "Pagamento",
                quoteTitle: quote.title,
                date: format(new Date(data.date), "dd/MM/yyyy")
              });
              
              // Aggiorno il flag di notifica
              await db.update(transactions)
                .set({ notificationSent: true })
                .where(eq(transactions.id, transaction.id));
            } catch (emailError) {
              console.error("Errore nell'invio della notifica di pagamento:", emailError);
            }
          }
        }
      }
      
      return transaction;
    } catch (error) {
      console.error("Errore nella creazione della transazione:", error);
      throw error;
    }
  },
  
  /**
   * Aggiorna una transazione esistente
   */
  async updateTransaction(id: number, data: any) {
    try {
      const [updatedTransaction] = await db.update(transactions)
        .set({
          type: data.type,
          amount: data.amount.toString(),
          date: new Date(data.date),
          description: data.description || null,
          // Utilizziamo quote_id direttamente invece di sourceId
          quote_id: data.sourceId || null,
          status: data.status || "completed",
          payment_method: data.paymentMethod || null,
          reference: data.reference || null,
          notes: data.notes || null,
          category: data.category || null,
          attachment_path: data.attachmentPath || null
        })
        .where(eq(transactions.id, id))
        .returning();
      
      if (!updatedTransaction) {
        throw new Error("Transazione non trovata");
      }
      
      return updatedTransaction;
    } catch (error) {
      console.error(`Errore nell'aggiornamento della transazione ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Elimina una transazione
   */
  async deleteTransaction(id: number) {
    try {
      // Verifico se è collegata a un pagamento programmato
      const [transaction] = await db.select()
        .from(transactions)
        .where(eq(transactions.id, id));
      
      if (!transaction) {
        throw new Error("Transazione non trovata");
      }
      
      // Se collegata a un pagamento programmato, aggiorno lo stato
      if (transaction.scheduledPaymentId) {
        await db.update(scheduledPayments)
          .set({ 
            status: "pending",
            transactionId: null
          })
          .where(eq(scheduledPayments.id, transaction.scheduledPaymentId));
      }
      
      // Elimino la transazione
      const [deletedTransaction] = await db.delete(transactions)
        .where(eq(transactions.id, id))
        .returning();
      
      return deletedTransaction;
    } catch (error) {
      console.error(`Errore nell'eliminazione della transazione ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Ottiene le transazioni relative a un preventivo
   */
  async getTransactionsByQuoteId(quoteId: number) {
    try {
      const result = await db.select()
        .from(transactions)
        .where(eq(transactions.quote_id, quoteId))
        .orderBy(desc(transactions.date));
      
      return result;
    } catch (error) {
      console.error(`Errore nel recupero delle transazioni per il preventivo ${quoteId}:`, error);
      throw error;
    }
  },
  
  // PAGAMENTI PROGRAMMATI
  
  /**
   * Ottiene tutti i pagamenti programmati
   */
  async getScheduledPayments() {
    try {
      const currentDate = new Date();
      
      // Recupero i pagamenti programmati
      const payments = await db.select({
        payment: scheduledPayments,
        quote: {
          id: quotes.id,
          title: quotes.title,
          clientId: quotes.clientId
        }
      })
      .from(scheduledPayments)
      .leftJoin(quotes, eq(scheduledPayments.quoteId, quotes.id))
      .orderBy(asc(scheduledPayments.dueDate));
      
      // Arricchisco con i dati del cliente
      const result = await Promise.all(payments.map(async (item) => {
        let client = null;
        
        if (item.quote?.clientId) {
          [client] = await db.select()
            .from(clients)
            .where(eq(clients.id, item.quote.clientId));
        }
        
        // Aggiungo lo stato overdue se necessario
        let status = item.payment.status;
        if (status === "pending" && isBefore(new Date(item.payment.dueDate), currentDate)) {
          status = "overdue";
        }
        
        return {
          ...item.payment,
          status,
          quote: {
            ...item.quote,
            client: client ? {
              id: client.id,
              firstName: client.firstName,
              lastName: client.lastName
            } : undefined
          }
        };
      }));
      
      return result;
    } catch (error) {
      console.error("Errore nel recupero dei pagamenti programmati:", error);
      throw error;
    }
  },
  
  /**
   * Ottiene i pagamenti programmati per un preventivo
   */
  async getScheduledPaymentsByQuoteId(quoteId: number) {
    try {
      const currentDate = new Date();
      
      const payments = await db.select()
        .from(scheduledPayments)
        .where(eq(scheduledPayments.quoteId, quoteId))
        .orderBy(asc(scheduledPayments.dueDate));
      
      // Aggiungo lo stato overdue se necessario
      return payments.map(payment => {
        let status = payment.status;
        if (status === "pending" && isBefore(new Date(payment.dueDate), currentDate)) {
          status = "overdue";
        }
        
        return {
          ...payment,
          status
        };
      });
    } catch (error) {
      console.error(`Errore nel recupero dei pagamenti programmati per il preventivo ${quoteId}:`, error);
      throw error;
    }
  },
  
  /**
   * Crea un nuovo pagamento programmato
   */
  async createScheduledPayment(data: any) {
    try {
      const [payment] = await db.insert(scheduledPayments)
        .values({
          quoteId: data.quoteId,
          amount: data.amount.toString(),
          dueDate: new Date(data.dueDate),
          description: data.description || null,
          status: data.status || "pending",
          paymentMethod: data.paymentMethod || null,
          notes: data.notes || null,
          reminderSent: false
        })
        .returning();
      
      return payment;
    } catch (error) {
      console.error("Errore nella creazione del pagamento programmato:", error);
      throw error;
    }
  },
  
  /**
   * Aggiorna un pagamento programmato
   */
  async updateScheduledPayment(id: number, data: any) {
    try {
      const [updatedPayment] = await db.update(scheduledPayments)
        .set({
          amount: data.amount.toString(),
          dueDate: new Date(data.dueDate),
          description: data.description || null,
          status: data.status || "pending",
          paymentMethod: data.paymentMethod || null,
          notes: data.notes || null
        })
        .where(eq(scheduledPayments.id, id))
        .returning();
      
      if (!updatedPayment) {
        throw new Error("Pagamento programmato non trovato");
      }
      
      return updatedPayment;
    } catch (error) {
      console.error(`Errore nell'aggiornamento del pagamento programmato ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Elimina un pagamento programmato
   */
  async deleteScheduledPayment(id: number) {
    try {
      const [payment] = await db.select()
        .from(scheduledPayments)
        .where(eq(scheduledPayments.id, id));
      
      if (!payment) {
        throw new Error("Pagamento programmato non trovato");
      }
      
      // Se è già collegato a una transazione, non posso eliminarlo
      if (payment.transactionId) {
        throw new Error("Impossibile eliminare un pagamento già effettuato");
      }
      
      const [deletedPayment] = await db.delete(scheduledPayments)
        .where(eq(scheduledPayments.id, id))
        .returning();
      
      return deletedPayment;
    } catch (error) {
      console.error(`Errore nell'eliminazione del pagamento programmato ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Invia un promemoria per un pagamento programmato
   */
  async sendPaymentReminder(id: number) {
    try {
      const [payment] = await db.select()
        .from(scheduledPayments)
        .where(eq(scheduledPayments.id, id));
      
      if (!payment) {
        throw new Error("Pagamento programmato non trovato");
      }
      
      if (payment.status === "paid") {
        throw new Error("Impossibile inviare un promemoria per un pagamento già effettuato");
      }
      
      if (payment.reminderSent) {
        throw new Error("Promemoria già inviato per questo pagamento");
      }
      
      // Recupero i dati del preventivo e cliente
      const [quote] = await db.select()
        .from(quotes)
        .where(eq(quotes.id, payment.quoteId));
      
      if (!quote) {
        throw new Error("Preventivo non trovato");
      }
      
      const [client] = await db.select()
        .from(clients)
        .where(eq(clients.id, quote.clientId));
      
      if (!client || !client.email) {
        throw new Error("Cliente non trovato o email non disponibile");
      }
      
      // Invio promemoria
      // TODO: Implementare il servizio di invio email per i promemoria
      console.log(`Invio promemoria per il pagamento ${id} a ${client.email}`);
      
      // Aggiorno il flag di promemoria
      const [updatedPayment] = await db.update(scheduledPayments)
        .set({ reminderSent: true })
        .where(eq(scheduledPayments.id, id))
        .returning();
      
      return updatedPayment;
    } catch (error) {
      console.error(`Errore nell'invio del promemoria per il pagamento ${id}:`, error);
      throw error;
    }
  },
  
  // STATISTICHE FINANZIARIE
  
  /**
   * Ottiene le statistiche finanziarie per la dashboard
   */
  async getFinancialStats(params: { period?: string, year?: number, month?: number } = {}) {
    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      
      // Periodo predefinito: mese corrente
      let startDate = startOfMonth(currentDate);
      let endDate = endOfMonth(currentDate);
      
      // Se specificato, utilizzo il periodo richiesto
      if (params.period) {
        switch (params.period) {
          case "year":
            startDate = new Date(params.year || currentYear, 0, 1);
            endDate = new Date(params.year || currentYear, 11, 31);
            break;
          case "month":
            const year = params.year || currentYear;
            const month = params.month !== undefined ? params.month : currentMonth;
            startDate = startOfMonth(new Date(year, month, 1));
            endDate = endOfMonth(new Date(year, month, 1));
            break;
          case "last_month":
            startDate = startOfMonth(subMonths(currentDate, 1));
            endDate = endOfMonth(subMonths(currentDate, 1));
            break;
          case "last_3_months":
            startDate = startOfMonth(subMonths(currentDate, 3));
            endDate = endOfMonth(currentDate);
            break;
          case "last_6_months":
            startDate = startOfMonth(subMonths(currentDate, 6));
            endDate = endOfMonth(currentDate);
            break;
          case "last_12_months":
            startDate = startOfMonth(subMonths(currentDate, 12));
            endDate = endOfMonth(currentDate);
            break;
        }
      }
      
      // Query per incassi totali nel periodo
      const [incomeResult] = await db
        .select({ total: sql`SUM(CAST(${transactions.amount} AS DECIMAL))` })
        .from(transactions)
        .where(and(
          eq(transactions.type, "income"),
          between(transactions.date, startDate, endDate)
        ));
      
      // Query per spese totali nel periodo
      const [expensesResult] = await db
        .select({ total: sql`SUM(CAST(${transactions.amount} AS DECIMAL))` })
        .from(transactions)
        .where(and(
          eq(transactions.type, "expense"),
          between(transactions.date, startDate, endDate)
        ));
      
      // Query per pagamenti programmati scaduti
      const [overdueResult] = await db
        .select({ count: count() })
        .from(scheduledPayments)
        .where(and(
          eq(scheduledPayments.status, "pending"),
          sql`${scheduledPayments.dueDate} < CURRENT_DATE`
        ));
      
      // Query per pagamenti programmati in arrivo
      const [upcomingResult] = await db
        .select({ count: count() })
        .from(scheduledPayments)
        .where(and(
          eq(scheduledPayments.status, "pending"),
          sql`${scheduledPayments.dueDate} >= CURRENT_DATE`,
          sql`${scheduledPayments.dueDate} <= CURRENT_DATE + INTERVAL '30 day'`
        ));
      
      // Query per dati mensili dell'anno corrente (per grafici)
      const monthlyData = await Promise.all([...Array(12).keys()].map(async (month) => {
        const monthStartDate = new Date(currentYear, month, 1);
        const monthEndDate = endOfMonth(monthStartDate);
        
        // Incassi del mese
        const [incomeItem] = await db
          .select({ total: sql`SUM(CAST(${transactions.amount} AS DECIMAL))` })
          .from(transactions)
          .where(and(
            eq(transactions.type, "income"),
            between(transactions.date, monthStartDate, monthEndDate)
          ));
        
        // Spese del mese
        const [expenseItem] = await db
          .select({ total: sql`SUM(CAST(${transactions.amount} AS DECIMAL))` })
          .from(transactions)
          .where(and(
            eq(transactions.type, "expense"),
            between(transactions.date, monthStartDate, monthEndDate)
          ));
        
        return {
          month: format(monthStartDate, "MMMM", { locale: it }),
          income: parseFloat(incomeItem.total || "0"),
          expenses: parseFloat(expenseItem.total || "0"),
          profit: parseFloat(incomeItem.total || "0") - parseFloat(expenseItem.total || "0")
        };
      }));
      
      // Query per categorie di spesa nel periodo
      const expenseCategories = await db
        .select({
          category: transactions.category,
          total: sql`SUM(CAST(${transactions.amount} AS DECIMAL))`
        })
        .from(transactions)
        .where(and(
          eq(transactions.type, "expense"),
          between(transactions.date, startDate, endDate)
        ))
        .groupBy(transactions.category)
        .orderBy(sql`SUM(CAST(${transactions.amount} AS DECIMAL))` as any, "desc"); // Usare any per evitare errori TS
      
      return {
        period: {
          start: format(startDate, "yyyy-MM-dd"),
          end: format(endDate, "yyyy-MM-dd"),
          label: params.period || "month"
        },
        summary: {
          income: parseFloat(incomeResult.total || "0"),
          expenses: parseFloat(expensesResult.total || "0"),
          profit: parseFloat(incomeResult.total || "0") - parseFloat(expensesResult.total || "0"),
          overduePayments: overdueResult.count,
          upcomingPayments: upcomingResult.count
        },
        monthlyData,
        expenseCategories: expenseCategories.map(item => ({
          category: item.category || "Non specificata",
          total: parseFloat(item.total || "0")
        }))
      };
    } catch (error) {
      console.error("Errore nel recupero delle statistiche finanziarie:", error);
      throw error;
    }
  },
  
  /**
   * Ottiene i dati finanziari per un preventivo
   */
  async getQuoteFinancialData(quoteId: number) {
    try {
      // Recupero le transazioni
      const payments = await this.getTransactionsByQuoteId(quoteId);
      
      // Recupero i pagamenti programmati
      const scheduledPaymentsList = await this.getScheduledPaymentsByQuoteId(quoteId);
      
      // Calcolo totali
      const totalPaid = payments
        .filter(p => p.type === "income")
        .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
      
      const totalScheduled = scheduledPaymentsList
        .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
      
      // Recupero il preventivo per ottenere il totale
      const [quote] = await db.select()
        .from(quotes)
        .where(eq(quotes.id, quoteId));
      
      if (!quote) {
        throw new Error("Preventivo non trovato");
      }
      
      // I campi subtotal, total, discount sono virtuali e calcolati dal frontend
      // Utilizzo il campo total se definito, altrimenti calcolo in base ai pagamenti
      const quoteTotal = quote.subtotal !== undefined && quote.total !== undefined 
        ? (quote.total as number) 
        : (totalPaid + totalScheduled); // Stima basata su pagamenti
      
      return {
        payments,
        scheduledPayments: scheduledPaymentsList,
        summary: {
          quoteTotal,
          totalPaid,
          totalScheduled,
          remainingAmount: quoteTotal - totalPaid
        }
      };
    } catch (error) {
      console.error(`Errore nel recupero dei dati finanziari per il preventivo ${quoteId}:`, error);
      throw error;
    }
  }
};