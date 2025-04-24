-- Script di migrazione per il modulo Collaboratori
-- Aggiunge le tabelle necessarie per la gestione collaboratori avanzata

-- Tabella eventi_collaboratori
CREATE TABLE "eventi_collaboratori" (
  "id" SERIAL PRIMARY KEY,
  "collaboratore_id" INTEGER NOT NULL REFERENCES "collaborators"("id") ON DELETE CASCADE,
  "evento_id" INTEGER NOT NULL,
  "ruolo" TEXT NOT NULL,
  "data_assegnazione" TIMESTAMP DEFAULT NOW() NOT NULL,
  "note" TEXT
);

-- Tabella pagamenti_collaboratori
CREATE TABLE "pagamenti_collaboratori" (
  "id" SERIAL PRIMARY KEY,
  "collaboratore_id" INTEGER NOT NULL REFERENCES "collaborators"("id") ON DELETE CASCADE,
  "evento_id" INTEGER NOT NULL,
  "tipo" TEXT NOT NULL,
  "importo" NUMERIC(10,2) NOT NULL,
  "data_pagamento" TIMESTAMP DEFAULT NOW() NOT NULL,
  "metodo_pagamento" TEXT,
  "note" TEXT,
  "riferimento_esterno" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabella montaggi
CREATE TABLE "montaggi" (
  "id" SERIAL PRIMARY KEY,
  "collaboratore_id" INTEGER NOT NULL REFERENCES "collaborators"("id") ON DELETE CASCADE,
  "evento_id" INTEGER NOT NULL,
  "acconto" NUMERIC(10,2) NOT NULL,
  "saldo" NUMERIC(10,2),
  "data_primo_contatto" TIMESTAMP,
  "priorita" INTEGER NOT NULL,
  "data_consegna_prevista" TIMESTAMP NOT NULL,
  "stato" TEXT NOT NULL DEFAULT 'da_fare',
  "note" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Aggiunta indici per migliorare le performance
CREATE INDEX idx_eventi_collaboratori_collaboratore_id ON "eventi_collaboratori"("collaboratore_id");
CREATE INDEX idx_eventi_collaboratori_evento_id ON "eventi_collaboratori"("evento_id");

CREATE INDEX idx_pagamenti_collaboratori_collaboratore_id ON "pagamenti_collaboratori"("collaboratore_id");
CREATE INDEX idx_pagamenti_collaboratori_evento_id ON "pagamenti_collaboratori"("evento_id");

CREATE INDEX idx_montaggi_collaboratore_id ON "montaggi"("collaboratore_id");
CREATE INDEX idx_montaggi_evento_id ON "montaggi"("evento_id");
CREATE INDEX idx_montaggi_stato ON "montaggi"("stato");