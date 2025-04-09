import { Router } from "express";
import { db } from "../db";
import { 
  bundleLeads, 
  insertBundleLeadSchema, 
  clients, 
  insertClientSchema,
  quotes,
  quoteItems,
  serviceBundles,
  serviceBundleItems,
} from "@shared/schema";
import { isAuthenticated } from "../auth";
import { eq } from "drizzle-orm";

const router = Router();

// Ottieni tutte le richieste di pacchetti
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const leads = await db.query.bundleLeads.findMany({
      with: {
        bundle: true,
        quote: true,
        client: true,
      },
      orderBy: (bundleLeads, { desc }) => [desc(bundleLeads.createdAt)],
    });
    
    res.json(leads);
  } catch (error) {
    console.error("Errore nel recupero delle richieste di pacchetti:", error);
    res.status(500).json({ error: "Errore nel recupero delle richieste di pacchetti" });
  }
});

// Ottieni una singola richiesta di pacchetto
router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const lead = await db.query.bundleLeads.findFirst({
      where: eq(bundleLeads.id, id),
      with: {
        bundle: true,
        quote: true,
        client: true,
      },
    });
    
    if (!lead) {
      return res.status(404).json({ error: "Richiesta di pacchetto non trovata" });
    }
    
    res.json(lead);
  } catch (error) {
    console.error("Errore nel recupero della richiesta di pacchetto:", error);
    res.status(500).json({ error: "Errore nel recupero della richiesta di pacchetto" });
  }
});

// Crea una nuova richiesta di pacchetto e genera automaticamente cliente e preventivo
router.post("/", async (req, res) => {
  try {
    const validatedData = insertBundleLeadSchema.parse(req.body);
    
    // Verifica che il pacchetto esista
    const bundle = await db.query.serviceBundles.findFirst({
      where: eq(serviceBundles.id, validatedData.bundleId),
    });
    
    if (!bundle) {
      return res.status(404).json({ error: "Pacchetto non trovato" });
    }
    
    // Crea o trova il cliente
    let client;
    const existingClient = await db.query.clients.findFirst({
      where: eq(clients.email, validatedData.email),
    });
    
    if (existingClient) {
      client = existingClient;
    } else {
      // Crea un nuovo cliente
      [client] = await db.insert(clients)
        .values({
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email,
          phone: validatedData.phone || "",
          notes: validatedData.message || "",
          // source non esiste nella tabella client, rimuoviamo questo campo
        })
        .returning();
    }
    
    // Crea il preventivo
    const [quote] = await db.insert(quotes)
      .values({
        title: `Preventivo basato su pacchetto: ${bundle.name}`,
        clientId: client.id,
        subtotal: bundle.totalPrice,
        discount: bundle.totalPrice - bundle.discountedPrice,
        tax: 0,
        total: bundle.discountedPrice,
        status: "draft",
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 giorni da oggi
        notes: validatedData.message || `Richiesta basata sul pacchetto: ${bundle.name}`,
      })
      .returning();
    
    // Recupera gli elementi del pacchetto
    const bundleItems = await db.query.serviceBundleItems.findMany({
      where: eq(serviceBundleItems.bundleId, bundle.id),
      with: {
        service: true,
      },
    });
    
    // Aggiungi gli elementi al preventivo
    for (const item of bundleItems) {
      await db.insert(quoteItems)
        .values({
          quoteId: quote.id,
          serviceId: item.serviceId,
          quantity: item.quantity,
          unitPrice: item.service.price,
          bundleId: bundle.id,
          total: item.quantity * item.service.price,
          // Non aggiungiamo sconti a livello di elemento poiché lo sconto è sul pacchetto completo
        });
    }
    
    // Crea il lead collegato al cliente e al preventivo
    const [lead] = await db.insert(bundleLeads)
      .values({
        ...validatedData,
        clientId: client.id,
        quoteId: quote.id,
        status: "new",
      })
      .returning();
    
    // Restituisci i dati del lead creato
    res.status(201).json(lead);
  } catch (error) {
    console.error("Errore nella creazione della richiesta di pacchetto:", error);
    res.status(500).json({ error: "Errore nella creazione della richiesta di pacchetto" });
  }
});

// Aggiorna lo stato di una richiesta di pacchetto
router.patch("/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!["new", "contacted", "converted", "archived"].includes(status)) {
      return res.status(400).json({ error: "Stato non valido" });
    }
    
    const [lead] = await db.update(bundleLeads)
      .set({ status })
      .where(eq(bundleLeads.id, id))
      .returning();
    
    if (!lead) {
      return res.status(404).json({ error: "Richiesta di pacchetto non trovata" });
    }
    
    res.json(lead);
  } catch (error) {
    console.error("Errore nell'aggiornamento della richiesta di pacchetto:", error);
    res.status(500).json({ error: "Errore nell'aggiornamento della richiesta di pacchetto" });
  }
});

// Elimina una richiesta di pacchetto
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    await db.delete(bundleLeads)
      .where(eq(bundleLeads.id, id));
    
    res.json({ success: true });
  } catch (error) {
    console.error("Errore nell'eliminazione della richiesta di pacchetto:", error);
    res.status(500).json({ error: "Errore nell'eliminazione della richiesta di pacchetto" });
  }
});

export default router;