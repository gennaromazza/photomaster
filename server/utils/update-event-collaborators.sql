-- Script per aggiungere le colonne mancanti alla tabella event_collaborators

-- Aggiungi la colonna assigned_at se non esiste
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='event_collaborators' AND column_name='assigned_at') THEN
        ALTER TABLE event_collaborators ADD COLUMN assigned_at TIMESTAMP DEFAULT NOW() NOT NULL;
    END IF;
END $$;

-- Aggiungi la colonna notes se non esiste
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='event_collaborators' AND column_name='notes') THEN
        ALTER TABLE event_collaborators ADD COLUMN notes TEXT;
    END IF;
END $$;