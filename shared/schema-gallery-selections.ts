import { pgTable, integer, timestamp, text, boolean, varchar, real, serial } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Riferimenti alle tabelle esterne (definite nello schema principale)
// Queste tabelle sono solo per riferimento e non verranno create/migrate
export const users = pgTable("users", {
  id: serial("id").primaryKey()
});

export const galleries = pgTable("galleries", {
  id: serial("id").primaryKey()
});

export const photos = pgTable("photos", {
  id: serial("id").primaryKey()
});

// Impostazioni di selezione per galleria
export const gallerySelectionSettings = pgTable("gallery_selection_settings", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").references(() => galleries.id, { onDelete: "cascade" }).notNull(),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  maxSelections: integer("max_selections").default(0),  // 0 = nessun limite
  allowComments: boolean("allow_comments").default(true).notNull(),
  expiresAt: timestamp("expires_at", { mode: 'date' }),
  customMessage: text("custom_message"),
  createdAt: timestamp("created_at", { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'timestamp' }).defaultNow().notNull()
});

export const insertGallerySelectionSettingsSchema = createInsertSchema(gallerySelectionSettings).pick({
  galleryId: true,
  isEnabled: true,
  maxSelections: true,
  allowComments: true,
  expiresAt: true,
  customMessage: true
});

export type InsertGallerySelectionSettings = z.infer<typeof insertGallerySelectionSettingsSchema>;
export type GallerySelectionSettings = typeof gallerySelectionSettings.$inferSelect;

// Sessioni di selezione
export const selectionSessions = pgTable("selection_sessions", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").references(() => galleries.id, { onDelete: "cascade" }).notNull(),
  clientId: integer("client_id").references(() => users.id, { onDelete: "set null" }),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }),
  sessionKey: varchar("session_key", { length: 100 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default('active'),  // 'active', 'completed'
  startedAt: timestamp("started_at", { mode: 'date' }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: 'date' }),
  notes: text("notes")
});

export const insertSelectionSessionSchema = createInsertSchema(selectionSessions).pick({
  galleryId: true,
  clientId: true,
  clientName: true,
  clientEmail: true,
  sessionKey: true,
  notes: true
});

export type InsertSelectionSession = z.infer<typeof insertSelectionSessionSchema>;
export type SelectionSession = typeof selectionSessions.$inferSelect;

// Selezioni di foto
export const photoSelections = pgTable("photo_selections", {
  id: serial("id").primaryKey(),
  photoId: integer("photo_id").references(() => photos.id, { onDelete: "cascade" }).notNull(),
  sessionId: integer("session_id").references(() => selectionSessions.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at", { mode: 'timestamp' }).defaultNow().notNull()
});

export const insertPhotoSelectionSchema = createInsertSchema(photoSelections).pick({
  photoId: true,
  sessionId: true
});

export type InsertPhotoSelection = z.infer<typeof insertPhotoSelectionSchema>;
export type PhotoSelection = typeof photoSelections.$inferSelect;

// Commenti sulle foto
export const photoComments = pgTable("photo_comments", {
  id: serial("id").primaryKey(),
  photoId: integer("photo_id").references(() => photos.id, { onDelete: "cascade" }).notNull(),
  sessionId: integer("session_id").references(() => selectionSessions.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  clientName: varchar("client_name", { length: 255 }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: 'timestamp' }).defaultNow().notNull()
});

export const insertPhotoCommentSchema = createInsertSchema(photoComments).pick({
  photoId: true,
  sessionId: true,
  content: true,
  clientName: true
});

export type InsertPhotoComment = z.infer<typeof insertPhotoCommentSchema>;
export type PhotoComment = typeof photoComments.$inferSelect;

// Relazioni
export const gallerySelectionSettingsRelations = relations(gallerySelectionSettings, ({ one }) => ({
  gallery: one(galleries, {
    fields: [gallerySelectionSettings.galleryId],
    references: [galleries.id]
  })
}));

export const selectionSessionsRelations = relations(selectionSessions, ({ one, many }) => ({
  gallery: one(galleries, {
    fields: [selectionSessions.galleryId],
    references: [galleries.id]
  }),
  client: one(users, {
    fields: [selectionSessions.clientId],
    references: [users.id]
  }),
  selections: many(photoSelections),
  comments: many(photoComments)
}));

export const photoSelectionsRelations = relations(photoSelections, ({ one }) => ({
  photo: one(photos, {
    fields: [photoSelections.photoId],
    references: [photos.id]
  }),
  session: one(selectionSessions, {
    fields: [photoSelections.sessionId],
    references: [selectionSessions.id]
  })
}));

export const photoCommentsRelations = relations(photoComments, ({ one }) => ({
  photo: one(photos, {
    fields: [photoComments.photoId],
    references: [photos.id]
  }),
  session: one(selectionSessions, {
    fields: [photoComments.sessionId],
    references: [selectionSessions.id]
  }),
  user: one(users, {
    fields: [photoComments.userId],
    references: [users.id]
  })
}));