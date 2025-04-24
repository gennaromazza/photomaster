import express from "express";
import {
  getEventoDettaglio,
  getPagamentiEvento,
  addPagamentoEvento,
  getMontaggiEvento,
  addMontaggioEvento,
  updateMontaggioEvento,
  getEventiSenzaCollaboratori,
  getCollaboratoriPreventivo
} from "../controllers/eventi-controller";
import { csrfProtection } from "../auth";

const router = express.Router();

// Rotte per la gestione evento-centrica
// GET: Lista eventi senza collaboratori assegnati
router.get("/senza-collaboratori", getEventiSenzaCollaboratori);

// GET: Collaboratori assegnati ad un preventivo
router.get("/preventivo/:quoteId/collaboratori", getCollaboratoriPreventivo);

// GET: Dettagli completi dell'evento
router.get("/:id", getEventoDettaglio);

// Rotte per i pagamenti legati all'evento
router.get("/:id/pagamenti", getPagamentiEvento);
router.post("/:id/pagamenti", csrfProtection, addPagamentoEvento);

// Rotte per i montaggi legati all'evento
router.get("/:id/montaggi", getMontaggiEvento);
router.post("/:id/montaggi", csrfProtection, addMontaggioEvento);
router.patch("/:id/montaggi/:montaggioId", csrfProtection, updateMontaggioEvento);

export default router;