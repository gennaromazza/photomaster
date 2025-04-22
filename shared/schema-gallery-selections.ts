import { pgTable, varchar, timestamp, boolean, serial, integer, text, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { photos, galleries, clients } from "./schema_gallery";

// Abilita la modalità selezione e opzioni relative
export const gallerySelectionSettings = pgTable("gallery_selection_settings", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull().references(() => galleries.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  instructions: text("instructions"),  // Istruzioni per la selezione formattate in HTML
  minSelections: integer("min_selections").default(0),
  maxSelections: integer("max_selections").default(0), // 0 significa nessun limite
  allowedSelectionTypes: jsonb("allowed_selection_types").$type<string[]>().default(['favorite']),
  expiresAt: timestamp("expires_at"), // Data/ora di scadenza opzionale
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Sessioni di selezione (quando un cliente inizia a selezionare)
export const selectionSessions = pgTable("selection_sessions", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull().references(() => galleries.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id),
  sessionKey: varchar("session_key", { length: 64 }).notNull().unique(),
  clientName: varchar("client_name", { length: 255 }),
  clientEmail: varchar("client_email", { length: 255 }),
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, completed, expired
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
  feedbackNotes: text("feedback_notes"), // Note o feedback forniti dal cliente
});

// Le singole selezioni foto
export const photoSelections = pgTable("photo_selections", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => selectionSessions.id, { onDelete: "cascade" }),
  photoId: integer("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
  selectionType: varchar("selection_type", { length: 50 }).default("favorite").notNull(), // favorite, must_have, like, ecc.
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  client: one(clients, {
    fields: [selectionSessions.clientId],
    references: [clients.id]
  }),
  selections: many(photoSelections)
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

// Schemi Zod per la validazione
export const insertGallerySelectionSettingsSchema = createInsertSchema(gallerySelectionSettings).pick({
  galleryId: true,
  isEnabled: true,
  instructions: true,
  minSelections: true,
  maxSelections: true,
  allowedSelectionTypes: true,
  expiresAt: true
});

export const insertSelectionSessionSchema = createInsertSchema(selectionSessions).pick({
  galleryId: true,
  clientId: true,
  sessionKey: true,
  clientName: true,
  clientEmail: true,
  status: true,
  feedbackNotes: true
});

export const insertPhotoSelectionSchema = createInsertSchema(photoSelections).pick({
  sessionId: true,
  photoId: true,
  selectionType: true,
  notes: true
});

// Tipi per TypeScript
export type InsertGallerySelectionSettings = z.infer<typeof insertGallerySelectionSettingsSchema>;
export type GallerySelectionSettings = typeof gallerySelectionSettings.$inferSelect;

export type InsertSelectionSession = z.infer<typeof insertSelectionSessionSchema>;
export type SelectionSession = typeof selectionSessions.$inferSelect;

export type InsertPhotoSelection = z.infer<typeof insertPhotoSelectionSchema>;
export type PhotoSelection = typeof photoSelections.$inferSelect;