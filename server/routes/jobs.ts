import express from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { quotes, events } from "@shared/schema";

const router = express.Router();

// API endpoint unificato per i lavori (quotes + events)
router.get("/", async (req, res) => {
  try {
    // Ottieni tutti i preventivi
    const quotes = await db.query.quotes.findMany({
      with: {
        client: true,
      },
    });
    
    // Ottieni tutti gli eventi
    const events = await db.query.events.findMany({
      with: {
        client: true,
      },
    });
    
    // Trasforma i preventivi nel formato "job"
    const quoteJobs = quotes.map(quote => ({
      id: quote.id,
      type: "quote",
      title: quote.title,
      clientId: quote.clientId,
      clientName: quote.client ? `${quote.client.firstName} ${quote.client.lastName}` : "Cliente sconosciuto",
      eventDate: quote.eventDate,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
      isSigned: quote.isSigned,
      status: quote.isSigned ? "signed" : "pending",
      quoteId: quote.id
    }));
    
    // Trasforma gli eventi nel formato "job"
    const eventJobs = events.map(event => ({
      id: event.id,
      type: "event",
      title: event.title,
      clientId: event.clientId,
      clientName: event.client ? `${event.client.firstName} ${event.client.lastName}` : "Cliente sconosciuto",
      eventDate: event.date,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      eventId: event.id,
      status: event.status || "scheduled",
      quoteId: event.quoteId || null
    }));
    
    // Unisci e ordina per data evento (più recenti prima)
    const jobs = [...quoteJobs, ...eventJobs].sort((a, b) => {
      // Ordina per data evento se disponibile, altrimenti per data creazione
      const dateA = a.eventDate || a.createdAt;
      const dateB = b.eventDate || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
    
    res.json(jobs);
  } catch (error) {
    console.error("Errore nel recupero dei lavori:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// API endpoint per ottenere un singolo lavoro
router.get("/:id", async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    if (isNaN(jobId)) {
      return res.status(400).json({ error: "ID lavoro non valido" });
    }
    
    // Cerca prima tra i preventivi
    const quote = await db.query.quotes.findFirst({
      where: eq(quotes.id, jobId),
      with: {
        client: true,
      },
    });
    
    // Se è un preventivo, restituiscilo come lavoro
    if (quote) {
      const job = {
        id: quote.id,
        type: "quote",
        title: quote.title,
        clientId: quote.clientId,
        clientName: quote.client ? `${quote.client.firstName} ${quote.client.lastName}` : "Cliente sconosciuto",
        eventDate: quote.eventDate,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
        isSigned: quote.isSigned,
        status: quote.isSigned ? "signed" : "pending",
        quoteId: quote.id,
        // Controlla se esiste un evento collegato a questo preventivo
        eventId: quote.eventId
      };
      
      return res.json(job);
    }
    
    // Altrimenti cerca tra gli eventi
    const event = await db.query.events.findFirst({
      where: eq(events.id, jobId),
      with: {
        client: true,
      },
    });
    
    // Se è un evento, restituiscilo come lavoro
    if (event) {
      const job = {
        id: event.id,
        type: "event",
        title: event.title,
        clientId: event.clientId,
        clientName: event.client ? `${event.client.firstName} ${event.client.lastName}` : "Cliente sconosciuto",
        eventDate: event.date,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        eventId: event.id,
        status: event.status || "scheduled",
        quoteId: event.quoteId || null
      };
      
      return res.json(job);
    }
    
    // Se non viene trovato né come preventivo né come evento
    res.status(404).json({ error: "Lavoro non trovato" });
  } catch (error) {
    console.error("Errore nel recupero del lavoro:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

export default router;