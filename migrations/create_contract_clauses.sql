-- Crea tabella per le clausole contrattuali
CREATE TABLE IF NOT EXISTS "contract_clauses" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category_id" INTEGER REFERENCES "service_categories"("id") ON DELETE SET NULL,
  "event_type" TEXT, -- Per collegare la clausola a tipi specifici di evento/lavoro (wedding, baptism, ecc.)
  "is_required" BOOLEAN DEFAULT true NOT NULL,
  "is_active" BOOLEAN DEFAULT true NOT NULL,
  "order" INTEGER DEFAULT 0 NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crea tabella per associare clausole a preventivi
CREATE TABLE IF NOT EXISTS "quote_clauses" (
  "id" SERIAL PRIMARY KEY,
  "quote_id" INTEGER NOT NULL REFERENCES "quotes"("id") ON DELETE CASCADE,
  "clause_id" INTEGER NOT NULL REFERENCES "contract_clauses"("id") ON DELETE CASCADE,
  "is_accepted" BOOLEAN DEFAULT false NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(quote_id, clause_id)
);

-- Aggiungiamo una colonna alla tabella quotes per tener traccia delle clausole confermate
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "clauses_confirmed" BOOLEAN DEFAULT false;

-- Indici per migliorare le prestazioni
CREATE INDEX IF NOT EXISTS "contract_clauses_active_idx" ON "contract_clauses"("is_active");
CREATE INDEX IF NOT EXISTS "quote_clauses_quote_idx" ON "quote_clauses"("quote_id");