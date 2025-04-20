-- Add email and name fields to photo_selections
ALTER TABLE "photo_selections"
ADD COLUMN IF NOT EXISTS "client_email" TEXT,
ADD COLUMN IF NOT EXISTS "client_name" TEXT;