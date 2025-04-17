-- Aggiungi i campi min_select_count e max_select_count alla tabella quote_modules
ALTER TABLE quote_modules
ADD COLUMN IF NOT EXISTS min_select_count INTEGER,
ADD COLUMN IF NOT EXISTS max_select_count INTEGER;