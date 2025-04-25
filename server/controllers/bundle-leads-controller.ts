import { Request, Response } from "express";
import { db } from "../db";
import { eq, or } from "drizzle-orm";
import { 
  insertBundleLeadSchema, 
  bundleLeads, 
  serviceBundles,
  serviceBundleItems,
  quotes,
  clients,
  quoteItems,
  insertQuoteSchema,
  insertClientSchema
} from "@shared/schema";
// import { sendBundleLeadNotification, sendBundleQuoteCreationConfirmation } from "../email";

/**
 * Verifica se esiste già un cliente con la stessa email o telefono
 */
export const checkExistingClient = async (req: Request, res: Response) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ 
        message: "È necessario fornire almeno un'email o un numero di telefono" 
      });
    }

    // Crea un array di condizioni per la ricerca
    const searchConditions = [];
    
    if (email) {
      searchConditions.push(eq(clients.email, email));
    }
    
    if (phone) {
      searchConditions.push(eq(clients.phone, phone));
    }

    // Cerca clienti che corrispondono a uno qualsiasi dei criteri
    let matchingClients = [];
    
    if (searchConditions.length > 0) {
      matchingClients = await db
        .select()
        .from(clients)
        .where(or(...searchConditions));
    }

    if (matchingClients.length > 0) {
      return res.status(200).json({
        exists: true,
        clients: matchingClients,
        message: "Clienti esistenti trovati"
      });
    } else {
      return res.status(200).json({
        exists: false,
        clients: [],
        message: "Nessun cliente trovato"
      });
    }
  } catch (error: any) {
    console.error("Errore nella ricerca di clienti esistenti:", error);
    return res
      .status(500)
      .json({ message: `Errore: ${error.message || "Errore sconosciuto"}` });
  }
};

// Funzioni interne per l'invio di email
async function sendBundleLeadNotification(lead: any, bundle: any): Promise<boolean> {
  try {
    console.log(`[Email] Invio notifica lead pacchetto ${bundle.name} per ${lead.firstName} ${lead.lastName}`);
    // In un ambiente di produzione, qui invieremmo l'email
    return true;
  } catch (error) {
    console.error("Errore nell'invio della notifica di lead pacchetto:", error);
    return false;
  }
}

async function sendBundleQuoteCreationConfirmation(quote: any, bundle: any): Promise<boolean> {
  try {
    console.log(`[Email] Invio conferma creazione preventivo da pacchetto ${bundle.name} per ${quote.client.firstName} ${quote.client.lastName}`);
    // In un ambiente di produzione, qui invieremmo l'email
    return true;
  } catch (error) {
    console.error("Errore nell'invio della conferma di creazione preventivo:", error);
    return false;
  }
}

/**
 * Crea una nuova lead da un pacchetto servizi
 */
export const createBundleLead = async (req: Request, res: Response) => {
  try {
    // Validare i dati in arrivo
    const bundleLeadData = insertBundleLeadSchema.parse({
      ...req.body,
      status: "new",
      createdAt: new Date(),
    });

    // Verificare che il bundle esista
    const bundle = await db.query.serviceBundles.findFirst({
      where: eq(serviceBundles.id, bundleLeadData.bundleId),
    });

    if (!bundle) {
      return res.status(404).json({ message: "Pacchetto non trovato" });
    }

    // Creare la lead
    const [newLead] = await db
      .insert(bundleLeads)
      .values(bundleLeadData)
      .returning();

    // Inviare email di notifica
    await sendBundleLeadNotification(newLead, bundle);

    return res.status(201).json(newLead);
  } catch (error: any) {
    console.error("Errore nella creazione della lead da pacchetto:", error);
    return res
      .status(500)
      .json({ message: `Errore: ${error.message || "Errore sconosciuto"}` });
  }
};

/**
 * Crea un preventivo completo da una richiesta di pacchetto servizi
 */
export const createQuoteFromBundleLead = async (req: Request, res: Response) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      address, 
      eventType, 
      eventDate, 
      location, // Cambiato da eventLocation a location per uniformità con il database
      message, 
      bundleId 
    } = req.body;

    // Verifica che il bundle esista
    const bundle = await db.query.serviceBundles.findFirst({
      where: eq(serviceBundles.id, bundleId),
    });

    if (!bundle) {
      return res.status(404).json({ message: "Pacchetto non trovato" });
    }

    // Recupera tutti gli elementi del pacchetto
    const bundleItems = await db.query.serviceBundleItems.findMany({
      where: eq(serviceBundleItems.bundleId, bundleId),
      with: {
        service: true
      }
    });

    // Ricerca più robusta di clienti esistenti
    let existingClient = null;
    let clientToUse = null;
    
    try {
      // Tentativo 1: Trova cliente con email esatta
      existingClient = await db.query.clients.findFirst({
        where: eq(clients.email, email),
      });
      
      if (existingClient) {
        console.log(`Cliente esistente trovato con email ${email}, ID: ${existingClient.id}`);
      } else {
        // Tentativo 2: Trova cliente con email case-insensitive usando SQL diretto
        const clientsByEmail = await db.$queryRaw<any[]>`
          SELECT * FROM clients WHERE LOWER(email) = LOWER(${email}) LIMIT 1
        `;
        
        if (clientsByEmail && clientsByEmail.length > 0) {
          // Converti da snake_case a camelCase
          existingClient = {
            id: clientsByEmail[0].id,
            firstName: clientsByEmail[0].first_name,
            lastName: clientsByEmail[0].last_name,
            email: clientsByEmail[0].email,
            phone: clientsByEmail[0].phone || "",
            address: clientsByEmail[0].address || "",
            company: clientsByEmail[0].company || "",
            postalCode: clientsByEmail[0].postal_code || "",
            city: clientsByEmail[0].city || "",
            province: clientsByEmail[0].province || "",
            state: clientsByEmail[0].state || "",
            taxCode: clientsByEmail[0].tax_code || "",
            notes: clientsByEmail[0].notes || "",
            createdAt: clientsByEmail[0].created_at,
            updatedAt: clientsByEmail[0].updated_at
          };
          console.log(`Cliente trovato con email case-insensitive ${email}, ID: ${existingClient.id}`);
        } else {
          // Tentativo 3: Cerca clienti con nome e cognome simili
          const nameMatch = await db.$queryRaw<any[]>`
            SELECT * FROM clients 
            WHERE LOWER(first_name) = LOWER(${firstName}) 
            AND LOWER(last_name) = LOWER(${lastName})
            LIMIT 1
          `;
          
          if (nameMatch && nameMatch.length > 0) {
            // Converti da snake_case a camelCase
            existingClient = {
              id: nameMatch[0].id,
              firstName: nameMatch[0].first_name,
              lastName: nameMatch[0].last_name,
              email: email, // Aggiorniamo con l'email fornita
              phone: nameMatch[0].phone || phone || "",
              address: nameMatch[0].address || address || "",
              company: nameMatch[0].company || "",
              postalCode: nameMatch[0].postal_code || "",
              city: nameMatch[0].city || "",
              province: nameMatch[0].province || "",
              state: nameMatch[0].state || "",
              taxCode: nameMatch[0].tax_code || "",
              notes: nameMatch[0].notes || "",
              createdAt: nameMatch[0].created_at,
              updatedAt: new Date()
            };
            console.log(`Cliente trovato con nome e cognome simili, ID: ${existingClient.id}`);
          }
        }
      }
    } catch (searchError) {
      console.error("Errore nella ricerca avanzata del cliente:", searchError);
      // Continuiamo con existingClient = null, creeremo un nuovo cliente
    }
    
    if (existingClient) {
      // Se il cliente esiste già, lo utilizziamo e aggiorniamo
      try {
        const [updatedClient] = await db
          .update(clients)
          .set({
            firstName,
            lastName,
            email, // Aggiorniamo anche l'email per sicurezza
            phone: phone || existingClient.phone,
            address: address || existingClient.address,
            updatedAt: new Date()
          })
          .where(eq(clients.id, existingClient.id))
          .returning();
          
        console.log(`Cliente ID ${existingClient.id} aggiornato con successo`);
        clientToUse = updatedClient;
      } catch (updateError) {
        console.error(`Errore nell'aggiornamento del cliente ID ${existingClient.id}:`, updateError);
        clientToUse = existingClient; // Fallback al cliente esistente se l'aggiornamento fallisce
      }
    } else {
      // Se il cliente non esiste, lo creiamo
      try {
        const clientData = insertClientSchema.parse({
          firstName,
          lastName,
          email,
          phone: phone || "",
          address: address || "",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const [newClient] = await db
          .insert(clients)
          .values(clientData)
          .returning();
          
        console.log(`Nuovo cliente creato con ID: ${newClient.id}, email: ${email}`);
        clientToUse = newClient;
      } catch (createError) {
        console.error(`Errore nella creazione del nuovo cliente:`, createError);
        throw createError; // Rilancia l'errore poiché senza cliente non possiamo procedere
      }
    }
    
    // Verifica che clientToUse abbia un ID valido
    if (!clientToUse || !clientToUse.id) {
      throw new Error(`Impossibile ottenere un cliente valido per l'email ${email}`);
    }

    // Crea il preventivo
    const quoteTitle = `Preventivo ${bundle.name} - ${firstName} ${lastName}`;
    
    const quoteData = insertQuoteSchema.parse({
      title: quoteTitle,
      clientId: clientToUse.id,
      status: "draft",
      eventType: eventType || "matrimonio",
      eventDate: eventDate ? new Date(eventDate) : null,
      location: location || "", // Corretto: ora usiamo location invece di eventLocation
      notes: message || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 giorni di validità
    });

    const [newQuote] = await db
      .insert(quotes)
      .values(quoteData)
      .returning();

    // Aggiungi gli item dal bundle al preventivo
    for (const item of bundleItems) {
      await db.insert(quoteItems).values({
        quoteId: newQuote.id,
        serviceId: item.serviceId,
        quantity: item.quantity,
        unitPrice: item.service.price,
        // Calcola prezzo totale (quantità * prezzo unitario o quantità * prezzo scontato)
        total: item.discountType !== null && item.discountValue > 0 
               ? (item.discountedPrice || 0) * item.quantity
               : item.service.price * item.quantity,
        hasDiscount: item.discountType !== null && item.discountValue > 0,
        discountType: item.discountType,
        discountValue: item.discountValue || 0,
        discountedPrice: item.discountedPrice,
        bundleId: bundleId,
        notes: item.notes,
        // Rimuoviamo i campi createdAt e updatedAt che non esistono nella tabella
      });
    }

    // Aggiorna il preventivo con il totale
    const quoteWithItems = await db.query.quotes.findFirst({
      where: eq(quotes.id, newQuote.id),
      with: {
        items: true,
        client: true,
      },
    });

    // Salva la lead
    const bundleLeadData = insertBundleLeadSchema.parse({
      firstName,
      lastName,
      email,
      phone: phone || "",
      message: message || "",
      bundleId,
      status: "converted", // È stata convertita in preventivo
      createdAt: new Date(),
      quoteId: newQuote.id,
      clientId: clientToUse.id, // Aggiungiamo l'ID del cliente per completezza
    });

    const [newLead] = await db
      .insert(bundleLeads)
      .values(bundleLeadData)
      .returning();

    // Invia email di conferma
    if (quoteWithItems) {
      await sendBundleQuoteCreationConfirmation(quoteWithItems, bundle);
    }

    return res.status(201).json({ 
      quote: newQuote,
      client: clientToUse,
      lead: newLead
    });
  } catch (error: any) {
    console.error("Errore nella creazione del preventivo da pacchetto:", error);
    return res
      .status(500)
      .json({ message: `Errore: ${error.message || "Errore sconosciuto"}` });
  }
};

/**
 * Recupera tutte le lead di un bundle
 */
export const getBundleLeads = async (req: Request, res: Response) => {
  try {
    const { bundleId } = req.params;
    
    const leads = await db.query.bundleLeads.findMany({
      where: eq(bundleLeads.bundleId, parseInt(bundleId)),
      orderBy: (bundleLeads, { desc }) => [desc(bundleLeads.createdAt)],
    });
    
    return res.status(200).json(leads);
  } catch (error: any) {
    console.error("Errore nel recupero delle lead del pacchetto:", error);
    return res
      .status(500)
      .json({ message: `Errore: ${error.message || "Errore sconosciuto"}` });
  }
};

/**
 * Recupera tutte le lead
 */
export const getAllBundleLeads = async (_req: Request, res: Response) => {
  try {
    const leads = await db.query.bundleLeads.findMany({
      orderBy: (bundleLeads, { desc }) => [desc(bundleLeads.createdAt)],
      with: {
        bundle: true,
        quote: true,
      },
    });
    
    return res.status(200).json(leads);
  } catch (error: any) {
    console.error("Errore nel recupero di tutte le lead:", error);
    return res
      .status(500)
      .json({ message: `Errore: ${error.message || "Errore sconosciuto"}` });
  }
};