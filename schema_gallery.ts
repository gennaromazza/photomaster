import { relations, sql } from "drizzle-orm";
import {
  serial,
  text,
  timestamp,
  pgTable,
  boolean,
  integer,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users, clients, events } from "./shared/schema";

// GESTIONE GALLERIE FOTOGRAFICHE

// Tabella per le gallerie
export const galleries = pgTable("galleries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  shortDescription: text("short_description"), // Breve descrizione per anteprima
  eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(), // URL friendly name per la galleria
  isPublic: boolean("is_public").default(false).notNull(), // Se la galleria è visibile pubblicamente
  password: text("password"), // Password opzionale per proteggere la galleria
  expiryDate: timestamp("expiry_date"), // Data opzionale di scadenza della galleria
  coverImage: text("cover_image"), // Immagine di copertina
  headerImage: text("header_image"), // Immagine testata
  layout: text("layout").default("grid").notNull(), // Tipo di layout: grid, masonry, slideshow, ecc.
  theme: text("theme").default("light").notNull(), // Tema: light, dark, sepia, ecc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  viewCount: integer("view_count").default(0).notNull(), // Contatore visualizzazioni
  downloadEnabled: boolean("download_enabled").default(false).notNull(), // Se è possibile scaricare le foto
  selectionEnabled: boolean("selection_enabled").default(true).notNull(), // Se i clienti possono selezionare le foto
  clientMessage: text("client_message"), // Messaggio personalizzato per i clienti
  showInClient: boolean("show_in_client").default(true).notNull(), // Se mostrare nei portali clienti
  metaData: jsonb("meta_data"), // Dati aggiuntivi in formato JSON
  studio: text("studio").default("ImageStudio").notNull(), // Nome dello studio fotografico
  watermarkEnabled: boolean("watermark_enabled").default(true).notNull(), // Se applicare filigrana alle foto
  
  // Social e SEO
  ogTitle: text("og_title"), // Titolo per OpenGraph (social)
  ogDescription: text("og_description"), // Descrizione per OpenGraph (social)
  ogImage: text("og_image"), // Immagine per OpenGraph (social)
  seoKeywords: text("seo_keywords"), // Parole chiave per SEO
  allowSocialSharing: boolean("allow_social_sharing").default(true).notNull(), // Abilitare la condivisione sui social
  
  // Notifiche
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(), // Se abilitare le notifiche per nuove foto
  notificationEmailSubject: text("notification_email_subject"), // Oggetto delle email di notifica
  notificationEmailTemplate: text("notification_email_template"), // Template per le email di notifica
});

export const insertGallerySchema = createInsertSchema(galleries).pick({
  name: true,
  description: true,
  shortDescription: true,
  eventId: true,
  slug: true,
  isPublic: true,
  password: true,
  expiryDate: true,
  coverImage: true,
  headerImage: true,
  layout: true,
  theme: true,
  downloadEnabled: true,
  selectionEnabled: true,
  clientMessage: true,
  showInClient: true,
  metaData: true,
  studio: true,
  watermarkEnabled: true,
  ogTitle: true,
  ogDescription: true,
  ogImage: true,
  seoKeywords: true,
  allowSocialSharing: true,
  notificationsEnabled: true,
  notificationEmailSubject: true,
  notificationEmailTemplate: true,
}).transform((gallery) => ({
  ...gallery,
  expiryDate: gallery.expiryDate && typeof gallery.expiryDate === 'string' 
    ? new Date(gallery.expiryDate) 
    : gallery.expiryDate,
}));

export type InsertGallery = z.infer<typeof insertGallerySchema>;
export type Gallery = typeof galleries.$inferSelect;

// Tabella per i capitoli/sezioni delle gallerie
export const galleryChapters = pgTable("gallery_chapters", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull().references(() => galleries.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  coverImage: text("cover_image"), // Immagine di copertina del capitolo
  sortOrder: integer("sort_order").default(0).notNull(), // Ordine di visualizzazione
  slug: text("slug").notNull(), // URL friendly name per il capitolo
  isPublic: boolean("is_public").default(true).notNull(), // Se il capitolo è visibile
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  metaData: jsonb("meta_data"), // Dati aggiuntivi in formato JSON
});

export const insertGalleryChapterSchema = createInsertSchema(galleryChapters).pick({
  galleryId: true,
  title: true,
  description: true,
  coverImage: true,
  sortOrder: true,
  slug: true,
  isPublic: true,
  metaData: true,
});

export type InsertGalleryChapter = z.infer<typeof insertGalleryChapterSchema>;
export type GalleryChapter = typeof galleryChapters.$inferSelect;

// Tabella per le foto
export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull().references(() => galleries.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id").references(() => galleryChapters.id, { onDelete: "set null" }), // Opzionale, può non appartenere a un capitolo
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  path: text("path").notNull(), // Percorso relativo del file sul server
  thumbnailPath: text("thumbnail_path"), // Percorso della miniatura
  mediumPath: text("medium_path"), // Versione media per visualizzazione web
  largePath: text("large_path"), // Versione grande ma compressa
  webpPath: text("webp_path"), // Versione WebP per browser moderni
  size: integer("size").notNull(), // Dimensione in byte
  width: integer("width"), // Larghezza dell'immagine in pixel
  height: integer("height"), // Altezza dell'immagine in pixel
  mimeType: text("mime_type").notNull(), // Tipo di file (es. image/jpeg)
  title: text("title"), // Titolo opzionale
  caption: text("caption"), // Didascalia opzionale
  isFeatured: boolean("is_featured").default(false).notNull(), // Se è un'immagine in evidenza
  isHidden: boolean("is_hidden").default(false).notNull(), // Se l'immagine è nascosta
  sortOrder: integer("sort_order").default(0).notNull(), // Ordine di visualizzazione
  metaData: jsonb("meta_data"), // Metadati EXIF e altro
  tags: text("tags").array(), // Array di tag
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  orientation: text("orientation").default("landscape").notNull(), // landscape, portrait, square
});

export const insertPhotoSchema = createInsertSchema(photos).pick({
  galleryId: true,
  chapterId: true,
  filename: true,
  originalFilename: true,
  path: true,
  thumbnailPath: true,
  mediumPath: true, 
  largePath: true,
  webpPath: true,
  size: true,
  width: true,
  height: true,
  mimeType: true,
  title: true,
  caption: true,
  isFeatured: true,
  isHidden: true,
  sortOrder: true,
  metaData: true,
  tags: true,
  uploadedBy: true,
  orientation: true,
});

export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;

// Tabella per i likes delle foto
export const photoLikes = pgTable("photo_likes", {
  id: serial("id").primaryKey(),
  photoId: integer("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(), // ID sessione per utenti non autenticati
  userId: integer("user_id").references(() => users.id), // Opzionale, solo per utenti autenticati
  likedAt: timestamp("liked_at").defaultNow().notNull(),
  ipAddress: text("ip_address"), // Opzionale per prevenire abusi
});

export const insertPhotoLikeSchema = createInsertSchema(photoLikes).pick({
  photoId: true,
  sessionId: true,
  userId: true,
  ipAddress: true,
});

export type InsertPhotoLike = z.infer<typeof insertPhotoLikeSchema>;
export type PhotoLike = typeof photoLikes.$inferSelect;

// Tabella per i commenti delle foto
export const photoComments = pgTable("photo_comments", {
  id: serial("id").primaryKey(),
  photoId: integer("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Nome della persona che commenta
  email: text("email").notNull(), // Email (non mostrata pubblicamente)
  comment: text("comment").notNull(),
  status: text("status").default("pending").notNull(), // pending, approved, spam
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userId: integer("user_id").references(() => users.id), // Opzionale, solo per utenti autenticati
  ipAddress: text("ip_address"), // Opzionale per prevenire abusi
});

export const insertPhotoCommentSchema = createInsertSchema(photoComments).pick({
  photoId: true,
  name: true,
  email: true,
  comment: true,
  status: true,
  userId: true,
  ipAddress: true,
});

export type InsertPhotoComment = z.infer<typeof insertPhotoCommentSchema>;
export type PhotoComment = typeof photoComments.$inferSelect;

// Tabella per le selezioni del cliente
export const photoSelections = pgTable("photo_selections", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull().references(() => galleries.id, { onDelete: "cascade" }),
  photoId: integer("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id), // Opzionale, solo per clienti registrati
  sessionId: text("session_id"), // Per clienti non registrati
  selectionType: text("selection_type").default("favorite").notNull(), // favorite, selected, rejected
  notes: text("notes"), // Note opzionali sulla selezione
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPhotoSelectionSchema = createInsertSchema(photoSelections).pick({
  galleryId: true,
  photoId: true,
  clientId: true,
  sessionId: true,
  selectionType: true,
  notes: true,
});

export type InsertPhotoSelection = z.infer<typeof insertPhotoSelectionSchema>;
export type PhotoSelection = typeof photoSelections.$inferSelect;

// Tabella per le sottoscrizioni alle gallerie (per le notifiche)
export const gallerySubscriptions = pgTable("gallery_subscriptions", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull().references(() => galleries.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name"),
  token: uuid("token").defaultRandom().notNull(), // Token per conferma e cancellazione
  isConfirmed: boolean("is_confirmed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastNotifiedAt: timestamp("last_notified_at"),
  ipAddress: text("ip_address"),
  clientId: integer("client_id").references(() => clients.id), // Se l'utente è un cliente registrato
});

export const insertGallerySubscriptionSchema = createInsertSchema(gallerySubscriptions).pick({
  galleryId: true,
  email: true,
  name: true,
  isConfirmed: true,
  ipAddress: true,
  clientId: true,
});

export type InsertGallerySubscription = z.infer<typeof insertGallerySubscriptionSchema>;
export type GallerySubscription = typeof gallerySubscriptions.$inferSelect;

// Relazioni
export const galleriesRelations = relations(galleries, ({ one, many }) => ({
  event: one(events, {
    fields: [galleries.eventId],
    references: [events.id],
  }),
  chapters: many(galleryChapters),
  photos: many(photos),
  selections: many(photoSelections),
  subscriptions: many(gallerySubscriptions),
}));

export const galleryChaptersRelations = relations(galleryChapters, ({ one, many }) => ({
  gallery: one(galleries, {
    fields: [galleryChapters.galleryId],
    references: [galleries.id],
  }),
  photos: many(photos),
}));

export const photosRelations = relations(photos, ({ one, many }) => ({
  gallery: one(galleries, {
    fields: [photos.galleryId],
    references: [galleries.id],
  }),
  chapter: one(galleryChapters, {
    fields: [photos.chapterId],
    references: [galleryChapters.id],
  }),
  uploader: one(users, {
    fields: [photos.uploadedBy],
    references: [users.id],
  }),
  likes: many(photoLikes),
  comments: many(photoComments),
  selections: many(photoSelections),
}));

export const photoLikesRelations = relations(photoLikes, ({ one }) => ({
  photo: one(photos, {
    fields: [photoLikes.photoId],
    references: [photos.id],
  }),
  user: one(users, {
    fields: [photoLikes.userId],
    references: [users.id],
  }),
}));

export const photoCommentsRelations = relations(photoComments, ({ one }) => ({
  photo: one(photos, {
    fields: [photoComments.photoId],
    references: [photos.id],
  }),
  user: one(users, {
    fields: [photoComments.userId],
    references: [users.id],
  }),
}));

export const photoSelectionsRelations = relations(photoSelections, ({ one }) => ({
  photo: one(photos, {
    fields: [photoSelections.photoId],
    references: [photos.id],
  }),
  gallery: one(galleries, {
    fields: [photoSelections.galleryId],
    references: [galleries.id],
  }),
  client: one(clients, {
    fields: [photoSelections.clientId],
    references: [clients.id],
  }),
}));

export const gallerySubscriptionsRelations = relations(gallerySubscriptions, ({ one }) => ({
  gallery: one(galleries, {
    fields: [gallerySubscriptions.galleryId],
    references: [galleries.id],
  }),
  client: one(clients, {
    fields: [gallerySubscriptions.clientId],
    references: [clients.id],
  }),
}));