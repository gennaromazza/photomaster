/**
 * Controller per la gestione delle clausole contrattuali
 */
import { Request, Response } from "express";
import { db } from "../db";
import {
  contractClauses,
  quotes,
  quoteModules
} from "../../shared/schema";
import { eq, and, isNull, not } from "drizzle-orm";

/**
 * Recupera le clausole appropriate in base al tipo di evento
 * @param eventType - Il tipo di evento (es. 'Matrimonio')
 * @param categoryId - L'ID della categoria (opzionale)
 * @returns Le clausole applicabili
 */
export const getApplicableClauses = async (eventType: string | null, categoryId: number | null) => {
  // Array per memorizzare tutte le clausole trovate
  let applicableClauses = [];
  
  // Costruiamo condizioni per trovare clausole appropriate
  let clauseConditions = [];
  
  // 1. Clausole generiche (senza tipo evento o categoria)
  clauseConditions.push(
    and(
      isNull(contractClauses.eventType),
      isNull(contractClauses.categoryId)
    )
  );
  
  // 2. Clausole specifiche per il tipo di evento
  if (eventType) {
    clauseConditions.push(
      and(
        eq(contractClauses.eventType, eventType),
        isNull(contractClauses.categoryId)
      )
    );
    
    // 3. Clausole specifiche per categoria e tipo evento
    if (categoryId) {
      clauseConditions.push(
        and(
          eq(contractClauses.eventType, eventType),
          eq(contractClauses.categoryId, categoryId)
        )
      );
    }
  }
  
  // 4. Clausole specifiche solo per categoria
  if (categoryId) {
    clauseConditions.push(
      and(
        eq(contractClauses.categoryId, categoryId),
        isNull(contractClauses.eventType)
      )
    );
  }
  
  // Recupera tutte le clausole applicabili
  for (const condition of clauseConditions) {
    const clauses = await db.query.contractClauses.findMany({
      where: and(
        condition,
        eq(contractClauses.isActive, true)
      )
    });
    
    if (clauses && clauses.length > 0) {
      applicableClauses = [...applicableClauses, ...clauses];
    }
  }
  
  // Rimuovi duplicati basati sull'ID della clausola
  applicableClauses = applicableClauses.filter((clause, index, self) =>
    index === self.findIndex((c) => c.id === clause.id)
  );
  
  // Prepara i dati delle clausole
  return applicableClauses.map(clause => ({
    id: clause.id,
    title: clause.title,
    content: clause.content,
    isRequired: clause.isRequired
  }));
};

/**
 * Recupera tutte le clausole contrattuali
 * @param req Request
 * @param res Response
 */
export const getAllClauses = async (req: Request, res: Response) => {
  try {
    const clauses = await db.query.contractClauses.findMany({
      where: eq(contractClauses.isActive, true)
    });
    
    res.json(clauses);
  } catch (error) {
    console.error("Errore nel recupero delle clausole:", error);
    res.status(500).json({ error: "Errore nel recupero delle clausole" });
  }
};

/**
 * Recupera le clausole per un tipo di evento specifico
 * @param req Request
 * @param res Response
 */
export const getClausesByEventType = async (req: Request, res: Response) => {
  try {
    const { eventType, categoryId } = req.query;
    
    const clausesData = await getApplicableClauses(
      eventType as string || null, 
      categoryId ? parseInt(categoryId as string) : null
    );
    
    res.json(clausesData);
  } catch (error) {
    console.error("Errore nel recupero delle clausole per tipo evento:", error);
    res.status(500).json({ error: "Errore nel recupero delle clausole per tipo evento" });
  }
};

/**
 * Assegna le clausole a tutti i moduli di un preventivo
 * @param req Request
 * @param res Response
 */
export const assignClausesToQuoteModules = async (req: Request, res: Response) => {
  try {
    const quoteId = parseInt(req.params.quoteId);
    
    if (isNaN(quoteId)) {
      return res.status(400).json({ error: "ID preventivo non valido" });
    }
    
    // Recupera il preventivo
    const quote = await db.query.quotes.findFirst({
      where: eq(quotes.id, quoteId)
    });
    
    if (!quote) {
      return res.status(404).json({ error: "Preventivo non trovato" });
    }
    
    // Recupera i moduli del preventivo
    const modules = await db.query.quoteModules.findMany({
      where: eq(quoteModules.quoteId, quoteId)
    });
    
    if (!modules || modules.length === 0) {
      return res.status(404).json({ error: "Nessun modulo trovato per questo preventivo" });
    }
    
    // Ottieni le clausole appropriate
    const clausesData = await getApplicableClauses(
      quote.eventType || null,
      quote.categoryId || null
    );
    
    if (clausesData.length === 0) {
      return res.json({ 
        message: "Nessuna clausola applicabile trovata per questo preventivo",
        quoteId,
        modulesUpdated: 0
      });
    }
    
    // Aggiorna tutti i moduli con le clausole
    for (const module of modules) {
      await db.update(quoteModules)
        .set({ clauses: clausesData })
        .where(eq(quoteModules.id, module.id));
    }
    
    res.json({
      message: "Clausole assegnate con successo",
      quoteId,
      clausesCount: clausesData.length,
      modulesUpdated: modules.length
    });
  } catch (error) {
    console.error("Errore nell'assegnazione delle clausole ai moduli:", error);
    res.status(500).json({ error: "Errore nell'assegnazione delle clausole ai moduli" });
  }
};

/**
 * Recupera le clausole associate a un modulo specifico
 * @param req Request
 * @param res Response
 */
export const getModuleClauses = async (req: Request, res: Response) => {
  try {
    const moduleId = parseInt(req.params.moduleId);
    
    if (isNaN(moduleId)) {
      return res.status(400).json({ error: "ID modulo non valido" });
    }
    
    // Recupera il modulo
    const module = await db.query.quoteModules.findFirst({
      where: eq(quoteModules.id, moduleId)
    });
    
    if (!module) {
      return res.status(404).json({ error: "Modulo non trovato" });
    }
    
    // Se il modulo non ha clausole, recuperiamo quelle del preventivo
    if (!module.clauses || (Array.isArray(module.clauses) && module.clauses.length === 0)) {
      // Recupera il preventivo associato
      const quote = await db.query.quotes.findFirst({
        where: eq(quotes.id, module.quoteId)
      });
      
      if (quote) {
        // Ottieni le clausole appropriate
        const clausesData = await getApplicableClauses(
          quote.eventType || null,
          quote.categoryId || null
        );
        
        // Aggiorna il modulo con le clausole trovate
        if (clausesData.length > 0) {
          await db.update(quoteModules)
            .set({ clauses: clausesData })
            .where(eq(quoteModules.id, moduleId));
            
          return res.json(clausesData);
        }
      }
    }
    
    // Ritorna le clausole del modulo
    res.json(module.clauses || []);
  } catch (error) {
    console.error("Errore nel recupero delle clausole del modulo:", error);
    res.status(500).json({ error: "Errore nel recupero delle clausole del modulo" });
  }
};

/**
 * Aggiorna le clausole di un modulo specifico
 * @param req Request
 * @param res Response
 */
export const updateModuleClauses = async (req: Request, res: Response) => {
  try {
    const moduleId = parseInt(req.params.moduleId);
    
    if (isNaN(moduleId)) {
      return res.status(400).json({ error: "ID modulo non valido" });
    }
    
    // Recupera il modulo
    const module = await db.query.quoteModules.findFirst({
      where: eq(quoteModules.id, moduleId)
    });
    
    if (!module) {
      return res.status(404).json({ error: "Modulo non trovato" });
    }
    
    // Valida i dati delle clausole
    if (!req.body || !Array.isArray(req.body)) {
      return res.status(400).json({ error: "Formato dati non valido" });
    }
    
    // Aggiorna il modulo con le nuove clausole
    await db.update(quoteModules)
      .set({ clauses: req.body })
      .where(eq(quoteModules.id, moduleId));
    
    res.json({ 
      message: "Clausole aggiornate con successo",
      moduleId,
      clauses: req.body
    });
  } catch (error) {
    console.error("Errore nell'aggiornamento delle clausole del modulo:", error);
    res.status(500).json({ error: "Errore nell'aggiornamento delle clausole del modulo" });
  }
};