import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { events } from "./schema";
import { collaborators } from "./schema";

/**
 * Schema per la gestione avanzata degli eventi
 * Versione Evento-Centrica 
 * Implementa:
 * - Collaboratori assegnati all'evento
 * - Pagamenti legati all'evento
 * - Montaggi legati all'evento
 */

// Definizione delle tabelle

// 1. Collaboratori assegnati all'evento
export const eventiCollaboratori = pgTable("eventi_collaboratori", {
  id: serial("id").primaryKey(),
  collaboratoreId: integer("collaboratore_id").notNull(),
  eventoId: integer("evento_id").notNull(),
  ruolo: text("ruolo").notNull(),
  dataAssegnazione: timestamp("data_assegnazione").defaultNow().notNull(),
  note: text("note"),
});

// 2. Pagamenti legati all'evento
export const pagamentiEvento = pgTable("pagamenti_evento", {
  id: serial("id").primaryKey(),
  eventoId: integer("evento_id").notNull(),
  collaboratoreId: integer("collaboratore_id"), // Può essere null se il pagamento non è associato a un collaboratore
  tipo: text("tipo").notNull(), // "cliente_acconto", "cliente_saldo", "fornitore", "collaboratore_acconto", "collaboratore_saldo", ecc.
  importo: numeric("importo", { precision: 10, scale: 2 }).notNull(),
  dataPagamento: timestamp("data_pagamento").defaultNow().notNull(),
  metodoPagamento: text("metodo_pagamento").notNull(), // "bonifico", "contanti", "altro"
  riferimentoEsterno: text("riferimento_esterno"), // Numero bonifico o altra referenza
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 3. Montaggi legati all'evento
export const montaggiEvento = pgTable("montaggi_evento", {
  id: serial("id").primaryKey(),
  eventoId: integer("evento_id").notNull(),
  collaboratoreId: integer("collaboratore_id").notNull(),
  tipoMontaggio: text("tipo_montaggio").notNull(), // "foto", "video", "album", ecc.
  accontoImporto: numeric("acconto_importo", { precision: 10, scale: 2 }),
  accontoPagato: boolean("acconto_pagato").default(false),
  accontoDataPagamento: timestamp("acconto_data_pagamento"),
  saldoImporto: numeric("saldo_importo", { precision: 10, scale: 2 }),
  saldoPagato: boolean("saldo_pagato").default(false),
  saldoDataPagamento: timestamp("saldo_data_pagamento"),
  dataPrimoContatto: timestamp("data_primo_contatto"),
  priorita: integer("priorita").notNull().default(5), // 1-10, default 5
  dataConsegnaPrevista: timestamp("data_consegna_prevista"),
  dataConsegnaEffettiva: timestamp("data_consegna_effettiva"),
  stato: text("stato").notNull().default("da_fare"), // "da_fare", "in_corso", "completato"
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schemas per inserts e updates

// 1. Schema per l'assegnazione di collaboratori
export const insertEventoCollaboratoreSchema = createInsertSchema(eventiCollaboratori).pick({
  collaboratoreId: true,
  eventoId: true,
  ruolo: true,
  dataAssegnazione: true,
  note: true,
});

// 2. Schema per i pagamenti evento
export const insertPagamentoEventoSchema = createInsertSchema(pagamentiEvento)
  .pick({
    eventoId: true,
    collaboratoreId: true,
    tipo: true,
    importo: true,
    dataPagamento: true,
    metodoPagamento: true,
    riferimentoEsterno: true,
    note: true,
  })
  .refine(data => Number(data.importo) > 0, {
    message: "L'importo deve essere maggiore di zero",
    path: ["importo"]
  });

// 3. Schema per i montaggi evento
export const insertMontaggioEventoSchema = createInsertSchema(montaggiEvento).pick({
  eventoId: true,
  collaboratoreId: true,
  tipoMontaggio: true,
  accontoImporto: true,
  accontoPagato: true,
  accontoDataPagamento: true,
  saldoImporto: true,
  saldoPagato: true,
  saldoDataPagamento: true,
  dataPrimoContatto: true,
  priorita: true,
  dataConsegnaPrevista: true,
  dataConsegnaEffettiva: true,
  stato: true,
  note: true,
});

export const updateMontaggioEventoSchema = insertMontaggioEventoSchema.partial().extend({
  // Rafforza la validazione del campo stato
  stato: z.enum(["da_fare", "in_corso", "completato"]).optional(),
});

// Definizione dei tipi TypeScript
export type EventoCollaboratore = typeof eventiCollaboratori.$inferSelect;
export type InsertEventoCollaboratore = z.infer<typeof insertEventoCollaboratoreSchema>;

export type PagamentoEvento = typeof pagamentiEvento.$inferSelect;
export type InsertPagamentoEvento = z.infer<typeof insertPagamentoEventoSchema>;

export type MontaggioEvento = typeof montaggiEvento.$inferSelect;
export type InsertMontaggioEvento = z.infer<typeof insertMontaggioEventoSchema>;
export type UpdateMontaggioEvento = z.infer<typeof updateMontaggioEventoSchema>;

// Enum per i tipi di pagamento
export enum TipoPagamentoEvento {
  // Pagamenti cliente
  CLIENTE_ACCONTO = "cliente_acconto",
  CLIENTE_SALDO = "cliente_saldo",
  CLIENTE_EXTRA = "cliente_extra",
  
  // Pagamenti collaboratori
  COLLABORATORE_ACCONTO = "collaboratore_acconto",
  COLLABORATORE_SALDO = "collaboratore_saldo",
  
  // Pagamenti montaggio
  MONTAGGIO_ACCONTO = "montaggio_acconto",
  MONTAGGIO_SALDO = "montaggio_saldo",
  
  // Altri pagamenti
  FORNITORE = "fornitore",
  ALTRO = "altro",
}

// Enum per gli stati di montaggio
export enum StatoMontaggioEvento {
  DA_FARE = "da_fare",
  IN_CORSO = "in_corso",
  COMPLETATO = "completato",
}

// Enum per i tipi di montaggio
export enum TipoMontaggioEvento {
  FOTO = "foto",
  VIDEO = "video",
  ALBUM = "album",
  SLIDESHOW = "slideshow",
  ALTRO = "altro",
}

// Relazioni
export const eventiCollaboratoriRelations = relations(eventiCollaboratori, ({ one }) => ({
  evento: one(events, {
    fields: [eventiCollaboratori.eventoId],
    references: [events.id],
  }),
  collaboratore: one(collaborators, {
    fields: [eventiCollaboratori.collaboratoreId],
    references: [collaborators.id],
  }),
}));

export const pagamentiEventoRelations = relations(pagamentiEvento, ({ one }) => ({
  evento: one(events, {
    fields: [pagamentiEvento.eventoId],
    references: [events.id],
  }),
  collaboratore: one(collaborators, {
    fields: [pagamentiEvento.collaboratoreId],
    references: [collaborators.id],
  }),
}));

export const montaggiEventoRelations = relations(montaggiEvento, ({ one }) => ({
  evento: one(events, {
    fields: [montaggiEvento.eventoId],
    references: [events.id],
  }),
  collaboratore: one(collaborators, {
    fields: [montaggiEvento.collaboratoreId],
    references: [collaborators.id],
  }),
}));

// Estendi le relazioni esistenti degli eventi per includere i nuovi elementi
export const eventsEventoCentricoRelations = relations(events, ({ many }) => ({
  eventiCollaboratori: many(eventiCollaboratori),
  pagamentiEvento: many(pagamentiEvento),
  montaggiEvento: many(montaggiEvento),
}));