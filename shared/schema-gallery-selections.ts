import { pgTable, serial, varchar, text, integer, boolean, timestamp, foreignKey } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';
import { photos, users } from './schema';

// Tabella per le impostazioni di selezione delle gallerie
export const gallerySelectionSettings = pgTable('gallery_selection_settings', {
  id: serial('id').primaryKey(),
  galleryId: integer('gallery_id').notNull().references(() => photos.galleryId),
  isEnabled: boolean('is_enabled').notNull().default(false),
  instructions: text('instructions'),
  minSelections: integer('min_selections').notNull().default(0),
  maxSelections: integer('max_selections').notNull().default(0),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Tabella per le sessioni di selezione
export const selectionSessions = pgTable('selection_sessions', {
  id: serial('id').primaryKey(),
  galleryId: integer('gallery_id').notNull().references(() => photos.galleryId),
  clientId: integer('client_id'),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }).notNull(),
  sessionKey: varchar('session_key', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  notes: text('notes')
});

// Tabella per le selezioni di foto
export const photoSelections = pgTable('photo_selections', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull().references(() => selectionSessions.id),
  photoId: integer('photo_id').notNull().references(() => photos.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Tabella per i commenti delle foto
export const photoComments = pgTable('photo_comments', {
  id: serial('id').primaryKey(),
  photoId: integer('photo_id').notNull().references(() => photos.id),
  sessionId: integer('session_id').notNull().references(() => selectionSessions.id),
  userId: integer('user_id').references(() => users.id),
  clientName: varchar('client_name', { length: 255 }),
  content: text('content').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Relazioni
export const gallerySelectionSettingsRelations = relations(gallerySelectionSettings, ({ one }) => ({
  gallery: one(photos, {
    fields: [gallerySelectionSettings.galleryId],
    references: [photos.galleryId]
  })
}));

export const selectionSessionsRelations = relations(selectionSessions, ({ one, many }) => ({
  gallery: one(photos, {
    fields: [selectionSessions.galleryId],
    references: [photos.galleryId]
  }),
  selections: many(photoSelections),
  comments: many(photoComments)
}));

export const photoSelectionsRelations = relations(photoSelections, ({ one }) => ({
  session: one(selectionSessions, {
    fields: [photoSelections.sessionId],
    references: [selectionSessions.id]
  }),
  photo: one(photos, {
    fields: [photoSelections.photoId],
    references: [photos.id]
  })
}));

export const photoCommentsRelations = relations(photoComments, ({ one }) => ({
  session: one(selectionSessions, {
    fields: [photoComments.sessionId],
    references: [selectionSessions.id]
  }),
  photo: one(photos, {
    fields: [photoComments.photoId],
    references: [photos.id]
  }),
  user: one(users, {
    fields: [photoComments.userId],
    references: [users.id]
  })
}));

// Schemi per inserimento dati
export const insertGallerySelectionSettingsSchema = createInsertSchema(gallerySelectionSettings).pick({
  galleryId: true,
  isEnabled: true,
  instructions: true,
  minSelections: true,
  maxSelections: true,
  expiresAt: true
});

export const insertSelectionSessionSchema = createInsertSchema(selectionSessions).pick({
  galleryId: true,
  clientId: true,
  clientName: true,
  clientEmail: true,
  sessionKey: true,
  status: true,
  notes: true
});

export const insertPhotoSelectionSchema = createInsertSchema(photoSelections).pick({
  sessionId: true,
  photoId: true,
  notes: true
});

export const insertPhotoCommentSchema = createInsertSchema(photoComments).pick({
  photoId: true,
  sessionId: true,
  userId: true,
  clientName: true,
  content: true,
  isRead: true
});

// Tipi inferiti
export type GallerySelectionSettings = typeof gallerySelectionSettings.$inferSelect;
export type InsertGallerySelectionSettings = z.infer<typeof insertGallerySelectionSettingsSchema>;

export type SelectionSession = typeof selectionSessions.$inferSelect;
export type InsertSelectionSession = z.infer<typeof insertSelectionSessionSchema>;

export type PhotoSelection = typeof photoSelections.$inferSelect;
export type InsertPhotoSelection = z.infer<typeof insertPhotoSelectionSchema>;

export type PhotoComment = typeof photoComments.$inferSelect;
export type InsertPhotoComment = z.infer<typeof insertPhotoCommentSchema>;