import { Request, Response } from "express";
import { db } from "../db";
import { bundleLeads, serviceBundles, serviceBundleItems, services, clients, quotes, quoteModules, quoteModuleItems, scheduledPayments } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage } from "../storage";
import { v4 as uuidv4 } from 'uuid';
import { addMonths } from 'date-fns';

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
      
    // Converti automaticamente in preventivo
    try {
      // Recupera i dettagli del bundle completi con i servizi
      const bundleComplete = await db.query.bundleLeads.findFirst({
        where: eq(bundleLeads.id, bundleLead.id),
        with: {
          bundle: {
            with: {
              items: {
                with: {
                  service: true
                }
              }
            }
          },
          client: true
        }
      });
      
      if (bundleComplete && bundleComplete.bundle) {
        // Crea un nuovo preventivo basato sulla richiesta
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30); // Scadenza a 30 giorni
        
        const shareToken = uuidv4().replace(/-/g, '');
        
        const [quote] = await db.insert(quotes)
          .values({
            title: `Preventivo ${bundleComplete.bundle.name} - ${bundleComplete.firstName} ${bundleComplete.lastName}`,
            clientId: bundleComplete.clientId,
            eventDate: bundleComplete.eventDate,
            location: bundleComplete.location,
            eventType: bundleComplete.eventType || "altro",
            status: "draft",
            notes: bundleComplete.message || "",
            createdAt: new Date(),
            updatedAt: new Date(),
            expiryDate: expiryDate,
            bundleId: bundleComplete.bundleId,
            isShared: false,
            shareToken: shareToken
          })
          .returning();
        
        if (quote) {
          // Aggiorna il lead con il riferimento al preventivo creato
          await db.update(bundleLeads)
            .set({ 
              quoteId: quote.id,
              status: "converted"
            })
            .where(eq(bundleLeads.id, bundleLead.id));
          
          // Crea un modulo fisso con i servizi del bundle
          const createdModule = await createFixedModuleFromBundle(bundleComplete.bundle, quote.id);
          
          // Crea un pagamento programmato per il preventivo
          if (createdModule && createdModule.total > 0) {
            await createInitialScheduledPayment(bundleComplete.clientId, quote.id, createdModule.total);
          }
          
          // Aggiorna l'oggetto bundleLead con il quoteId
          bundleLead.quoteId = quote.id;
          bundleLead.status = "converted";
        }
      }
    } catch (conversionError) {
      console.error("Errore nella conversione automatica in preventivo:", conversionError);
      // Non bloccare la risposta, si tratta di un'operazione secondaria
    }

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

/**
 * Converte una richiesta di preventivo da bundle in un preventivo effettivo
 */
export const convertBundleLeadToQuote = async (req: Request, res: Response) => {
  const { leadId } = req.params;
  
  if (!leadId || isNaN(parseInt(leadId))) {
    return res.status(400).json({ error: "ID richiesta non valido" });
  }
  
  try {
    // Recupera la richiesta di preventivo da bundle
    const bundleLead = await db.query.bundleLeads.findFirst({
      where: eq(bundleLeads.id, parseInt(leadId)),
      with: {
        bundle: {
          with: {
            items: {
              with: {
                service: true
              }
            }
          }
        },
        client: true
      }
    });
    
    if (!bundleLead) {
      return res.status(404).json({ error: "Richiesta preventivo non trovata" });
    }
    
    // Verifica che non sia già stato creato un preventivo per questa richiesta
    if (bundleLead.quoteId) {
      // Recupera il preventivo esistente
      const quote = await db.query.quotes.findFirst({
        where: eq(quotes.id, bundleLead.quoteId)
      });
      
      if (quote) {
        return res.status(400).json({ 
          error: "Preventivo già creato", 
          quoteId: quote.id 
        });
      }
    }
    
    // Crea un nuovo preventivo basato sulla richiesta
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // Scadenza a 30 giorni
    
    const shareToken = uuidv4().replace(/-/g, '');
    
    const [quote] = await db.insert(quotes)
      .values({
        title: `Preventivo ${bundleLead.bundle.name} - ${bundleLead.firstName} ${bundleLead.lastName}`,
        clientId: bundleLead.clientId,
        eventDate: bundleLead.eventDate,
        location: bundleLead.location,
        eventType: bundleLead.eventType || "altro",
        status: "draft",
        notes: bundleLead.message || "",
        createdAt: new Date(),
        updatedAt: new Date(),
        expiryDate: expiryDate,
        bundleId: bundleLead.bundleId,
        isShared: false,
        shareToken: shareToken
      })
      .returning();
    
    if (!quote) {
      return res.status(500).json({ error: "Errore nella creazione del preventivo" });
    }
    
    // Aggiorna il lead con il riferimento al preventivo creato
    await db.update(bundleLeads)
      .set({ 
        quoteId: quote.id,
        status: "converted"
      })
      .where(eq(bundleLeads.id, bundleLead.id));
    
    // Crea un modulo fisso con i servizi del bundle
    const createdModule = await createFixedModuleFromBundle(bundleLead.bundle, quote.id);
    
    // Crea un pagamento programmato per il preventivo
    if (createdModule && createdModule.total > 0 && bundleLead.clientId) {
      await createInitialScheduledPayment(bundleLead.clientId, quote.id, createdModule.total);
    }
    
    return res.status(201).json({
      success: true,
      message: "Preventivo creato con successo",
      quoteId: quote.id
    });
    
  } catch (error) {
    console.error("Errore nella conversione della richiesta in preventivo:", error);
    return res.status(500).json({ error: "Errore del server" });
  }
};

/**
 * Crea un modulo fisso per un preventivo basato sui servizi/prodotti di un bundle
 */
const createFixedModuleFromBundle = async (bundle: any, quoteId: number) => {
  try {
    // Crea il modulo fisso
    const [module] = await db.insert(quoteModules)
      .values({
        quoteId: quoteId,
        name: `Pacchetto ${bundle.name}`,
        description: bundle.description || "Servizi inclusi nel pacchetto",
        type: "fixed",
        position: 0,
        discountType: "percentage",
        discountValue: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    if (!module) {
      throw new Error("Impossibile creare il modulo fisso");
    }
    
    // Aggiungi tutti i servizi/prodotti del bundle come elementi del modulo
    const moduleItems = bundle.items.map((item: any) => ({
      moduleId: module.id,
      serviceId: item.serviceId,
      name: item.service.name,
      description: item.service.description || "",
      price: item.service.price,
      quantity: 1,
      discount: 0,
      total: item.service.price,
      type: item.service.type || "service",
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    if (moduleItems.length > 0) {
      await db.insert(quoteModuleItems)
        .values(moduleItems);
    }
    
    // Calcola il subtotal e total del modulo
    // Moltiplichiamo per 100 per convertire da euro a centesimi (per consistenza col DB)
    const subtotal = moduleItems.reduce((sum: number, item: any) => {
      // Assicuriamoci che il prezzo sia un numero
      const itemPrice = parseFloat(item.price) || 0;
      const quantity = item.quantity || 1;
      return sum + (itemPrice * quantity);
    }, 0);
    
    const subtotalInCents = Math.round(subtotal * 100);
    
    // Aggiorna il modulo con i totali calcolati in centesimi
    await db.update(quoteModules)
      .set({
        subtotal: subtotalInCents,
        total: subtotalInCents
      })
      .where(eq(quoteModules.id, module.id));
    
    return module;
  } catch (error) {
    console.error("Errore nella creazione del modulo fisso:", error);
    throw error;
  }
};

/**
 * Elimina una richiesta di preventivo
 */
export const deleteBundleLead = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: "ID della richiesta mancante" });
  }
  
  try {
    const bundleLeadId = Number(id);
    
    // Verifica che il bundle lead esista
    const bundleLead = await db.query.bundleLeads.findFirst({
      where: eq(bundleLeads.id, bundleLeadId)
    });
    
    if (!bundleLead) {
      return res.status(404).json({ error: "Richiesta di preventivo non trovata" });
    }
    
    // Elimina il bundle lead
    await db.delete(bundleLeads)
      .where(eq(bundleLeads.id, bundleLeadId));
    
    return res.status(200).json({ 
      success: true,
      message: "Richiesta di preventivo eliminata con successo" 
    });
  } catch (error) {
    console.error("Errore nell'eliminazione della richiesta di preventivo:", error);
    return res.status(500).json({ error: "Errore del server" });
  }
};

/**
 * Recupera tutte le richieste di preventivi da bundle
 */
export const getAllBundleLeads = async (req: Request, res: Response) => {
  try {
    const bundleLeads = await db.query.bundleLeads.findMany({
      orderBy: (bundleLeads, { desc }) => [desc(bundleLeads.createdAt)],
      with: {
        bundle: true,
        client: true,
        quote: {
          columns: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });
    
    return res.status(200).json(bundleLeads);
  } catch (error) {
    console.error("Errore nel recupero delle richieste di preventivo:", error);
    return res.status(500).json({ error: "Errore del server" });
  }
};

/**
 * Recupera una richiesta di preventivo specifica per ID
 */
export const getBundleLeadById = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ error: "ID richiesta non valido" });
  }
  
  try {
    const bundleLead = await db.query.bundleLeads.findFirst({
      where: eq(bundleLeads.id, parseInt(id)),
      with: {
        bundle: {
          with: {
            items: {
              with: {
                service: true
              }
            }
          }
        },
        client: true,
        quote: true
      }
    });
    
    if (!bundleLead) {
      return res.status(404).json({ error: "Richiesta preventivo non trovata" });
    }
    
    return res.status(200).json(bundleLead);
  } catch (error) {
    console.error("Errore nel recupero della richiesta di preventivo:", error);
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

/**
 * Crea un pagamento programmato iniziale per il preventivo
 * Divise l'importo totale in due rate: acconto e saldo 
 * @param clientId ID del cliente
 * @param quoteId ID del preventivo 
 * @param totalAmount Importo totale del preventivo
 */
const createInitialScheduledPayment = async (clientId: number, quoteId: number, totalAmount: number) => {
  try {
    // Calcoliamo acconto (30%) e saldo (70%)
    // Assicuriamoci che totalAmount sia in centesimi per il database
    const totalAmountInCents = Math.round(totalAmount * 100);
    const depositAmount = Math.round(totalAmountInCents * 0.3);
    const balanceAmount = totalAmountInCents - depositAmount;
    
    // Data attuale per l'acconto
    const today = new Date();
    
    // Data a 30 giorni per il saldo
    const balanceDate = addMonths(today, 1);
    
    // Creiamo l'acconto con scadenza oggi
    await db.insert(scheduledPayments)
      .values({
        clientId: clientId,
        quoteId: quoteId,
        amount: depositAmount,
        dueDate: today,
        description: "Acconto iniziale",
        status: "pending",
        paymentMethod: null,
        reminderSent: false,
        notes: "Acconto generato automaticamente da richiesta preventivo",
        installmentNumber: 1,
        totalInstallments: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    
    // Creiamo il saldo con scadenza tra 30 giorni
    await db.insert(scheduledPayments)
      .values({
        clientId: clientId,
        quoteId: quoteId,
        amount: balanceAmount,
        dueDate: balanceDate,
        description: "Saldo finale",
        status: "pending",
        paymentMethod: null,
        reminderSent: false,
        notes: "Saldo generato automaticamente da richiesta preventivo",
        installmentNumber: 2,
        totalInstallments: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    
    // Riconverti in euro per i log
    const depositAmountEuro = depositAmount / 100;
    const balanceAmountEuro = balanceAmount / 100;
    console.log(`Pagamenti programmati creati per il preventivo ${quoteId}: acconto di ${depositAmountEuro}€ e saldo di ${balanceAmountEuro}€`);
    
  } catch (error) {
    console.error("Errore nella creazione dei pagamenti programmati:", error);
    throw error;
  }
};