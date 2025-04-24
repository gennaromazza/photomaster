import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Definizione tabella eventi (schema italiano)
export const eventi = pgTable("eventi", {
  id: serial("id").primaryKey(),
  titolo: text("titolo").notNull(),
  descrizione: text("descrizione"),
  data: timestamp("data").notNull(),
  dataFine: timestamp("data_fine"),
  luogo: text("luogo"),
  clienteId: integer("cliente_id").notNull(),
  secondoClienteId: integer("secondo_cliente_id"),
  tipo: text("tipo"),
  stato: text("stato").default("confermato"),
  note: text("note"),
  pubblico: boolean("pubblico").default(false),
  idEsterno: text("id_esterno"),
  googleCalendarId: text("google_calendar_id"),
  googleCalendarLink: text("google_calendar_link"),
  sincronizzaConGoogle: boolean("sincronizza_con_google").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schema per l'inserimento
export const insertEventoSchema = createInsertSchema(eventi).pick({
  titolo: true,
  descrizione: true,
  data: true,
  dataFine: true,
  luogo: true,
  clienteId: true,
  secondoClienteId: true,
  tipo: true,
  stato: true,
  note: true,
  pubblico: true,
  idEsterno: true,
  googleCalendarId: true,
  googleCalendarLink: true,
  sincronizzaConGoogle: true,
});

// Tipi
export type Evento = typeof eventi.$inferSelect;
export type InsertEvento = z.infer<typeof insertEventoSchema>;