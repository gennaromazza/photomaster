import { pgTable, varchar, timestamp, text, boolean, serial, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users } from "./schema";

// Schema per le notifiche
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // L'utente destinatario della notifica
  type: varchar("type", { length: 50 }).notNull(), // 'quote_signed', 'payment_received', 'event_reminder', 'system'
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 255 }), // Link opzionale a una risorsa
  resourceId: integer("resource_id"), // ID della risorsa correlata (preventivo, evento, ecc.)
  resourceType: varchar("resource_type", { length: 50 }), // 'quote', 'event', 'payment', ecc.
  metadata: json("metadata"), // Dati aggiuntivi in formato JSON
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tipi di notifica
export enum NotificationType {
  QUOTE_SIGNED = 'quote_signed',
  PAYMENT_RECEIVED = 'payment_received',
  EVENT_REMINDER = 'event_reminder',
  SYSTEM = 'system',
}

// Relazioni
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Schema di inserimento
export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true, 
  title: true,
  message: true,
  link: true,
  resourceId: true,
  resourceType: true,
  metadata: true,
});

// Tipi derivati
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;