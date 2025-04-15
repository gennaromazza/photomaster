import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { isAuthenticated } from "../auth";
import { eq, sql } from "drizzle-orm";
import { events, quotes } from "@shared/schema";

const router = Router();

/**
 * Ottiene tutti i lavori (preventivi ed eventi)
 */
router.get("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Ottieni tutti i preventivi attivi
    const quotesResult = await db.select({
      id: quotes.id,
      title: quotes.title,
      clientId: quotes.clientId,
      status: quotes.status,
      type: sql`'quote'`.as('type')
    }).from(quotes);
    
    // Ottieni tutti gli eventi attivi
    const eventsResult = await db.select({
      id: events.id,
      title: events.title,
      clientId: events.clientId,
      status: events.status,
      date: events.date,
      quoteId: events.quoteId,
      type: sql`'event'`.as('type')
    }).from(events);
    
    // Combina preventivi ed eventi in una lista unica
    const allJobs = [
      ...quotesResult.map((quote) => ({
        id: quote.id,
        type: quote.type,
        title: quote.title,
        clientId: quote.clientId,
        status: quote.status || "draft",
        quoteId: quote.id,
      })),
      ...eventsResult.map((event) => ({
        id: event.id,
        type: event.type,
        title: event.title,
        clientId: event.clientId,
        status: event.status || "draft",
        date: event.date,
        quoteId: event.quoteId,
        eventId: event.id,
      })),
    ];
    
    res.json(allJobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Ottiene i dettagli di un singolo lavoro (preventivo o evento)
 */
router.get("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);
    
    if (isNaN(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }
    
    // Controlla se è un preventivo
    const quoteResult = await db.select().from(quotes).where(eq(quotes.id, jobId));
    if (quoteResult.length > 0) {
      const quote = quoteResult[0];
      
      // Controlla se esiste un evento associato per questo preventivo
      const eventResult = await db.select().from(events).where(eq(events.quoteId, quote.id));
      const eventId = eventResult.length > 0 ? eventResult[0].id : null;
      
      return res.json({
        id: quote.id,
        type: "quote",
        title: quote.title,
        clientId: quote.clientId,
        status: quote.status || "draft",
        quoteId: quote.id,
        eventId: eventId,
      });
    }
    
    // Controlla se è un evento
    const eventResult = await db.select().from(events).where(eq(events.id, jobId));
    if (eventResult.length > 0) {
      const event = eventResult[0];
      
      return res.json({
        id: event.id,
        type: "event",
        title: event.title,
        clientId: event.clientId,
        status: event.status || "scheduled",
        date: event.date,
        eventId: event.id,
        quoteId: event.quoteId,
      });
    }
    
    // Non trovato
    res.status(404).json({ message: "Job not found" });
  } catch (error) {
    console.error("Error fetching job details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Aggiorna lo stato di un lavoro
 */
router.patch("/:id/status", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (isNaN(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }
    
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    
    // Ottieni il job per determinare il tipo
    const jobResult = await db.select().from(quotes).where(eq(quotes.id, jobId));
    
    if (jobResult.length > 0) {
      // È un preventivo
      const quoteStatus = mapJobStatusToQuoteStatus(status);
      await db.update(quotes)
        .set({ status: quoteStatus })
        .where(eq(quotes.id, jobId));
        
      // Se lo stato è "confirmed", mettiamo un commento nel campo notes che indica la firma
      if (status === "confirmed") {
        // Aggiungiamo una nota al preventivo per indicare che è stato firmato tramite la gestione stati
        await db.update(quotes)
          .set({ 
            notes: sql`CONCAT(COALESCE(notes, ''), '\n[CONFERMATO]: Preventivo firmato tramite cambio stato il ', NOW()::text)`
          })
          .where(eq(quotes.id, jobId));
      }
    } else {
      // Controlla se è un evento
      const eventResult = await db.select().from(events).where(eq(events.id, jobId));
      
      if (eventResult.length === 0) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // È un evento
      const eventStatus = mapJobStatusToEventStatus(status);
      await db.update(events)
        .set({ status: eventStatus })
        .where(eq(events.id, jobId));
    }
    
    res.json({ 
      message: "Status updated successfully",
      status
    });
  } catch (error) {
    console.error("Error updating job status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Mappa lo stato unificato del lavoro allo stato specifico del preventivo
 */
function mapJobStatusToQuoteStatus(jobStatus: string): string {
  switch (jobStatus) {
    case "draft":
      return "draft";
    case "pending":
      return "sent";
    case "confirmed":
      return "signed";
    case "cancelled":
      return "cancelled";
    default:
      return "draft";
  }
}

/**
 * Mappa lo stato unificato del lavoro allo stato specifico dell'evento
 */
function mapJobStatusToEventStatus(jobStatus: string): string {
  switch (jobStatus) {
    case "in_progress":
      return "in progress";
    case "confirmed":
      return "scheduled";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "scheduled";
  }
}

export default router;