import { relations } from "drizzle-orm";
import { collaborators } from "./schema";
import { eventiCollaboratori, pagamentiCollaboratori, montaggi } from "./collaboratori";

/**
 * Relazioni per il modulo collaboratori
 * 
 * Questo file è progettato per essere importato dopo aver definito tutte le tabelle
 * e contiene solo le relazioni tra le tabelle
 */

// Relazioni tra Collaboratori e tabelle
export const eventiCollaboratoriRelations = relations(eventiCollaboratori, ({ one }) => ({
  collaboratore: one(collaborators, {
    fields: [eventiCollaboratori.collaboratoreId],
    references: [collaborators.id],
  }),
}));

export const pagamentiCollaboratoriRelations = relations(pagamentiCollaboratori, ({ one }) => ({
  collaboratore: one(collaborators, {
    fields: [pagamentiCollaboratori.collaboratoreId],
    references: [collaborators.id],
  }),
}));

export const montaggiRelations = relations(montaggi, ({ one }) => ({
  collaboratore: one(collaborators, {
    fields: [montaggi.collaboratoreId],
    references: [collaborators.id],
  }),
}));

// Aggiungiamo le relazioni inverse ai collaboratori
export const collaboratoriRelationsEstese = relations(collaborators, ({ many }) => ({
  eventiCollaboratori: many(eventiCollaboratori),
  pagamentiCollaboratori: many(pagamentiCollaboratori),
  montaggi: many(montaggi),
}));