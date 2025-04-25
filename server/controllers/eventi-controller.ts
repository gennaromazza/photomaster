import { Request, Response } from "express";
import { db as dbAny, type DB } from "../db";
import { eq, sql, desc, asc } from "drizzle-orm";
import { format, parse } from "date-fns";

// Tipizziamo correttamente db per evitare errori "implicitly has an 'any' type"
const db: DB = dbAny;

// Tipi esportabili per essere usati anche in altri file
export interface Evento {
  id: number;
  title: string;
  description?: string;
  eventDate?: Date | string;
  date?: Date | string; // Supporto per entrambi i formati
  data?: Date | string; // Supporto per formato italiano legacy
  location?: string;
  status?: string;
  clientName?: string;
  clientFirstName?: string; // Supporto per formato legacy
  clientLastName?: string; // Supporto per formato legacy
  eventoId?: number; // Supporto per formato legacy
  clienteQuoteId?: number; // Supporto per formato legacy
  titolo?: string; // Supporto per formato legacy italiano (title in inglese)
  ruolo?: string; // Ruolo del collaboratore nell'evento
  quote?: {
    id: number;
    title: string;
    client?: {
      firstName: string;
      lastName: string;
    };
  };
}

export interface EventoCollaboratore {
  id: number;
  ruolo: string;
  dataAssegnazione: Date;
  note?: string;
  eventoId: number;
  collaboratoreId: number;
}

// Funzione helper esportabile per normalizzare date tra formati diversi
export function getEventDate(evento: Evento): Date | null {
  // Cerca in tutti i possibili campi di data in ordine di priorità
  const dateString = evento.eventDate || evento.date || evento.data;
  if (!dateString) {
    console.warn("Evento senza data:", evento);
    return null;
  }
  
  try {
    // Prima prova con il costruttore standard di Date
    const date = new Date(dateString);
    
    // Se la data non è valida, segnala il problema e ritorna null
    if (isNaN(date.getTime())) {
      console.warn("Data evento non valida:", dateString);
      return null;
    }
    
    return date;
  } catch (error) {
    console.error("Errore nel parsing della data:", error);
    return null;
  }
}
import { 
  pagamentiEvento, 
  montaggiEvento, 
  eventiCollaboratori,
  insertPagamentoEventoSchema,
  insertMontaggioEventoSchema,
  updateMontaggioEventoSchema,
  insertEventoCollaboratoreSchema,
  TipoPagamentoEvento,
  StatoMontaggioEvento,
  TipoMontaggioEvento
} from "@shared/eventi-schema";
import { z } from "zod";
import { events, quotes, eventCollaborators, collaborators } from "@shared/schema";
import { 
  syncFromEventiCollaboratoriToEventCollaborators,
  syncFromEventCollaboratorsToEventiCollaboratori
} from "../utils/sync-collaboratori";

/**
 * Controller per la gestione evento-centrica di:
 * - Collaboratori associati all'evento
 * - Pagamenti legati all'evento
 * - Montaggi legati all'evento
 */

// GET: Recupera i dettagli di un evento con collaboratori, pagamenti e montaggi
export const getEventoDettaglio = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Recupera i dettagli dell'evento
    const [evento] = await db.select().from(events)
      .where(eq(events.id, Number(id)));
    
    if (!evento) {
      return res.status(404).json({ error: "Evento non trovato" });
    }
    
    // Recupera i collaboratori associati
    const collaboratoriEvento = await db.select({
      id: eventiCollaboratori.id,
      ruolo: eventiCollaboratori.ruolo,
      dataAssegnazione: eventiCollaboratori.dataAssegnazione,
      note: eventiCollaboratori.note,
      collaboratore: {
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
    
    // Recupera i pagamenti legati all'evento
    const pagamentiEventoData = await db.select({
      id: pagamentiEvento.id,
      tipo: pagamentiEvento.tipo,
      importo: pagamentiEvento.importo,
      dataPagamento: pagamentiEvento.dataPagamento,
      metodoPagamento: pagamentiEvento.metodoPagamento,
      riferimentoEsterno: pagamentiEvento.riferimentoEsterno,
      note: pagamentiEvento.note,
      createdAt: pagamentiEvento.createdAt,
      updatedAt: pagamentiEvento.updatedAt,
      collaboratore: {
        id: collaborators.id,
        firstName: collaborators.firstName,
        lastName: collaborators.lastName
      }
    })
    .from(pagamentiEvento)
    .leftJoin(collaborators, eq(pagamentiEvento.collaboratoreId, collaborators.id))
    .where(eq(pagamentiEvento.eventoId, Number(id)))
    .orderBy(desc(pagamentiEvento.dataPagamento));
    
    // Recupera i montaggi legati all'evento
    const montaggiEventoData = await db.select({
      id: montaggiEvento.id,
      tipoMontaggio: montaggiEvento.tipoMontaggio,
      accontoImporto: montaggiEvento.accontoImporto,
      accontoPagato: montaggiEvento.accontoPagato,
      accontoDataPagamento: montaggiEvento.accontoDataPagamento,
      saldoImporto: montaggiEvento.saldoImporto,
      saldoPagato: montaggiEvento.saldoPagato,
      saldoDataPagamento: montaggiEvento.saldoDataPagamento,
      dataPrimoContatto: montaggiEvento.dataPrimoContatto,
      priorita: montaggiEvento.priorita,
      dataConsegnaPrevista: montaggiEvento.dataConsegnaPrevista,
      dataConsegnaEffettiva: montaggiEvento.dataConsegnaEffettiva,
      stato: montaggiEvento.stato,
      note: montaggiEvento.note,
      createdAt: montaggiEvento.createdAt,
      updatedAt: montaggiEvento.updatedAt,
      collaboratore: {
        id: collaborators.id,
        firstName: collaborators.firstName,
        lastName: collaborators.lastName
      }
    })
    .from(montaggiEvento)
    .innerJoin(collaborators, eq(montaggiEvento.collaboratoreId, collaborators.id))
    .where(eq(montaggiEvento.eventoId, Number(id)))
    .orderBy(asc(montaggiEvento.dataConsegnaPrevista));
    
    // Calcola statistiche di pagamento
    // Incassi cliente
    const pagamentiCliente = pagamentiEventoData.filter((p: {tipo: string}) => 
      p.tipo === TipoPagamentoEvento.CLIENTE_ACCONTO || 
      p.tipo === TipoPagamentoEvento.CLIENTE_SALDO || 
      p.tipo === TipoPagamentoEvento.CLIENTE_EXTRA
    );
    const totaleIncassi = pagamentiCliente.reduce((acc: number, p: {importo: string|number}) => acc + Number(p.importo), 0);
    
    // Pagamenti collaboratori
    const pagamentiCollaboratori = pagamentiEventoData.filter((p: {tipo: string}) => 
      p.tipo === TipoPagamentoEvento.COLLABORATORE_ACCONTO || 
      p.tipo === TipoPagamentoEvento.COLLABORATORE_SALDO
    );
    const totalePagamentiCollaboratori = pagamentiCollaboratori.reduce((acc: number, p: {importo: string|number}) => acc + Number(p.importo), 0);
    
    // Pagamenti montaggi
    const pagamentiMontaggi = pagamentiEventoData.filter((p: {tipo: string}) => 
      p.tipo === TipoPagamentoEvento.MONTAGGIO_ACCONTO || 
      p.tipo === TipoPagamentoEvento.MONTAGGIO_SALDO
    );
    const totalePagamentiMontaggi = pagamentiMontaggi.reduce((acc: number, p: {importo: string|number}) => acc + Number(p.importo), 0);
    
    // Pagamenti fornitori e altro
    const altriPagamenti = pagamentiEventoData.filter((p: {tipo: string}) => 
      p.tipo === TipoPagamentoEvento.FORNITORE || 
      p.tipo === TipoPagamentoEvento.ALTRO
    );
    const totaleAltriPagamenti = altriPagamenti.reduce((acc: number, p: {importo: string|number}) => acc + Number(p.importo), 0);
    
    // Calcola margine
    const margineLordo = totaleIncassi - totalePagamentiCollaboratori - totalePagamentiMontaggi - totaleAltriPagamenti;
    
    // Prepara i dati completi
    const eventoCompleto = {
      ...evento,
      collaboratori: collaboratoriEvento,
      pagamenti: pagamentiEventoData,
      montaggi: montaggiEventoData,
      statistiche: {
        totaleIncassi,
        totalePagamentiCollaboratori,
        totalePagamentiMontaggi,
        totaleAltriPagamenti,
        margineLordo
      }
    };
    
    return res.status(200).json(eventoCompleto);
  } catch (error) {
    console.error(`Errore recupero dettagli evento ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero dei dettagli dell'evento" });
  }
};

// PAGAMENTI EVENTO
// ----------------

// GET: Recupera tutti i pagamenti di un evento
export const getPagamentiEvento = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const pagamentiList = await db.select({
      id: pagamentiEvento.id,
      tipo: pagamentiEvento.tipo,
      importo: pagamentiEvento.importo,
      dataPagamento: pagamentiEvento.dataPagamento,
      metodoPagamento: pagamentiEvento.metodoPagamento,
      riferimentoEsterno: pagamentiEvento.riferimentoEsterno,
      note: pagamentiEvento.note,
      createdAt: pagamentiEvento.createdAt,
      updatedAt: pagamentiEvento.updatedAt,
      collaboratore: {
        id: collaborators.id,
        firstName: collaborators.firstName,
        lastName: collaborators.lastName
      }
    })
    .from(pagamentiEvento)
    .leftJoin(collaborators, eq(pagamentiEvento.collaboratoreId, collaborators.id))
    .where(eq(pagamentiEvento.eventoId, Number(id)))
    .orderBy(desc(pagamentiEvento.dataPagamento));
    
    return res.status(200).json(pagamentiList);
  } catch (error) {
    console.error(`Errore recupero pagamenti evento ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero dei pagamenti dell'evento" });
  }
};

// POST: Registra un nuovo pagamento per un evento
export const addPagamentoEvento = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Verifica che l'evento esista
    const [evento] = await db.select().from(events)
      .where(eq(events.id, Number(id)));
    
    if (!evento) {
      return res.status(404).json({ error: "Evento non trovato" });
    }
    
    // Validazione input
    const data = insertPagamentoEventoSchema.parse({
      ...req.body,
      eventoId: Number(id)
    });
    
    // Inserisci il pagamento
    const [nuovoPagamento] = await db.insert(pagamentiEvento)
      .values(data)
      .returning();
    
    // Se il pagamento è relativo a un montaggio, aggiorna lo stato del montaggio
    if (
      data.tipo === TipoPagamentoEvento.MONTAGGIO_ACCONTO || 
      data.tipo === TipoPagamentoEvento.MONTAGGIO_SALDO
    ) {
      // Recupera il montaggio associato al collaboratore per questo evento
      const [montaggio] = await db.select().from(montaggiEvento)
        .where(eq(montaggiEvento.eventoId, Number(id)))
        .where(eq(montaggiEvento.collaboratoreId, data.collaboratoreId));
      
      if (montaggio) {
        // Aggiorna lo stato di pagamento del montaggio
        if (data.tipo === TipoPagamentoEvento.MONTAGGIO_ACCONTO) {
          await db.update(montaggiEvento)
            .set({ 
              accontoPagato: true,
              accontoDataPagamento: data.dataPagamento
            })
            .where(eq(montaggiEvento.id, montaggio.id));
        } else if (data.tipo === TipoPagamentoEvento.MONTAGGIO_SALDO) {
          await db.update(montaggiEvento)
            .set({ 
              saldoPagato: true,
              saldoDataPagamento: data.dataPagamento
            })
            .where(eq(montaggiEvento.id, montaggio.id));
        }
      }
    }
    
    // Recupera i dettagli completi del pagamento con i dati del collaboratore
    let pagamentoCompleto;
    if (data.collaboratoreId) {
      const [result] = await db.select({
        id: pagamentiEvento.id,
        tipo: pagamentiEvento.tipo,
        importo: pagamentiEvento.importo,
        dataPagamento: pagamentiEvento.dataPagamento,
        metodoPagamento: pagamentiEvento.metodoPagamento,
        riferimentoEsterno: pagamentiEvento.riferimentoEsterno,
        note: pagamentiEvento.note,
        createdAt: pagamentiEvento.createdAt,
        updatedAt: pagamentiEvento.updatedAt,
        collaboratore: {
          id: collaborators.id,
          firstName: collaborators.firstName,
          lastName: collaborators.lastName
        }
      })
      .from(pagamentiEvento)
      .leftJoin(collaborators, eq(pagamentiEvento.collaboratoreId, collaborators.id))
      .where(eq(pagamentiEvento.id, nuovoPagamento.id));
      
      pagamentoCompleto = result;
    } else {
      pagamentoCompleto = nuovoPagamento;
    }
    
    return res.status(201).json(pagamentoCompleto);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error(`Errore aggiunta pagamento all'evento ${id}:`, error);
    return res.status(500).json({ error: "Errore durante la registrazione del pagamento" });
  }
};

// MONTAGGI EVENTO
// --------------

// GET: Recupera tutti i montaggi di un evento
export const getMontaggiEvento = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const montaggiList = await db.select({
      id: montaggiEvento.id,
      tipoMontaggio: montaggiEvento.tipoMontaggio,
      accontoImporto: montaggiEvento.accontoImporto,
      accontoPagato: montaggiEvento.accontoPagato,
      accontoDataPagamento: montaggiEvento.accontoDataPagamento,
      saldoImporto: montaggiEvento.saldoImporto,
      saldoPagato: montaggiEvento.saldoPagato,
      saldoDataPagamento: montaggiEvento.saldoDataPagamento,
      dataPrimoContatto: montaggiEvento.dataPrimoContatto,
      priorita: montaggiEvento.priorita,
      dataConsegnaPrevista: montaggiEvento.dataConsegnaPrevista,
      dataConsegnaEffettiva: montaggiEvento.dataConsegnaEffettiva,
      stato: montaggiEvento.stato,
      note: montaggiEvento.note,
      createdAt: montaggiEvento.createdAt,
      updatedAt: montaggiEvento.updatedAt,
      collaboratore: {
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
    
    return res.status(200).json(montaggiList);
  } catch (error) {
    console.error(`Errore recupero montaggi evento ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero dei montaggi dell'evento" });
  }
};

// POST: Registra un nuovo montaggio per un evento
export const addMontaggioEvento = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Verifica che l'evento esista
    const [evento] = await db.select().from(events)
      .where(eq(events.id, Number(id)));
    
    if (!evento) {
      return res.status(404).json({ error: "Evento non trovato" });
    }
    
    // Validazione input
    const data = insertMontaggioEventoSchema.parse({
      ...req.body,
      eventoId: Number(id)
    });
    
    // Verifica che non esista già un montaggio dello stesso tipo per questo collaboratore e evento
    const [montaggioEsistente] = await db.select().from(montaggiEvento)
      .where(eq(montaggiEvento.eventoId, Number(id)))
      .where(eq(montaggiEvento.collaboratoreId, data.collaboratoreId))
      .where(eq(montaggiEvento.tipoMontaggio, data.tipoMontaggio));
    
    if (montaggioEsistente) {
      return res.status(400).json({ 
        error: `Esiste già un montaggio di tipo ${data.tipoMontaggio} per questo collaboratore e evento` 
      });
    }
    
    // Inserisci il montaggio
    let montaggioData = { ...data };
    
    // Gestione dell'eventuale pagamento associato al montaggio
    let pagamentoAcconto = null;
    if (req.body.pagamentoAcconto && data.accontoImporto && Number(data.accontoImporto) > 0) {
      const dataPagamento = new Date();
      
      // Crea un nuovo record di pagamento per l'acconto
      [pagamentoAcconto] = await db.insert(pagamentiEvento)
        .values({
          eventoId: Number(id),
          collaboratoreId: data.collaboratoreId,
          tipo: TipoPagamentoEvento.MONTAGGIO_ACCONTO,
          importo: data.accontoImporto,
          dataPagamento,
          metodoPagamento: req.body.metodoPagamento || "bonifico",
          note: `Acconto montaggio ${data.tipoMontaggio}`,
          riferimentoEsterno: req.body.riferimentoEsterno
        })
        .returning();
      
      // Aggiorna i campi del montaggio per riflettere il pagamento dell'acconto
      montaggioData = {
        ...montaggioData,
        accontoPagato: true,
        accontoDataPagamento: dataPagamento
      };
    }
    
    // Inserisci il montaggio
    const [nuovoMontaggio] = await db.insert(montaggiEvento)
      .values(montaggioData)
      .returning();
    
    // Recupera i dettagli completi del montaggio con i dati del collaboratore
    const [montaggioCompleto] = await db.select({
      id: montaggiEvento.id,
      tipoMontaggio: montaggiEvento.tipoMontaggio,
      accontoImporto: montaggiEvento.accontoImporto,
      accontoPagato: montaggiEvento.accontoPagato,
      accontoDataPagamento: montaggiEvento.accontoDataPagamento,
      saldoImporto: montaggiEvento.saldoImporto,
      saldoPagato: montaggiEvento.saldoPagato,
      saldoDataPagamento: montaggiEvento.saldoDataPagamento,
      dataPrimoContatto: montaggiEvento.dataPrimoContatto,
      priorita: montaggiEvento.priorita,
      dataConsegnaPrevista: montaggiEvento.dataConsegnaPrevista,
      dataConsegnaEffettiva: montaggiEvento.dataConsegnaEffettiva,
      stato: montaggiEvento.stato,
      note: montaggiEvento.note,
      createdAt: montaggiEvento.createdAt,
      updatedAt: montaggiEvento.updatedAt,
      collaboratore: {
        id: collaborators.id,
        firstName: collaborators.firstName,
        lastName: collaborators.lastName
      }
    })
    .from(montaggiEvento)
    .innerJoin(collaborators, eq(montaggiEvento.collaboratoreId, collaborators.id))
    .where(eq(montaggiEvento.id, nuovoMontaggio.id));
    
    // Aggiungi il pagamento se presente
    const risultato = {
      ...montaggioCompleto,
      pagamentoAcconto: pagamentoAcconto
    };
    
    return res.status(201).json(risultato);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error(`Errore aggiunta montaggio all'evento ${id}:`, error);
    return res.status(500).json({ error: "Errore durante la registrazione del montaggio" });
  }
};

// Funzione di supporto per verificare e ottenere l'evento da un preventivo
const getEventoForPreventivo = async (quoteId: number) => {
  // Recupera l'evento associato al preventivo (dalla tabella events)
  const [evento] = await db.select().from(events)
    .where(eq(events.quoteId, quoteId));
  
  // Se non esiste ancora un evento associato al preventivo, ne creiamo uno
  if (!evento) {
    // Recupera i dati del preventivo
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
    
    if (!quote) {
      throw new Error(`Preventivo con ID ${quoteId} non trovato`);
    }
    
    // Crea un nuovo evento associato al preventivo
    const [nuovoEvento] = await db.insert(events)
      .values({
        title: quote.title || 'Evento senza titolo',
        description: '',
        clientId: quote.clientId,
        startDate: quote.eventDate || new Date(),
        location: quote.location || '',
        status: 'pending',
        quoteId: quoteId
      })
      .returning();
    
    return nuovoEvento;
  }
  
  return evento;
};

// GET: Recupera i collaboratori associati ad un preventivo
export const getCollaboratoriPreventivo = async (req: Request, res: Response) => {
  const { quoteId } = req.params;
  
  try {
    // Ottieni l'evento associato al preventivo
    const evento = await getEventoForPreventivo(Number(quoteId));
    
    // Recupera i collaboratori associati all'evento
    const collaboratoriEvento = await db.select({
      id: eventiCollaboratori.id,
      ruolo: eventiCollaboratori.ruolo,
      dataAssegnazione: eventiCollaboratori.dataAssegnazione,
      note: eventiCollaboratori.note,
      collaboratore: {
        id: collaborators.id,
        firstName: collaborators.firstName,
        lastName: collaborators.lastName,
        email: collaborators.email,
        phone: collaborators.phone
      }
    })
    .from(eventiCollaboratori)
    .innerJoin(collaborators, eq(eventiCollaboratori.collaboratoreId, collaborators.id))
    .where(eq(eventiCollaboratori.eventoId, evento.id));
    
    return res.status(200).json(collaboratoriEvento);
  } catch (error) {
    console.error(`Errore recupero collaboratori preventivo ${quoteId}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero dei collaboratori associati al preventivo" });
  }
};

// PATCH: Aggiorna un montaggio
// GET: Recupera gli eventi senza collaboratori assegnati
export const getEventiSenzaCollaboratori = async (req: Request, res: Response) => {
  try {
    // Recupera tutti gli eventi confermati
    const eventiConfermati = await db.select({
      id: events.id,
      title: events.title,
      description: events.description,
      date: events.date,
      location: events.location,
      status: events.status,
      clientId: events.clientId,
      eventType: events.eventType
    })
    .from(events)
    .where(eq(events.status, "confirmed")) // Solo eventi confermati
    .orderBy(desc(events.date));
    
    // Ottieni gli ID degli eventi con collaboratori
    const collaboratoriPerEvento = await db.select({
      eventoId: eventiCollaboratori.eventoId,
      count: sql<number>`count(*)`.as('count')
    })
    .from(eventiCollaboratori)
    .groupBy(eventiCollaboratori.eventoId);
    
    // Crea un Set di eventi con collaboratori per una ricerca veloce
    const eventiConCollaboratoriSet = new Set(
      collaboratoriPerEvento.map((row: { eventoId: number }) => row.eventoId)
    );
    
    // Filtra gli eventi che non hanno collaboratori
    const eventiSenzaCollaboratori = eventiConfermati.filter(
      (evento: { id: number }) => !eventiConCollaboratoriSet.has(evento.id)
    );
    
    return res.status(200).json(eventiSenzaCollaboratori);
  } catch (error) {
    console.error("Errore recupero eventi senza collaboratori:", error);
    return res.status(500).json({ error: "Errore durante il recupero degli eventi senza collaboratori" });
  }
};

// Schema di validazione per l'aggiunta di un collaboratore a un preventivo
const addCollaboratoreSchema = z.object({
  collaboratoreId: z.number({
    required_error: "ID collaboratore richiesto",
    invalid_type_error: "L'ID collaboratore deve essere un numero"
  }),
  ruolo: z.string({
    required_error: "Ruolo richiesto"
  }).default("fotografo"),
  note: z.string().optional().default("")
});

// POST: Aggiunge un collaboratore a un preventivo
export const addCollaboratorePreventivo = async (req: Request, res: Response) => {
  const { quoteId } = req.params;
  
  try {
    if (!quoteId || isNaN(Number(quoteId))) {
      return res.status(400).json({ error: "ID preventivo non valido" });
    }
    
    // Ottieni l'evento associato al preventivo (o creane uno se non esiste)
    const evento = await getEventoForPreventivo(Number(quoteId));
    
    // Validazione input
    let validatedData;
    try {
      validatedData = addCollaboratoreSchema.parse(req.body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Dati non validi", 
          details: validationError.errors 
        });
      }
      throw validationError;
    }
    
    const data = {
      ...validatedData,
      eventoId: evento.id,
      dataAssegnazione: new Date()
    };
    
    // Verifica se l'assegnazione esiste già
    const esisteGia = await db.select().from(eventiCollaboratori)
      .where(eq(eventiCollaboratori.collaboratoreId, data.collaboratoreId))
      .where(eq(eventiCollaboratori.eventoId, evento.id))
      .limit(1);
    
    if (esisteGia.length > 0) {
      return res.status(409).json({ 
        error: "Questo collaboratore è già assegnato a questo evento"
      });
    }
    
    // Inserisci il collaboratore
    const [nuovaAssegnazione] = await db.insert(eventiCollaboratori)
      .values({
        collaboratoreId: data.collaboratoreId,
        eventoId: evento.id,
        ruolo: data.ruolo || "fotografo",
        dataAssegnazione: data.dataAssegnazione,
        note: data.note || ""
      })
      .returning();
    
    // Sincronizza con la tabella eventCollaborators
    await syncFromEventiCollaboratoriToEventCollaborators(
      data.collaboratoreId,
      evento.id,
      data.ruolo || "fotografo"
    );
    
    // Recupera i dettagli completi dell'assegnazione
    const [collaboratore] = await db.select().from(collaborators)
      .where(eq(collaborators.id, data.collaboratoreId));
    
    const risultato = {
      ...nuovaAssegnazione,
      collaboratore: collaboratore
    };
    
    return res.status(201).json(risultato);
  } catch (error) {
    console.error(`Errore aggiunta collaboratore al preventivo ${quoteId}:`, error);
    return res.status(500).json({ error: "Errore durante l'assegnazione del collaboratore al preventivo" });
  }
};

// Schema di validazione per l'aggiornamento di un collaboratore
const updateCollaboratoreSchema = z.object({
  ruolo: z.string().optional(),
  note: z.string().optional(),
  dataAssegnazione: z.date().optional()
});

// PATCH: Aggiorna i dettagli di un collaboratore assegnato a un preventivo
export const updateCollaboratorePreventivo = async (req: Request, res: Response) => {
  const { quoteId, id } = req.params;
  
  try {
    if (!quoteId || isNaN(Number(quoteId)) || !id || isNaN(Number(id))) {
      return res.status(400).json({ error: "ID preventivo o ID assegnazione non validi" });
    }
    
    // Ottieni l'evento associato al preventivo
    const evento = await getEventoForPreventivo(Number(quoteId));
    
    // Verifica che l'assegnazione esista
    const [assegnazione] = await db.select().from(eventiCollaboratori)
      .where(eq(eventiCollaboratori.id, Number(id)));
    
    if (!assegnazione) {
      return res.status(404).json({ error: "Assegnazione non trovata" });
    }
    
    // Validazione input
    let validatedData;
    try {
      validatedData = updateCollaboratoreSchema.parse(req.body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Dati non validi", 
          details: validationError.errors 
        });
      }
      throw validationError;
    }
    
    // Aggiorna l'assegnazione
    const [assegnazioneAggiornata] = await db.update(eventiCollaboratori)
      .set({
        ruolo: req.body.ruolo || assegnazione.ruolo,
        note: req.body.note !== undefined ? req.body.note : assegnazione.note,
        dataAssegnazione: req.body.dataAssegnazione || assegnazione.dataAssegnazione
      })
      .where(eq(eventiCollaboratori.id, Number(id)))
      .returning();
    
    // Sincronizza con la tabella eventCollaborators (aggiorna il ruolo)
    await syncFromEventiCollaboratoriToEventCollaborators(
      assegnazione.collaboratoreId,
      assegnazione.eventoId,
      req.body.ruolo || assegnazione.ruolo
    );
    
    // Recupera i dettagli completi dell'assegnazione
    const [collaboratore] = await db.select().from(collaborators)
      .where(eq(collaborators.id, assegnazione.collaboratoreId));
    
    const risultato = {
      ...assegnazioneAggiornata,
      collaboratore: collaboratore
    };
    
    return res.status(200).json(risultato);
  } catch (error) {
    console.error(`Errore aggiornamento collaboratore ${id} del preventivo ${quoteId}:`, error);
    return res.status(500).json({ error: "Errore durante l'aggiornamento dell'assegnazione del collaboratore" });
  }
};

// DELETE: Rimuove un collaboratore da un preventivo
export const removeCollaboratorePreventivo = async (req: Request, res: Response) => {
  const { quoteId, id } = req.params;
  
  try {
    if (!quoteId || isNaN(Number(quoteId)) || !id || isNaN(Number(id))) {
      return res.status(400).json({ error: "ID preventivo o ID assegnazione non validi" });
    }
    
    // Ottieni l'evento associato al preventivo
    const evento = await getEventoForPreventivo(Number(quoteId));
    
    // Verifica che l'assegnazione esista
    const [assegnazione] = await db.select().from(eventiCollaboratori)
      .where(eq(eventiCollaboratori.id, Number(id)));
    
    if (!assegnazione) {
      return res.status(404).json({ error: "Assegnazione non trovata" });
    }
    
    // Memorizza i dati prima dell'eliminazione per la sincronizzazione
    const collaboratoreId = assegnazione.collaboratoreId;
    const eventoId = assegnazione.eventoId;
    
    // Elimina l'assegnazione dalla tabella italiana
    await db.delete(eventiCollaboratori)
      .where(eq(eventiCollaboratori.id, Number(id)));
    
    // Elimina anche l'assegnazione dalla tabella inglese
    await db.delete(eventCollaborators)
      .where(eq(eventCollaborators.collaboratorId, collaboratoreId))
      .where(eq(eventCollaborators.eventId, eventoId));
    
    return res.status(200).json({ 
      success: true, 
      message: "Collaboratore rimosso con successo" 
    });
  } catch (error) {
    console.error(`Errore rimozione collaboratore ${id} dal preventivo ${quoteId}:`, error);
    return res.status(500).json({ error: "Errore durante la rimozione del collaboratore dal preventivo" });
  }
};

export const updateMontaggioEvento = async (req: Request, res: Response) => {
  const { id: eventoId, montaggioId } = req.params;
  
  try {
    // Verifica che il montaggio esista
    const [montaggio] = await db.select().from(montaggiEvento)
      .where(eq(montaggiEvento.id, Number(montaggioId)))
      .where(eq(montaggiEvento.eventoId, Number(eventoId)));
    
    if (!montaggio) {
      return res.status(404).json({ error: "Montaggio non trovato" });
    }
    
    // Validazione input
    const data = updateMontaggioEventoSchema.parse(req.body);
    
    // Esegui l'aggiornamento in una transazione se c'è anche un pagamento di saldo
    let montaggioAggiornato;
    let pagamentoSaldo = null;
    
    if (req.body.pagamentoSaldo && montaggio.saldoImporto && montaggio.saldoImporto > 0) {
      await db.transaction(async (tx: DB) => {
        // Aggiorna il montaggio
        [montaggioAggiornato] = await tx.update(montaggiEvento)
          .set({
            ...data,
            saldoPagato: true,
            saldoDataPagamento: new Date(),
            updatedAt: new Date()
          })
          .where(eq(montaggiEvento.id, Number(montaggioId)))
          .returning();
        
        // Crea un nuovo record di pagamento per il saldo
        [pagamentoSaldo] = await tx.insert(pagamentiEvento)
          .values({
            eventoId: Number(eventoId),
            collaboratoreId: montaggio.collaboratoreId,
            tipo: TipoPagamentoEvento.MONTAGGIO_SALDO,
            importo: montaggio.saldoImporto,
            dataPagamento: new Date(),
            metodoPagamento: req.body.metodoPagamento || "bonifico",
            note: `Saldo montaggio ${montaggio.tipoMontaggio}`,
            riferimentoEsterno: req.body.riferimentoEsterno
          })
          .returning();
      });
    } else {
      // Aggiorna solo il montaggio
      [montaggioAggiornato] = await db.update(montaggiEvento)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(montaggiEvento.id, Number(montaggioId)))
        .returning();
    }
    
    // Recupera i dettagli completi del montaggio aggiornato
    const [montaggioCompleto] = await db.select({
      id: montaggiEvento.id,
      tipoMontaggio: montaggiEvento.tipoMontaggio,
      accontoImporto: montaggiEvento.accontoImporto,
      accontoPagato: montaggiEvento.accontoPagato,
      accontoDataPagamento: montaggiEvento.accontoDataPagamento,
      saldoImporto: montaggiEvento.saldoImporto,
      saldoPagato: montaggiEvento.saldoPagato,
      saldoDataPagamento: montaggiEvento.saldoDataPagamento,
      dataPrimoContatto: montaggiEvento.dataPrimoContatto,
      priorita: montaggiEvento.priorita,
      dataConsegnaPrevista: montaggiEvento.dataConsegnaPrevista,
      dataConsegnaEffettiva: montaggiEvento.dataConsegnaEffettiva,
      stato: montaggiEvento.stato,
      note: montaggiEvento.note,
      createdAt: montaggiEvento.createdAt,
      updatedAt: montaggiEvento.updatedAt,
      collaboratore: {
        id: collaborators.id,
        firstName: collaborators.firstName,
        lastName: collaborators.lastName
      }
    })
    .from(montaggiEvento)
    .innerJoin(collaborators, eq(montaggiEvento.collaboratoreId, collaborators.id))
    .where(eq(montaggiEvento.id, Number(montaggioId)));
    
    // Aggiungi il pagamento se presente
    const risultato = {
      ...montaggioCompleto,
      pagamentoSaldo: pagamentoSaldo
    };
    
    return res.status(200).json(risultato);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error(`Errore aggiornamento montaggio ${montaggioId} dell'evento ${eventoId}:`, error);
    return res.status(500).json({ error: "Errore durante l'aggiornamento del montaggio" });
  }
};