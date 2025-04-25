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
    
    if (email && email.toString().trim() !== "") {
      // Ricerca case-insensitive con ILIKE per email
      searchConditions.push(ilike(clients.email, `%${email.toString().trim()}%`));
    }
    
    if (phone && phone.toString().trim() !== "") {
      // Normalizza il numero di telefono (rimuovi spazi e caratteri non numerici)
      const normalizedPhone = phone.toString().trim().replace(/[\s()-]/g, "");
      
      // Se il numero è abbastanza lungo, gestisce diverse forme: con/senza prefisso
      if (normalizedPhone.length > 8) {
        const lastDigits = normalizedPhone.slice(-9);
        searchConditions.push(
          or(
            ilike(clients.phone, `%${normalizedPhone}%`),
            ilike(clients.phone, `%${lastDigits}%`)
          )
        );
      } else {
        searchConditions.push(ilike(clients.phone, `%${normalizedPhone}%`));
      }
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
        message: "Clienti esistenti trovati",
        // Include il primo cliente come principale e gli altri come alternativi
        primaryMatch: matchingClients[0],
        alternativeMatches: matchingClients.length > 1 ? matchingClients.slice(1) : []
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
    
    // Variabili per ordinamento
    const sortColumn = sortBy.toString() || "lastName";
    const isDescending = sortDir.toString() === "desc";
    
    // Risultati base senza query di ricerca
    let baseQuery = db.select().from(clients);
    
    // Aggiungi condizioni di ricerca
    if (query && query.toString().trim() !== "") {
      const searchPattern = `%${query.toString().trim()}%`;
      
      // Ora che sappiamo che la base funziona, possiamo aggiungere la ricerca su più campi
      baseQuery = baseQuery.where(
        or(
          ilike(clients.firstName, searchPattern),
          ilike(clients.lastName, searchPattern),
          ilike(clients.email, searchPattern),
          ilike(clients.phone, searchPattern),
          ilike(clients.address, searchPattern)
        )
      );
    }
    
    // Applica ordinamento
    if (isDescending) {
      if (sortColumn === "firstName") baseQuery = baseQuery.orderBy(desc(clients.firstName));
      else if (sortColumn === "email") baseQuery = baseQuery.orderBy(desc(clients.email));
      else if (sortColumn === "phone") baseQuery = baseQuery.orderBy(desc(clients.phone));
      else baseQuery = baseQuery.orderBy(desc(clients.lastName));
    } else {
      if (sortColumn === "firstName") baseQuery = baseQuery.orderBy(asc(clients.firstName));
      else if (sortColumn === "email") baseQuery = baseQuery.orderBy(asc(clients.email));
      else if (sortColumn === "phone") baseQuery = baseQuery.orderBy(asc(clients.phone));
      else baseQuery = baseQuery.orderBy(asc(clients.lastName));
    }
    
    // Applica paginazione
    const clientResults = await baseQuery.limit(limitNumber).offset(offset);
    
    // Conta il totale senza paginazione ma con gli stessi filtri
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(clients);
    
    if (query && query.toString().trim() !== "") {
      const searchPattern = `%${query.toString().trim()}%`;
      countQuery = countQuery.where(
        or(
          ilike(clients.firstName, searchPattern),
          ilike(clients.lastName, searchPattern),
          ilike(clients.email, searchPattern),
          ilike(clients.phone, searchPattern),
          ilike(clients.address, searchPattern)
        )
      );
    }
    
    const [totalCount] = await countQuery;
    
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