-- Aggiunge tabelle per il tracciamento delle email inviate e per gli abbonamenti utente

-- Tabella per il tracciamento delle email inviate
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'sent',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);

-- Tabella per il tracciamento dell'utilizzo dello spazio di archiviazione
CREATE TABLE IF NOT EXISTS gallery_storage_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  gallery_id INTEGER NOT NULL,
  size_mb DECIMAL(10, 2) NOT NULL,
  upload_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_storage_usage_user_id ON gallery_storage_usage(user_id);

-- Tabella per gli abbonamenti utente
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP,
  payment_provider VARCHAR(50),
  payment_id VARCHAR(255),
  last_payment_date TIMESTAMP,
  next_payment_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON user_subscriptions(status);

-- Aggiunge un record di abbonamento gratuito per tutti gli utenti esistenti
INSERT INTO user_subscriptions (user_id, plan, status)
SELECT id, 'free', 'active' FROM users
WHERE id NOT IN (SELECT user_id FROM user_subscriptions);