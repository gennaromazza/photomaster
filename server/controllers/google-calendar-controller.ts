import { Request, Response } from 'express';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { events } from '@shared/schema';
import {
  getAuthUrl,
  handleAuthCallback,
  syncEventToGoogleCalendar,
  deleteEventFromGoogleCalendar,
  syncAllEventsToGoogleCalendar,
  importEventsFromGoogleCalendar,
  checkGoogleAuth
} from '../google-calendar';

export async function connectGoogleCalendar(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Utente non autenticato' });
    }
    
    const authUrl = getAuthUrl(req.user.id);
    res.json({ authUrl });
  } catch (error) {
    console.error('Errore nella generazione URL di autorizzazione Google:', error);
    res.status(500).json({ message: 'Errore durante la connessione a Google Calendar' });
  }
}

export async function googleAuthCallback(req: Request, res: Response) {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ message: 'Parametri mancanti nella richiesta' });
    }
    
    await handleAuthCallback(code.toString(), state.toString());
    
    // Reindirizza l'utente alla pagina delle impostazioni
    res.redirect('/settings');
  } catch (error) {
    console.error('Errore nel callback di autorizzazione Google:', error);
    res.status(500).json({ message: 'Errore durante l\'autorizzazione con Google' });
  }
}

export async function syncEventToGoogle(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Utente non autenticato' });
    }
    
    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'ID evento non valido' });
    }
    
    const googleEventId = await syncEventToGoogleCalendar(eventId, req.user.id);
    res.json({ success: true, googleEventId });
  } catch (error) {
    console.error('Errore nella sincronizzazione evento con Google Calendar:', error);
    res.status(500).json({ message: 'Errore durante la sincronizzazione con Google Calendar' });
  }
}

export async function deleteEventFromGoogle(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Utente non autenticato' });
    }
    
    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'ID evento non valido' });
    }
    
    const success = await deleteEventFromGoogleCalendar(eventId, req.user.id);
    res.json({ success });
  } catch (error) {
    console.error('Errore nella cancellazione evento da Google Calendar:', error);
    res.status(500).json({ message: 'Errore durante la cancellazione da Google Calendar' });
  }
}

export async function syncAllEvents(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Utente non autenticato' });
    }
    
    const results = await syncAllEventsToGoogleCalendar(req.user.id);
    res.json(results);
  } catch (error) {
    console.error('Errore nella sincronizzazione di tutti gli eventi:', error);
    res.status(500).json({ message: 'Errore durante la sincronizzazione con Google Calendar' });
  }
}

export async function importGoogleEvents(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Utente non autenticato' });
    }
    
    const count = await importEventsFromGoogleCalendar(req.user.id);
    res.json({ success: true, count });
  } catch (error) {
    console.error('Errore nell\'importazione eventi da Google Calendar:', error);
    res.status(500).json({ message: 'Errore durante l\'importazione da Google Calendar' });
  }
}

export async function getGoogleAuthStatus(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Utente non autenticato' });
    }
    
    const isConnected = await checkGoogleAuth(req);
    res.json({ isConnected });
  } catch (error) {
    console.error('Errore nel controllo stato autenticazione Google:', error);
    res.status(500).json({ message: 'Errore durante il controllo dell\'autenticazione Google' });
  }
}

export async function toggleGoogleSync(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Utente non autenticato' });
    }
    
    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'ID evento non valido' });
    }
    
    // Ottieni lo stato attuale dell'evento
    const [event] = await db.select()
      .from(events)
      .where(eq(events.id, eventId));
    
    if (!event) {
      return res.status(404).json({ message: 'Evento non trovato' });
    }
    
    // Toggle della sincronizzazione
    if (event.googleCalendarSynced) {
      // Se l'evento è già sincronizzato, rimuovilo da Google Calendar
      await deleteEventFromGoogleCalendar(eventId, req.user.id);
      res.json({ synced: false });
    } else {
      // Altrimenti, sincronizzalo con Google Calendar
      await syncEventToGoogleCalendar(eventId, req.user.id);
      res.json({ synced: true });
    }
  } catch (error) {
    console.error('Errore nel toggle della sincronizzazione Google:', error);
    res.status(500).json({ message: 'Errore durante la gestione della sincronizzazione Google' });
  }
}