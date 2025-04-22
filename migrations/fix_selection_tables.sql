-- Migrazione per correggere le tabelle del sistema di selezione

-- Aggiorno la tabella photo_selections per supportare il sistema di selezione
ALTER TABLE public.photo_selections 
  ALTER COLUMN session_id TYPE integer USING session_id::integer,
  ADD COLUMN IF NOT EXISTS parent_id integer REFERENCES photo_selections(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

-- Aggiorno la tabella photo_comments per supportare il sistema di selezione
ALTER TABLE public.photo_comments 
  ADD COLUMN IF NOT EXISTS session_id integer REFERENCES selection_sessions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS parent_id integer REFERENCES photo_comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

-- Aggiungo un indice per migliorare le prestazioni nelle query più comuni
CREATE INDEX IF NOT EXISTS idx_photo_selections_session_id ON photo_selections(session_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_session_id ON photo_comments(session_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_photo_id ON photo_comments(photo_id);