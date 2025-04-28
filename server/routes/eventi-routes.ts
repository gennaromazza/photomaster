import express from "express";
import {
  getEventoDettaglio,
  getPagamentiEvento,
  addPagamentoEvento,
  getMontaggiEvento,
  addMontaggioEvento,
  updateMontaggioEvento,
  getEventiSenzaCollaboratori,
  getCollaboratoriPreventivo,
  addCollaboratorePreventivo,
  updateCollaboratorePreventivo,
  removeCollaboratorePreventivo
} from "../controllers/eventi-controller";
import { csrfProtection } from "../auth";

const router = express.Router();

// Rotte per la gestione evento-centrica
// GET: Lista eventi senza collaboratori assegnati
router.get("/senza-collaboratori", getEventiSenzaCollaboratori);

// Rotte per i collaboratori di un preventivo
router.get("/preventivo/:quoteId/collaboratori", getCollaboratoriPreventivo);
router.post("/preventivo/:quoteId/collaboratori", csrfProtection, addCollaboratorePreventivo);
router.patch("/preventivo/:quoteId/collaboratori/:id", csrfProtection, updateCollaboratorePreventivo);
router.delete("/preventivo/:quoteId/collaboratori/:id", csrfProtection, removeCollaboratorePreventivo);

// GET: Dettagli completi dell'evento
router.get("/:id", getEventoDettaglio);

// Rotte per i pagamenti legati all'evento
router.get("/:id/pagamenti", getPagamentiEvento);
router.post("/:id/pagamenti", csrfProtection, addPagamentoEvento);

// Rotte per i montaggi legati all'evento
router.get("/:id/montaggi", getMontaggiEvento);
router.post("/:id/montaggi", csrfProtection, addMontaggioEvento);
router.patch("/:id/montaggi/:montaggioId", csrfProtection, updateMontaggioEvento);

// GET: Lista di tutti gli eventi con paginazione
router.get("/api/eventi", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [list, total] = await Promise.all([
      db.select().from(eventi).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql`count(*)` }).from(eventi)
    ]);

    return res.json({ data: list, page, total: Number(total[0].count) });
  } catch (error) {
    console.error("Errore nel recupero eventi:", error);
    return res.status(500).json({ error: "Errore nel recupero degli eventi" });
  }
});

export default router;