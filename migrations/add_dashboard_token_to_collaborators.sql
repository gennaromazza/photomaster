-- Aggiungi il campo dashboard_token alla tabella collaborators
ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS dashboard_token TEXT;