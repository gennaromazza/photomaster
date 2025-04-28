-- Aggiungi la colonna scheduled_payment_id alla tabella transactions se non esiste
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'transactions' 
                  AND column_name = 'scheduled_payment_id') THEN
        ALTER TABLE transactions ADD COLUMN scheduled_payment_id INTEGER REFERENCES scheduled_payments(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Output di conferma
SELECT 'Colonna scheduled_payment_id aggiunta alla tabella transactions' as messaggio;