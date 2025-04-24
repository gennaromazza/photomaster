import { Request, Response } from "express";
import { db, pool } from "../db";
import { 
  contractClauses, 
  quoteClauses, 
  quotes, 
  insertContractClauseSchema, 
  serviceCategories,
  ContractClause,
  QuoteClause,
  ServiceCategory
} from "@shared/schema";
import { eq, and, isNull, inArray, sql, desc, SQL } from "drizzle-orm";
import { ZodError } from "zod";

/**
 * Controller per la gestione delle clausole contrattuali
 */
export class ClausesController {
  /**
   * Ottiene tutte le clausole contrattuali
   */
  static async getAllClauses(req: Request, res: Response) {
    try {
      // Utilizziamo pool per eseguire query SQL dirette
      const queryText = `
        SELECT 
          c.*,
          sc.id as category_id, 
          sc.name as category_name, 
          sc.description as category_description
        FROM 
          contract_clauses c
        LEFT JOIN 
          service_categories sc ON c.category_id = sc.id
        ORDER BY 
          c.is_active DESC, 
          c.order ASC
      `;
      
      const result = await pool.query(queryText);
      
      // Processiamo i risultati per avere lo stesso formato delle relazioni
      const clauses = result.rows.map((row: any) => {
        const clause = {
          id: row.id,
          title: row.title,
          content: row.content,
          categoryId: row.category_id,
          eventType: row.event_type,
          isRequired: row.is_required,
          isActive: row.is_active,
          order: row.order,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          category: row.category_id ? {
            id: row.category_id,
            name: row.category_name,
            description: row.category_description
          } : null
        };
        return clause;
      });
      
      return res.json(clauses);
    } catch (error) {
      console.error("Errore nel recupero delle clausole:", error);
      return res.status(500).json({ error: "Errore nel recupero delle clausole" });
    }
  }
  
  /**
   * Ottiene una clausola contrattuale specifica
   */
  static async getClauseById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID clausola non valido" });
      }
      
      // Utilizziamo una query diretta invece della query con relazioni
      const clause = await db.select()
        .from(contractClauses)
        .where(eq(contractClauses.id, id))
        .limit(1);
      
      if (!clause || clause.length === 0) {
        return res.status(404).json({ error: "Clausola non trovata" });
      }
      
      // Ora otteniamo i dati della categoria se presente
      let category = null;
      if (clause[0].categoryId) {
        const categoryResult = await db.select()
          .from(serviceCategories)
          .where(eq(serviceCategories.id, clause[0].categoryId))
          .limit(1);
          
        if (categoryResult && categoryResult.length > 0) {
          category = categoryResult[0];
        }
      }
      
      return res.json({
        ...clause[0],
        category
      });
    } catch (error) {
      console.error("Errore nel recupero della clausola:", error);
      return res.status(500).json({ error: "Errore nel recupero della clausola" });
    }
  }
  
  /**
   * Crea una nuova clausola contrattuale
   */
  static async createClause(req: Request, res: Response) {
    try {
      // Valida i dati di input
      const validatedData = insertContractClauseSchema.parse(req.body);
      
      // Crea la clausola
      const [newClause] = await db.insert(contractClauses)
        .values({
          ...validatedData,
          updatedAt: new Date()
        })
        .returning();
      
      return res.status(201).json(newClause);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Dati non validi", details: error.format() });
      }
      
      console.error("Errore nella creazione della clausola:", error);
      return res.status(500).json({ error: "Errore nella creazione della clausola" });
    }
  }
  
  /**
   * Aggiorna una clausola contrattuale esistente
   */
  static async updateClause(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID clausola non valido" });
      }
      
      // Verifica che la clausola esista
      const existingClause = await db.query.contractClauses.findFirst({
        where: eq(contractClauses.id, id)
      });
      
      if (!existingClause) {
        return res.status(404).json({ error: "Clausola non trovata" });
      }
      
      // Valida i dati di input
      const validatedData = insertContractClauseSchema.partial().parse(req.body);
      
      // Aggiorna la clausola
      const [updatedClause] = await db.update(contractClauses)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(contractClauses.id, id))
        .returning();
      
      return res.json(updatedClause);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Dati non validi", details: error.format() });
      }
      
      console.error("Errore nell'aggiornamento della clausola:", error);
      return res.status(500).json({ error: "Errore nell'aggiornamento della clausola" });
    }
  }
  
  /**
   * Elimina una clausola contrattuale
   */
  static async deleteClause(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID clausola non valido" });
      }
      
      // Verifica che la clausola esista
      const existingClause = await db.query.contractClauses.findFirst({
        where: eq(contractClauses.id, id)
      });
      
      if (!existingClause) {
        return res.status(404).json({ error: "Clausola non trovata" });
      }
      
      // Elimina la clausola
      await db.delete(contractClauses)
        .where(eq(contractClauses.id, id));
      
      return res.status(200).json({ success: true, message: "Clausola eliminata con successo" });
    } catch (error) {
      console.error("Errore nell'eliminazione della clausola:", error);
      return res.status(500).json({ error: "Errore nell'eliminazione della clausola" });
    }
  }
  
  /**
   * Ottiene le clausole associate a un preventivo
   */
  static async getQuoteClauses(req: Request, res: Response) {
    try {
      const quoteId = parseInt(req.params.quoteId);
      if (isNaN(quoteId)) {
        return res.status(400).json({ error: "ID preventivo non valido" });
      }
      
      // Verifica che il preventivo esista
      const quote = await db.query.quotes.findFirst({
        where: eq(quotes.id, quoteId)
      });
      
      if (!quote) {
        return res.status(404).json({ error: "Preventivo non trovato" });
      }
      
      // Recupera le clausole associate al preventivo
      const quoteClausesList = await db.query.quoteClauses.findMany({
        where: eq(quoteClauses.quoteId, quoteId),
        with: {
          clause: true
        }
      });
      
      return res.json(quoteClausesList);
    } catch (error) {
      console.error("Errore nel recupero delle clausole del preventivo:", error);
      return res.status(500).json({ error: "Errore nel recupero delle clausole del preventivo" });
    }
  }
  
  /**
   * Ottiene le clausole disponibili per un preventivo in base alla categoria e tipo di evento
   */
  static async getAvailableClausesForQuote(req: Request, res: Response) {
    try {
      const quoteId = parseInt(req.params.quoteId);
      if (isNaN(quoteId)) {
        return res.status(400).json({ error: "ID preventivo non valido" });
      }
      
      // Recupera i dati del preventivo
      const quote = await db.query.quotes.findFirst({
        where: eq(quotes.id, quoteId)
      });
      
      if (!quote) {
        return res.status(404).json({ error: "Preventivo non trovato" });
      }
      
      // Costruisci condizione per filtrare clausole per categoria e tipo di evento
      const conditions: SQL[] = [];
      
      // Clausole per tutte le categorie e tipi di evento (generiche)
      conditions.push(and(isNull(contractClauses.categoryId), isNull(contractClauses.eventType)));
      
      // Clausole specifiche per il tipo di evento del preventivo
      if (quote.eventType) {
        conditions.push(and(isNull(contractClauses.categoryId), eq(contractClauses.eventType, quote.eventType)));
      }
      
      // Clausole specifiche per la categoria del preventivo
      if (quote.categoryId) {
        conditions.push(and(eq(contractClauses.categoryId, quote.categoryId), isNull(contractClauses.eventType)));
        
        // Clausole specifiche per categoria E tipo di evento
        if (quote.eventType) {
          conditions.push(and(
            eq(contractClauses.categoryId, quote.categoryId),
            eq(contractClauses.eventType, quote.eventType)
          ));
        }
      }
      
      // Recupera clausole attive che corrispondono ai criteri
      const availableClauses = await db.query.contractClauses.findMany({
        where: and(
          eq(contractClauses.isActive, true),
          sql`(${sql.join(conditions, sql` OR `)})`
        ),
        with: {
          category: true
        },
        orderBy: [
          { order: "asc" }
        ]
      });
      
      return res.json(availableClauses);
    } catch (error) {
      console.error("Errore nel recupero delle clausole disponibili:", error);
      return res.status(500).json({ error: "Errore nel recupero delle clausole disponibili per il preventivo" });
    }
  }
  
  /**
   * Associa clausole a un preventivo
   */
  static async associateClausesToQuote(req: Request, res: Response) {
    try {
      const quoteId = parseInt(req.params.quoteId);
      if (isNaN(quoteId)) {
        return res.status(400).json({ error: "ID preventivo non valido" });
      }
      
      // Verifica che il preventivo esista
      const quote = await db.query.quotes.findFirst({
        where: eq(quotes.id, quoteId)
      });
      
      if (!quote) {
        return res.status(404).json({ error: "Preventivo non trovato" });
      }
      
      // Clausole da associare (automatiche se non specificate)
      let clauseIds: number[];
      if (!req.body.clauseIds) {
        // assegna tutte le clausole collegate alla stessa categoria dell'evento
        const autoClauses = await db.query.contractClauses.findMany({
          where: eq(contractClauses.categoryId, quote.categoryId)
        });
        clauseIds = autoClauses.map(c => c.id);
      } else {
        clauseIds = req.body.clauseIds as number[];
      }
      if (!Array.isArray(clauseIds) || clauseIds.length === 0) {
        return res.status(400).json({ error: "Nessuna clausola trovata per questa categoria" });
      }
      
      // Verifica che le clausole esistano
      const clauses = await db.query.contractClauses.findMany({
        where: inArray(contractClauses.id, clauseIds)
      });
      
      if (clauses.length !== clauseIds.length) {
        return res.status(400).json({ error: "Una o più clausole non esistono" });
      }
      
      // Elimina le associazioni esistenti
      await db.delete(quoteClauses)
        .where(eq(quoteClauses.quoteId, quoteId));
      
      // Crea le nuove associazioni
      const newAssociations = clauseIds.map(clauseId => ({
        quoteId,
        clauseId,
        isAccepted: false,
        createdAt: new Date()
      }));
      
      const result = await db.insert(quoteClauses)
        .values(newAssociations)
        .returning();
      
      // Imposta la conferma delle clausole a false per richiedere l'accettazione
      await db.update(quotes)
        .set({ clausesConfirmed: false })
        .where(eq(quotes.id, quoteId));
      
      return res.status(201).json({ 
        success: true, 
        message: "Clausole associate con successo", 
        data: result 
      });
    } catch (error) {
      console.error("Errore nell'associazione delle clausole:", error);
      return res.status(500).json({ error: "Errore nell'associazione delle clausole al preventivo" });
    }
  }
  
  /**
   * Accetta le clausole di un preventivo
   */
  static async acceptQuoteClauses(req: Request, res: Response) {
    try {
      const quoteId = parseInt(req.params.quoteId);
      if (isNaN(quoteId)) {
        return res.status(400).json({ error: "ID preventivo non valido" });
      }
      
      // Verifica che il preventivo esista
      const quote = await db.query.quotes.findFirst({
        where: eq(quotes.id, quoteId)
      });
      
      if (!quote) {
        return res.status(404).json({ error: "Preventivo non trovato" });
      }
      
      // Verifica che ci siano clausole associate
      const quoteClausesCount = await db.select({ count: sql<number>`count(*)` })
        .from(quoteClauses)
        .where(eq(quoteClauses.quoteId, quoteId))
        .then((result: Array<{count: number}>) => result[0]?.count || 0);
      
      if (quoteClausesCount === 0) {
        return res.status(400).json({ error: "Nessuna clausola associata a questo preventivo" });
      }
      
      // Aggiorna lo stato di accettazione delle clausole
      await db.update(quoteClauses)
        .set({ isAccepted: true })
        .where(eq(quoteClauses.quoteId, quoteId));
      
      // Imposta la conferma delle clausole a true
      await db.update(quotes)
        .set({ clausesConfirmed: true })
        .where(eq(quotes.id, quoteId));
        
      return res.status(200).json({
        success: true,
        message: "Clausole accettate con successo"
      });
    } catch (error) {
      console.error("Errore nell'accettazione delle clausole:", error);
      return res.status(500).json({ error: "Errore nell'accettazione delle clausole del preventivo" });
    }
  }
  
  /**
   * Ottiene le categorie di servizi per filtrare le clausole
   */
  static async getCategories(req: Request, res: Response) {
    try {
      // Utilizziamo pool per eseguire query SQL dirette
      const queryText = `
        SELECT * FROM service_categories
        ORDER BY name
      `;
      
      const result = await pool.query(queryText);
      
      return res.json(result.rows);
    } catch (error) {
      console.error("Errore nel recupero delle categorie:", error);
      return res.status(500).json({ error: "Errore nel recupero delle categorie di servizio" });
    }
  }
  
  /**
   * Ottiene i tipi di evento disponibili
   */
  static async getEventTypes(req: Request, res: Response) {
    try {
      // Utilizziamo pool per eseguire query SQL dirette
      const queryText = `
        SELECT DISTINCT event_type 
        FROM quotes 
        WHERE event_type IS NOT NULL AND event_type != ''
      `;
      
      const result = await pool.query(queryText);
      
      // Estraiamo i valori unici e assicuriamoci che siano stringhe valide
      const eventTypes = result.rows
        .map((row: any) => row.event_type)
        .filter((type: any) => type && typeof type === 'string' && type.trim() !== '');
      
      // Restituisce un array vuoto se non ci sono tipi di evento
      return res.json(eventTypes);
    } catch (error) {
      console.error("Errore nel recupero dei tipi di evento:", error);
      // In caso di errore, restituiamo un array vuoto per non bloccare l'UI
      return res.json([]);
    }
  }
}

// Esportazione dei metodi della classe
export const getAllClauses = ClausesController.getAllClauses;
export const getClauseById = ClausesController.getClauseById;
export const createClause = ClausesController.createClause;
export const updateClause = ClausesController.updateClause;
export const deleteClause = ClausesController.deleteClause;
export const getQuoteClauses = ClausesController.getQuoteClauses;
export const getAvailableClausesForQuote = ClausesController.getAvailableClausesForQuote;
export const associateClausesToQuote = ClausesController.associateClausesToQuote;
export const acceptQuoteClauses = ClausesController.acceptQuoteClauses;
export const getCategories = ClausesController.getCategories;
export const getEventTypes = ClausesController.getEventTypes;