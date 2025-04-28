/**
 * Controller per la gestione delle clausole contrattuali associate ai moduli dei preventivi
 */
import { Request, Response } from "express";
import { db } from "../db";
import {
  quotes,
  quoteModules,
  contractClauses,
  eq,
  and,
  isNull,
} from "../../shared/schema";

/**
 * Recupera le clausole contrattuali per un modulo specifico
 * @param req Request
 * @param res Response
 */
export const getClausesForModule = async (req: Request, res: Response) => {
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
    
    // Controlla se il modulo ha già delle clausole assegnate
    if (module.clauses && Array.isArray(module.clauses) && module.clauses.length > 0) {
      return res.json(module.clauses);
    }
    
    // Se il modulo non ha clausole, recupera quelle applicabili
    // Recupera il preventivo associato al modulo
    const quote = await db.query.quotes.findFirst({
      where: eq(quotes.id, module.quoteId)
    });
    
    if (!quote) {
      return res.status(404).json({ error: "Preventivo associato non trovato" });
    }
    
    // Trova le clausole applicabili in base al tipo di evento
    const eventType = quote.eventType || null;
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
      if (quote.categoryId) {
        clauseConditions.push(
          and(
            eq(contractClauses.eventType, eventType),
            eq(contractClauses.categoryId, quote.categoryId)
          )
        );
      }
    }
    
    // 4. Clausole specifiche solo per categoria
    if (quote.categoryId) {
      clauseConditions.push(
        and(
          eq(contractClauses.categoryId, quote.categoryId),
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
    const clausesData = applicableClauses.map(clause => ({
      id: clause.id,
      title: clause.title,
      content: clause.content,
      isRequired: clause.isRequired
    }));
    
    // Aggiorna il modulo con le clausole trovate
    await db.update(quoteModules)
      .set({ clauses: clausesData })
      .where(eq(quoteModules.id, moduleId));
    
    return res.json(clausesData);
  } catch (error) {
    console.error("Errore nel recupero delle clausole per il modulo:", error);
    res.status(500).json({ error: "Errore nel recupero delle clausole per il modulo" });
  }
};

/**
 * Aggiorna le clausole per un modulo specifico
 * @param req Request
 * @param res Response
 */
export const updateClausesForModule = async (req: Request, res: Response) => {
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
    
    return res.json({ success: true, clauses: req.body });
  } catch (error) {
    console.error("Errore nell'aggiornamento delle clausole per il modulo:", error);
    res.status(500).json({ error: "Errore nell'aggiornamento delle clausole per il modulo" });
  }
};