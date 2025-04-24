/**
 * Script di migrazione dei dati dalle tabelle in italiano alle tabelle standardizzate in inglese
 * Questo script è progettato per essere eseguito una tantum per migrare tutti i dati
 */

import { db } from "../db";
import { 
  eventiCollaboratori, 
  pagamentiCollaboratori, 
  montaggi 
} from "@shared/schema";
import { 
  eventCollaborators, 
  collaboratorPayments, 
  collaboratorEditing 
} from "@shared/collaborators-schema";
import { eq, and } from "drizzle-orm";

/**
 * Migra i dati da eventiCollaboratori a eventCollaborators
 */
export async function migrateEventiToEventCollaborators(): Promise<void> {
  try {
    console.log("Inizio migrazione dati da eventiCollaboratori a eventCollaborators");
    
    // Recupera tutti i record dalla tabella italiana
    const records = await db.select().from(eventiCollaboratori);
    console.log(`Trovati ${records.length} record da migrare`);
    
    // Migra ogni record
    for (const record of records) {
      try {
        // Verifica se esiste già nella tabella inglese usando SQL raw
        const { rows: existingRecord } = await db.execute(
          `SELECT id FROM event_collaborators 
           WHERE collaborator_id = $1 AND event_id = $2 
           LIMIT 1`,
          [record.collaboratoreId, record.eventoId]
        );
        
        // Se non esiste, inserisci nella tabella inglese
        if (existingRecord.length === 0) {
          // Utilizziamo SQL raw per inserire i dati senza coinvolgere le definizioni dello schema Drizzle
          await db.execute(
            `INSERT INTO event_collaborators (collaborator_id, event_id, role) 
             VALUES ($1, $2, $3)`,
            [record.collaboratoreId, record.eventoId, record.ruolo]
          );
          console.log(`Migrato evento collaboratore: ${record.collaboratoreId}-${record.eventoId}`);
        } else {
          console.log(`Record già esistente: ${record.collaboratoreId}-${record.eventoId}`);
        }
      } catch (error) {
        console.error(`Errore migrazione record ${record.id}:`, error);
      }
    }
    
    console.log("Migrazione eventi collaboratori completata");
  } catch (error) {
    console.error("Errore durante la migrazione degli eventi collaboratori:", error);
    throw error;
  }
}

/**
 * Migra i dati da pagamentiCollaboratori a collaboratorPayments
 */
export async function migratePagamentiToCollaboratorPayments(): Promise<void> {
  try {
    console.log("Inizio migrazione dati da pagamentiCollaboratori a collaboratorPayments");
    
    // Recupera tutti i record dalla tabella italiana
    const records = await db.select().from(pagamentiCollaboratori);
    console.log(`Trovati ${records.length} record da migrare`);
    
    // Mappa i tipi di pagamento da italiano a inglese
    const mapTipoPagamento = (tipo: string): string => {
      const mapping: Record<string, string> = {
        "acconto": "advance",
        "saldo": "balance",
        "montaggio_acconto": "editing_advance",
        "montaggio_saldo": "editing_balance"
      };
      return mapping[tipo] || tipo; // Ritorna il tipo originale se non c'è mapping
    };
    
    // Mappa i metodi di pagamento da italiano a inglese
    const mapMetodoPagamento = (metodo: string | null): string | null => {
      if (!metodo) return null;
      
      const mapping: Record<string, string> = {
        "bonifico": "bank_transfer",
        "contanti": "cash",
        "altro": "other"
      };
      return mapping[metodo] || metodo; // Ritorna il metodo originale se non c'è mapping
    };
    
    // Migra ogni record
    for (const record of records) {
      try {
        // Verifica se esiste già nella tabella inglese usando SQL raw
        const { rows: existingRecord } = await db.execute(
          `SELECT id FROM collaborator_payments 
           WHERE collaborator_id = $1 AND event_id = $2 AND payment_date = $3
           LIMIT 1`,
          [record.collaboratoreId, record.eventoId, record.dataPagamento]
        );
        
        // Se non esiste, inserisci nella tabella inglese
        if (existingRecord.length === 0) {
          // Utilizziamo SQL raw per evitare errori con campi mancanti nella tabella
          await db.execute(
            `INSERT INTO collaborator_payments (
              collaborator_id, event_id, type, amount, payment_date, 
              payment_method, notes, external_reference, created_at, updated_at
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              record.collaboratoreId, 
              record.eventoId,
              mapTipoPagamento(record.tipo),
              record.importo,
              record.dataPagamento,
              mapMetodoPagamento(record.metodoPagamento),
              record.note || null,
              record.riferimentoEsterno || null,
              record.createdAt,
              record.updatedAt
            ]
          );
          console.log(`Migrato pagamento collaboratore: ${record.id}`);
        } else {
          console.log(`Pagamento già esistente: ${record.id}`);
        }
      } catch (error) {
        console.error(`Errore migrazione pagamento ${record.id}:`, error);
      }
    }
    
    console.log("Migrazione pagamenti collaboratori completata");
  } catch (error) {
    console.error("Errore durante la migrazione dei pagamenti collaboratori:", error);
    throw error;
  }
}

/**
 * Migra i dati da montaggi a collaboratorEditing
 */
export async function migrateMontaggiToCollaboratorEditing(): Promise<void> {
  try {
    console.log("Inizio migrazione dati da montaggi a collaboratorEditing");
    
    // Recupera tutti i record dalla tabella italiana
    const records = await db.select().from(montaggi);
    console.log(`Trovati ${records.length} record da migrare`);
    
    // Mappa gli stati da italiano a inglese
    const mapStato = (stato: string): string => {
      const mapping: Record<string, string> = {
        "da_fare": "to_do",
        "in_corso": "in_progress",
        "completato": "completed"
      };
      return mapping[stato] || stato; // Ritorna lo stato originale se non c'è mapping
    };
    
    // Migra ogni record
    for (const record of records) {
      try {
        // Verifica se esiste già nella tabella inglese
        const existingRecord = await db.select()
          .from(collaboratorEditing)
          .where(
            and(
              eq(collaboratorEditing.collaboratorId, record.collaboratoreId),
              eq(collaboratorEditing.eventId, record.eventoId)
            )
          )
          .limit(1);
        
        // Se non esiste, inserisci nella tabella inglese
        if (existingRecord.length === 0) {
          // Utilizziamo SQL raw per evitare errori con campi mancanti nella tabella
          await db.execute(
            `INSERT INTO collaborator_editing (
              collaborator_id, event_id, advance, balance, first_contact_date,
              priority, expected_delivery_date, status, notes, created_at, updated_at
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              record.collaboratoreId,
              record.eventoId,
              record.acconto,
              record.saldo,
              record.dataPrimoContatto,
              record.priorita,
              record.dataConsegnaPrevista,
              mapStato(record.stato),
              record.note || null,
              record.createdAt,
              record.updatedAt
            ]
          );
          console.log(`Migrato montaggio collaboratore: ${record.id}`);
        } else {
          console.log(`Montaggio già esistente: ${record.id}`);
        }
      } catch (error) {
        console.error(`Errore migrazione montaggio ${record.id}:`, error);
      }
    }
    
    console.log("Migrazione montaggi collaboratori completata");
  } catch (error) {
    console.error("Errore durante la migrazione dei montaggi collaboratori:", error);
    throw error;
  }
}

/**
 * Esegue la migrazione completa di tutti i dati
 */
export async function migrateAllCollaboratoriData(): Promise<void> {
  try {
    console.log("Inizio migrazione completa dei dati dei collaboratori");
    
    // Migra i dati da eventiCollaboratori a eventCollaborators
    await migrateEventiToEventCollaborators();
    
    // Migra i dati da pagamentiCollaboratori a collaboratorPayments
    await migratePagamentiToCollaboratorPayments();
    
    // Migra i dati da montaggi a collaboratorEditing
    await migrateMontaggiToCollaboratorEditing();
    
    console.log("Migrazione completa dei dati dei collaboratori completata con successo");
  } catch (error) {
    console.error("Errore durante la migrazione completa dei dati dei collaboratori:", error);
    throw error;
  }
}