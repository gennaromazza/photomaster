import { Request, Response } from "express";
// Non usare l'import di db dall'esterno, ma usare l'istanza locale che conosce lo schema aggiornato
// import { db } from "../db";
import { drizzle } from 'drizzle-orm/neon-serverless';
import { pool } from "../db";
import { 
  pagamentiEvento, 
  montaggiEvento, 
  eventiCollaboratori,
  insertPagamentoEventoSchema,
  insertMontaggioEventoSchema,
  updateMontaggioEventoSchema,
  TipoPagamentoEvento,
  StatoMontaggioEvento,
  TipoMontaggioEvento
} from "@shared/eventi-schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { z } from "zod";
import * as schema from "@shared/schema";
import { events, collaborators, eventCollaborators } from "@shared/schema";

// Crea un'istanza locale del db che conosce lo schema più recente
const db = drizzle({ client: pool, schema });

/**
 * Controller for event-centric management of:
 * - Collaborators assigned to the event
 * - Payments related to the event
 * - Editing tasks related to the event
 * 
 * This is the standardized English version of the controller.
 */

// GET: Retrieve event details with collaborators, payments and editing tasks
export const getEventDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Get event details
    const [event] = await db.select().from(events)
      .where(eq(events.id, Number(id)));
    
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    // Get assigned collaborators
    const eventCollaborators = await db.select({
      id: eventiCollaboratori.id,
      role: eventiCollaboratori.ruolo,
      assignedAt: eventiCollaboratori.dataAssegnazione,
      notes: eventiCollaboratori.note,
      collaborator: {
        id: collaborators.id,
        firstName: collaborators.firstName,
        lastName: collaborators.lastName,
        email: collaborators.email,
        phone: collaborators.phone
      }
    })
    .from(eventiCollaboratori)
    .innerJoin(collaborators, eq(eventiCollaboratori.collaboratoreId, collaborators.id))
    .where(eq(eventiCollaboratori.eventoId, Number(id)));
    
    // Get payments related to the event
    const eventPayments = await db.select({
      id: pagamentiEvento.id,
      type: pagamentiEvento.tipo,
      amount: pagamentiEvento.importo,
      paymentDate: pagamentiEvento.dataPagamento,
      paymentMethod: pagamentiEvento.metodoPagamento,
      externalReference: pagamentiEvento.riferimentoEsterno,
      notes: pagamentiEvento.note,
      createdAt: pagamentiEvento.createdAt,
      updatedAt: pagamentiEvento.updatedAt,
      collaborator: {
        id: collaborators.id,
        firstName: collaborators.firstName,
        lastName: collaborators.lastName
      }
    })
    .from(pagamentiEvento)
    .leftJoin(collaborators, eq(pagamentiEvento.collaboratoreId, collaborators.id))
    .where(eq(pagamentiEvento.eventoId, Number(id)))
    .orderBy(desc(pagamentiEvento.dataPagamento));
    
    // Get editing tasks related to the event
    const eventEditingTasks = await db.select({
      id: montaggiEvento.id,
      editingType: montaggiEvento.tipoMontaggio,
      advanceAmount: montaggiEvento.accontoImporto,
      advancePaid: montaggiEvento.accontoPagato,
      advancePaymentDate: montaggiEvento.accontoDataPagamento,
      balanceAmount: montaggiEvento.saldoImporto,
      balancePaid: montaggiEvento.saldoPagato,
      balancePaymentDate: montaggiEvento.saldoDataPagamento,
      firstContactDate: montaggiEvento.dataPrimoContatto,
      priority: montaggiEvento.priorita,
      expectedDeliveryDate: montaggiEvento.dataConsegnaPrevista,
      actualDeliveryDate: montaggiEvento.dataConsegnaEffettiva,
      status: montaggiEvento.stato,
      notes: montaggiEvento.note,
      createdAt: montaggiEvento.createdAt,
      updatedAt: montaggiEvento.updatedAt,
      collaborator: {
        id: collaborators.id,
        firstName: collaborators.firstName,
        lastName: collaborators.lastName
      }
    })
    .from(montaggiEvento)
    .innerJoin(collaborators, eq(montaggiEvento.collaboratoreId, collaborators.id))
    .where(eq(montaggiEvento.eventoId, Number(id)))
    .orderBy(asc(montaggiEvento.dataConsegnaPrevista));
    
    // Calculate payment statistics
    // Client income
    const clientPayments = eventPayments.filter(p => 
      p.type === TipoPagamentoEvento.CLIENTE_ACCONTO || 
      p.type === TipoPagamentoEvento.CLIENTE_SALDO || 
      p.type === TipoPagamentoEvento.CLIENTE_EXTRA
    );
    const totalIncome = clientPayments.reduce((acc, p) => acc + Number(p.amount), 0);
    
    // Collaborator payments
    const collaboratorPayments = eventPayments.filter(p => 
      p.type === TipoPagamentoEvento.COLLABORATORE_ACCONTO || 
      p.type === TipoPagamentoEvento.COLLABORATORE_SALDO
    );
    const totalCollaboratorPayments = collaboratorPayments.reduce((acc, p) => acc + Number(p.amount), 0);
    
    // Editing payments
    const editingPayments = eventPayments.filter(p => 
      p.type === TipoPagamentoEvento.MONTAGGIO_ACCONTO || 
      p.type === TipoPagamentoEvento.MONTAGGIO_SALDO
    );
    const totalEditingPayments = editingPayments.reduce((acc, p) => acc + Number(p.amount), 0);
    
    // Vendor and other payments
    const otherPayments = eventPayments.filter(p => 
      p.type === TipoPagamentoEvento.FORNITORE || 
      p.type === TipoPagamentoEvento.ALTRO
    );
    const totalOtherPayments = otherPayments.reduce((acc, p) => acc + Number(p.amount), 0);
    
    // Calculate margin
    const grossMargin = totalIncome - totalCollaboratorPayments - totalEditingPayments - totalOtherPayments;
    
    // Prepare complete data
    const completeEvent = {
      ...event,
      collaborators: eventCollaborators,
      payments: eventPayments,
      editingTasks: eventEditingTasks,
      statistics: {
        totalIncome,
        totalCollaboratorPayments,
        totalEditingPayments,
        totalOtherPayments,
        grossMargin
      }
    };
    
    return res.status(200).json(completeEvent);
  } catch (error) {
    console.error(`Error retrieving event details ${id}:`, error);
    return res.status(500).json({ error: "Error retrieving event details" });
  }
};

// EVENT PAYMENTS
// -------------

// GET: Retrieve all payments for an event
export const getEventPayments = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const paymentsList = await db.select({
      id: pagamentiEvento.id,
      type: pagamentiEvento.tipo,
      amount: pagamentiEvento.importo,
      paymentDate: pagamentiEvento.dataPagamento,
      paymentMethod: pagamentiEvento.metodoPagamento,
      externalReference: pagamentiEvento.riferimentoEsterno,
      notes: pagamentiEvento.note,
      createdAt: pagamentiEvento.createdAt,
      updatedAt: pagamentiEvento.updatedAt,
      collaborator: {
        id: collaborators.id,
        firstName: collaborators.firstName,
        lastName: collaborators.lastName
      }
    })
    .from(pagamentiEvento)
    .leftJoin(collaborators, eq(pagamentiEvento.collaboratoreId, collaborators.id))
    .where(eq(pagamentiEvento.eventoId, Number(id)))
    .orderBy(desc(pagamentiEvento.dataPagamento));
    
    return res.status(200).json(paymentsList);
  } catch (error) {
    console.error(`Error retrieving event payments ${id}:`, error);
    return res.status(500).json({ error: "Error retrieving event payments" });
  }
};

// POST: Register a new payment for an event
export const addEventPayment = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Verify that the event exists
    const [event] = await db.select().from(events)
      .where(eq(events.id, Number(id)));
    
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    // Validate input
    const data = insertPagamentoEventoSchema.parse({
      ...req.body,
      eventoId: Number(id)
    });
    
    // Insert the payment
    const [newPayment] = await db.insert(pagamentiEvento)
      .values(data)
      .returning();
    
    // If the payment is related to an editing task, update the editing task status
    if (
      data.tipo === TipoPagamentoEvento.MONTAGGIO_ACCONTO || 
      data.tipo === TipoPagamentoEvento.MONTAGGIO_SALDO
    ) {
      // Get the editing task associated with the collaborator for this event
      const [editingTask] = await db.select().from(montaggiEvento)
        .where(
          and(
            eq(montaggiEvento.eventoId, Number(id)),
            eq(montaggiEvento.collaboratoreId, data.collaboratoreId)
          )
        );
      
      if (editingTask) {
        // Update the payment status of the editing task
        if (data.tipo === TipoPagamentoEvento.MONTAGGIO_ACCONTO) {
          await db.update(montaggiEvento)
            .set({ 
              accontoPagato: true,
              accontoDataPagamento: data.dataPagamento
            })
            .where(eq(montaggiEvento.id, editingTask.id));
        } else if (data.tipo === TipoPagamentoEvento.MONTAGGIO_SALDO) {
          await db.update(montaggiEvento)
            .set({ 
              saldoPagato: true,
              saldoDataPagamento: data.dataPagamento
            })
            .where(eq(montaggiEvento.id, editingTask.id));
        }
      }
    }
    
    // Retrieve the complete payment details with collaborator data
    let completePayment;
    if (data.collaboratoreId) {
      const [result] = await db.select({
        id: pagamentiEvento.id,
        type: pagamentiEvento.tipo,
        amount: pagamentiEvento.importo,
        paymentDate: pagamentiEvento.dataPagamento,
        paymentMethod: pagamentiEvento.metodoPagamento,
        externalReference: pagamentiEvento.riferimentoEsterno,
        notes: pagamentiEvento.note,
        createdAt: pagamentiEvento.createdAt,
        updatedAt: pagamentiEvento.updatedAt,
        collaborator: {
          id: collaborators.id,
          firstName: collaborators.firstName,
          lastName: collaborators.lastName
        }
      })
      .from(pagamentiEvento)
      .leftJoin(collaborators, eq(pagamentiEvento.collaboratoreId, collaborators.id))
      .where(eq(pagamentiEvento.id, newPayment.id));
      
      completePayment = result;
    } else {
      completePayment = newPayment;
    }
    
    return res.status(201).json(completePayment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error(`Error adding payment to event ${id}:`, error);
    return res.status(500).json({ error: "Error registering payment" });
  }
};

// EVENT EDITING TASKS
// -----------------

// GET: Retrieve all editing tasks for an event
export const getEventEditingTasks = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const editingTasksList = await db.select({
      id: montaggiEvento.id,
      editingType: montaggiEvento.tipoMontaggio,
      advanceAmount: montaggiEvento.accontoImporto,
      advancePaid: montaggiEvento.accontoPagato,
      advancePaymentDate: montaggiEvento.accontoDataPagamento,
      balanceAmount: montaggiEvento.saldoImporto,
      balancePaid: montaggiEvento.saldoPagato,
      balancePaymentDate: montaggiEvento.saldoDataPagamento,
      firstContactDate: montaggiEvento.dataPrimoContatto,
      priority: montaggiEvento.priorita,
      expectedDeliveryDate: montaggiEvento.dataConsegnaPrevista,
      actualDeliveryDate: montaggiEvento.dataConsegnaEffettiva,
      status: montaggiEvento.stato,
      notes: montaggiEvento.note,
      createdAt: montaggiEvento.createdAt,
      updatedAt: montaggiEvento.updatedAt,
      collaborator: {
        id: collaborators.id,
        firstName: collaborators.firstName,
        lastName: collaborators.lastName,
        email: collaborators.email,
        phone: collaborators.phone
      }
    })
    .from(montaggiEvento)
    .innerJoin(collaborators, eq(montaggiEvento.collaboratoreId, collaborators.id))
    .where(eq(montaggiEvento.eventoId, Number(id)))
    .orderBy(asc(montaggiEvento.dataConsegnaPrevista));
    
    return res.status(200).json(editingTasksList);
  } catch (error) {
    console.error(`Error retrieving event editing tasks ${id}:`, error);
    return res.status(500).json({ error: "Error retrieving event editing tasks" });
  }
};

// POST: Register a new editing task for an event
export const addEventEditingTask = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Verify that the event exists
    const [event] = await db.select().from(events)
      .where(eq(events.id, Number(id)));
    
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    // Input validation
    const data = insertMontaggioEventoSchema.parse({
      ...req.body,
      eventoId: Number(id)
    });
    
    // Verify that there isn't already an editing task of the same type for this collaborator and event
    const [existingTask] = await db.select().from(montaggiEvento)
      .where(
        and(
          eq(montaggiEvento.eventoId, Number(id)),
          eq(montaggiEvento.collaboratoreId, data.collaboratoreId),
          eq(montaggiEvento.tipoMontaggio, data.tipoMontaggio)
        )
      );
    
    if (existingTask) {
      return res.status(400).json({ 
        error: `An editing task of type ${data.tipoMontaggio} already exists for this collaborator and event` 
      });
    }
    
    // Insert the editing task
    let taskData = { ...data };
    
    // Handle any associated payment with the editing task
    let advancePayment = null;
    if (req.body.advancePayment && data.accontoImporto && data.accontoImporto > 0) {
      const paymentDate = new Date();
      
      // Create a new payment record for the advance
      [advancePayment] = await db.insert(pagamentiEvento)
        .values({
          eventoId: Number(id),
          collaboratoreId: data.collaboratoreId,
          tipo: TipoPagamentoEvento.MONTAGGIO_ACCONTO,
          importo: data.accontoImporto,
          dataPagamento: paymentDate,
          metodoPagamento: req.body.paymentMethod || "bank_transfer",
          note: `Advance for ${data.tipoMontaggio} editing task`,
          riferimentoEsterno: req.body.externalReference
        })
        .returning();
      
      // Update the editing task fields to reflect the advance payment
      taskData = {
        ...taskData,
        accontoPagato: true,
        accontoDataPagamento: paymentDate
      };
    }
    
    // Insert the editing task
    const [newEditingTask] = await db.insert(montaggiEvento)
      .values(taskData)
      .returning();
    
    // Retrieve the complete editing task details with collaborator data
    const [completeEditingTask] = await db.select({
      id: montaggiEvento.id,
      editingType: montaggiEvento.tipoMontaggio,
      advanceAmount: montaggiEvento.accontoImporto,
      advancePaid: montaggiEvento.accontoPagato,
      advancePaymentDate: montaggiEvento.accontoDataPagamento,
      balanceAmount: montaggiEvento.saldoImporto,
      balancePaid: montaggiEvento.saldoPagato,
      balancePaymentDate: montaggiEvento.saldoDataPagamento,
      firstContactDate: montaggiEvento.dataPrimoContatto,
      priority: montaggiEvento.priorita,
      expectedDeliveryDate: montaggiEvento.dataConsegnaPrevista,
      actualDeliveryDate: montaggiEvento.dataConsegnaEffettiva,
      status: montaggiEvento.stato,
      notes: montaggiEvento.note,
      createdAt: montaggiEvento.createdAt,
      updatedAt: montaggiEvento.updatedAt,
      collaborator: {
        id: collaborators.id,
        firstName: collaborators.firstName,
        lastName: collaborators.lastName
      }
    })
    .from(montaggiEvento)
    .innerJoin(collaborators, eq(montaggiEvento.collaboratoreId, collaborators.id))
    .where(eq(montaggiEvento.id, newEditingTask.id));
    
    // Add the payment if present
    const result = {
      ...completeEditingTask,
      payment: advancePayment
    };
    
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error(`Error adding editing task to event ${id}:`, error);
    return res.status(500).json({ error: "Error registering editing task" });
  }
};

// PATCH: Update an editing task
export const updateEventEditingTask = async (req: Request, res: Response) => {
  const { id, taskId } = req.params;
  
  try {
    // Verify that the event exists
    const [event] = await db.select().from(events)
      .where(eq(events.id, Number(id)));
    
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    // Verify that the editing task exists and belongs to this event
    const [editingTask] = await db.select().from(montaggiEvento)
      .where(
        and(
          eq(montaggiEvento.id, Number(taskId)),
          eq(montaggiEvento.eventoId, Number(id))
        )
      );
    
    if (!editingTask) {
      return res.status(404).json({ error: "Editing task not found or does not belong to this event" });
    }
    
    // Input validation
    const data = updateMontaggioEventoSchema.parse(req.body);
    
    // Handle balance payment if requested
    let balancePayment = null;
    if (
      req.body.makeBalancePayment && 
      data.saldoImporto && 
      data.saldoImporto > 0 && 
      !editingTask.saldoPagato
    ) {
      const paymentDate = new Date();
      
      // Create a new payment record for the balance
      [balancePayment] = await db.insert(pagamentiEvento)
        .values({
          eventoId: Number(id),
          collaboratoreId: editingTask.collaboratoreId,
          tipo: TipoPagamentoEvento.MONTAGGIO_SALDO,
          importo: data.saldoImporto,
          dataPagamento: paymentDate,
          metodoPagamento: req.body.paymentMethod || "bank_transfer",
          note: `Balance for ${editingTask.tipoMontaggio} editing task`,
          riferimentoEsterno: req.body.externalReference
        })
        .returning();
      
      // Update the fields to reflect the balance payment
      data.saldoPagato = true;
      data.saldoDataPagamento = paymentDate;
    }
    
    // Update the editing task
    await db.update(montaggiEvento)
      .set(data)
      .where(eq(montaggiEvento.id, Number(taskId)));
    
    // Retrieve the updated editing task with collaborator data
    const [updatedTask] = await db.select({
      id: montaggiEvento.id,
      editingType: montaggiEvento.tipoMontaggio,
      advanceAmount: montaggiEvento.accontoImporto,
      advancePaid: montaggiEvento.accontoPagato,
      advancePaymentDate: montaggiEvento.accontoDataPagamento,
      balanceAmount: montaggiEvento.saldoImporto,
      balancePaid: montaggiEvento.saldoPagato,
      balancePaymentDate: montaggiEvento.saldoDataPagamento,
      firstContactDate: montaggiEvento.dataPrimoContatto,
      priority: montaggiEvento.priorita,
      expectedDeliveryDate: montaggiEvento.dataConsegnaPrevista,
      actualDeliveryDate: montaggiEvento.dataConsegnaEffettiva,
      status: montaggiEvento.stato,
      notes: montaggiEvento.note,
      createdAt: montaggiEvento.createdAt,
      updatedAt: montaggiEvento.updatedAt,
      collaborator: {
        id: collaborators.id,
        firstName: collaborators.firstName,
        lastName: collaborators.lastName
      }
    })
    .from(montaggiEvento)
    .innerJoin(collaborators, eq(montaggiEvento.collaboratoreId, collaborators.id))
    .where(eq(montaggiEvento.id, Number(taskId)));
    
    // Add the payment if present
    const result = {
      ...updatedTask,
      payment: balancePayment
    };
    
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error(`Error updating editing task ${taskId} for event ${id}:`, error);
    return res.status(500).json({ error: "Error updating editing task" });
  }
};

// Additional methods from original controller

// GET: Retrieve events without collaborators
export const getEventsWithoutCollaborators = async (req: Request, res: Response) => {
  try {
    // Get events that don't have any collaborators assigned
    const eventsWithoutCollaboratorsQuery = db
      .select({
        id: events.id,
        title: events.title,
      })
      .from(events)
      .leftJoin(
        eventiCollaboratori,
        eq(events.id, eventiCollaboratori.eventoId)
      )
      .where(
        sql`${eventiCollaboratori.id} IS NULL`
      );

    const eventsWithoutCollaborators = await eventsWithoutCollaboratorsQuery;

    return res.status(200).json(eventsWithoutCollaborators);
  } catch (error) {
    console.error("Error retrieving events without collaborators:", error);
    return res.status(500).json({ error: "Error retrieving events without collaborators" });
  }
};