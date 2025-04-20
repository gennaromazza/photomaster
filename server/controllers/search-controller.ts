import { Request, Response } from "express";
import { db } from "../db";
import { ilike, sql, desc } from "drizzle-orm";
import { clients, events, quotes, contracts, galleries } from "@shared/schema";
import { formatDateCompact } from "../utils/date-utils";

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
      
      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.status(400).json({ message: "La query di ricerca deve essere una stringa di almeno 2 caratteri" });
      }
      
      const searchTerm = `%${q}%`;
      
      // Cerca tra i clienti
      const clientResults = await SearchController.searchClients(searchTerm);
      
      // Cerca tra gli eventi
      const eventResults = await SearchController.searchEvents(searchTerm);
      
      // Cerca tra i preventivi
      const quoteResults = await SearchController.searchQuotes(searchTerm);
      
      // Cerca tra i contratti
      const contractResults = await SearchController.searchContracts(searchTerm);
      
      // Cerca tra le gallerie
      const galleryResults = await SearchController.searchGalleries(searchTerm);
      
      // Combina tutti i risultati
      const results = [
        ...clientResults,
        ...eventResults,
        ...quoteResults,
        ...contractResults,
        ...galleryResults
      ];
      
      // Ordina i risultati per rilevanza (implementazione semplice)
      results.sort((a, b) => {
        // Se il termine di ricerca è nel titolo, dai priorità
        const aHasInTitle = a.title.toLowerCase().includes(q.toLowerCase());
        const bHasInTitle = b.title.toLowerCase().includes(q.toLowerCase());
        
        if (aHasInTitle && !bHasInTitle) return -1;
        if (!aHasInTitle && bHasInTitle) return 1;
        
        // Altrimenti ordina per data di creazione (più recente prima)
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        
        return 0;
      });
      
      return res.json({
        results: results.slice(0, 10), // Limita a 10 risultati
        totalCount: results.length
      });
    } catch (error) {
      console.error("Errore nella ricerca globale:", error);
      return res.status(500).json({ message: "Errore durante la ricerca", error });
    }
  }
  
  /**
   * Cerca tra i clienti
   */
  private static async searchClients(searchTerm: string) {
    // Definizione esplicita del tipo
    type ClientResult = {
      id: number;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      createdAt: Date | null;
    };
    
    const clientsResult = await db
      .select({
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone,
        createdAt: clients.createdAt
      })
      .from(clients)
      .where(
        sql`(${clients.firstName} ILIKE ${searchTerm} OR 
             ${clients.lastName} ILIKE ${searchTerm} OR 
             ${clients.email} ILIKE ${searchTerm} OR 
             ${clients.phone} ILIKE ${searchTerm})`
      )
      .orderBy(desc(clients.createdAt))
      .limit(20) as ClientResult[];
    
    return clientsResult.map(client => ({
      id: client.id,
      type: 'cliente' as const,
      title: `${client.firstName} ${client.lastName}`,
      subtitle: client.email || client.phone,
      path: `/clients/${client.id}`,
      createdAt: client.createdAt?.toISOString(),
    }));
  }
  
  /**
   * Cerca tra gli eventi
   */
  private static async searchEvents(searchTerm: string) {
    // Ottieni i dati degli eventi con typing esplicito
    type EventResult = {
      id: number;
      title: string;
      description: string | null;
      eventDate: Date | null;
      createdAt: Date | null;
      status: string | null;
    };

    const eventsResult = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        eventDate: events.eventDate,
        createdAt: events.createdAt,
        status: events.status,
      })
      .from(events)
      .where(
        sql`(${events.title} ILIKE ${searchTerm} OR 
             ${events.description} ILIKE ${searchTerm})`
      )
      .orderBy(desc(events.createdAt))
      .limit(20) as EventResult[];
    
    return eventsResult.map(event => ({
      id: event.id,
      type: 'evento' as const,
      title: event.title,
      subtitle: event.eventDate ? formatDateCompact(event.eventDate) : undefined,
      path: `/events/${event.id}`,
      createdAt: event.createdAt?.toISOString(),
    }));
  }
  
  /**
   * Cerca tra i preventivi
   */
  private static async searchQuotes(searchTerm: string) {
    // Definizione esplicita del tipo
    type QuoteResult = {
      id: number;
      title: string;
      status: string | null;
      createdAt: Date | null;
    };
    
    const quotesResult = await db
      .select({
        id: quotes.id,
        title: quotes.title,
        status: quotes.status,
        createdAt: quotes.createdAt,
      })
      .from(quotes)
      .where(
        sql`(${quotes.title} ILIKE ${searchTerm} OR 
             ${quotes.status} ILIKE ${searchTerm})`
      )
      .orderBy(desc(quotes.createdAt))
      .limit(20) as QuoteResult[];
    
    return quotesResult.map(quote => ({
      id: quote.id,
      type: 'preventivo' as const,
      title: quote.title,
      subtitle: `Stato: ${quote.status || 'N/D'}`,
      path: `/quotes/detail/${quote.id}`,
      createdAt: quote.createdAt?.toISOString(),
    }));
  }
  
  /**
   * Cerca tra i contratti
   */
  private static async searchContracts(searchTerm: string) {
    // Definizione esplicita del tipo
    type ContractResult = {
      id: number;
      title: string;
      status: string | null;
      createdAt: Date | null;
    };
    
    const contractsResult = await db
      .select({
        id: contracts.id,
        title: contracts.title,
        status: contracts.status,
        createdAt: contracts.createdAt,
      })
      .from(contracts)
      .where(
        sql`(${contracts.title} ILIKE ${searchTerm} OR 
             ${contracts.status} ILIKE ${searchTerm})`
      )
      .orderBy(desc(contracts.createdAt))
      .limit(20) as ContractResult[];
    
    return contractsResult.map(contract => ({
      id: contract.id,
      type: 'contratto' as const,
      title: contract.title,
      subtitle: `Stato: ${contract.status || 'N/D'}`,
      path: `/contracts/${contract.id}`,
      createdAt: contract.createdAt?.toISOString(),
    }));
  }
  
  /**
   * Cerca tra le gallerie
   */
  private static async searchGalleries(searchTerm: string) {
    // Definizione esplicita del tipo
    type GalleryResult = {
      id: number;
      name: string;
      slug: string | null;
      createdAt: Date | null;
    };
    
    const galleriesResult = await db
      .select({
        id: galleries.id,
        name: galleries.name,
        slug: galleries.slug,
        createdAt: galleries.createdAt,
      })
      .from(galleries)
      .where(
        sql`(${galleries.name} ILIKE ${searchTerm} OR 
             ${galleries.slug} ILIKE ${searchTerm} OR
             ${galleries.description} ILIKE ${searchTerm})`
      )
      .orderBy(desc(galleries.createdAt))
      .limit(20) as GalleryResult[];
    
    return galleriesResult.map(gallery => ({
      id: gallery.id,
      type: 'galleria' as const,
      title: gallery.name,
      subtitle: gallery.slug || '',
      path: `/galleries/${gallery.id}`,
      createdAt: gallery.createdAt?.toISOString(),
    }));
  }
}