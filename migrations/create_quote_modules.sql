-- Creazione della tabella quote_modules
CREATE TABLE IF NOT EXISTS quote_modules (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP,
  expiry_date TIMESTAMP,
  share_token TEXT,
  client_notes TEXT,
  internal_notes TEXT,
  subtotal INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  max_selections INTEGER,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);

-- Creazione della tabella quote_module_items
CREATE TABLE IF NOT EXISTS quote_module_items (
  id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL,
  service_id INTEGER,
  bundle_id INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  is_selected BOOLEAN DEFAULT FALSE,
  position INTEGER DEFAULT 0,
  has_discount BOOLEAN NOT NULL DEFAULT FALSE,
  discount_type TEXT,
  discount_value INTEGER,
  discounted_price INTEGER,
  total INTEGER NOT NULL,
  notes TEXT,
  FOREIGN KEY (module_id) REFERENCES quote_modules(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  FOREIGN KEY (bundle_id) REFERENCES service_bundles(id) ON DELETE SET NULL
);

-- Indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_quote_modules_quote_id ON quote_modules(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_modules_share_token ON quote_modules(share_token);
CREATE INDEX IF NOT EXISTS idx_quote_module_items_module_id ON quote_module_items(module_id);
CREATE INDEX IF NOT EXISTS idx_quote_module_items_service_id ON quote_module_items(service_id);
CREATE INDEX IF NOT EXISTS idx_quote_module_items_bundle_id ON quote_module_items(bundle_id);