import { Request, Response } from "express";
import { db, pgClient } from "../db";
import { clients } from "@shared/schema";
import { eq, or, and, ilike } from "drizzle-orm";

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
    const matchingClients = await db
      .select()
      .from(clients)
      .where(or(...searchConditions));

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
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: "È necessario fornire un termine di ricerca" });
    }

    // Ricerca fuzzy su nome, cognome, email e telefono
    const searchTerm = `%${query}%`;
    
    const results = await db
      .select()
      .from(clients)
      .where(
        or(
          ilike(clients.firstName, searchTerm),
          ilike(clients.lastName, searchTerm),
          ilike(clients.email, searchTerm),
          ilike(clients.phone, searchTerm)
        )
      )
      .limit(10);

    return res.status(200).json(results);
  } catch (error: any) {
    console.error("Errore nella ricerca dei clienti:", error);
    return res
      .status(500)
      .json({ message: `Errore: ${error.message || "Errore sconosciuto"}` });
  }
};