// Definizione delle tabelle del database per il controller selection
// Questo file è usato solo per il controller selection-controller.ts

import { sql } from "drizzle-orm";

// Definizione delle costanti per i nomi delle tabelle SQL
export const gallerySelectionSettings = {
  tableName: 'gallery_selection_settings',
  id: sql`id`,
  galleryId: sql`gallery_id`,
  isEnabled: sql`is_enabled`,
  maxSelections: sql`max_selections`,
  allowComments: sql`allow_comments`,
  expiresAt: sql`expires_at`,
  customMessage: sql`custom_message`,
  createdAt: sql`created_at`,
  updatedAt: sql`updated_at`
};

export const selectionSessions = {
  tableName: 'selection_sessions',
  id: sql`id`,
  galleryId: sql`gallery_id`,
  clientId: sql`client_id`,
  clientName: sql`client_name`,
  clientEmail: sql`client_email`,
  sessionKey: sql`session_key`,
  status: sql`status`,
  startedAt: sql`started_at`,
  completedAt: sql`completed_at`,
  notes: sql`notes`
};

export const photoSelections = {
  tableName: 'photo_selections',
  id: sql`id`,
  photoId: sql`photo_id`,
  sessionId: sql`session_id`,
  createdAt: sql`created_at`
};

export const photoComments = {
  tableName: 'photo_comments',
  id: sql`id`,
  photoId: sql`photo_id`,
  sessionId: sql`session_id`,
  content: sql`content`,
  userId: sql`user_id`,
  clientName: sql`client_name`,
  isRead: sql`is_read`,
  createdAt: sql`created_at`
};