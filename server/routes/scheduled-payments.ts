import express from "express";
import { db } from "../db";
import { scheduledPayments } from "@shared/schema";
import { eq, asc, isBefore } from "drizzle-orm";
import { isAfter, isBefore as dateFnsBefore } from "date-fns";

const router = express.Router();

/**
 * Ottiene tutti i pagamenti programmati per un preventivo
 */
router.get("/by-quote/:quoteId", async (req, res) => {
  try {
    const quoteId = parseInt(req.params.quoteId);
    if (isNaN(quoteId)) {
      return res.status(400).json({ error: "ID preventivo non valido" });
    }

    const currentDate = new Date();
    
    const payments = await db.select()
      .from(scheduledPayments)
      .where(eq(scheduledPayments.quoteId, quoteId))
      .orderBy(asc(scheduledPayments.dueDate));

    // Aggiungi lo stato overdue se necessario
    const result = payments.map(payment => {
      let status = payment.status;
      if (status === "pending" && dateFnsBefore(new Date(payment.dueDate), currentDate)) {
        status = "overdue";
      }

      return {
        ...payment,
        status
      };
    });

    res.json(result);
  } catch (error) {
    console.error(`Errore nel recupero dei pagamenti programmati per il preventivo ${req.params.quoteId}:`, error);
    res.status(500).json({ error: "Errore nel recupero dei pagamenti programmati per il preventivo" });
  }
});

export default router;