/**
 * Debug Collaboratori Controller
 * 
 * Controllore per debug delle funzionalità del modulo collaboratori
 * Fornisce endpoint speciali per testare l'integrazione finanziaria
 */
import { Request, Response } from 'express';
import { db } from '../db';
import { eq, and, or, sql } from 'drizzle-orm';
import { 
  events, 
  collaborators, 
  eventCollaborators,
  quotes,
  clients,
  transactions
} from '@shared/schema';

/**
 * Verifica lo stato dell'integrazione finanziaria tra collaboratori e sistema generale
 */
export async function verificaIntegrazioneFinanziaria(req: Request, res: Response) {
  try {
    // 1. Verifica la consistenza tra pagamenti ai collaboratori e transactions totali
    const pagamentiCollaboratori = await db.execute(sql`
      SELECT SUM(amount) as total_pagamenti_collaboratori 
      FROM pagamenti_evento
    `);
    
    const transazioniUscita = await db.execute(sql`
      SELECT SUM(amount) as total_uscite
      FROM transactions 
      WHERE type = 'expense'
    `);
    
    // 2. Controllo relazioni tra eventi e collaboratori
    const relazioniEventiCollaboratori = await db.execute(sql`
      SELECT 
        e.id as event_id, 
        e.title as event_title,
        COUNT(ec.collaborator_id) as num_collaboratori,
        COUNT(pe.id) as num_pagamenti
      FROM events e
      LEFT JOIN event_collaborators ec ON e.id = ec.event_id
      LEFT JOIN pagamenti_evento pe ON e.id = pe.event_id
      GROUP BY e.id, e.title
      ORDER BY e.date DESC
      LIMIT 10
    `);

    // 3. Controlla consistenza dei saldi collaboratori
    const saldoCollaboratori = await db.execute(sql`
      SELECT 
        c.id as collaborator_id,
        c.first_name, 
        c.last_name,
        SUM(pe.amount) as pagamenti_totali
      FROM collaborators c
      LEFT JOIN eventi_collaboratori ec ON c.id = ec.collaborator_id
      LEFT JOIN pagamenti_evento pe ON ec.event_id = pe.event_id AND ec.collaborator_id = pe.collaborator_id
      GROUP BY c.id, c.first_name, c.last_name
      ORDER BY pagamenti_totali DESC
      LIMIT 10
    `);

    res.json({
      status: 'success',
      finanziario: {
        pagamentiCollaboratori: pagamentiCollaboratori[0] || { total_pagamenti_collaboratori: 0 },
        transazioniUscita: transazioniUscita[0] || { total_uscite: 0 },
        consistenza: pagamentiCollaboratori[0]?.total_pagamenti_collaboratori === transazioniUscita[0]?.total_uscite
      },
      relazioni: {
        eventiCollaboratori: relazioniEventiCollaboratori
      },
      saldi: {
        collaboratori: saldoCollaboratori
      }
    });
  } catch (error) {
    console.error('Errore nella verifica integrazione finanziaria:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Errore durante la verifica dell\'integrazione finanziaria',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Verifica le statistiche sui pagamenti ai collaboratori
 */
export async function verificaStatistichePagamenti(req: Request, res: Response) {
  try {
    // Statistiche mensili
    const statisticheMensili = await db.execute(sql`
      SELECT 
        EXTRACT(YEAR FROM pe.data) as anno,
        EXTRACT(MONTH FROM pe.data) as mese,
        SUM(pe.amount) as totale,
        COUNT(pe.id) as num_pagamenti
      FROM pagamenti_evento pe
      GROUP BY anno, mese
      ORDER BY anno DESC, mese DESC
      LIMIT 12
    `);

    // Statistiche per collaboratore
    const statisticheCollaboratori = await db.execute(sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        COUNT(pe.id) as num_pagamenti,
        SUM(pe.amount) as totale_pagamenti,
        AVG(pe.amount) as media_pagamenti
      FROM collaborators c
      JOIN pagamenti_evento pe ON c.id = pe.collaborator_id
      GROUP BY c.id, c.first_name, c.last_name
      ORDER BY totale_pagamenti DESC
      LIMIT 10
    `);

    // Statistiche per evento
    const statisticheEventi = await db.execute(sql`
      SELECT 
        e.id,
        e.title,
        COUNT(pe.id) as num_pagamenti,
        SUM(pe.amount) as totale_pagamenti
      FROM events e
      JOIN pagamenti_evento pe ON e.id = pe.event_id
      GROUP BY e.id, e.title
      ORDER BY totale_pagamenti DESC
      LIMIT 10
    `);
    
    res.json({
      status: 'success',
      statistiche: {
        mensili: statisticheMensili,
        collaboratori: statisticheCollaboratori,
        eventi: statisticheEventi
      }
    });

  } catch (error) {
    console.error('Errore nel recupero statistiche pagamenti:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Errore durante il recupero delle statistiche sui pagamenti',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Ottiene la lista di tutti i montaggi con relativi collaboratori ed eventi
 */
export async function getMontaggiConRelazioni(req: Request, res: Response) {
  try {
    const montaggi = await db.execute(sql`
      SELECT 
        me.id as montaggio_id,
        me.event_id,
        me.collaborator_id,
        me.tipo,
        me.stato,
        me.priorita,
        me.scadenza,
        me.data_consegna,
        me.created_at,
        e.title as event_title,
        c.first_name,
        c.last_name
      FROM montaggi_evento me
      JOIN events e ON me.event_id = e.id
      JOIN collaborators c ON me.collaborator_id = c.id
      ORDER BY me.created_at DESC
      LIMIT 50
    `);

    const conteggioStati = await db.execute(sql`
      SELECT 
        stato,
        COUNT(*) as conteggio
      FROM montaggi_evento
      GROUP BY stato
    `);

    const montaggiPerCollaboratore = await db.execute(sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        COUNT(me.id) as num_montaggi,
        COUNT(CASE WHEN me.stato = 'completato' THEN 1 END) as completati,
        COUNT(CASE WHEN me.stato = 'in_corso' THEN 1 END) as in_corso,
        COUNT(CASE WHEN me.stato = 'da_iniziare' THEN 1 END) as da_iniziare
      FROM collaborators c
      LEFT JOIN montaggi_evento me ON c.id = me.collaborator_id
      GROUP BY c.id, c.first_name, c.last_name
      ORDER BY num_montaggi DESC
    `);

    res.json({
      status: 'success',
      dati: {
        montaggi,
        statistiche: {
          conteggioStati,
          perCollaboratore: montaggiPerCollaboratore
        }
      }
    });

  } catch (error) {
    console.error('Errore nel recupero montaggi con relazioni:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Errore durante il recupero dei montaggi con relazioni',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Verifica l'interconnessione tra preventivi e pagamenti ai collaboratori
 */
export async function verificaIntegrazionePreventivi(req: Request, res: Response) {
  try {
    // Preventivi con eventi collegati
    const quotesWithEvents = await db.select({
      quoteId: quotes.id,
      quoteTitle: quotes.title,
      eventId: events.id,
      eventTitle: events.title,
      clientFirstName: clients.firstName,
      clientLastName: clients.lastName,
    })
    .from(quotes)
    .leftJoin(events, eq(quotes.id, events.quoteId))
    .leftJoin(clients, eq(quotes.clientId, clients.id))
    .limit(20);

    // Eventi con collaboratori e pagamenti
    const eventsWithCollaboratorsPayments = await db.execute(sql`
      SELECT 
        e.id as event_id,
        e.title as event_title,
        q.id as quote_id,
        q.title as quote_title,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        COUNT(DISTINCT ec.collaborator_id) as num_collaboratori,
        SUM(pe.amount) as totale_pagamenti_collaboratori
      FROM events e
      LEFT JOIN quotes q ON e.quote_id = q.id
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN event_collaborators ec ON e.id = ec.event_id
      LEFT JOIN pagamenti_evento pe ON e.id = pe.event_id
      GROUP BY e.id, e.title, q.id, q.title, c.first_name, c.last_name
      ORDER BY e.date DESC
      LIMIT 20
    `);

    res.json({
      status: 'success',
      dati: {
        quotesWithEvents,
        eventsWithCollaboratorsPayments
      }
    });

  } catch (error) {
    console.error('Errore nella verifica integrazione preventivi:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Errore durante la verifica dell\'integrazione con i preventivi',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}