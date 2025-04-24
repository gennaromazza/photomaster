/**
 * Schema unificato per la gestione dei collaboratori
 * Standardizzato in inglese per mantenere coerenza in tutto il codebase
 */

import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Tabella principale collaboratori
export const collaborators = pgTable("collaborators", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull(),
  profileImage: text("profile_image"),
  status: text("status").default("available").notNull(),
  dashboardToken: text("dashboard_token"), // Token JWT per accesso dashboard pubblica
});

export const insertCollaboratorSchema = createInsertSchema(collaborators).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  profileImage: true,
  status: true,
  dashboardToken: true,
});

export type InsertCollaborator = z.infer<typeof insertCollaboratorSchema>;
export type Collaborator = typeof collaborators.$inferSelect;

// Tabella relazioni collaboratori-eventi
export const eventCollaborators = pgTable("event_collaborators", {
  id: serial("id").primaryKey(),
  collaboratorId: integer("collaborator_id").notNull(),
  eventId: integer("event_id").notNull(),
  role: text("role").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  notes: text("notes"),
});

export const insertEventCollaboratorSchema = createInsertSchema(eventCollaborators).pick({
  collaboratorId: true,
  eventId: true,
  role: true,
  assignedAt: true,
  notes: true,
})
.transform((data) => ({
  ...data,
  assignedAt: data.assignedAt ? new Date(data.assignedAt) : new Date(),
}));

export type InsertEventCollaborator = z.infer<typeof insertEventCollaboratorSchema>;
export type EventCollaborator = typeof eventCollaborators.$inferSelect;

// Tabella pagamenti ai collaboratori
export const collaboratorPayments = pgTable("collaborator_payments", {
  id: serial("id").primaryKey(),
  collaboratorId: integer("collaborator_id").notNull(),
  eventId: integer("event_id").notNull(),
  type: text("type").notNull(), // "advance", "balance", "editing_advance", "editing_balance"
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  paymentMethod: text("payment_method"), // "bank_transfer", "cash", "other"
  notes: text("notes"),
  externalReference: text("external_reference"), // Numero bonifico o altra referenza
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCollaboratorPaymentSchema = createInsertSchema(collaboratorPayments).pick({
  collaboratorId: true,
  eventId: true,
  type: true,
  amount: true,
  paymentDate: true,
  paymentMethod: true,
  notes: true,
  externalReference: true,
})
.transform((data) => ({
  ...data,
  paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
}));

export type InsertCollaboratorPayment = z.infer<typeof insertCollaboratorPaymentSchema>;
export type CollaboratorPayment = typeof collaboratorPayments.$inferSelect;

// Tabella montaggi
export const collaboratorEditing = pgTable("collaborator_editing", {
  id: serial("id").primaryKey(),
  collaboratorId: integer("collaborator_id").notNull(),
  eventId: integer("event_id").notNull(),
  advance: numeric("advance", { precision: 10, scale: 2 }).notNull(),
  balance: numeric("balance", { precision: 10, scale: 2 }),
  firstContactDate: timestamp("first_contact_date"),
  priority: integer("priority").notNull(),
  expectedDeliveryDate: timestamp("expected_delivery_date").notNull(),
  status: text("status").notNull().default("to_do"), // "to_do", "in_progress", "completed"
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCollaboratorEditingSchema = createInsertSchema(collaboratorEditing).pick({
  collaboratorId: true,
  eventId: true,
  advance: true,
  balance: true,
  firstContactDate: true,
  priority: true,
  expectedDeliveryDate: true,
  status: true,
  notes: true,
})
.transform((data) => ({
  ...data,
  firstContactDate: data.firstContactDate ? new Date(data.firstContactDate) : null,
  expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : new Date(),
}));

export const updateCollaboratorEditingSchema = createInsertSchema(collaboratorEditing).partial().pick({
  advance: true,
  balance: true,
  firstContactDate: true,
  priority: true,
  expectedDeliveryDate: true,
  status: true,
  notes: true,
})
.transform((data) => ({
  ...data,
  firstContactDate: data.firstContactDate ? new Date(data.firstContactDate) : undefined,
  expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
  updatedAt: new Date(),
}));

export type InsertCollaboratorEditing = z.infer<typeof insertCollaboratorEditingSchema>;
export type UpdateCollaboratorEditing = z.infer<typeof updateCollaboratorEditingSchema>;
export type CollaboratorEditing = typeof collaboratorEditing.$inferSelect;

// Costanti
export enum PaymentType {
  ADVANCE = "advance",
  BALANCE = "balance",
  EDITING_ADVANCE = "editing_advance",
  EDITING_BALANCE = "editing_balance",
}

export enum EditingStatus {
  TO_DO = "to_do",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

// Relazioni

// Relazioni collaboratori
export const collaboratorsRelations = relations(collaborators, ({ many }) => ({
  eventCollaborators: many(eventCollaborators),
  collaboratorPayments: many(collaboratorPayments),
  collaboratorEditing: many(collaboratorEditing),
}));

// Relazioni event_collaborators
export const eventCollaboratorsRelations = relations(eventCollaborators, ({ one }) => ({
  collaborator: one(collaborators, {
    fields: [eventCollaborators.collaboratorId],
    references: [collaborators.id],
  }),
  // Il collegamento a events è definito nel file eventos-schema.ts
}));

// Relazioni collaborator_payments
export const collaboratorPaymentsRelations = relations(collaboratorPayments, ({ one }) => ({
  collaborator: one(collaborators, {
    fields: [collaboratorPayments.collaboratorId],
    references: [collaborators.id],
  }),
  // Il collegamento a events è definito nel file events-schema.ts
}));

// Relazioni collaborator_editing
export const collaboratorEditingRelations = relations(collaboratorEditing, ({ one }) => ({
  collaborator: one(collaborators, {
    fields: [collaboratorEditing.collaboratorId],
    references: [collaborators.id],
  }),
  // Il collegamento a events è definito nel file events-schema.ts
}));