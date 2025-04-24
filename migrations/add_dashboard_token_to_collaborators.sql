-- Aggiunge il campo dashboard_token alla tabella collaborators
ALTER TABLE collaborators
ADD COLUMN dashboard_token TEXT;