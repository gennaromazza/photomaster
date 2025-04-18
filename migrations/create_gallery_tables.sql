-- Creazione tabella galleries
CREATE TABLE IF NOT EXISTS "galleries" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "short_description" TEXT,
  "event_id" INTEGER REFERENCES "events"("id") ON DELETE CASCADE,
  "slug" TEXT NOT NULL UNIQUE,
  "is_public" BOOLEAN NOT NULL DEFAULT FALSE,
  "password" TEXT,
  "expiry_date" TIMESTAMP,
  "cover_image" TEXT,
  "header_image" TEXT,
  "layout" TEXT NOT NULL DEFAULT 'grid',
  "theme" TEXT NOT NULL DEFAULT 'light',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "download_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "selection_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "client_message" TEXT,
  "show_in_client" BOOLEAN NOT NULL DEFAULT TRUE,
  "meta_data" JSONB,
  "studio" TEXT NOT NULL DEFAULT 'ImageStudio',
  "watermark_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "og_title" TEXT,
  "og_description" TEXT,
  "og_image" TEXT,
  "seo_keywords" TEXT,
  "allow_social_sharing" BOOLEAN NOT NULL DEFAULT TRUE,
  "instagram_handle" TEXT,
  "facebook_page" TEXT,
  "twitter_handle" TEXT,
  "pinterest_handle" TEXT,
  "tiktok_handle" TEXT,
  "show_follow_prompt" BOOLEAN NOT NULL DEFAULT TRUE,
  "show_tagging_prompt" BOOLEAN NOT NULL DEFAULT TRUE,
  "follow_prompt_text" TEXT,
  "tagging_prompt_text" TEXT,
  "social_sharing_image" TEXT,
  "notifications_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "notification_email_subject" TEXT,
  "notification_email_template" TEXT
);

-- Creazione tabella gallery_chapters
CREATE TABLE IF NOT EXISTS "gallery_chapters" (
  "id" SERIAL PRIMARY KEY,
  "gallery_id" INTEGER NOT NULL REFERENCES "galleries"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "cover_image" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "slug" TEXT NOT NULL,
  "is_public" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "meta_data" JSONB
);

-- Creazione tabella photos
CREATE TABLE IF NOT EXISTS "photos" (
  "id" SERIAL PRIMARY KEY,
  "gallery_id" INTEGER NOT NULL REFERENCES "galleries"("id") ON DELETE CASCADE,
  "chapter_id" INTEGER REFERENCES "gallery_chapters"("id") ON DELETE SET NULL,
  "filename" TEXT NOT NULL,
  "original_filename" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "thumbnail_path" TEXT,
  "medium_path" TEXT,
  "large_path" TEXT,
  "webp_path" TEXT,
  "size" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "mime_type" TEXT NOT NULL,
  "title" TEXT,
  "caption" TEXT,
  "is_featured" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_hidden" BOOLEAN NOT NULL DEFAULT FALSE,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "meta_data" JSONB,
  "tags" TEXT[],
  "uploaded_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "uploaded_by" INTEGER REFERENCES "users"("id"),
  "orientation" TEXT NOT NULL DEFAULT 'landscape'
);

-- Creazione tabella photo_likes
CREATE TABLE IF NOT EXISTS "photo_likes" (
  "id" SERIAL PRIMARY KEY,
  "photo_id" INTEGER NOT NULL REFERENCES "photos"("id") ON DELETE CASCADE,
  "session_id" TEXT NOT NULL,
  "user_id" INTEGER REFERENCES "users"("id"),
  "liked_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "ip_address" TEXT
);

-- Creazione tabella photo_comments
CREATE TABLE IF NOT EXISTS "photo_comments" (
  "id" SERIAL PRIMARY KEY,
  "photo_id" INTEGER NOT NULL REFERENCES "photos"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "comment" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "user_id" INTEGER REFERENCES "users"("id"),
  "ip_address" TEXT
);

-- Creazione tabella photo_selections
CREATE TABLE IF NOT EXISTS "photo_selections" (
  "id" SERIAL PRIMARY KEY,
  "gallery_id" INTEGER NOT NULL REFERENCES "galleries"("id") ON DELETE CASCADE,
  "photo_id" INTEGER NOT NULL REFERENCES "photos"("id") ON DELETE CASCADE,
  "client_id" INTEGER REFERENCES "clients"("id"),
  "session_id" TEXT,
  "selection_type" TEXT NOT NULL DEFAULT 'favorite',
  "notes" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Creazione tabella gallery_subscriptions
CREATE TABLE IF NOT EXISTS "gallery_subscriptions" (
  "id" SERIAL PRIMARY KEY,
  "gallery_id" INTEGER NOT NULL REFERENCES "galleries"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "token" UUID NOT NULL DEFAULT gen_random_uuid(),
  "is_confirmed" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "last_notified_at" TIMESTAMP,
  "ip_address" TEXT,
  "client_id" INTEGER REFERENCES "clients"("id")
);

-- Creazione tabella social_shares
CREATE TABLE IF NOT EXISTS "social_shares" (
  "id" SERIAL PRIMARY KEY,
  "gallery_id" INTEGER NOT NULL REFERENCES "galleries"("id") ON DELETE CASCADE,
  "photo_id" INTEGER REFERENCES "photos"("id") ON DELETE CASCADE,
  "platform" TEXT NOT NULL,
  "shared_by" INTEGER REFERENCES "users"("id"),
  "client_id" INTEGER REFERENCES "clients"("id"),
  "session_id" TEXT,
  "shared_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "post_url" TEXT,
  "tagged" BOOLEAN NOT NULL DEFAULT FALSE,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "referrer" TEXT,
  "meta_data" JSONB
);