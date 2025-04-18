-- Migrazione per aggiungere i campi di Google Calendar alla tabella events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_synced BOOLEAN DEFAULT FALSE;