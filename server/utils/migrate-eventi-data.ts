/**
 * Script di migrazione per trasferire i dati dalle tabelle in italiano alle tabelle standardizzate in inglese
 * Supporta la migrazione dei dati relativi a eventi, pagamenti eventi e montaggi eventi
 */

import { db } from "../db";
import { events } from "@shared/schema";
import {
  pagamentiEvento,
  eventiCollaboratori,
  montaggiEvento,
  TipoPagamentoEvento,
  StatoMontaggioEvento
} from "@shared/eventi-schema";
import { eventi } from "./eventi-schema"; // tabella eventi in italiano
import { eq, and, sql } from "drizzle-orm";

/**
 * Converte un record evento dal formato italiano al formato inglese standardizzato
 * @param eventoRecord Record dalla tabella eventi (italiano)
 * @returns Record formattato per la tabella events (inglese)
 */
function convertEventoToEvent(eventoRecord: any) {
  return {
    id: eventoRecord.id,
    title: eventoRecord.titolo,
    description: eventoRecord.descrizione || null,
    date: eventoRecord.data,
    endDate: eventoRecord.dataFine || null,
    location: eventoRecord.luogo || null,
    clientId: eventoRecord.clienteId,
    secondClientId: eventoRecord.secondoClienteId || null,
    type: eventoRecord.tipo || null,
    status: eventoRecord.stato || "confermato",
    notes: eventoRecord.note || null,
    isPublic: eventoRecord.pubblico || false,
    externalId: eventoRecord.idEsterno || null,
    googleCalendarId: eventoRecord.googleCalendarId || null,
    googleCalendarLink: eventoRecord.googleCalendarLink || null,
    syncWithGoogle: eventoRecord.sincronizzaConGoogle || false,
    createdAt: eventoRecord.createdAt || new Date(),
    updatedAt: eventoRecord.updatedAt || new Date()
  };
}

/**
 * Trasferisce tutti i record dalla tabella 'eventi' (italiano) alla tabella 'events' (inglese)
 * Se le tabelle sono già sincronizzate, non fa nulla.
 */
export async function migrateEventiToEvents() {
  console.log("Inizio migrazione eventi da italiano a inglese...");
  
  try {
    // Conta i record in entrambe le tabelle
    const [{ count: eventiCount }] = await db.select({
      count: sql<number>`count(*)`,
    }).from(eventi);
    
    const [{ count: eventsCount }] = await db.select({
      count: sql<number>`count(*)`,
    }).from(events);
    
    console.log(`Conteggio record: eventi (IT): ${eventiCount}, events (EN): ${eventsCount}`);
    
    // Se i conteggi sono uguali, le tabelle potrebbero essere già sincronizzate
    if (eventiCount === eventsCount && eventiCount > 0) {
      console.log("Le tabelle hanno lo stesso numero di record. Verifico gli ID...");
      
      // Verifica alcuni record a caso per confermare che gli ID corrispondono
      const eventiRecords = await db.select().from(eventi).limit(5);
      
      for (const eventoRecord of eventiRecords) {
        const [eventRecord] = await db
          .select()
          .from(events)
          .where(eq(events.id, eventoRecord.id));
        
        if (!eventRecord) {
          console.log(`ID mancante nella tabella events: ${eventoRecord.id}`);
          console.log("Le tabelle non sono sincronizzate. Inizio la migrazione...");
          break;
        }
      }
      
      console.log("Tabelle eventi già sincronizzate. Nessuna migrazione necessaria.");
      return;
    }
    
    // Ottieni tutti i record dalla tabella eventi
    const eventiRecords = await db.select().from(eventi);
    console.log(`Trovati ${eventiRecords.length} record nella tabella eventi`);
    
    // Per ogni record, verifica se esiste già nella tabella events
    for (const eventoRecord of eventiRecords) {
      const [existingEvent] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventoRecord.id));
      
      if (!existingEvent) {
        // Converte e inserisce il record
        const eventData = convertEventoToEvent(eventoRecord);
        
        await db.insert(events).values(eventData);
        console.log(`Migrato evento ID ${eventoRecord.id}: ${eventoRecord.titolo}`);
      } else {
        console.log(`Evento ID ${eventoRecord.id} già presente. Aggiornamento...`);
        
        // Aggiorna il record esistente
        const eventData = convertEventoToEvent(eventoRecord);
        
        await db
          .update(events)
          .set(eventData)
          .where(eq(events.id, eventoRecord.id));
      }
    }
    
    console.log("Migrazione eventi completata con successo!");
    
  } catch (error) {
    console.error("Errore durante la migrazione eventi:", error);
    throw error;
  }
}

/**
 * Sincronizza tutti i dati degli eventi tra le tabelle in italiano e inglese
 * Questo è il punto di ingresso principale per la migrazione completa
 */
export async function syncAllEventData() {
  console.log("Inizio sincronizzazione completa dei dati eventi");
  
  try {
    // 1. Migra i dati principali degli eventi
    await migrateEventiToEvents();
    
    // 2. Sincronizza anche gli altri dati (pagamenti, montaggi, collaboratori)
    // Nota: in questo caso, non è necessario migrare questi dati,
    // perché stiamo usando le stesse tabelle sia per i endpoint italiani che per quelli inglesi
    
    console.log("Sincronizzazione completa dei dati eventi terminata con successo");
    
  } catch (error) {
    console.error("Errore durante la sincronizzazione completa dei dati eventi:", error);
    throw error;
  }
}

/**
 * Esegue la migrazione completa di tutti i dati degli eventi
 * Questo metodo viene esposto per essere chiamato da script di migrazione
 */
export async function runEventMigration() {
  try {
    console.log("------ INIZIO MIGRAZIONE DATI EVENTI ------");
    
    await syncAllEventData();
    
    console.log("------ MIGRAZIONE DATI EVENTI COMPLETATA ------");
    
  } catch (error) {
    console.error("Errore fatale durante la migrazione dei dati eventi:", error);
    process.exit(1);
  }
}

// Se lo script viene eseguito direttamente, avvia la migrazione
if (require.main === module) {
  runEventMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Errore:", err);
      process.exit(1);
    });
}