import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

/**
 * Schema per la gestione avanzata dei collaboratori
 * Implementa:
 * - Assegnazione a eventi
 * - Pagamenti
 * - Montaggi
 */

// Definizione delle tabelle
export const eventiCollaboratori = pgTable("eventi_collaboratori", {
  id: serial("id").primaryKey(),
  collaboratoreId: integer("collaboratore_id").notNull(),
  eventoId: integer("evento_id").notNull(),
  ruolo: text("ruolo").notNull(),
  dataAssegnazione: timestamp("data_assegnazione").defaultNow().notNull(),
  note: text("note"),
});

export const pagamentiCollaboratori = pgTable("pagamenti_collaboratori", {
  id: serial("id").primaryKey(),
  collaboratoreId: integer("collaboratore_id").notNull(),
  eventoId: integer("evento_id").notNull(),
  tipo: text("tipo").notNull(), // "acconto", "saldo", "montaggio_acconto", "montaggio_saldo"
  importo: numeric("importo", { precision: 10, scale: 2 }).notNull(),
  dataPagamento: timestamp("data_pagamento").defaultNow().notNull(),
  metodoPagamento: text("metodo_pagamento"), // "bonifico", "contanti", "altro"
  note: text("note"),
  riferimentoEsterno: text("riferimento_esterno"), // Numero bonifico o altra referenza
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const montaggi = pgTable("montaggi", {
  id: serial("id").primaryKey(),
  collaboratoreId: integer("collaboratore_id").notNull(),
  eventoId: integer("evento_id").notNull(),
  acconto: numeric("acconto", { precision: 10, scale: 2 }).notNull(),
  saldo: numeric("saldo", { precision: 10, scale: 2 }),
  dataPrimoContatto: timestamp("data_primo_contatto"),
  priorita: integer("priorita").notNull(),
  dataConsegnaPrevista: timestamp("data_consegna_prevista").notNull(),
  stato: text("stato").notNull().default("da_fare"), // "da_fare", "in_corso", "completato"
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schemas per inserts e updates
export const insertEventoCollaboratoreSchema = createInsertSchema(eventiCollaboratori).pick({
  collaboratoreId: true,
  eventoId: true,
  ruolo: true,
  dataAssegnazione: true,
  note: true,
});

export const insertPagamentoCollaboratoreSchema = createInsertSchema(pagamentiCollaboratori)
  .pick({
    collaboratoreId: true,
    eventoId: true,
    tipo: true,
    importo: true,
    dataPagamento: true,
    metodoPagamento: true,
    note: true,
    riferimentoEsterno: true,
  })
  .refine(data => Number(data.importo) > 0, {
    message: "L'importo deve essere maggiore di zero",
    path: ["importo"]
  });

export const insertMontaggioSchema = createInsertSchema(montaggi).pick({
  collaboratoreId: true,
  eventoId: true,
  acconto: true,
  priorita: true,
  dataConsegnaPrevista: true,
  stato: true,
  note: true,
});

export const updateMontaggioSchema = insertMontaggioSchema.partial().extend({
  saldo: z.number().optional(),
  dataPrimoContatto: z.date().optional(),
  stato: z.enum(["da_fare", "in_corso", "completato"]).optional(),
});

// Definizione dei tipi TypeScript
export type EventoCollaboratore = typeof eventiCollaboratori.$inferSelect;
export type InsertEventoCollaboratore = z.infer<typeof insertEventoCollaboratoreSchema>;

export type PagamentoCollaboratore = typeof pagamentiCollaboratori.$inferSelect;
export type InsertPagamentoCollaboratore = z.infer<typeof insertPagamentoCollaboratoreSchema>;

export type Montaggio = typeof montaggi.$inferSelect;
export type InsertMontaggio = z.infer<typeof insertMontaggioSchema>;
export type UpdateMontaggio = z.infer<typeof updateMontaggioSchema>;

// Enum per i tipi di pagamento
export enum TipoPagamento {
  ACCONTO = "acconto",
  SALDO = "saldo",
  MONTAGGIO_ACCONTO = "montaggio_acconto",
  MONTAGGIO_SALDO = "montaggio_saldo",
}

// Enum per gli stati di montaggio
export enum StatoMontaggio {
  DA_FARE = "da_fare",
  IN_CORSO = "in_corso",
  COMPLETATO = "completato",
}