-- Migrazione per passare a un approccio evento-centrico
-- Questo script crea le nuove tabelle e migra i dati dalle tabelle esistenti

-- Step 1: Creare nuove tabelle per l'approccio evento-centrico

-- Tabella per i pagamenti legati agli eventi
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
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  CONSTRAINT fk_pagamento_evento
    FOREIGN KEY (evento_id)
    REFERENCES events(id)
    ON DELETE CASCADE,
    
  CONSTRAINT fk_pagamento_collaboratore
    FOREIGN KEY (collaboratore_id)
    REFERENCES collaborators(id)
    ON DELETE SET NULL
);

-- Tabella per i montaggi legati agli eventi
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
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  CONSTRAINT fk_montaggio_evento
    FOREIGN KEY (evento_id)
    REFERENCES events(id)
    ON DELETE CASCADE,
    
  CONSTRAINT fk_montaggio_collaboratore
    FOREIGN KEY (collaboratore_id)
    REFERENCES collaborators(id)
    ON DELETE CASCADE
);

-- Step 2: Migrare i dati dalle tabelle esistenti alle nuove tabelle evento-centriche

-- Migrazione dei pagamenti collaboratori alla nuova tabella pagamenti_evento
INSERT INTO pagamenti_evento (
  evento_id,
  collaboratore_id,
  tipo,
  importo,
  data_pagamento,
  metodo_pagamento,
  riferimento_esterno,
  note,
  created_at,
  updated_at
)
SELECT
  evento_id,
  collaboratore_id,
  -- Mappatura dei tipi di pagamento
  CASE
    WHEN tipo = 'acconto' THEN 'collaboratore_acconto'
    WHEN tipo = 'saldo' THEN 'collaboratore_saldo'
    WHEN tipo = 'montaggio_acconto' THEN 'montaggio_acconto'
    WHEN tipo = 'montaggio_saldo' THEN 'montaggio_saldo'
    ELSE tipo
  END as tipo,
  importo,
  data_pagamento,
  metodo_pagamento,
  riferimento_esterno,
  note,
  created_at,
  updated_at
FROM pagamenti_collaboratori;

-- Migrazione dei montaggi alla nuova tabella montaggi_evento
INSERT INTO montaggi_evento (
  evento_id,
  collaboratore_id,
  tipo_montaggio,
  acconto_importo,
  acconto_pagato,
  saldo_importo,
  saldo_pagato,
  data_primo_contatto,
  priorita,
  data_consegna_prevista,
  stato,
  note,
  created_at,
  updated_at
)
SELECT
  evento_id,
  collaboratore_id,
  'foto' AS tipo_montaggio, -- Default, potrebbe richiedere aggiornamenti manuali
  acconto,
  CASE WHEN EXISTS (
    SELECT 1 FROM pagamenti_collaboratori 
    WHERE pagamenti_collaboratori.evento_id = montaggi.evento_id 
    AND pagamenti_collaboratori.collaboratore_id = montaggi.collaboratore_id
    AND pagamenti_collaboratori.tipo = 'montaggio_acconto'
  ) THEN TRUE ELSE FALSE END AS acconto_pagato,
  saldo,
  CASE WHEN EXISTS (
    SELECT 1 FROM pagamenti_collaboratori 
    WHERE pagamenti_collaboratori.evento_id = montaggi.evento_id 
    AND pagamenti_collaboratori.collaboratore_id = montaggi.collaboratore_id
    AND pagamenti_collaboratori.tipo = 'montaggio_saldo'
  ) THEN TRUE ELSE FALSE END AS saldo_pagato,
  data_primo_contatto,
  priorita,
  data_consegna_prevista,
  stato,
  note,
  created_at,
  updated_at
FROM montaggi;

-- Step 3: Aggiungi indici per migliorare le prestazioni delle query
CREATE INDEX IF NOT EXISTS idx_pagamenti_evento_evento_id ON pagamenti_evento(evento_id);
CREATE INDEX IF NOT EXISTS idx_pagamenti_evento_collaboratore_id ON pagamenti_evento(collaboratore_id);
CREATE INDEX IF NOT EXISTS idx_montaggi_evento_evento_id ON montaggi_evento(evento_id);
CREATE INDEX IF NOT EXISTS idx_montaggi_evento_collaboratore_id ON montaggi_evento(collaboratore_id);

-- Non eliminiamo le vecchie tabelle per ora, manteniamo la compatibilità
-- durante la transizione
-- In una fase successiva, dopo la verifica del corretto funzionamento,
-- potremo eliminare le tabelle vecchie con:
-- DROP TABLE IF EXISTS pagamenti_collaboratori;
-- DROP TABLE IF EXISTS montaggi;