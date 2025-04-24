import { Request, Response } from "express";
// Non usare l'import di db dall'esterno, ma usare l'istanza locale che conosce lo schema aggiornato
// import { db } from "../db";
import { drizzle } from 'drizzle-orm/neon-serverless';
import { pool } from "../db";
// Ricarica lo schema aggiornato direttamente dal file
import * as schema from "@shared/schema";
import { collaborators, events, eventCollaborators, clients, type EventCollaborator } from "@shared/schema";

// Crea un'istanza locale del db che conosce lo schema più recente
const db = drizzle({ client: pool, schema });
import { 
  collaboratorPayments,
  collaboratorEditing,
  insertEventCollaboratorSchema,
  insertCollaboratorPaymentSchema,
  insertCollaboratorEditingSchema,
  updateCollaboratorEditingSchema,
  PaymentType,
  EditingStatus
} from "@shared/collaborators-schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { z } from "zod";

/**
 * Controller standardizzato in inglese per la gestione delle operazioni relative al modulo Collaboratori
 */

// GET: Lista di eventi di un collaboratore
export const getCollaboratorEvents = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    console.log(`Recupero eventi per il collaboratore ID: ${id}`);
    
    // Recupera tutti gli eventi del collaboratore
    const assignedEventIds = await db
      .select({
        eventId: eventCollaborators.eventId
      })
      .from(eventCollaborators)
      .where(eq(eventCollaborators.collaboratorId, Number(id)));
    
    // Se non ci sono eventi, restituisce un array vuoto
    if (assignedEventIds.length === 0) {
      return res.status(200).json([]);
    }
    
    // Estrai gli ID degli eventi
    const eventIds = assignedEventIds.map(record => record.eventId);
    console.log(`Trovati ${eventIds.length} eventi unici per il collaboratore ID: ${id}`);
    
    // Recupera i dettagli degli eventi
    const eventsDetails = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        date: events.date,
        location: events.location,
        status: events.status,
        clientId: events.clientId,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName
      })
      .from(events)
      .leftJoin(clients, eq(events.clientId, clients.id))
      .where(inArray(events.id, eventIds));
      
    console.log(`Recuperati ${eventsDetails.length} eventi con dettagli`);
    
    // Crea una mappa degli eventi per ID per un accesso rapido
    const eventsById = {};
    for (const event of eventsDetails) {
      eventsById[event.id] = event;
    }
    
    // Recupera i ruoli e le note per ogni evento
    const eventAssignments = await db
      .select({
        id: eventCollaborators.id,
        collaboratorId: eventCollaborators.collaboratorId,
        eventId: eventCollaborators.eventId,
        role: eventCollaborators.role,
        assignedAt: eventCollaborators.assignedAt,
        notes: eventCollaborators.notes
      })
      .from(eventCollaborators)
      .where(eq(eventCollaborators.collaboratorId, Number(id)));
    
    // Combina i dettagli degli eventi con le assegnazioni
    const combinedEvents = eventAssignments.map(assignment => {
      const eventDetails = eventsById[assignment.eventId];
      if (!eventDetails) return null;
      
      return {
        id: assignment.id,
        collaboratoreId: assignment.collaboratorId, // Mantiene retrocompatibilità
        eventoId: assignment.eventId, // Mantiene retrocompatibilità
        ruolo: assignment.role, // Mantiene retrocompatibilità
        dataAssegnazione: assignment.assignedAt, // Mantiene retrocompatibilità
        note: assignment.notes, // Mantiene retrocompatibilità
        titolo: eventDetails.title, // Mantiene retrocompatibilità
        descrizione: eventDetails.description, // Mantiene retrocompatibilità
        data: eventDetails.date, // Mantiene retrocompatibilità
        location: eventDetails.location,
        stato: eventDetails.status, // Mantiene retrocompatibilità
        clientId: eventDetails.clientId,
        clientFirstName: eventDetails.clientFirstName,
        clientLastName: eventDetails.clientLastName,
        // Aggiungi campi in inglese per compatibilità futura
        collaboratorId: assignment.collaboratorId,
        eventId: assignment.eventId,
        role: assignment.role,
        assignedAt: assignment.assignedAt,
        notes: assignment.notes,
        title: eventDetails.title,
        description: eventDetails.description,
        eventDate: eventDetails.date,
        status: eventDetails.status
      };
    }).filter(Boolean);
    
    // Ordina per data di assegnazione decrescente
    combinedEvents.sort((a, b) => {
      const dateA = a.assignedAt ? new Date(a.assignedAt) : new Date(0);
      const dateB = b.assignedAt ? new Date(b.assignedAt) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log(`Restituiti ${combinedEvents.length} eventi combinati totali`);
    
    return res.status(200).json(combinedEvents);
  } catch (error) {
    console.error(`Errore recupero eventi del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero degli eventi del collaboratore" });
  }
};

// POST: Aggiunta di un nuovo evento a un collaboratore
export const addCollaboratorEvent = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Debug dei dati ricevuti
    console.log("Dati ricevuti nel controller addCollaboratorEvent:", {
      body: req.body,
      id: id
    });
    
    // Prepara i dati per l'inserimento - adatta i nomi dei campi in italiano a quelli in inglese
    const requestData = {
      collaboratorId: Number(id),
      eventId: req.body.eventoId || req.body.eventId,
      role: req.body.ruolo || req.body.role,
      assignedAt: new Date(),
      notes: req.body.note || req.body.notes
    };
    
    // Validazione input con dati già convertiti
    const data = insertEventCollaboratorSchema.parse(requestData);
    
    // Verifica se l'associazione esiste già
    const existingAssignment = await db
      .select()
      .from(eventCollaborators)
      .where(
        and(
          eq(eventCollaborators.collaboratorId, data.collaboratorId),
          eq(eventCollaborators.eventId, data.eventId)
        )
      )
      .limit(1);
      
    if (existingAssignment.length > 0) {
      return res.status(409).json({ 
        error: "Questo collaboratore è già associato a questo evento",
        eventId: data.eventId
      });
    }
    
    // Inserimento nel database
    const [newAssignment] = await db
      .insert(eventCollaborators)
      .values(data)
      .returning();
    
    // Recupera i dettagli completi dell'evento per la risposta
    const [eventDetails] = await db
      .select({
        id: eventCollaborators.id,
        collaboratorId: eventCollaborators.collaboratorId,
        eventId: eventCollaborators.eventId,
        role: eventCollaborators.role,
        assignedAt: eventCollaborators.assignedAt,
        notes: eventCollaborators.notes,
        title: events.title,
        description: events.description,
        date: events.date,
        location: events.location,
        status: events.status
      })
      .from(eventCollaborators)
      .innerJoin(events, eq(eventCollaborators.eventId, events.id))
      .where(eq(eventCollaborators.id, newAssignment.id));
    
    // Formatta la risposta con campi sia in italiano che in inglese per retrocompatibilità
    const response = {
      ...eventDetails,
      // Campi in italiano per retrocompatibilità
      collaboratoreId: eventDetails.collaboratorId,
      eventoId: eventDetails.eventId,
      ruolo: eventDetails.role,
      dataAssegnazione: eventDetails.assignedAt,
      note: eventDetails.notes,
      titolo: eventDetails.title,
      descrizione: eventDetails.description,
      data: eventDetails.date,
      stato: eventDetails.status
    };
    
    return res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error(`Errore aggiunta evento al collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante l'aggiunta dell'evento al collaboratore" });
  }
};

// GET: Lista di pagamenti di un collaboratore
export const getCollaboratorPayments = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const payments = await db
      .select()
      .from(collaboratorPayments)
      .where(eq(collaboratorPayments.collaboratorId, Number(id)))
      .orderBy(desc(collaboratorPayments.paymentDate));
    
    // Formatta la risposta con campi sia in italiano che in inglese per retrocompatibilità
    const formattedPayments = payments.map(payment => ({
      ...payment,
      // Campi in italiano per retrocompatibilità
      collaboratoreId: payment.collaboratorId,
      eventoId: payment.eventId,
      tipo: payment.type,
      importo: payment.amount,
      dataPagamento: payment.paymentDate,
      metodoPagamento: payment.paymentMethod,
      note: payment.notes,
      riferimentoEsterno: payment.externalReference,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    }));
    
    return res.status(200).json(formattedPayments);
  } catch (error) {
    console.error(`Errore recupero pagamenti del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero dei pagamenti del collaboratore" });
  }
};

// POST: Registrazione di un nuovo pagamento
export const addCollaboratorPayment = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Prepara i dati per l'inserimento - adatta i nomi dei campi in italiano a quelli in inglese
    const requestData = {
      collaboratorId: Number(id),
      eventId: req.body.eventoId || req.body.eventId,
      type: req.body.tipo || req.body.type,
      amount: req.body.importo || req.body.amount,
      paymentDate: req.body.dataPagamento || req.body.paymentDate || new Date(),
      paymentMethod: req.body.metodoPagamento || req.body.paymentMethod,
      notes: req.body.note || req.body.notes,
      externalReference: req.body.riferimentoEsterno || req.body.externalReference
    };
    
    // Validazione input
    const data = insertCollaboratorPaymentSchema.parse(requestData);
    
    // Inserimento nel database
    const [newPayment] = await db
      .insert(collaboratorPayments)
      .values(data)
      .returning();
    
    // Formatta la risposta con campi sia in italiano che in inglese per retrocompatibilità
    const response = {
      ...newPayment,
      // Campi in italiano per retrocompatibilità
      collaboratoreId: newPayment.collaboratorId,
      eventoId: newPayment.eventId,
      tipo: newPayment.type,
      importo: newPayment.amount,
      dataPagamento: newPayment.paymentDate,
      metodoPagamento: newPayment.paymentMethod,
      note: newPayment.notes,
      riferimentoEsterno: newPayment.externalReference
    };
    
    return res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error(`Errore aggiunta pagamento al collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante la registrazione del pagamento" });
  }
};

// GET: Lista di montaggi di un collaboratore
export const getCollaboratorEditing = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const editingList = await db
      .select()
      .from(collaboratorEditing)
      .where(eq(collaboratorEditing.collaboratorId, Number(id)))
      .orderBy(desc(collaboratorEditing.priority));
    
    // Formatta la risposta con campi sia in italiano che in inglese per retrocompatibilità
    const formattedEditingList = editingList.map(editing => ({
      ...editing,
      // Campi in italiano per retrocompatibilità
      collaboratoreId: editing.collaboratorId,
      eventoId: editing.eventId,
      acconto: editing.advance,
      saldo: editing.balance,
      dataPrimoContatto: editing.firstContactDate,
      priorita: editing.priority,
      dataConsegnaPrevista: editing.expectedDeliveryDate,
      stato: editing.status,
      note: editing.notes
    }));
    
    return res.status(200).json(formattedEditingList);
  } catch (error) {
    console.error(`Errore recupero montaggi del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero dei montaggi del collaboratore" });
  }
};

// POST: Creazione di un nuovo montaggio (con opzione per registrare acconto)
export const addCollaboratorEditing = async (req: Request, res: Response) => {
  const { id } = req.params;
  const collaboratorId = Number(id);
  
  try {
    // Prepara i dati per l'inserimento - adatta i nomi dei campi in italiano a quelli in inglese
    const requestData = {
      collaboratorId,
      eventId: req.body.eventoId || req.body.eventId,
      advance: req.body.acconto || req.body.advance || 0,
      balance: req.body.saldo || req.body.balance,
      firstContactDate: req.body.dataPrimoContatto || req.body.firstContactDate,
      priority: req.body.priorita || req.body.priority || 0,
      expectedDeliveryDate: req.body.dataConsegnaPrevista || req.body.expectedDeliveryDate || new Date(),
      status: req.body.stato || req.body.status || EditingStatus.TO_DO,
      notes: req.body.note || req.body.notes
    };
    
    // Validazione input del montaggio
    const data = insertCollaboratorEditingSchema.parse(requestData);
    
    // Verifica se è stato richiesto anche il pagamento di un acconto
    const registerAdvance = req.body.registraAcconto === true || req.body.registerAdvance === true;
    let paymentData;
    
    if (registerAdvance && (req.body.pagamento || req.body.payment)) {
      const payment = req.body.pagamento || req.body.payment;
      
      // Prepara i dati per l'inserimento del pagamento
      const paymentRequestData = {
        collaboratorId,
        eventId: data.eventId,
        type: PaymentType.EDITING_ADVANCE,
        amount: payment.importo || payment.amount,
        paymentDate: payment.dataPagamento || payment.paymentDate || new Date(),
        paymentMethod: payment.metodoPagamento || payment.paymentMethod,
        notes: payment.note || payment.notes,
        externalReference: payment.riferimentoEsterno || payment.externalReference
      };
      
      // Validazione dati pagamento acconto
      paymentData = insertCollaboratorPaymentSchema.parse(paymentRequestData);
    }
    
    // Usa una transazione per garantire che entrambe le operazioni abbiano successo o falliscano insieme
    return await db.transaction(async (tx) => {
      // Inserimento del montaggio nel database
      const [newEditing] = await tx
        .insert(collaboratorEditing)
        .values(data)
        .returning();
      
      // Se richiesto, inserisci anche il pagamento dell'acconto
      if (registerAdvance && paymentData) {
        await tx
          .insert(collaboratorPayments)
          .values(paymentData);
      }
      
      // Formatta la risposta con campi sia in italiano che in inglese per retrocompatibilità
      const response = {
        ...newEditing,
        // Campi in italiano per retrocompatibilità
        collaboratoreId: newEditing.collaboratorId,
        eventoId: newEditing.eventId,
        acconto: newEditing.advance,
        saldo: newEditing.balance,
        dataPrimoContatto: newEditing.firstContactDate,
        priorita: newEditing.priority,
        dataConsegnaPrevista: newEditing.expectedDeliveryDate,
        stato: newEditing.status,
        note: newEditing.notes
      };
      
      return res.status(201).json(response);
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error(`Errore creazione montaggio per il collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante la creazione del montaggio" });
  }
};

// PATCH: Aggiornamento stato montaggio (con opzione per registrare saldo)
export const updateCollaboratorEditing = async (req: Request, res: Response) => {
  const { id, editingId } = req.params;
  const collaboratorId = Number(id);
  const editingIdNum = Number(editingId);
  
  try {
    // Prepara i dati per l'aggiornamento - adatta i nomi dei campi in italiano a quelli in inglese
    const requestData = {
      advance: req.body.acconto !== undefined ? req.body.acconto : req.body.advance,
      balance: req.body.saldo !== undefined ? req.body.saldo : req.body.balance,
      firstContactDate: req.body.dataPrimoContatto || req.body.firstContactDate,
      priority: req.body.priorita !== undefined ? req.body.priorita : req.body.priority,
      expectedDeliveryDate: req.body.dataConsegnaPrevista || req.body.expectedDeliveryDate,
      status: req.body.stato || req.body.status,
      notes: req.body.note || req.body.notes
    };
    
    // Filtriamo i campi undefined
    const filteredData = Object.fromEntries(
      Object.entries(requestData).filter(([_, v]) => v !== undefined)
    );
    
    // Validazione input
    const data = updateCollaboratorEditingSchema.parse(filteredData);
    
    // Verifica se è stato richiesto anche il pagamento di un saldo al completamento
    const registerBalance = (req.body.registraSaldo === true || req.body.registerBalance === true) && 
                           (data.status === EditingStatus.COMPLETED);
    let paymentData;
    
    if (registerBalance && (req.body.pagamento || req.body.payment)) {
      const payment = req.body.pagamento || req.body.payment;
      const eventId = req.body.eventoId || req.body.eventId;
      
      // Prepara i dati per l'inserimento del pagamento saldo
      const paymentRequestData = {
        collaboratorId,
        eventId: eventId,
        type: PaymentType.EDITING_BALANCE,
        amount: payment.importo || payment.amount,
        paymentDate: payment.dataPagamento || payment.paymentDate || new Date(),
        paymentMethod: payment.metodoPagamento || payment.paymentMethod,
        notes: payment.note || payment.notes,
        externalReference: payment.riferimentoEsterno || payment.externalReference
      };
      
      // Validazione dati pagamento saldo
      paymentData = insertCollaboratorPaymentSchema.parse(paymentRequestData);
    }
    
    // Usa una transazione per garantire che entrambe le operazioni abbiano successo o falliscano insieme
    return await db.transaction(async (tx) => {
      // Aggiornamento nel database
      const [updatedEditing] = await tx
        .update(collaboratorEditing)
        .set(data)
        .where(eq(collaboratorEditing.id, editingIdNum))
        .returning();
      
      // Se richiesto, inserisci anche il pagamento del saldo
      if (registerBalance && paymentData) {
        await tx
          .insert(collaboratorPayments)
          .values(paymentData);
      }
      
      // Formatta la risposta con campi sia in italiano che in inglese per retrocompatibilità
      const response = {
        ...updatedEditing,
        // Campi in italiano per retrocompatibilità
        collaboratoreId: updatedEditing.collaboratorId,
        eventoId: updatedEditing.eventId,
        acconto: updatedEditing.advance,
        saldo: updatedEditing.balance,
        dataPrimoContatto: updatedEditing.firstContactDate,
        priorita: updatedEditing.priority,
        dataConsegnaPrevista: updatedEditing.expectedDeliveryDate,
        stato: updatedEditing.status,
        note: updatedEditing.notes
      };
      
      return res.status(200).json(response);
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error(`Errore aggiornamento montaggio ${editingId} per il collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante l'aggiornamento del montaggio" });
  }
};

// GET: Dashboard collaboratore (statistiche)
export const getCollaboratorDashboard = async (req: Request, res: Response) => {
  const { id } = req.params;
  const collaboratorId = Number(id);
  
  try {
    // Recupera il collaboratore per i dati di base
    const [collaborator] = await db
      .select()
      .from(collaborators)
      .where(eq(collaborators.id, collaboratorId));
    
    if (!collaborator) {
      return res.status(404).json({ error: "Collaboratore non trovato" });
    }
    
    // Recupera eventi assegnati
    const assignedEvents = await db
      .select({
        id: eventCollaborators.id,
        eventId: eventCollaborators.eventId,
        role: eventCollaborators.role,
        assignedAt: eventCollaborators.assignedAt
      })
      .from(eventCollaborators)
      .where(eq(eventCollaborators.collaboratorId, collaboratorId))
      .orderBy(desc(eventCollaborators.assignedAt));
    
    // Conta eventi totali e per ruolo
    const totalEvents = assignedEvents.length;
    
    const roleCount = {};
    for (const event of assignedEvents) {
      roleCount[event.role] = (roleCount[event.role] || 0) + 1;
    }
    
    // Recupera informazioni sui pagamenti
    const payments = await db
      .select()
      .from(collaboratorPayments)
      .where(eq(collaboratorPayments.collaboratorId, collaboratorId));
    
    // Calcola pagamenti totali e per tipo
    let totalPayments = 0;
    const paymentsByType = {};
    
    for (const payment of payments) {
      const amount = typeof payment.amount === 'string' 
        ? parseFloat(payment.amount) 
        : Number(payment.amount);
      
      totalPayments += amount;
      paymentsByType[payment.type] = (paymentsByType[payment.type] || 0) + amount;
    }
    
    // Recupera informazioni sui montaggi
    const editingJobs = await db
      .select()
      .from(collaboratorEditing)
      .where(eq(collaboratorEditing.collaboratorId, collaboratorId));
    
    // Conta montaggi per stato
    const editingByStatus = {};
    for (const job of editingJobs) {
      editingByStatus[job.status] = (editingByStatus[job.status] || 0) + 1;
    }
    
    // Costruisci la dashboard
    const dashboard = {
      // Info collaboratore
      collaborator: {
        id: collaborator.id,
        firstName: collaborator.firstName,
        lastName: collaborator.lastName,
        role: collaborator.role,
        status: collaborator.status,
        // Campi in italiano per retrocompatibilità
        nome: collaborator.firstName,
        cognome: collaborator.lastName,
        ruolo: collaborator.role,
        stato: collaborator.status
      },
      // Statistiche eventi
      events: {
        total: totalEvents,
        byRole: roleCount,
        recent: assignedEvents.slice(0, 5).map(event => ({
          id: event.id,
          eventId: event.eventId,
          role: event.role,
          assignedAt: event.assignedAt,
          // Campi in italiano per retrocompatibilità
          eventoId: event.eventId,
          ruolo: event.role,
          dataAssegnazione: event.assignedAt
        })),
        // Campi in italiano per retrocompatibilità
        totale: totalEvents,
        perRuolo: roleCount,
        recenti: assignedEvents.slice(0, 5).map(event => ({
          id: event.id,
          eventoId: event.eventId,
          ruolo: event.role,
          dataAssegnazione: event.assignedAt
        }))
      },
      // Statistiche pagamenti
      payments: {
        total: totalPayments,
        byType: paymentsByType,
        count: payments.length,
        // Campi in italiano per retrocompatibilità
        totale: totalPayments,
        perTipo: paymentsByType,
        conteggio: payments.length
      },
      // Statistiche montaggi
      editing: {
        total: editingJobs.length,
        byStatus: editingByStatus,
        // Campi in italiano per retrocompatibilità
        totale: editingJobs.length,
        perStato: editingByStatus
      }
    };
    
    return res.status(200).json(dashboard);
  } catch (error) {
    console.error(`Errore recupero dashboard del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero della dashboard del collaboratore" });
  }
};