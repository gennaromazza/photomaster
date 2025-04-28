-- Aggiungi la colonna clauses alla tabella quote_modules se non esiste
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'quote_modules' 
                  AND column_name = 'clauses') THEN
        ALTER TABLE quote_modules ADD COLUMN clauses JSONB;
    END IF;
END $$;

-- Aggiorna lo schema del quoteModules
UPDATE information_schema.tables 
SET table_comment = 'The quote_modules table contains fixed and variable modules for quotes with clauses support'
WHERE table_name = 'quote_modules';

-- Aggiungi un indice per migliorare la performance delle query che utilizzano la colonna clauses
CREATE INDEX IF NOT EXISTS idx_quote_modules_clauses ON quote_modules USING GIN (clauses);

-- Output di conferma
SELECT 'Colonna clauses aggiunta alla tabella quote_modules' as messaggio;