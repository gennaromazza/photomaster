import { Request, Response } from "express";
import { db } from "../db";
import { collaborators } from "@shared/schema";
import { 
  eventiCollaboratori, 
  pagamentiCollaboratori, 
  montaggi,
  TipoPagamento,
  StatoMontaggio,
  insertEventoCollaboratoreSchema,
  insertPagamentoCollaboratoreSchema,
  insertMontaggioSchema,
  updateMontaggioSchema
} from "@shared/collaboratori";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

/**
 * Controller per la gestione delle operazioni relative al modulo Collaboratori
 */

// GET: Lista di eventi di un collaboratore
export const getEventiCollaboratore = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Utilizziamo l'approccio event-centric per recuperare gli eventi
    // Facciamo una query con join per ottenere anche i dettagli dell'evento
    const eventi = await db.select({
      id: eventiCollaboratori.id,
      collaboratoreId: eventiCollaboratori.collaboratoreId,
      eventoId: eventiCollaboratori.eventoId,
      ruolo: eventiCollaboratori.ruolo,
      dataAssegnazione: eventiCollaboratori.dataAssegnazione,
      note: eventiCollaboratori.note,
      titolo: events.title,
      descrizione: events.description,
      data: events.date,
      location: events.location,
      stato: events.status
    })
    .from(eventiCollaboratori)
    .innerJoin(events, eq(eventiCollaboratori.eventoId, events.id))
    .where(eq(eventiCollaboratori.collaboratoreId, Number(id)))
    .orderBy(desc(eventiCollaboratori.dataAssegnazione));
    
    return res.status(200).json(eventi);
  } catch (error) {
    console.error(`Errore recupero eventi del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero degli eventi del collaboratore" });
  }
};

// POST: Aggiunta di un nuovo evento a un collaboratore
export const addEventoCollaboratore = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Validazione input
    const data = insertEventoCollaboratoreSchema.parse({
      ...req.body,
      collaboratoreId: Number(id)
    });
    
    // Inserimento nel database usando l'approccio event-centric
    // Prima verifichiamo se l'associazione esiste già
    const esisteGià = await db.select()
      .from(eventiCollaboratori)
      .where(
        and(
          eq(eventiCollaboratori.collaboratoreId, Number(id)),
          eq(eventiCollaboratori.eventoId, data.eventoId)
        )
      )
      .limit(1);
    
    if (esisteGià.length > 0) {
      return res.status(409).json({ 
        error: "Questo collaboratore è già associato a questo evento",
        eventoId: data.eventoId
      });
    }
    
    // Inserimento nel database
    const [nuovoEvento] = await db.insert(eventiCollaboratori)
      .values(data)
      .returning();
    
    // Recuperiamo i dettagli completi dell'evento per la risposta
    const [eventoCompleto] = await db.select({
      id: eventiCollaboratori.id,
      collaboratoreId: eventiCollaboratori.collaboratoreId,
      eventoId: eventiCollaboratori.eventoId,
      ruolo: eventiCollaboratori.ruolo,
      dataAssegnazione: eventiCollaboratori.dataAssegnazione,
      note: eventiCollaboratori.note,
      titolo: events.title,
      descrizione: events.description,
      data: events.date,
      location: events.location,
      stato: events.status
    })
    .from(eventiCollaboratori)
    .innerJoin(events, eq(eventiCollaboratori.eventoId, events.id))
    .where(eq(eventiCollaboratori.id, nuovoEvento.id));
    
    return res.status(201).json(eventoCompleto);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error(`Errore aggiunta evento al collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante l'aggiunta dell'evento al collaboratore" });
  }
};

// GET: Lista di pagamenti di un collaboratore
export const getPagamentiCollaboratore = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const pagamenti = await db.select().from(pagamentiCollaboratori)
      .where(eq(pagamentiCollaboratori.collaboratoreId, Number(id)))
      .orderBy(desc(pagamentiCollaboratori.dataPagamento));
    
    return res.status(200).json(pagamenti);
  } catch (error) {
    console.error(`Errore recupero pagamenti del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero dei pagamenti del collaboratore" });
  }
};

// POST: Registrazione di un nuovo pagamento
export const addPagamentoCollaboratore = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Validazione input
    const data = insertPagamentoCollaboratoreSchema.parse({
      ...req.body,
      collaboratoreId: Number(id)
    });
    
    // Inserimento nel database
    const [nuovoPagamento] = await db.insert(pagamentiCollaboratori)
      .values(data)
      .returning();
    
    return res.status(201).json(nuovoPagamento);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error(`Errore aggiunta pagamento al collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante la registrazione del pagamento" });
  }
};

// GET: Lista di montaggi di un collaboratore
export const getMontaggiCollaboratore = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const listaMontaggi = await db.select().from(montaggi)
      .where(eq(montaggi.collaboratoreId, Number(id)))
      .orderBy(desc(montaggi.priorita));
    
    return res.status(200).json(listaMontaggi);
  } catch (error) {
    console.error(`Errore recupero montaggi del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero dei montaggi del collaboratore" });
  }
};

// POST: Creazione di un nuovo montaggio (con opzione per registrare acconto)
export const addMontaggioCollaboratore = async (req: Request, res: Response) => {
  const { id } = req.params;
  const collaboratoreId = Number(id);
  
  try {
    // Validazione input del montaggio
    const data = insertMontaggioSchema.parse({
      ...req.body,
      collaboratoreId
    });
    
    // Verifica se è stato richiesto anche il pagamento di un acconto
    const registraAcconto = req.body.registraAcconto === true;
    let pagamentoData;
    
    if (registraAcconto && req.body.pagamento) {
      // Validazione dati pagamento acconto
      pagamentoData = insertPagamentoCollaboratoreSchema.parse({
        ...req.body.pagamento,
        collaboratoreId,
        eventoId: data.eventoId,
        tipo: TipoPagamento.MONTAGGIO_ACCONTO
      });
    }
    
    // Usa una transazione per garantire che entrambe le operazioni abbiano successo o falliscano insieme
    return await db.transaction(async (tx) => {
      // Inserimento del montaggio nel database
      const [nuovoMontaggio] = await tx.insert(montaggi)
        .values(data)
        .returning();
      
      // Se richiesto, inserisci anche il pagamento dell'acconto
      if (registraAcconto && pagamentoData) {
        await tx.insert(pagamentiCollaboratori)
          .values(pagamentoData);
      }
      
      return res.status(201).json(nuovoMontaggio);
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
export const updateMontaggioCollaboratore = async (req: Request, res: Response) => {
  const { id, montaggioId } = req.params;
  const collaboratoreId = Number(id);
  const montaggioIdNum = Number(montaggioId);
  
  try {
    // Validazione input
    const data = updateMontaggioSchema.parse(req.body);
    
    // Verifica se è stato richiesto anche il pagamento di un saldo al completamento
    const registraSaldo = req.body.registraSaldo === true && data.stato === StatoMontaggio.COMPLETATO;
    let pagamentoData;
    
    if (registraSaldo && req.body.pagamento) {
      // Validazione dati pagamento saldo
      pagamentoData = insertPagamentoCollaboratoreSchema.parse({
        ...req.body.pagamento,
        collaboratoreId,
        eventoId: req.body.eventoId, // Deve essere incluso nella richiesta
        tipo: TipoPagamento.MONTAGGIO_SALDO
      });
    }
    
    // Usa una transazione per garantire che entrambe le operazioni abbiano successo o falliscano insieme
    return await db.transaction(async (tx) => {
      // Aggiornamento nel database
      const [montaggioAggiornato] = await tx.update(montaggi)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(montaggi.id, montaggioIdNum),
            eq(montaggi.collaboratoreId, collaboratoreId)
          )
        )
        .returning();
      
      if (!montaggioAggiornato) {
        throw new Error("Montaggio non trovato");
      }
      
      // Se richiesto, inserisci anche il pagamento del saldo
      if (registraSaldo && pagamentoData) {
        await tx.insert(pagamentiCollaboratori)
          .values(pagamentoData);
      }
      
      return res.status(200).json(montaggioAggiornato);
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    if (error instanceof Error && error.message === "Montaggio non trovato") {
      return res.status(404).json({ error: "Montaggio non trovato" });
    }
    
    console.error(`Errore aggiornamento montaggio ${montaggioId} del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante l'aggiornamento del montaggio" });
  }
};

// GET: Dashboard con riepilogo statistiche (montaggi in corso, pagamenti totali, ...)
export const getDashboardCollaboratore = async (req: Request, res: Response) => {
  const { id } = req.params;
  const collaboratoreId = Number(id);
  
  try {
    // Recupera il collaboratore
    const [collaboratore] = await db.select().from(collaborators)
      .where(eq(collaborators.id, collaboratoreId));
    
    if (!collaboratore) {
      return res.status(404).json({ error: "Collaboratore non trovato" });
    }
    
    // Recupera tutti i montaggi
    const listaMontaggi = await db.select().from(montaggi)
      .where(eq(montaggi.collaboratoreId, collaboratoreId))
      .catch(error => {
        console.error(`Errore DB recupero montaggi: ${error.message}`);
        throw new Error("Errore database durante il recupero dei montaggi");
      });
    
    // Recupera tutti i pagamenti
    const listaPagamenti = await db.select().from(pagamentiCollaboratori)
      .where(eq(pagamentiCollaboratori.collaboratoreId, collaboratoreId))
      .catch(error => {
        console.error(`Errore DB recupero pagamenti: ${error.message}`);
        throw new Error("Errore database durante il recupero dei pagamenti");
      });
    
    // Calcola statistiche
    const montaggiPendenti = listaMontaggi.filter(m => m.stato !== StatoMontaggio.COMPLETATO).length;
    const montaggiCompletati = listaMontaggi.filter(m => m.stato === StatoMontaggio.COMPLETATO).length;
    
    // Calcola il totale dei pagamenti
    const totalePagamenti = listaPagamenti.reduce((acc, p) => acc + Number(p.importo), 0);
    
    // Prepara i dati per la dashboard
    const dashboard = {
      collaboratore,
      statistiche: {
        montaggiTotali: listaMontaggi.length,
        montaggiPendenti,
        montaggiCompletati,
        pagamentiTotali: listaPagamenti.length,
        importoTotalePagamenti: totalePagamenti
      },
      montaggiRecenti: listaMontaggi
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 5),
      pagamentiRecenti: listaPagamenti
        .sort((a, b) => b.dataPagamento.getTime() - a.dataPagamento.getTime())
        .slice(0, 5)
    };
    
    return res.status(200).json(dashboard);
  } catch (error) {
    console.error(`Errore recupero dashboard del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero della dashboard del collaboratore" });
  }
};