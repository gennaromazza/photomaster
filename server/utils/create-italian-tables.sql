-- Script per creare le tabelle in italiano necessarie per la migrazione
-- Questo script crea solo le tabelle essenziali per far funzionare la migrazione

-- Tabella eventi
CREATE TABLE IF NOT EXISTS eventi (
  id SERIAL PRIMARY KEY,
  titolo TEXT NOT NULL,
  descrizione TEXT,
  data TIMESTAMP NOT NULL,
  data_fine TIMESTAMP,
  luogo TEXT,
  cliente_id INTEGER NOT NULL,
  secondo_cliente_id INTEGER,
  tipo TEXT,
  stato TEXT DEFAULT 'confermato',
  note TEXT,
  pubblico BOOLEAN DEFAULT FALSE,
  id_esterno TEXT,
  google_calendar_id TEXT,
  google_calendar_link TEXT,
  sincronizza_con_google BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabella eventi_collaboratori
CREATE TABLE IF NOT EXISTS eventi_collaboratori (
  id SERIAL PRIMARY KEY,
  collaboratore_id INTEGER NOT NULL,
  evento_id INTEGER NOT NULL,
  ruolo TEXT NOT NULL,
  data_assegnazione TIMESTAMP DEFAULT NOW() NOT NULL,
  note TEXT
);

-- Tabella pagamenti_evento
CREATE TABLE IF NOT EXISTS pagamenti_evento (
  id SERIAL PRIMARY KEY,
  evento_id INTEGER NOT NULL,
  collaboratore_id INTEGER,
  tipo TEXT NOT NULL,
  importo NUMERIC(10, 2) NOT NULL,
  data_pagamento TIMESTAMP DEFAULT NOW() NOT NULL,
  metodo_pagamento TEXT NOT NULL,
  riferimento_esterno TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabella montaggi_evento
CREATE TABLE IF NOT EXISTS montaggi_evento (
  id SERIAL PRIMARY KEY,
  evento_id INTEGER NOT NULL,
  collaboratore_id INTEGER NOT NULL,
  tipo_montaggio TEXT NOT NULL,
  acconto_importo NUMERIC(10, 2),
  acconto_pagato BOOLEAN DEFAULT FALSE,
  acconto_data_pagamento TIMESTAMP,
  saldo_importo NUMERIC(10, 2),
  saldo_pagato BOOLEAN DEFAULT FALSE,
  saldo_data_pagamento TIMESTAMP,
  data_primo_contatto TIMESTAMP,
  priorita INTEGER NOT NULL DEFAULT 5,
  data_consegna_prevista TIMESTAMP,
  data_consegna_effettiva TIMESTAMP,
  stato TEXT NOT NULL DEFAULT 'da_fare',
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);