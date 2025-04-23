
BEGIN;
-- Aggiunta dei campi mancanti in selection_sessions
ALTER TABLE selection_sessions
  ADD COLUMN IF NOT EXISTS session_key TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT NULL;

-- Drop colonne duplicate/pre-esistenti con tipi errati
ALTER TABLE photo_comments
  DROP COLUMN IF EXISTS parent_id_old,
  DROP COLUMN IF EXISTS client_name_old;

-- Aggiungi indici mancanti
CREATE INDEX IF NOT EXISTS idx_photo_selections_photo_id ON photo_selections(photo_id);
CREATE INDEX IF NOT EXISTS idx_selection_sessions_gallery_id ON selection_sessions(gallery_id);
COMMIT;
