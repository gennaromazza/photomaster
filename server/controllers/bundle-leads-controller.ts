import { Request, Response } from "express";
import { db } from "../db";
import { bundleLeads, serviceBundles, serviceBundleItems, services, clients } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage } from "../storage";

// Crea una richiesta di preventivo da pacchetto e, se presente, associa un cliente esistente
export const createBundleQuote = async (req: Request, res: Response) => {
  const { 
    bundleId, 
    firstName, 
    lastName, 
    email, 
    phone, 
    address, 
    message,
    eventType,
    eventDate,
    location,
    existingClientId
  } = req.body;

  if (!bundleId || !firstName || !lastName || !email) {
    return res.status(400).json({ error: "Mancano dati obbligatori" });
  }

  try {
    // Verifica che il pacchetto esista
    const bundle = await db.query.serviceBundles.findFirst({
      where: eq(serviceBundles.id, bundleId)
    });

    if (!bundle) {
      return res.status(404).json({ error: "Pacchetto non trovato" });
    }

    // Se viene fornito un ID cliente esistente, usa quello
    let clientId = existingClientId;

    // Se non c'è un ID cliente esistente, verifica se esiste già un cliente con questa email
    if (!clientId) {
      const existingClients = await db.query.clients.findMany({
        where: eq(clients.email, email)
      });

      if (existingClients.length > 0) {
        // Usa il primo cliente trovato con questa email
        clientId = existingClients[0].id;
        
        // Aggiorna le informazioni del cliente se necessario
        await db.update(clients)
          .set({
            firstName,
            lastName,
            phone: phone || existingClients[0].phone,
            address: address || existingClients[0].address,
            updatedAt: new Date()
          })
          .where(eq(clients.id, clientId));
      } else {
        // Crea un nuovo cliente
        const [newClient] = await db.insert(clients)
          .values({
            firstName,
            lastName,
            email,
            phone: phone || null,
            address: address || null,
            source: "bundle_request",
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        clientId = newClient.id;
      }
    }

    // Crea una nuova richiesta di preventivo
    const [bundleLead] = await db.insert(bundleLeads)
      .values({
        bundleId,
        clientId,
        firstName,
        lastName,
        email,
        phone: phone || null,
        message: message || null,
        eventType: eventType || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        location: location || null,
        status: "new",
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Restituisci i dati della richiesta
    return res.status(201).json({
      success: true,
      quote: bundleLead
    });
  } catch (error) {
    console.error("Errore durante la creazione della richiesta preventivo:", error);
    return res.status(500).json({ error: "Errore del server" });
  }
};

// Recupera una richiesta di preventivo per email
export const getBundleLeadByEmail = async (req: Request, res: Response) => {
  const { email } = req.params;
  
  if (!email) {
    return res.status(400).json({ error: "Email richiesta" });
  }
  
  try {
    // Prende la richiesta più recente con questa email
    const bundleLead = await db.query.bundleLeads.findFirst({
      where: eq(bundleLeads.email, email),
      orderBy: (bundleLeads, { desc }) => [desc(bundleLeads.createdAt)],
      with: {
        bundle: {
          with: {
            items: {
              with: {
                service: true
              }
            }
          }
        }
      }
    });
    
    if (!bundleLead) {
      return res.status(404).json({ error: "Richiesta preventivo non trovata" });
    }
    
    return res.status(200).json(bundleLead);
  } catch (error) {
    console.error("Errore recupero dettagli richiesta preventivo:", error);
    return res.status(500).json({ error: "Errore server" });
  }
};