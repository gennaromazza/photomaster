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
export const insertEventoCollaboratoreSchema = createInsertSchema(eventiCollaboratori)
  .pick({
    collaboratoreId: true,
    eventoId: true,
    ruolo: true,
    dataAssegnazione: true,
    note: true,
  })
  .transform((data) => ({
    ...data,
    dataAssegnazione: data.dataAssegnazione ? new Date(data.dataAssegnazione) : new Date(),
  }));

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
  .transform((data) => ({
    ...data,
    dataPagamento: data.dataPagamento ? new Date(data.dataPagamento) : new Date(),
    importo: typeof data.importo === 'string' ? parseFloat(data.importo) : data.importo,
  }))
  .refine(data => Number(data.importo) > 0, {
    message: "L'importo deve essere maggiore di zero",
    path: ["importo"]
  });

export const insertMontaggioSchema = createInsertSchema(montaggi)
  .pick({
    collaboratoreId: true,
    eventoId: true,
    acconto: true,
    priorita: true,
    dataConsegnaPrevista: true,
    stato: true,
    note: true,
  })
  .transform((data) => ({
    ...data,
    dataConsegnaPrevista: data.dataConsegnaPrevista ? new Date(data.dataConsegnaPrevista) : new Date(),
    dataPrimoContatto: data.dataPrimoContatto ? new Date(data.dataPrimoContatto) : undefined,
    acconto: typeof data.acconto === 'string' ? parseFloat(data.acconto) : data.acconto,
    saldo: data.saldo ? (typeof data.saldo === 'string' ? parseFloat(data.saldo) : data.saldo) : undefined
  }));

export const updateMontaggioSchema = createInsertSchema(montaggi)
  .partial()
  .extend({
    saldo: z.union([z.number(), z.string()]).optional().transform(val => 
      val ? (typeof val === 'string' ? parseFloat(val) : val) : undefined
    ),
    dataPrimoContatto: z.union([z.date(), z.string()]).optional().transform(val => 
      val ? (val instanceof Date ? val : new Date(val)) : undefined
    ),
    stato: z.enum(["da_fare", "in_corso", "completato", "in_revisione", "approvato"]).optional(),
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