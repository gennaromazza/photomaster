-- Create bundle_leads table which is missing in the database
CREATE TABLE IF NOT EXISTS bundle_leads (
  id SERIAL PRIMARY KEY,
  bundle_id INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  quote_id INTEGER,
  client_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE bundle_leads ADD CONSTRAINT fk_bundle_leads_bundle
  FOREIGN KEY (bundle_id) REFERENCES service_bundles(id) ON DELETE CASCADE;

ALTER TABLE bundle_leads ADD CONSTRAINT fk_bundle_leads_quote
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL;

ALTER TABLE bundle_leads ADD CONSTRAINT fk_bundle_leads_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Create index to speed up searches
CREATE INDEX idx_bundle_leads_bundle_id ON bundle_leads(bundle_id);
CREATE INDEX idx_bundle_leads_email ON bundle_leads(email);
CREATE INDEX idx_bundle_leads_status ON bundle_leads(status);