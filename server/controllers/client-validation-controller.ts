import { Request, Response } from "express";
import { db } from "../db";
import { eq, or, and, desc, asc, sql, ilike } from "drizzle-orm";
import { clients } from "@shared/schema";

/**
 * Verifica se esiste già un cliente con la stessa email o telefono
 */
export const checkExistingClient = async (req: Request, res: Response) => {
  try {
    const { email, phone } = req.query;

    if (!email && !phone) {
      return res.status(400).json({ 
        message: "È necessario fornire almeno un'email o un numero di telefono" 
      });
    }

    // Crea un array di condizioni per la ricerca
    const searchConditions = [];
    
    if (email) {
      searchConditions.push(eq(clients.email, email.toString()));
    }
    
    if (phone) {
      searchConditions.push(eq(clients.phone, phone.toString()));
    }

    // Cerca clienti che corrispondono a uno qualsiasi dei criteri
    const matchingClients = await db
      .select()
      .from(clients)
      .where(or(...searchConditions))
      .limit(5);

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
 * Cerca clienti con criteri avanzati
 */
export const searchClients = async (req: Request, res: Response) => {
  try {
    const { 
      query = "", 
      page = "1", 
      limit = "10",
      sortBy = "lastName",
      sortDir = "asc"
    } = req.query;

    const pageNumber = parseInt(page.toString());
    const limitNumber = parseInt(limit.toString());
    const offset = (pageNumber - 1) * limitNumber;
    
    const sortDirection = sortDir === "desc" ? desc : asc;
    let sortColumn;
    
    // Gestisci la colonna di ordinamento
    switch (sortBy) {
      case "firstName":
        sortColumn = clients.firstName;
        break;
      case "email":
        sortColumn = clients.email;
        break;
      case "phone":
        sortColumn = clients.phone;
        break;
      case "createdAt":
        sortColumn = clients.createdAt;
        break;
      default:
        sortColumn = clients.lastName; // default
    }

    // Costruisci la query di base
    let clientResults = [];
    let countResult = { count: 0 };

    if (query && query.toString().trim() !== "") {
      const searchTerm = `%${query.toString()}%`;
      
      // Versione estremamente semplificata - solo ricerca su first_name
      clientResults = await db.execute(sql`
        SELECT * FROM clients 
        WHERE first_name ILIKE ${searchTerm}
        ORDER BY last_name ASC
        LIMIT ${limitNumber} OFFSET ${offset}
      `);
      
      // Conteggio totale
      const countRows = await db.execute(sql`
        SELECT COUNT(*) as count FROM clients 
        WHERE first_name ILIKE ${searchTerm}
      `);
      
      countResult = countRows[0];
    } else {
      // Se non c'è una query, restituisci tutti i clienti con paginazione
      clientResults = await db.execute(sql`
        SELECT * FROM clients 
        ORDER BY last_name ASC
        LIMIT ${limitNumber} OFFSET ${offset}
      `);
      
      // Conteggio totale
      const countRows = await db.execute(sql`
        SELECT COUNT(*) as count FROM clients
      `);
      
      countResult = countRows[0];
    }
    
    // Assicurati che totalCount sia un numero
    const totalCountValue = parseInt(countResult.count);
    
    // Calcola informazioni di paginazione
    const totalPages = Math.ceil(totalCountValue / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;
    
    return res.status(200).json({
      clients: clientResults,
      pagination: {
        total: totalCountValue,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error: any) {
    console.error("Errore nella ricerca avanzata di clienti:", error);
    return res
      .status(500)
      .json({ message: `Errore: ${error.message || "Errore sconosciuto"}` });
  }
};