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
    const eventi = await db.select().from(eventiCollaboratori)
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
    
    // Inserimento nel database
    const [nuovoEvento] = await db.insert(eventiCollaboratori)
      .values(data)
      .returning();
    
    return res.status(201).json(nuovoEvento);
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

// POST: Creazione di un nuovo montaggio
export const addMontaggioCollaboratore = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Validazione input
    const data = insertMontaggioSchema.parse({
      ...req.body,
      collaboratoreId: Number(id)
    });
    
    // Inserimento nel database
    const [nuovoMontaggio] = await db.insert(montaggi)
      .values(data)
      .returning();
    
    return res.status(201).json(nuovoMontaggio);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error(`Errore creazione montaggio per il collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante la creazione del montaggio" });
  }
};

// PATCH: Aggiornamento stato montaggio
export const updateMontaggioCollaboratore = async (req: Request, res: Response) => {
  const { id, montaggioId } = req.params;
  
  try {
    // Validazione input
    const data = updateMontaggioSchema.parse(req.body);
    
    // Aggiornamento nel database
    const [montaggioAggiornato] = await db.update(montaggi)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(montaggi.id, Number(montaggioId)),
          eq(montaggi.collaboratoreId, Number(id))
        )
      )
      .returning();
    
    if (!montaggioAggiornato) {
      return res.status(404).json({ error: "Montaggio non trovato" });
    }
    
    return res.status(200).json(montaggioAggiornato);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
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
      .where(eq(montaggi.collaboratoreId, collaboratoreId));
    
    // Recupera tutti i pagamenti
    const listaPagamenti = await db.select().from(pagamentiCollaboratori)
      .where(eq(pagamentiCollaboratori.collaboratoreId, collaboratoreId));
    
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