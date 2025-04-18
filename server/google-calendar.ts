import { google, calendar_v3 } from 'googleapis';
import { db } from './db';
import { and, eq } from 'drizzle-orm';
import { events, users } from '@shared/schema';
import { Request } from 'express';

// Configura l'OAuth2 per Google
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/google/callback`
);

// Crea il client di Google Calendar
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Ambiti di autorizzazione richiesti
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Genera l'URL di autorizzazione per Google
 */
export function getAuthUrl(userId: number): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: userId.toString(), // Usiamo lo state per tenere traccia dell'ID utente
    prompt: 'consent', // Forza il prompt di consenso per ottenere il refresh_token
  });
}

/**
 * Gestisce il callback di autorizzazione di Google
 */
export async function handleAuthCallback(code: string, state: string): Promise<any> {
  const userId = parseInt(state);
  
  // Scambia il codice di autorizzazione per i token
  const { tokens } = await oauth2Client.getToken(code);
  
  // Salva i token nel database
  if (tokens) {
    await db.update(users)
      .set({ googleTokens: JSON.stringify(tokens) })
      .where(eq(users.id, userId));
    
    return tokens;
  }
  
  throw new Error('Nessun token ricevuto');
}

/**
 * Verifica e aggiorna i token per un utente specifico
 */
async function getAuthClientForUser(userId: number): Promise<any> {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, userId));
  
  if (!user || !user.googleTokens) {
    throw new Error('Utente non autenticato con Google');
  }
  
  const tokens = JSON.parse(user.googleTokens);
  oauth2Client.setCredentials(tokens);
  
  // Controlla se il token è scaduto e deve essere aggiornato
  if (tokens.expiry_date && tokens.expiry_date < Date.now() && tokens.refresh_token) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await db.update(users)
        .set({ googleTokens: JSON.stringify(credentials) })
        .where(eq(users.id, userId));
      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error('Errore durante aggiornamento del token:', error);
      throw new Error('Impossibile aggiornare il token Google');
    }
  }
  
  return oauth2Client;
}

/**
 * Verifica se l'utente della richiesta è autenticato con Google
 */
export async function checkGoogleAuth(req: Request): Promise<boolean> {
  if (!req.user?.id) return false;
  
  try {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, req.user.id));
    
    return !!user && !!user.googleTokens;
  } catch (error) {
    console.error('Errore durante la verifica dell\'autenticazione Google:', error);
    return false;
  }
}

/**
 * Sincronizza un evento con Google Calendar
 */
export async function syncEventToGoogleCalendar(eventId: number, userId: number): Promise<string> {
  try {
    // Ottieni l'autenticazione per l'utente
    await getAuthClientForUser(userId);
    
    // Ottieni i dettagli dell'evento dal database
    const [event] = await db.select()
      .from(events)
      .where(eq(events.id, eventId));
    
    if (!event) {
      throw new Error('Evento non trovato');
    }
    
    // Prepara i dati dell'evento per Google Calendar
    const calendarEvent: calendar_v3.Schema$Event = {
      summary: event.title,
      description: event.description || '',
      location: event.location || '',
      start: {
        dateTime: event.date.toISOString(),
        timeZone: 'Europe/Rome',
      },
      end: {
        dateTime: event.endDate ? event.endDate.toISOString() : 
                  new Date(event.date.getTime() + (event.duration || 60) * 60000).toISOString(),
        timeZone: 'Europe/Rome',
      },
    };
    
    // Se l'evento non ha già un ID Google Calendar, creane uno nuovo
    if (!event.googleCalendarEventId) {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: calendarEvent,
      });
      
      // Salva l'ID dell'evento Google Calendar nel database
      await db.update(events)
        .set({ 
          googleCalendarEventId: response.data.id,
          googleCalendarSynced: true
        })
        .where(eq(events.id, eventId));
      
      return response.data.id || '';
    } else {
      // Aggiorna l'evento esistente su Google Calendar
      await calendar.events.update({
        calendarId: 'primary',
        eventId: event.googleCalendarEventId,
        requestBody: calendarEvent,
      });
      
      // Aggiorna lo stato di sincronizzazione
      await db.update(events)
        .set({ googleCalendarSynced: true })
        .where(eq(events.id, eventId));
      
      return event.googleCalendarEventId;
    }
  } catch (error) {
    console.error('Errore durante la sincronizzazione con Google Calendar:', error);
    throw error;
  }
}

/**
 * Elimina un evento da Google Calendar
 */
export async function deleteEventFromGoogleCalendar(eventId: number, userId: number): Promise<boolean> {
  try {
    // Ottieni l'autenticazione per l'utente
    await getAuthClientForUser(userId);
    
    // Ottieni i dettagli dell'evento dal database
    const [event] = await db.select()
      .from(events)
      .where(eq(events.id, eventId));
    
    if (!event || !event.googleCalendarEventId) {
      return false; // L'evento non esiste o non è sincronizzato con Google Calendar
    }
    
    // Elimina l'evento da Google Calendar
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: event.googleCalendarEventId,
    });
    
    // Aggiorna il record nel database
    await db.update(events)
      .set({ 
        googleCalendarEventId: null,
        googleCalendarSynced: false
      })
      .where(eq(events.id, eventId));
    
    return true;
  } catch (error) {
    console.error('Errore durante la cancellazione dell\'evento da Google Calendar:', error);
    return false;
  }
}

/**
 * Sincronizza tutti gli eventi dell'utente con Google Calendar
 */
export async function syncAllEventsToGoogleCalendar(userId: number): Promise<{ success: number; failed: number }> {
  try {
    const results = { success: 0, failed: 0 };
    
    // Ottieni tutti gli eventi dal database
    const allEvents = await db.select()
      .from(events);
    
    for (const event of allEvents) {
      try {
        await syncEventToGoogleCalendar(event.id, userId);
        results.success++;
      } catch (error) {
        console.error(`Errore nella sincronizzazione dell'evento ${event.id}:`, error);
        results.failed++;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Errore durante la sincronizzazione di tutti gli eventi:', error);
    throw error;
  }
}

/**
 * Importa eventi da Google Calendar
 */
export async function importEventsFromGoogleCalendar(userId: number): Promise<number> {
  try {
    // Ottieni l'autenticazione per l'utente
    await getAuthClientForUser(userId);
    
    // Ottieni gli eventi da Google Calendar (limitato agli eventi futuri)
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    let importedCount = 0;
    
    if (response.data.items && response.data.items.length > 0) {
      for (const googleEvent of response.data.items) {
        if (!googleEvent.id) continue;
        
        // Controlla se l'evento è già presente nel database
        const [existingEvent] = await db.select()
          .from(events)
          .where(eq(events.googleCalendarEventId, googleEvent.id));
        
        if (existingEvent) continue; // Evento già importato, salta
        
        // Prepara i dati dell'evento
        const startDate = googleEvent.start?.dateTime ? 
          new Date(googleEvent.start.dateTime) : 
          (googleEvent.start?.date ? new Date(googleEvent.start.date) : new Date());
        
        const endDate = googleEvent.end?.dateTime ? 
          new Date(googleEvent.end.dateTime) : 
          (googleEvent.end?.date ? new Date(googleEvent.end.date) : undefined);
        
        // Calcola la durata in minuti
        const duration = endDate ? 
          Math.round((endDate.getTime() - startDate.getTime()) / 60000) : 
          60; // Durata predefinita: 1 ora
        
        // Inserisci il nuovo evento nel database
        await db.insert(events)
          .values({
            title: googleEvent.summary || 'Evento Google Calendar',
            description: googleEvent.description || '',
            location: googleEvent.location || '',
            date: startDate,
            endDate: endDate,
            duration: duration,
            eventType: 'other', // Tipo generico per eventi importati
            clientId: 1, // Utente default o placeholder (deve esistere nel database)
            status: 'upcoming',
            googleCalendarEventId: googleEvent.id,
            googleCalendarSynced: true,
          });
        
        importedCount++;
      }
    }
    
    return importedCount;
  } catch (error) {
    console.error('Errore durante l\'importazione degli eventi da Google Calendar:', error);
    throw error;
  }
}