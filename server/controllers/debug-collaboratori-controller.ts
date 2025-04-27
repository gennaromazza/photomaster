/**
 * Debug Collaboratori Controller
 * 
 * Controllore per debug delle funzionalità del modulo collaboratori
 * Fornisce endpoint speciali per testare l'integrazione finanziaria
 */

import { Request, Response } from 'express';
import { db } from '../db';
import { 
  collaborators, 
  events, 
  eventCollaborators,
  transactions,
  quotes
} from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * Verifica lo stato dell'integrazione finanziaria tra collaboratori e sistema generale
 */
export async function verificaIntegrazioneFinanziaria(req: Request, res: Response) {
  try {
    const results = {
      statusCheck: true,
      errors: [],
      warnings: [],
      suggerimenti: [],
      report: {
        totals: {
          collaborators: 0,
          events: 0,
          eventCollaborators: 0,
          transactions: 0,
          pagamentiCollaboratori: 0,
        },
        inconsistencies: [],
        missingTransactions: 0,
        orphanedRecords: 0
      }
    };

    // 1. Conta elementi per statistiche generali
    const collaboratoriCount = await db.select({ count: db.fn.count() }).from(collaborators);
    const eventiCount = await db.select({ count: db.fn.count() }).from(events);
    const assegnazioniCount = await db.select({ count: db.fn.count() }).from(eventCollaborators);
    const transakioniCount = await db.select({ count: db.fn.count() }).from(transactions);

    results.report.totals.collaborators = Number(collaboratoriCount[0].count || 0);
    results.report.totals.events = Number(eventiCount[0].count || 0);
    results.report.totals.eventCollaborators = Number(assegnazioniCount[0].count || 0);
    results.report.totals.transactions = Number(transakioniCount[0].count || 0);

    // 2. Verifica assegnazioni senza eventi validi
    const assegnazioniInvalide = await db
      .select({
        assignment: eventCollaborators
      })
      .from(eventCollaborators)
      .leftJoin(events, eq(eventCollaborators.eventId, events.id))
      .where(eq(events.id, null))
      .limit(50);

    if (assegnazioniInvalide.length > 0) {
      results.errors.push('Trovate assegnazioni collaboratori ad eventi inesistenti');
      results.report.inconsistencies.push({
        type: 'invalid_assignments',
        count: assegnazioniInvalide.length,
        examples: assegnazioniInvalide.slice(0, 5).map(item => item.assignment)
      });
      results.statusCheck = false;
      results.report.orphanedRecords += assegnazioniInvalide.length;
    }

    // 3. Verifica collaboratori eliminati ma ancora assegnati
    const assegnazioniCollegateAColleghi = await db
      .select({
        assignment: eventCollaborators
      })
      .from(eventCollaborators)
      .leftJoin(collaborators, eq(eventCollaborators.collaboratorId, collaborators.id))
      .where(eq(collaborators.id, null))
      .limit(50);

    if (assegnazioniCollegateAColleghi.length > 0) {
      results.errors.push('Trovate assegnazioni a collaboratori eliminati');
      results.report.inconsistencies.push({
        type: 'deleted_collaborator_assignments',
        count: assegnazioniCollegateAColleghi.length,
        examples: assegnazioniCollegateAColleghi.slice(0, 5).map(item => item.assignment)
      });
      results.statusCheck = false;
      results.report.orphanedRecords += assegnazioniCollegateAColleghi.length;
    }

    // 4. Verifica transazioni collegate a collaboratori
    // Questo dipende da come è implementato il sistema finanziario
    // Esempio ipotetico basato su un campo di riferimento nelle transazioni
    const transakioniCollaboratori = await db
      .select({
        count: db.fn.count()
      })
      .from(transactions)
      .where(eq(transactions.type, 'collaborator_payment'));

    results.report.totals.pagamentiCollaboratori = Number(transakioniCollaboratori[0].count || 0);

    // 5. Suggerimenti migliorativi se non ci sono errori
    if (results.errors.length === 0) {
      results.suggerimenti.push(
        'Il sistema di integrazioni finanziarie sembra funzionare correttamente.',
        'Per migliorare ulteriormente, considera di aggiungere riconciliazione automatica tra pagamenti e montaggi.'
      );
    } else {
      results.suggerimenti.push(
        'Risolvi le inconsistenze prima di eseguire altri test finanziari.',
        'Considera di implementare vincoli referenziali a livello di database per prevenire record orfani.'
      );
    }

    return res.status(200).json(results);
  } catch (error: any) {
    console.error('Errore nella verifica finanziaria collaboratori:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Errore interno durante la verifica finanziaria'
    });
  }
}

/**
 * Verifica le statistiche sui pagamenti ai collaboratori
 */
export async function verificaStatistichePagamenti(req: Request, res: Response) {
  try {
    const stats = {
      pagamentiTotali: 0,
      pagamentiPerTipo: {},
      pagamentiPerMese: {},
      mediaImporto: 0,
      collaboratoriTopPagamenti: [],
      collaboratoriSenzaPagamenti: []
    };

    // Implementa le query per recuperare le statistiche necessarie
    // Questa è una versione semplificata che andrebbe adattata alla tua struttura dati

    return res.status(200).json(stats);
  } catch (error: any) {
    console.error('Errore nelle statistiche pagamenti:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Errore interno durante l\'analisi delle statistiche pagamenti'
    });
  }
}

/**
 * Ottiene la lista di tutti i montaggi con relativi collaboratori ed eventi
 */
export async function getMontaggiConRelazioni(req: Request, res: Response) {
  try {
    // Questa query dipende dalla struttura effettiva del tuo schema
    // Esempio rappresentativo che andrà adattato
    const result = await db.query.events.findMany({
      with: {
        eventCollaborators: {
          with: {
            collaborator: true
          }
        }
      }
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Errore nel recupero montaggi con relazioni:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Errore interno durante il recupero dei montaggi'
    });
  }
}

/**
 * Verifica l'interconnessione tra preventivi e pagamenti ai collaboratori
 */
export async function verificaIntegrazionePreventivi(req: Request, res: Response) {
  try {
    const result = {
      associazioni: [],
      totalePreventivi: 0,
      totalePreventivConAssociazioni: 0,
      errori: []
    };

    // Recupera tutti i preventivi con eventi collegati
    const preventivi = await db.query.quotes.findMany({
      columns: {
        id: true, 
        title: true
      },
      with: {
        event: {
          columns: {
            id: true,
            title: true
          }
        }
      }
    });

    result.totalePreventivi = preventivi.length;

    // Conta quanti preventivi hanno effettivamente eventi associati
    result.totalePreventivConAssociazioni = preventivi.filter(q => q.event).length;

    if (result.totalePreventivi > 0 && result.totalePreventivConAssociazioni === 0) {
      result.errori.push('Nessun preventivo ha eventi associati, verificare il sistema di conversione preventivi->eventi');
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Errore nella verifica integrazione preventivi:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Errore interno durante la verifica dell\'integrazione preventivi'
    });
  }
}