import { Request, Response } from "express";
import { db } from "../db";
import { clients, events, quotes, contracts, galleries } from "../../shared/schema";
import { sql, like, or } from "drizzle-orm";
import { SearchResult } from "../../client/src/hooks/use-global-search";

/**
 * Controller per la ricerca globale
 * Cerca in varie entità del sistema (clienti, eventi, preventivi, contratti, gallerie)
 */
export class SearchController {
  /**
   * Ricerca globale su tutte le entità
   * @param query Testo da cercare
   * @returns Risultati della ricerca
   */
  static async searchGlobal(req: Request, res: Response) {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== "string" || q.length < 2) {
        return res.status(400).json({ 
          error: "La query di ricerca deve essere una stringa di almeno 2 caratteri" 
        });
      }
      
      // Preparazione del pattern di ricerca con ILIKE per case-insensitive
      const searchPattern = `%${q}%`;
      const results: SearchResult[] = [];
      let totalCount = 0;
      
      // 1. Ricerca clienti
      const clientResults = await db
        .select({
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
          phone: clients.phone,
          address: clients.address,
          createdAt: clients.createdAt
        })
        .from(clients)
        .where(
          or(
            like(clients.firstName, searchPattern),
            like(clients.lastName, searchPattern),
            like(clients.email, searchPattern),
            like(clients.phone, searchPattern),
            like(sql`concat(${clients.firstName}, ' ', ${clients.lastName})`, searchPattern)
          )
        )
        .limit(5);
      
      // Trasformazione risultati clienti nel formato comune
      clientResults.forEach(client => {
        results.push({
          id: client.id,
          type: "cliente",
          title: `${client.firstName} ${client.lastName}`,
          subtitle: client.email || client.phone,
          path: `/clients/${client.id}`,
          createdAt: client.createdAt?.toISOString(),
        });
      });
      
      totalCount += clientResults.length;
      
      // 2. Ricerca eventi
      const eventResults = await db
        .select({
          id: events.id,
          title: events.title,
          location: events.location,
          eventDate: events.eventDate,
          eventType: events.eventType,
          createdAt: events.createdAt
        })
        .from(events)
        .where(
          or(
            like(events.title, searchPattern),
            like(events.location, searchPattern),
            like(events.eventType, searchPattern)
          )
        )
        .limit(5);
      
      // Trasformazione risultati eventi
      eventResults.forEach(event => {
        results.push({
          id: event.id,
          type: "evento",
          title: event.title,
          subtitle: `${event.eventType || 'Evento'} - ${event.location || 'Nessuna location'}`,
          path: `/events/${event.id}`,
          createdAt: event.createdAt?.toISOString(),
        });
      });
      
      totalCount += eventResults.length;
      
      // 3. Ricerca preventivi
      const quoteResults = await db
        .select({
          id: quotes.id,
          title: quotes.title,
          status: quotes.status,
          eventDate: quotes.eventDate,
          createdAt: quotes.createdAt
        })
        .from(quotes)
        .where(
          or(
            like(quotes.title, searchPattern),
            like(quotes.eventType, searchPattern),
            like(quotes.status, searchPattern)
          )
        )
        .limit(5);
      
      // Trasformazione risultati preventivi
      quoteResults.forEach(quote => {
        results.push({
          id: quote.id,
          type: "preventivo",
          title: quote.title,
          subtitle: `Stato: ${quote.status || 'In attesa'}`,
          path: `/quotes/detail/${quote.id}`,
          createdAt: quote.createdAt?.toISOString(),
        });
      });
      
      totalCount += quoteResults.length;
      
      // 4. Ricerca contratti
      const contractResults = await db
        .select({
          id: contracts.id,
          title: contracts.title,
          status: contracts.status,
          createdAt: contracts.createdAt
        })
        .from(contracts)
        .where(
          or(
            like(contracts.title, searchPattern),
            like(contracts.status, searchPattern)
          )
        )
        .limit(5);
      
      // Trasformazione risultati contratti
      contractResults.forEach(contract => {
        results.push({
          id: contract.id,
          type: "contratto",
          title: contract.title,
          subtitle: `Stato: ${contract.status || 'In attesa'}`,
          path: `/contracts/${contract.id}`,
          createdAt: contract.createdAt?.toISOString(),
        });
      });
      
      totalCount += contractResults.length;
      
      // 5. Ricerca gallerie
      const galleryResults = await db
        .select({
          id: galleries.id,
          title: galleries.title,
          description: galleries.description,
          coverImage: galleries.coverImage,
          createdAt: galleries.createdAt
        })
        .from(galleries)
        .where(
          or(
            like(galleries.title, searchPattern),
            like(galleries.description, searchPattern)
          )
        )
        .limit(5);
      
      // Trasformazione risultati gallerie
      galleryResults.forEach(gallery => {
        results.push({
          id: gallery.id,
          type: "galleria",
          title: gallery.title,
          subtitle: gallery.description || 'Nessuna descrizione',
          path: `/galleries/${gallery.id}`,
          createdAt: gallery.createdAt?.toISOString(),
          imageUrl: gallery.coverImage || undefined
        });
      });
      
      totalCount += galleryResults.length;
      
      // Ordina i risultati per creazione, più recenti prima
      results.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      // Limita a massimo 20 risultati totali
      const limitedResults = results.slice(0, 20);
      
      return res.json({
        results: limitedResults,
        totalCount
      });
      
    } catch (error) {
      console.error("Errore nella ricerca globale:", error);
      return res.status(500).json({ error: "Errore durante la ricerca" });
    }
  }
}