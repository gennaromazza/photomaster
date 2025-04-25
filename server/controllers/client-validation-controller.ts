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

    let dbQuery = db.select().from(clients);
    
    // Aggiungi condizioni di ricerca solo se è presente una query
    if (query && query.toString().trim() !== "") {
      const searchTerm = `%${query.toString()}%`;
      
      dbQuery = dbQuery.where(
        or(
          sql`${clients.firstName} ILIKE ${searchTerm}`,
          sql`${clients.lastName} ILIKE ${searchTerm}`,
          sql`${clients.email} ILIKE ${searchTerm}`,
          sql`${clients.phone} ILIKE ${searchTerm}`,
          sql`${clients.address} ILIKE ${searchTerm}`,
          sql`${clients.company} ILIKE ${searchTerm}`
        )
      );
    }
    
    // Applica ordinamento, paginazione e recupera i risultati
    const clientResults = await dbQuery
      .orderBy(sortDirection(sortColumn))
      .limit(limitNumber)
      .offset(offset);
    
    // Conta il totale di record per la paginazione
    let totalCountQuery = db.select({ count: sql<number>`count(*)` }).from(clients);
    
    // Se c'è una query di ricerca, applica le stesse condizioni al conteggio
    if (query && query.toString().trim() !== "") {
      const searchTerm = `%${query.toString()}%`;
      
      totalCountQuery = totalCountQuery.where(
        or(
          sql`${clients.firstName} ILIKE ${searchTerm}`,
          sql`${clients.lastName} ILIKE ${searchTerm}`,
          sql`${clients.email} ILIKE ${searchTerm}`,
          sql`${clients.phone} ILIKE ${searchTerm}`,
          sql`${clients.address} ILIKE ${searchTerm}`,
          sql`${clients.company} ILIKE ${searchTerm}`
        )
      );
    }
    
    const [totalCount] = await totalCountQuery;
    
    // Calcola informazioni di paginazione
    const totalPages = Math.ceil(totalCount.count / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;
    
    return res.status(200).json({
      clients: clientResults,
      pagination: {
        total: totalCount.count,
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