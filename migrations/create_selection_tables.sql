-- Crea le tabelle per il sistema di selezione foto

-- Impostazioni di selezione per galleria
CREATE TABLE IF NOT EXISTS gallery_selection_settings (
  id SERIAL PRIMARY KEY,
  gallery_id INTEGER NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  max_selections INTEGER DEFAULT 0,
  allow_comments BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMP,
  custom_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Sessioni di selezione
CREATE TABLE IF NOT EXISTS selection_sessions (
  id SERIAL PRIMARY KEY,
  gallery_id INTEGER NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  session_key VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  notes TEXT
);

-- Selezioni di foto
CREATE TABLE IF NOT EXISTS photo_selections (
  id SERIAL PRIMARY KEY,
  photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  session_id INTEGER NOT NULL REFERENCES selection_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Commenti sulle foto
CREATE TABLE IF NOT EXISTS photo_comments (
  id SERIAL PRIMARY KEY,
  photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  session_id INTEGER NOT NULL REFERENCES selection_sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  client_name VARCHAR(255),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);