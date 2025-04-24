/**
 * Controller unificato per la gestione dei collaboratori
 * Standardizzato in inglese per mantenere coerenza nel codebase
 */

import { Request, Response } from "express";
import { db } from "../db";
import { eq, desc, and, inArray, count, sql } from "drizzle-orm";
import { z } from "zod";

// Import dello schema unificato
import { 
  collaborators, 
  eventCollaborators, 
  collaboratorPayments, 
  collaboratorEditing,
  insertEventCollaboratorSchema,
  insertCollaboratorPaymentSchema,
  insertCollaboratorEditingSchema,
  updateCollaboratorEditingSchema,
  PaymentType,
  EditingStatus
} from "@shared/collaborators-schema";

// Import relazioni con altre tabelle
import { events, clients } from "@shared/schema";

/**
 * Ottiene tutti i collaboratori
 */
export const getAllCollaborators = async (req: Request, res: Response) => {
  try {
    const collaboratorsList = await db
      .select()
      .from(collaborators)
      .orderBy(collaborators.firstName, collaborators.lastName);
      
    return res.status(200).json(collaboratorsList);
  } catch (error) {
    console.error("Errore durante il recupero dei collaboratori:", error);
    return res.status(500).json({ error: "Errore durante il recupero dei collaboratori" });
  }
};

/**
 * Ottiene un singolo collaboratore per ID
 */
export const getCollaborator = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [collaborator] = await db
      .select()
      .from(collaborators)
      .where(eq(collaborators.id, Number(id)))
      .limit(1);
      
    if (!collaborator) {
      return res.status(404).json({ error: "Collaboratore non trovato" });
    }
    
    return res.status(200).json(collaborator);
  } catch (error) {
    console.error(`Errore durante il recupero del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero del collaboratore" });
  }
};

/**
 * Crea un nuovo collaboratore
 */
export const createCollaborator = async (req: Request, res: Response) => {
  try {
    const collaboratorData = req.body;
    
    const [collaborator] = await db
      .insert(collaborators)
      .values(collaboratorData)
      .returning();
      
    return res.status(201).json(collaborator);
  } catch (error) {
    console.error("Errore durante la creazione del collaboratore:", error);
    return res.status(500).json({ error: "Errore durante la creazione del collaboratore" });
  }
};

/**
 * Aggiorna un collaboratore esistente
 */
export const updateCollaborator = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const collaboratorData = req.body;
    
    const [updatedCollaborator] = await db
      .update(collaborators)
      .set(collaboratorData)
      .where(eq(collaborators.id, Number(id)))
      .returning();
      
    if (!updatedCollaborator) {
      return res.status(404).json({ error: "Collaboratore non trovato" });
    }
    
    return res.status(200).json(updatedCollaborator);
  } catch (error) {
    console.error(`Errore durante l'aggiornamento del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante l'aggiornamento del collaboratore" });
  }
};

/**
 * Elimina un collaboratore
 */
export const deleteCollaborator = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [deletedCollaborator] = await db
      .delete(collaborators)
      .where(eq(collaborators.id, Number(id)))
      .returning();
      
    if (!deletedCollaborator) {
      return res.status(404).json({ error: "Collaboratore non trovato" });
    }
    
    return res.status(200).json({ message: "Collaboratore eliminato con successo" });
  } catch (error) {
    console.error(`Errore durante l'eliminazione del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante l'eliminazione del collaboratore" });
  }
};

/**
 * Ottiene tutti gli eventi di un collaboratore
 */
export const getCollaboratorEvents = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Recuperiamo gli ID degli eventi a cui il collaboratore è associato
    const eventRecords = await db
      .select({
        eventId: eventCollaborators.eventId
      })
      .from(eventCollaborators)
      .where(eq(eventCollaborators.collaboratorId, Number(id)));
    
    // Se non ci sono eventi, restituiamo un array vuoto
    if (eventRecords.length === 0) {
      return res.status(200).json([]);
    }
    
    // Estraiamo gli ID degli eventi
    const eventIds = eventRecords.map(record => record.eventId);
    
    // Recuperiamo i dettagli degli eventi
    const eventsWithDetails = await db
      .select({
        // Dati dell'evento
        id: events.id,
        title: events.title,
        description: events.description,
        date: events.date,
        location: events.location,
        status: events.status,
        // Dati del cliente
        clientId: events.clientId,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        // Dati dell'assegnazione
        assignmentId: eventCollaborators.id,
        role: eventCollaborators.role,
        assignedAt: eventCollaborators.assignedAt,
        notes: eventCollaborators.notes
      })
      .from(events)
      .leftJoin(clients, eq(events.clientId, clients.id))
      .innerJoin(
        eventCollaborators, 
        and(
          eq(eventCollaborators.eventId, events.id),
          eq(eventCollaborators.collaboratorId, Number(id))
        )
      )
      .where(inArray(events.id, eventIds))
      .orderBy(desc(events.date));
    
    return res.status(200).json(eventsWithDetails);
  } catch (error) {
    console.error(`Errore durante il recupero degli eventi del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero degli eventi del collaboratore" });
  }
};

/**
 * Assegna un evento a un collaboratore
 */
export const assignEventToCollaborator = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Validazione dati
    const validatedData = insertEventCollaboratorSchema.parse(req.body);
    
    // Verifica che i campi essenziali siano presenti
    if (!validatedData.eventId || !validatedData.role) {
      return res.status(400).json({ error: "Dati mancanti. Richiesti: eventId, role" });
    }
    
    // Inserisci l'assegnazione
    const [assignment] = await db.insert(eventCollaborators)
      .values({
        collaboratorId: Number(id),
        eventId: validatedData.eventId,
        role: validatedData.role,
        assignedAt: validatedData.assignedAt || new Date(),
        notes: validatedData.notes
      })
      .returning();
    
    return res.status(201).json(assignment);
  } catch (error) {
    console.error(`Errore durante l'assegnazione dell'evento al collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante l'assegnazione dell'evento al collaboratore" });
  }
};

/**
 * Ottiene tutti i pagamenti di un collaboratore
 */
export const getCollaboratorPayments = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Recuperiamo i pagamenti con i dettagli degli eventi associati
    const payments = await db
      .select({
        // Dati del pagamento
        id: collaboratorPayments.id,
        collaboratorId: collaboratorPayments.collaboratorId,
        eventId: collaboratorPayments.eventId,
        type: collaboratorPayments.type,
        amount: collaboratorPayments.amount,
        paymentDate: collaboratorPayments.paymentDate,
        paymentMethod: collaboratorPayments.paymentMethod,
        notes: collaboratorPayments.notes,
        externalReference: collaboratorPayments.externalReference,
        createdAt: collaboratorPayments.createdAt,
        // Dati dell'evento
        eventTitle: events.title,
        eventDate: events.date
      })
      .from(collaboratorPayments)
      .leftJoin(events, eq(collaboratorPayments.eventId, events.id))
      .where(eq(collaboratorPayments.collaboratorId, Number(id)))
      .orderBy(desc(collaboratorPayments.paymentDate));
    
    return res.status(200).json(payments);
  } catch (error) {
    console.error(`Errore durante il recupero dei pagamenti del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero dei pagamenti del collaboratore" });
  }
};

/**
 * Aggiunge un pagamento a un collaboratore
 */
export const addCollaboratorPayment = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Validazione dati
    const validatedData = insertCollaboratorPaymentSchema.parse(req.body);
    
    // Verifica che i campi essenziali siano presenti
    if (!validatedData.eventId || !validatedData.type || !validatedData.amount) {
      return res.status(400).json({ error: "Dati mancanti. Richiesti: eventId, type, amount" });
    }
    
    // Inserisci il pagamento
    const [payment] = await db.insert(collaboratorPayments)
      .values({
        collaboratorId: Number(id),
        eventId: validatedData.eventId,
        type: validatedData.type,
        amount: validatedData.amount,
        paymentDate: validatedData.paymentDate || new Date(),
        paymentMethod: validatedData.paymentMethod,
        notes: validatedData.notes,
        externalReference: validatedData.externalReference,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return res.status(201).json(payment);
  } catch (error) {
    console.error(`Errore durante l'aggiunta del pagamento al collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante l'aggiunta del pagamento al collaboratore" });
  }
};

/**
 * Ottiene tutti i montaggi di un collaboratore
 */
export const getCollaboratorEditing = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Recuperiamo i montaggi con i dettagli degli eventi associati
    const editing = await db
      .select({
        // Dati del montaggio
        id: collaboratorEditing.id,
        collaboratorId: collaboratorEditing.collaboratorId,
        eventId: collaboratorEditing.eventId,
        advance: collaboratorEditing.advance,
        balance: collaboratorEditing.balance,
        firstContactDate: collaboratorEditing.firstContactDate,
        priority: collaboratorEditing.priority,
        expectedDeliveryDate: collaboratorEditing.expectedDeliveryDate,
        status: collaboratorEditing.status,
        notes: collaboratorEditing.notes,
        createdAt: collaboratorEditing.createdAt,
        updatedAt: collaboratorEditing.updatedAt,
        // Dati dell'evento
        eventTitle: events.title,
        eventDate: events.date
      })
      .from(collaboratorEditing)
      .leftJoin(events, eq(collaboratorEditing.eventId, events.id))
      .where(eq(collaboratorEditing.collaboratorId, Number(id)))
      .orderBy(desc(collaboratorEditing.expectedDeliveryDate));
    
    return res.status(200).json(editing);
  } catch (error) {
    console.error(`Errore durante il recupero dei montaggi del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero dei montaggi del collaboratore" });
  }
};

/**
 * Aggiunge un montaggio a un collaboratore
 */
export const addCollaboratorEditing = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Validazione dati
    const validatedData = insertCollaboratorEditingSchema.parse(req.body);
    
    // Verifica che i campi essenziali siano presenti
    if (!validatedData.eventId || !validatedData.advance || !validatedData.expectedDeliveryDate) {
      return res.status(400).json({ error: "Dati mancanti. Richiesti: eventId, advance, expectedDeliveryDate" });
    }
    
    // Inserisci il montaggio
    const [editing] = await db.insert(collaboratorEditing)
      .values({
        collaboratorId: Number(id),
        eventId: validatedData.eventId,
        advance: validatedData.advance,
        balance: validatedData.balance,
        firstContactDate: validatedData.firstContactDate,
        priority: validatedData.priority,
        expectedDeliveryDate: validatedData.expectedDeliveryDate,
        status: validatedData.status || EditingStatus.TO_DO,
        notes: validatedData.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return res.status(201).json(editing);
  } catch (error) {
    console.error(`Errore durante l'aggiunta del montaggio al collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante l'aggiunta del montaggio al collaboratore" });
  }
};

/**
 * Aggiorna un montaggio
 */
export const updateCollaboratorEditing = async (req: Request, res: Response) => {
  const { id, editingId } = req.params;
  try {
    // Validazione dati
    const validatedData = updateCollaboratorEditingSchema.parse(req.body);
    
    // Aggiorna il montaggio
    const [editing] = await db.update(collaboratorEditing)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(collaboratorEditing.id, Number(editingId)),
          eq(collaboratorEditing.collaboratorId, Number(id))
        )
      )
      .returning();
    
    if (!editing) {
      return res.status(404).json({ error: "Montaggio non trovato" });
    }
    
    return res.status(200).json(editing);
  } catch (error) {
    console.error(`Errore durante l'aggiornamento del montaggio ${editingId}:`, error);
    return res.status(500).json({ error: "Errore durante l'aggiornamento del montaggio" });
  }
};

/**
 * Ottiene i dati per la dashboard di un collaboratore
 */
export const getCollaboratorDashboard = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const collaboratorId = Number(id);
    
    // Recupera il collaboratore
    const [collaborator] = await db
      .select()
      .from(collaborators)
      .where(eq(collaborators.id, collaboratorId))
      .limit(1);
      
    if (!collaborator) {
      return res.status(404).json({ error: "Collaboratore non trovato" });
    }
    
    // Recupera gli eventi (ultimi 5)
    const recentEvents = await db
      .select({
        // Dati dell'evento
        id: events.id,
        title: events.title,
        date: events.date,
        location: events.location,
        status: events.status,
        // Dati del cliente
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        // Dati dell'assegnazione
        role: eventCollaborators.role
      })
      .from(events)
      .leftJoin(clients, eq(events.clientId, clients.id))
      .innerJoin(
        eventCollaborators, 
        and(
          eq(eventCollaborators.eventId, events.id),
          eq(eventCollaborators.collaboratorId, collaboratorId)
        )
      )
      .orderBy(desc(events.date))
      .limit(5);
    
    // Recupera i pagamenti (ultimi 5)
    const payments = await db
      .select({
        id: collaboratorPayments.id,
        eventId: collaboratorPayments.eventId,
        type: collaboratorPayments.type,
        amount: collaboratorPayments.amount,
        paymentDate: collaboratorPayments.paymentDate,
        eventTitle: events.title
      })
      .from(collaboratorPayments)
      .leftJoin(events, eq(collaboratorPayments.eventId, events.id))
      .where(eq(collaboratorPayments.collaboratorId, collaboratorId))
      .orderBy(desc(collaboratorPayments.paymentDate))
      .limit(5);
    
    // Recupera i montaggi (ultimi 5)
    const editing = await db
      .select({
        id: collaboratorEditing.id,
        eventId: collaboratorEditing.eventId,
        advance: collaboratorEditing.advance,
        balance: collaboratorEditing.balance,
        expectedDeliveryDate: collaboratorEditing.expectedDeliveryDate,
        status: collaboratorEditing.status,
        eventTitle: events.title
      })
      .from(collaboratorEditing)
      .leftJoin(events, eq(collaboratorEditing.eventId, events.id))
      .where(eq(collaboratorEditing.collaboratorId, collaboratorId))
      .orderBy(desc(collaboratorEditing.expectedDeliveryDate))
      .limit(5);
    
    // Calcola statistiche
    // Totale eventi
    const { count: totalEvents } = await db
      .select({ count: count() })
      .from(eventCollaborators)
      .where(eq(eventCollaborators.collaboratorId, collaboratorId))
      .then(rows => rows[0] || { count: 0 });
    
    // Totale pagamenti
    const { sum: totalPayments } = await db
      .select({ sum: sql`COALESCE(SUM(${collaboratorPayments.amount}), 0)` })
      .from(collaboratorPayments)
      .where(eq(collaboratorPayments.collaboratorId, collaboratorId))
      .then(rows => rows[0] || { sum: 0 });
    
    // Montaggi da completare
    const { count: pendingEditing } = await db
      .select({ count: count() })
      .from(collaboratorEditing)
      .where(
        and(
          eq(collaboratorEditing.collaboratorId, collaboratorId),
          eq(collaboratorEditing.status, EditingStatus.TO_DO)
        )
      )
      .then(rows => rows[0] || { count: 0 });
    
    return res.status(200).json({
      collaborator,
      statistics: {
        totalEvents,
        totalPayments,
        pendingEditing
      },
      recentData: {
        events: recentEvents,
        payments,
        editing
      }
    });
  } catch (error) {
    console.error(`Errore durante il recupero della dashboard del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero della dashboard del collaboratore" });
  }
};