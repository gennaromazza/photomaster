import { Request, Response } from "express";
import { db as dbAny } from "../db";
import { clients } from "@shared/schema";
import { eq, or, ilike, and, sql, type SQL } from "drizzle-orm";
import { storage } from "../storage";
import type { Client } from "@shared/schema";

const db = dbAny as any;

/**
 * Controlla se esiste già un cliente con la stessa email o telefono
 */
export const checkExistingClient = async (req: Request, res: Response) => {
  try {
    const { email, phone } = req.query;
    
    if (!email && !phone) {
      return res.status(400).json({
        exists: false,
        clients: [],
        message: "Devi fornire almeno un'email o un numero di telefono"
      });
    }
    
    const queryConditions = [];
    
    if (email && typeof email === 'string' && email.trim() !== '') {
      queryConditions.push(eq(clients.email, email.trim().toLowerCase()));
    }
    
    if (phone && typeof phone === 'string' && phone.trim() !== '') {
      queryConditions.push(eq(clients.phone, phone.trim()));
    }
    
    if (queryConditions.length === 0) {
      return res.status(400).json({
        exists: false,
        clients: [],
        message: "Parametri di ricerca non validi"
      });
    }
    
    const existingClients = await db.select().from(clients).where(or(...queryConditions));
    
    return res.json({
      exists: existingClients.length > 0,
      clients: existingClients,
      message: existingClients.length > 0 
        ? `Trovati ${existingClients.length} clienti con queste informazioni` 
        : "Nessun cliente trovato"
    });
  } catch (error: any) {
    console.error("Errore durante la verifica del cliente esistente:", error);
    return res.status(500).json({
      exists: false,
      clients: [],
      message: `Errore durante la verifica: ${error.message}`
    });
  }
};

/**
 * Ricerca clienti con supporto per paginazione e ricerca full-text
 */
export const searchClients = async (req: Request, res: Response) => {
  try {
    const { query, page = "1", limit = "10" } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;
    
    // Costruisci la query di ricerca
    let queryConditions: SQL | undefined;
    if (query && typeof query === 'string' && query.trim() !== '') {
      const searchQuery = `%${query.trim().toLowerCase()}%`;
      queryConditions = or(
        ilike(clients.firstName, searchQuery),
        ilike(clients.lastName, searchQuery),
        ilike(clients.email, searchQuery),
        ilike(clients.phone, searchQuery),
        ilike(clients.address, searchQuery),
        ilike(clients.city, searchQuery),
        ilike(clients.companyName || '', searchQuery)
      );
    }
    
    // Ottieni il conteggio totale
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(queryConditions || sql`TRUE`);
    
    const totalCount = parseInt(totalCountResult[0].count.toString(), 10);
    const totalPages = Math.ceil(totalCount / limitNum);
    
    // Esegui la query principale con paginazione
    const result = await db
      .select()
      .from(clients)
      .where(queryConditions || sql`TRUE`)
      .orderBy(clients.lastName, clients.firstName)
      .offset(offset)
      .limit(limitNum);
    
    return res.json({
      clients: result,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
        hasMore: pageNum < totalPages
      }
    });
  } catch (error: any) {
    console.error("Errore durante la ricerca dei clienti:", error);
    return res.status(500).json({
      message: `Errore durante la ricerca: ${error.message}`
    });
  }
};