
-- Creazione della tabella transazioni
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL, -- income, expense
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  category TEXT,
  attachment_path TEXT,
  notification_sent BOOLEAN DEFAULT FALSE,
  scheduled_payment_id INTEGER REFERENCES scheduled_payments(id) ON DELETE SET NULL
);

-- Creazione della tabella pagamenti programmati
CREATE TABLE IF NOT EXISTS scheduled_payments (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  notes TEXT,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  reminder_sent BOOLEAN DEFAULT FALSE
);

-- Indici per migliorare le prestazioni
CREATE INDEX IF NOT EXISTS transactions_quote_id_idx ON transactions(quote_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(date);
CREATE INDEX IF NOT EXISTS transactions_type_idx ON transactions(type);
CREATE INDEX IF NOT EXISTS scheduled_payments_quote_id_idx ON scheduled_payments(quote_id);
CREATE INDEX IF NOT EXISTS scheduled_payments_due_date_idx ON scheduled_payments(due_date);
CREATE INDEX IF NOT EXISTS scheduled_payments_transaction_id_idx ON scheduled_payments(transaction_id);

-- Aggiorna quote in modo che quando un preventivo è firmato, non abbia scadenza di condivisione
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS remove_expiry_when_signed BOOLEAN DEFAULT TRUE;
