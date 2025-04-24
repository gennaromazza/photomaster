import { Router } from "express";
import {
  getEventiCollaboratore,
  addEventoCollaboratore,
  getPagamentiCollaboratore,
  addPagamentoCollaboratore,
  getMontaggiCollaboratore,
  addMontaggioCollaboratore,
  updateMontaggioCollaboratore,
  getDashboardCollaboratore
} from "../controllers/collaboratori-controller";
import { csrfProtection } from "../auth";
import { syncAllCollaboratorAssignments } from "../utils/sync-collaboratori";

const router = Router();

/**
 * Rotte per la gestione del modulo Collaboratori
 */

// Eventi collaboratori
router.get("/collaboratori/:id/eventi", getEventiCollaboratore);
router.post("/collaboratori/:id/eventi", csrfProtection, addEventoCollaboratore);

// Pagamenti collaboratori
router.get("/collaboratori/:id/pagamenti", getPagamentiCollaboratore);
router.post("/collaboratori/:id/pagamenti", csrfProtection, addPagamentoCollaboratore);

// Montaggi collaboratori
router.get("/collaboratori/:id/montaggi", getMontaggiCollaboratore);
router.post("/collaboratori/:id/montaggi", csrfProtection, addMontaggioCollaboratore);
router.patch("/collaboratori/:id/montaggi/:montaggioId", csrfProtection, updateMontaggioCollaboratore);

// Dashboard collaboratore (statistiche)
router.get("/collaboratori/:id/dashboard", getDashboardCollaboratore);

// Sincronizzazione assegnazioni collaboratori tra le tabelle
router.post("/collaboratori/sincronizza-assegnazioni", csrfProtection, async (req, res) => {
  try {
    // Esegue la sincronizzazione completa
    await syncAllCollaboratorAssignments();
    
    return res.status(200).json({
      success: true,
      message: "Sincronizzazione completata con successo"
    });
  } catch (error) {
    console.error("Errore durante la sincronizzazione delle assegnazioni:", error);
    return res.status(500).json({
      success: false,
      error: "Errore durante la sincronizzazione delle assegnazioni"
    });
  }
});

export default router;