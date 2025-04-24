import { db } from "../db";
import { eventiCollaboratori } from "@shared/eventi-schema";
import { eventCollaborators, events, collaborators } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Utility per sincronizzare le tabelle eventiCollaboratori e eventCollaborators
 * Mantiene la coerenza dei dati tra le due tabelle (italiana e inglese)
 */

/**
 * Sincronizza un'assegnazione collaboratore-evento da eventCollaborators a eventiCollaboratori
 * @param collaboratorId - ID del collaboratore
 * @param eventId - ID dell'evento
 * @param role - Ruolo del collaboratore (opzionale)
 */
export async function syncFromEventCollaboratorsToEventiCollaboratori(
  collaboratorId: number,
  eventId: number,
  role: string = "fotografo" // Ruolo predefinito se non specificato
): Promise<void> {
  try {
    console.log(`Sincronizzazione da eventCollaborators a eventiCollaboratori: ${collaboratorId}-${eventId}`);
    
    // Verifica se l'assegnazione esiste già in eventiCollaboratori
    const esisteInEventiCollaboratori = await db.select()
      .from(eventiCollaboratori)
      .where(
        and(
          eq(eventiCollaboratori.collaboratoreId, collaboratorId),
          eq(eventiCollaboratori.eventoId, eventId)
        )
      )
      .limit(1);
    
    // Se non esiste, la aggiungiamo
    if (esisteInEventiCollaboratori.length === 0) {
      console.log(`Creazione nuovo record in eventiCollaboratori per ${collaboratorId}-${eventId}`);
      await db.insert(eventiCollaboratori)
        .values({
          collaboratoreId: collaboratorId,
          eventoId: eventId,
          ruolo: role,
          dataAssegnazione: new Date(),
          note: "Sincronizzato automaticamente"
        })
        .onConflictDoNothing();
    }
  } catch (error) {
    console.error("Errore durante la sincronizzazione da eventCollaborators a eventiCollaboratori:", error);
  }
}

/**
 * Sincronizza un'assegnazione collaboratore-evento da eventiCollaboratori a eventCollaborators
 * @param collaboratoreId - ID del collaboratore
 * @param eventoId - ID dell'evento
 * @param ruolo - Ruolo del collaboratore (opzionale)
 */
export async function syncFromEventiCollaboratoriToEventCollaborators(
  collaboratoreId: number,
  eventoId: number,
  ruolo: string = "fotografo" // Ruolo predefinito se non specificato
): Promise<void> {
  try {
    console.log(`Sincronizzazione da eventiCollaboratori a eventCollaborators: ${collaboratoreId}-${eventoId}`);
    
    // Verifica se l'assegnazione esiste già in eventCollaborators
    const esisteInEventCollaborators = await db.select()
      .from(eventCollaborators)
      .where(
        and(
          eq(eventCollaborators.collaboratorId, collaboratoreId),
          eq(eventCollaborators.eventId, eventoId)
        )
      )
      .limit(1);
    
    // Se non esiste, la aggiungiamo
    if (esisteInEventCollaborators.length === 0) {
      console.log(`Creazione nuovo record in eventCollaborators per ${collaboratoreId}-${eventoId}`);
      await db.insert(eventCollaborators)
        .values({
          collaboratorId: collaboratoreId,
          eventId: eventoId,
          role: ruolo
        })
        .onConflictDoNothing();
    }
  } catch (error) {
    console.error("Errore durante la sincronizzazione da eventiCollaboratori a eventCollaborators:", error);
  }
}

/**
 * Funzione di sincronizzazione bidirezionale che mantiene entrambe le tabelle
 * aggiornate con gli stessi dati.
 * @param collaboratorId - ID del collaboratore
 * @param eventId - ID dell'evento
 * @param role - Ruolo del collaboratore
 */
export async function syncCollaboratorAssignment(
  collaboratorId: number,
  eventId: number,
  role: string = "fotografo"
): Promise<void> {
  await Promise.all([
    syncFromEventCollaboratorsToEventiCollaboratori(collaboratorId, eventId, role),
    syncFromEventiCollaboratoriToEventCollaborators(collaboratorId, eventId, role)
  ]);
}

/**
 * Verifica e sincronizza tutte le assegnazioni collaboratore-evento
 * in entrambe le tabelle
 */
export async function syncAllCollaboratorAssignments(): Promise<void> {
  try {
    console.log("Inizio sincronizzazione completa delle assegnazioni collaboratore-evento");
    
    // Ottieni tutti i record da eventCollaborators
    const eventCollabsRecords = await db.select().from(eventCollaborators);
    
    // Ottieni tutti i record da eventiCollaboratori
    const eventiCollabsRecords = await db.select().from(eventiCollaboratori);
    
    // Crea un set di assegnazioni da eventCollaborators per ricerca veloce
    const eventCollabsSet = new Set(
      eventCollabsRecords.map(record => `${record.collaboratorId}-${record.eventId}`)
    );
    
    // Crea un set di assegnazioni da eventiCollaboratori per ricerca veloce
    const eventiCollabsSet = new Set(
      eventiCollabsRecords.map(record => `${record.collaboratoreId}-${record.eventoId}`)
    );
    
    // Sincronizza da eventCollaborators a eventiCollaboratori
    for (const record of eventCollabsRecords) {
      const key = `${record.collaboratorId}-${record.eventId}`;
      if (!eventiCollabsSet.has(key)) {
        await syncFromEventCollaboratorsToEventiCollaboratori(
          record.collaboratorId,
          record.eventId,
          record.role
        );
      }
    }
    
    // Sincronizza da eventiCollaboratori a eventCollaborators
    for (const record of eventiCollabsRecords) {
      const key = `${record.collaboratoreId}-${record.eventoId}`;
      if (!eventCollabsSet.has(key)) {
        await syncFromEventiCollaboratoriToEventCollaborators(
          record.collaboratoreId,
          record.eventoId,
          record.ruolo
        );
      }
    }
    
    console.log("Sincronizzazione completa terminata con successo");
  } catch (error) {
    console.error("Errore durante la sincronizzazione completa:", error);
  }
}