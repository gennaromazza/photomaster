import { Request, Response } from "express";
import { db } from "../db";
import { collaborators, events, eventCollaborators, clients } from "@shared/schema";
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
import { eq, desc, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { syncCollaboratorAssignment, syncAllCollaboratorAssignments } from "../utils/sync-collaboratori";
import { syncFromEventiCollaboratoriToEventCollaborators } from "../utils/sync-collaboratori";

/**
 * Controller per la gestione delle operazioni relative al modulo Collaboratori
 */

import { cleanupStaleEventReferences, verificaEsistenzaEvento } from "../utils/clean-eventi-collabs";

// GET: Lista di eventi di un collaboratore
export const getEventiCollaboratore = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    console.log(`Recupero eventi per il collaboratore ID: ${id}`);
    
    // Prima di recuperare gli eventi, puliamo i riferimenti non validi
    await cleanupStaleEventReferences();
    
    // Soluzione molto più semplice: recuperiamo gli eventi da entrambe le tabelle in modo separato
    // e costruiamo manualmente oggetti semplici
    
    // 1. Recuperiamo i dati base degli eventi dalla tabella italiana
    const eventiItalianiIds = await db
      .select({
        eventoId: eventiCollaboratori.eventoId
      })
      .from(eventiCollaboratori)
      .where(eq(eventiCollaboratori.collaboratoreId, Number(id)));
    
    // 2. Recuperiamo i dati base degli eventi dalla tabella inglese
    const eventiInglesiIds = await db
      .select({
        eventoId: eventCollaborators.eventId
      })
      .from(eventCollaborators)
      .where(eq(eventCollaborators.collaboratorId, Number(id)));
    
    // 3. Combiniamo gli ID e rimuoviamo i duplicati
    const eventoIdsAggiunti = new Set();
    const tuttiGliEventiIds = [];
    
    for (const evento of eventiItalianiIds) {
      if (!eventoIdsAggiunti.has(evento.eventoId)) {
        eventoIdsAggiunti.add(evento.eventoId);
        tuttiGliEventiIds.push(evento.eventoId);
      }
    }
    
    for (const evento of eventiInglesiIds) {
      if (!eventoIdsAggiunti.has(evento.eventoId)) {
        eventoIdsAggiunti.add(evento.eventoId);
        tuttiGliEventiIds.push(evento.eventoId);
      }
    }
    
    console.log(`Trovati ${tuttiGliEventiIds.length} eventi unici per il collaboratore ID: ${id}`);
    
    // 4. Se non ci sono eventi, restituiamo un array vuoto
    if (tuttiGliEventiIds.length === 0) {
      return res.status(200).json([]);
    }
    
    // 5. Recuperiamo i dettagli di tutti gli eventi dai loro ID
    // Questa è una singola query che evita problemi di alias
    const eventiDettagli = await db
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
      .where(inArray(events.id, tuttiGliEventiIds));
      
    console.log(`Recuperati ${eventiDettagli.length} eventi con dettagli`);
    
    // Creiamo un oggetto per mappare facilmente ID eventi -> dettagli
    const eventiPerID = {};
    for (const evento of eventiDettagli) {
      eventiPerID[evento.id] = evento;
    }
    
    // 6. Recuperiamo gli eventi dalla tabella italiana con ruolo e data
    const eventiItaliani = await db
      .select({
        id: eventiCollaboratori.id,
        collaboratoreId: eventiCollaboratori.collaboratoreId,
        eventoId: eventiCollaboratori.eventoId,
        ruolo: eventiCollaboratori.ruolo,
        dataAssegnazione: eventiCollaboratori.dataAssegnazione,
        note: eventiCollaboratori.note
      })
      .from(eventiCollaboratori)
      .where(eq(eventiCollaboratori.collaboratoreId, Number(id)));
    
    // 7. Recuperiamo ruolo e data per gli eventi inglesi che non sono già stati trovati
    const eventiInglesi = await db
      .select({
        id: eventCollaborators.id,
        collaboratoreId: eventCollaborators.collaboratorId,
        eventoId: eventCollaborators.eventId,
        ruolo: eventCollaborators.role,
        dataAssegnazione: eventCollaborators.assignedAt,
        note: eventCollaborators.notes
      })
      .from(eventCollaborators)
      .where(eq(eventCollaborators.collaboratorId, Number(id)));
    
    // 8. Combiniamo i risultati
    const eventiCombinati = [];
    const eventoIdProcessati = new Set();
    
    // Aggiungiamo gli eventi italiani
    for (const evento of eventiItaliani) {
      if (eventoIdProcessati.has(evento.eventoId)) continue;
      
      const dettagli = eventiPerID[evento.eventoId];
      if (!dettagli) continue; // Skip se non troviamo i dettagli
      
      eventiCombinati.push({
        id: evento.id,
        collaboratoreId: evento.collaboratoreId,
        eventoId: evento.eventoId,
        ruolo: evento.ruolo,
        dataAssegnazione: evento.dataAssegnazione,
        note: evento.note,
        titolo: dettagli.title,
        descrizione: dettagli.description,
        data: dettagli.date,
        location: dettagli.location,
        stato: dettagli.status,
        clientId: dettagli.clientId,
        clientFirstName: dettagli.clientFirstName,
        clientLastName: dettagli.clientLastName
      });
      
      eventoIdProcessati.add(evento.eventoId);
    }
    
    // Aggiungiamo gli eventi inglesi che non sono già stati processati
    for (const evento of eventiInglesi) {
      if (eventoIdProcessati.has(evento.eventoId)) continue;
      
      const dettagli = eventiPerID[evento.eventoId];
      if (!dettagli) continue; // Skip se non troviamo i dettagli
      
      eventiCombinati.push({
        id: evento.id,
        collaboratoreId: evento.collaboratoreId,
        eventoId: evento.eventoId,
        ruolo: evento.ruolo,
        dataAssegnazione: evento.dataAssegnazione,
        note: evento.note,
        titolo: dettagli.title,
        descrizione: dettagli.description,
        data: dettagli.date,
        location: dettagli.location,
        stato: dettagli.status,
        clientId: dettagli.clientId,
        clientFirstName: dettagli.clientFirstName,
        clientLastName: dettagli.clientLastName
      });
      
      eventoIdProcessati.add(evento.eventoId);
    }
    
    // 9. Ordiniamo per data di assegnazione decrescente
    eventiCombinati.sort((a, b) => {
      const dateA = a.dataAssegnazione ? new Date(a.dataAssegnazione) : new Date(0);
      const dateB = b.dataAssegnazione ? new Date(b.dataAssegnazione) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log(`Restituiti ${eventiCombinati.length} eventi combinati totali`);
    
    return res.status(200).json(eventiCombinati);
  } catch (error) {
    console.error(`Errore recupero eventi del collaboratore ${id}:`, error);
    return res.status(500).json({ error: "Errore durante il recupero degli eventi del collaboratore" });
  }
};

// POST: Aggiunta di un nuovo evento a un collaboratore
export const addEventoCollaboratore = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Debug dei dati ricevuti
    console.log("Dati ricevuti nel controller addEventoCollaboratore:", {
      body: req.body,
      id: id,
      dataAssegnazioneType: typeof req.body.dataAssegnazione,
      dataAssegnazioneValue: req.body.dataAssegnazione
    });
    
    // Modifichiamo manualmente la data invece di affidarci allo schema
    const requestData = {
      ...req.body,
      collaboratoreId: Number(id),
      dataAssegnazione: new Date()
    };
    
    // Validazione input con dati già convertiti
    const data = insertEventoCollaboratoreSchema.parse(requestData);
    
    // Verifica che l'evento esiste prima di procedere
    const eventoEsiste = await verificaEsistenzaEvento(data.eventoId);
    if (!eventoEsiste) {
      return res.status(404).json({ 
        error: "Evento non trovato o eliminato",
        eventoId: data.eventoId
      });
    }
    
    // Inserimento nel database usando l'approccio event-centric
    // Prima verifichiamo se l'associazione esiste già in entrambe le tabelle
    // Verifica nella tabella eventiCollaboratori (schema italiano)
    const esisteInEventiCollaboratori = await db.select()
      .from(eventiCollaboratori)
      .where(
        and(
          eq(eventiCollaboratori.collaboratoreId, Number(id)),
          eq(eventiCollaboratori.eventoId, data.eventoId)
        )
      )
      .limit(1);
      
    // Verifica anche nella tabella eventCollaborators (schema inglese)
    // per la compatibilità con le assegnazioni effettuate durante la creazione del preventivo
    const esisteInEventCollaborators = await db.select()
      .from(eventCollaborators)
      .where(
        and(
          eq(eventCollaborators.collaboratorId, Number(id)),
          eq(eventCollaborators.eventId, data.eventoId)
        )
      )
      .limit(1);
    
    if (esisteInEventiCollaboratori.length > 0 || esisteInEventCollaborators.length > 0) {
      // Se esiste già nell'altra tabella ma non in questa, lo aggiungiamo anche qui per sincronizzazione
      if (esisteInEventiCollaboratori.length === 0 && esisteInEventCollaborators.length > 0) {
        console.log("Collaboratore già assegnato nella tabella eventCollaborators, lo sincronizziamo con eventiCollaboratori");
        await db.insert(eventiCollaboratori)
          .values(data)
          .onConflictDoNothing();
      }
      
      return res.status(409).json({ 
        error: "Questo collaboratore è già associato a questo evento",
        eventoId: data.eventoId,
        eventoDettagli: esisteInEventCollaborators[0]
      });
    }
    
    // Inserimento nel database
    const [nuovoEvento] = await db.insert(eventiCollaboratori)
      .values(data)
      .returning();
    
    // Sincronizziamo l'assegnazione con l'altra tabella (eventCollaborators)
    await syncFromEventiCollaboratoriToEventCollaborators(
      data.collaboratoreId,
      data.eventoId,
      data.ruolo
    );
    
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
    // Log per debug
    console.log("Dati pagamento ricevuti:", req.body);
    
    // Prepara i dati con la conversione appropriata dei tipi
    const transformedData = {
      ...req.body,
      collaboratoreId: Number(id),
      eventoId: req.body.eventoId ? Number(req.body.eventoId) : undefined,
      importo: req.body.importo ? Number(req.body.importo) : undefined,
      dataPagamento: req.body.dataPagamento ? new Date(req.body.dataPagamento) : new Date()
    };
    
    // Validazione input
    const data = insertPagamentoCollaboratoreSchema.parse(transformedData);
    
    // Log dei dati dopo la trasformazione
    console.log("Dati pagamento validati:", data);
    
    // Inserimento nel database
    const [nuovoPagamento] = await db.insert(pagamentiCollaboratori)
      .values(data)
      .returning();
    
    return res.status(201).json(nuovoPagamento);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Errore di validazione:", error.errors);
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
    
    // Se c'è un eventoId, verifica che l'evento esista
    if (data.eventoId) {
      const eventoEsiste = await verificaEsistenzaEvento(data.eventoId);
      if (!eventoEsiste) {
        return res.status(404).json({ 
          error: "Evento non trovato o eliminato",
          eventoId: data.eventoId
        });
      }
    }
    
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