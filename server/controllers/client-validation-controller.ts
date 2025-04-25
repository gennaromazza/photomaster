import { Request, Response } from "express";
import { db } from "../db";
import { clients } from "@shared/schema";
import { eq, or, ilike, and, sql } from "drizzle-orm";

/**
 * Controlla se esiste già un cliente con la stessa email o numero di telefono
 */
export const checkExistingClient = async (req: Request, res: Response) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ 
        message: "È necessario fornire almeno un'email o un numero di telefono" 
      });
    }

    // Crea un array di condizioni per la ricerca
    const searchConditions = [];
    
    if (email) {
      searchConditions.push(eq(clients.email, email));
    }
    
    if (phone) {
      searchConditions.push(eq(clients.phone, phone));
    }

    // Cerca clienti che corrispondono a uno qualsiasi dei criteri
    let matchingClients = [];
    
    if (searchConditions.length > 0) {
      matchingClients = await db
        .select()
        .from(clients)
        .where(or(...searchConditions));
    }

    if (matchingClients.length > 0) {
      return res.status(200).json({
        exists: true,
        clients: matchingClients,
        message: "Clienti esistenti trovati"
      });
    } else {
      return res.status(200).json({
        exists: false,
        clients: [],
        message: "Nessun cliente trovato"
      });
    }
  } catch (error: any) {
    console.error("Errore nella ricerca di clienti esistenti:", error);
    return res
      .status(500)
      .json({ message: `Errore: ${error.message || "Errore sconosciuto"}` });
  }
};

/**
 * Ricerca clienti per nome, email o telefono (ricerca fuzzy)
 */
export const searchClients = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    if (!query) {
      return res
        .status(400)
        .json({ message: "È necessario fornire un termine di ricerca (query)" });
    }

    // Per ricerche più complesse, possiamo usare SQL diretto
    const searchQuery = `%${query}%`.toLowerCase();

    // Ricerca per nome, email o telefono usando ilike per case-insensitive
    const searchResult = await db
      .select()
      .from(clients)
      .where(
        or(
          ilike(clients.firstName, searchQuery),
          ilike(clients.lastName, searchQuery),
          ilike(clients.email, searchQuery),
          ilike(clients.phone, searchQuery),
          sql`LOWER(CONCAT(${clients.firstName}, ' ', ${clients.lastName})) LIKE ${searchQuery}`
        )
      )
      .limit(limit)
      .offset(offset);

    // Conta il totale dei risultati per la paginazione
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(
        or(
          ilike(clients.firstName, searchQuery),
          ilike(clients.lastName, searchQuery),
          ilike(clients.email, searchQuery),
          ilike(clients.phone, searchQuery),
          sql`LOWER(CONCAT(${clients.firstName}, ' ', ${clients.lastName})) LIKE ${searchQuery}`
        )
      );

    const totalCount = countResult?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      clients: searchResult,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages
      }
    });
  } catch (error: any) {
    console.error("Errore nella ricerca dei clienti:", error);
    return res
      .status(500)
      .json({ message: `Errore: ${error.message || "Errore sconosciuto"}` });
  }
};