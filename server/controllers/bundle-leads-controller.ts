import { Request, Response } from "express";
import { db } from "../db";
import { bundleLeads, insertBundleLeadSchema, quotes, quoteItems, clients, insertClientSchema, insertQuoteSchema, services, serviceItems, serviceBundles, serviceBundleItems } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "../email";

export const createQuoteFromBundle = async (req: Request, res: Response) => {
  try {
    console.log("Creazione preventivo da pacchetto bundle:", req.body);
    
    // Validazione dei dati di input
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      message,
      eventDate,
      eventLocation,
      eventType,
      bundleId,
    } = req.body;
    
    // Controllo che il bundleId sia presente
    if (!bundleId) {
      return res.status(400).json({ message: "ID del pacchetto mancante" });
    }
    
    // Verifica che il bundle esista
    const bundle = await db.query.serviceBundles.findFirst({
      where: eq(serviceBundles.id, Number(bundleId)),
    });
    
    if (!bundle) {
      return res.status(404).json({ message: "Pacchetto non trovato" });
    }
    
    // Recupera i servizi inclusi nel bundle
    const bundleItems = await db.query.serviceBundleItems.findMany({
      where: eq(serviceBundleItems.bundleId, Number(bundleId)),
      with: {
        service: true
      }
    });
    
    if (bundleItems.length === 0) {
      return res.status(400).json({ message: "Il pacchetto non contiene servizi" });
    }

    // Esegui tutta la logica in una transazione
    return await db.transaction(async (tx) => {
      // 1. Crea o recupera il cliente
      let clientId: number;
      
      // Cerca se il cliente esiste già con questa email
      const existingClient = await tx.query.clients.findFirst({
        where: eq(clients.email, email)
      });
      
      if (existingClient) {
        // Usa il cliente esistente
        clientId = existingClient.id;
        
        // Aggiorna eventualmente i dati del cliente se necessario
        if (phone && !existingClient.phone) {
          await tx.update(clients)
            .set({ phone })
            .where(eq(clients.id, clientId));
        }
      } else {
        // Crea un nuovo cliente
        const [newClient] = await tx.insert(clients)
          .values({
            firstName,
            lastName,
            email,
            phone: phone || null,
            address: address || null,
            notes: message || null,
          })
          .returning();
          
        clientId = newClient.id;
      }
      
      // 2. Crea il preventivo
      const [newQuote] = await tx.insert(quotes)
        .values({
          title: `Preventivo da ${bundle.name}`,
          clientId,
          secondClientId: null,
          status: "draft",
          eventType: eventType || "matrimonio",
          eventDate: eventDate ? new Date(eventDate) : null,
          eventLocation: eventLocation || null,
          notes: message || null,
          discountType: bundle.discountType || null,
          discountValue: bundle.discountValue || null,
          signedAt: null,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 giorni di validità
          shareToken: null,
          shareExpiry: null,
          expiryNotificationSent: false,
          moduleLayout: "gallery",
          publicNotes: `Preventivo generato automaticamente dal pacchetto "${bundle.name}"`,
          createdAt: new Date(),
          updatedAt: new Date(),
          depositAmount: bundle.depositAmount || null,
          depositDueDate: null,
          totalPaid: 0,
          totalDue: bundle.discountedPrice || bundle.totalPrice,
          installmentsCount: bundle.installmentsCount || 1,
          leadSourceId: null,
        })
        .returning();
      
      // 3. Crea gli elementi del preventivo basati sugli elementi del bundle
      for (const item of bundleItems) {
        await tx.insert(quoteItems)
          .values({
            quoteId: newQuote.id,
            serviceId: item.serviceId,
            bundleId: bundle.id,
            quantity: item.quantity,
            unitPrice: item.service.price,
            total: item.quantity * item.service.price,
            notes: null,
            hasDiscount: false,
            discountType: null,
            discountValue: null,
            discountedPrice: null,
          });
      }
      
      // 4. Registra il lead del bundle
      await tx.insert(bundleLeads)
        .values({
          bundleId: bundle.id,
          clientId,
          quoteId: newQuote.id,
          createdAt: new Date(),
          notes: message || null,
        });
      
      // 5. Invia notifica email (se configurato)
      try {
        const clientName = `${firstName} ${lastName}`;
        const emailParams = {
          to: process.env.ADMIN_EMAIL || "admin@example.com",
          subject: `Nuova richiesta di preventivo dal pacchetto "${bundle.name}"`,
          text: `
            È stata ricevuta una nuova richiesta di preventivo:
            
            Cliente: ${clientName}
            Email: ${email}
            Telefono: ${phone || 'Non specificato'}
            Pacchetto richiesto: ${bundle.name}
            
            Messaggio del cliente:
            ${message || 'Nessun messaggio incluso'}
            
            Puoi visualizzare il preventivo creato automaticamente nel tuo pannello di controllo.
          `
        };
        
        await sendEmail(process.env.SENDGRID_API_KEY || '', {
          ...emailParams,
          from: process.env.FROM_EMAIL || "noreply@studiomaster.it",
          html: emailParams.text.replace(/\n/g, '<br>')
        });
      } catch (emailError) {
        console.error("Errore nell'invio dell'email:", emailError);
        // Continua l'esecuzione anche se l'invio dell'email fallisce
      }
      
      return res.status(201).json({ 
        message: "Preventivo creato con successo", 
        quoteId: newQuote.id,
        bundleId: bundle.id,
        clientId
      });
    });
    
  } catch (error) {
    console.error("Errore durante la creazione del preventivo dal pacchetto:", error);
    return res.status(500).json({ 
      message: "Si è verificato un errore durante la creazione del preventivo", 
      error: error instanceof Error ? error.message : "Errore sconosciuto" 
    });
  }
};