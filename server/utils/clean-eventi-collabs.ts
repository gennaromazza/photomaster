import { db } from "../db";
import { events, eventiCollaboratori, eventCollaborators } from "@shared/schema";
import { eq, and, not, inArray } from "drizzle-orm";

/**
 * Verifica e rimuove i riferimenti a eventi eliminati nelle assegnazioni dei collaboratori
 * Questo risolve il problema degli eventi cancellati che appaiono ancora nelle assegnazioni
 */
export async function cleanupStaleEventReferences() {
  try {
    console.log("Avvio pulizia riferimenti a eventi eliminati nelle assegnazioni collaboratori...");
    
    // 1. Recupera tutti gli ID eventi esistenti
    const eventiEsistenti = await db
      .select({
        id: events.id
      })
      .from(events);
    
    const eventiIds = eventiEsistenti.map(e => e.id);
    
    if (eventiIds.length === 0) {
      console.log("Nessun evento trovato nel database, skip pulizia");
      return {
        success: true,
        eventiTotali: 0,
        rimossiEventiIT: 0,
        rimossiEventiEN: 0
      };
    }
    
    console.log(`Trovati ${eventiIds.length} eventi validi nel database`);
    
    // 2. Rimuovi le assegnazioni che fanno riferimento a eventi non esistenti dalla tabella italiana
    const resultIT = await db
      .delete(eventiCollaboratori)
      .where(not(inArray(eventiCollaboratori.eventoId, eventiIds)))
      .returning();
    
    // 3. Rimuovi le assegnazioni che fanno riferimento a eventi non esistenti dalla tabella inglese
    const resultEN = await db
      .delete(eventCollaborators)
      .where(not(inArray(eventCollaborators.eventId, eventiIds)))
      .returning();
    
    console.log(`Pulizia completata: rimossi ${resultIT.length} riferimenti dalla tabella italiana e ${resultEN.length} dalla tabella inglese`);
    
    return {
      success: true,
      eventiTotali: eventiIds.length,
      rimossiEventiIT: resultIT.length,
      rimossiEventiEN: resultEN.length
    };
  } catch (error) {
    console.error("Errore durante la pulizia dei riferimenti a eventi eliminati:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verifica la validità di un evento prima dell'assegnazione a un collaboratore
 * @param eventoId ID dell'evento da verificare
 * @returns true se l'evento esiste, false altrimenti
 */
export async function verificaEsistenzaEvento(eventoId: number): Promise<boolean> {
  try {
    const [evento] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventoId))
      .limit(1);
    
    return !!evento;
  } catch (error) {
    console.error(`Errore verifica esistenza evento ${eventoId}:`, error);
    return false;
  }
}