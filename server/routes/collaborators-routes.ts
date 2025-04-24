import { Router } from "express";
import { csrfProtection } from "../auth";
import { 
  getAllCollaborators,
  getCollaborator,
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
  getCollaboratorEvents,
  assignEventToCollaborator,
  getCollaboratorPayments,
  addCollaboratorPayment,
  getCollaboratorEditing,
  addCollaboratorEditing,
  updateCollaboratorEditing,
  getCollaboratorDashboard
} from "../controllers/collaborators-controller";

import { migrateAllCollaboratoriData } from "../utils/migrate-collaboratori-data";

const router = Router();

/**
 * Rotte per la gestione unificata dei collaboratori
 * Standardizzate in inglese per mantenere coerenza nel codebase
 */

// Rotte base collaboratori
router.get("/collaborators", getAllCollaborators);
router.get("/collaborators/:id", getCollaborator);
router.post("/collaborators", csrfProtection, createCollaborator);
router.put("/collaborators/:id", csrfProtection, updateCollaborator);
router.delete("/collaborators/:id", csrfProtection, deleteCollaborator);

// Eventi collaboratori
router.get("/collaborators/:id/events", getCollaboratorEvents);
router.post("/collaborators/:id/events", csrfProtection, assignEventToCollaborator);

// Pagamenti collaboratori
router.get("/collaborators/:id/payments", getCollaboratorPayments);
router.post("/collaborators/:id/payments", csrfProtection, addCollaboratorPayment);

// Montaggi collaboratori
router.get("/collaborators/:id/editing", getCollaboratorEditing);
router.post("/collaborators/:id/editing", csrfProtection, addCollaboratorEditing);
router.patch("/collaborators/:id/editing/:editingId", csrfProtection, updateCollaboratorEditing);

// Dashboard collaboratore (statistiche)
router.get("/collaborators/:id/dashboard", getCollaboratorDashboard);

// Migrazione dati (da utilizzare una tantum)
router.post("/collaborators/migrate-data", csrfProtection, async (req, res) => {
  try {
    // Esegue la migrazione completa
    await migrateAllCollaboratoriData();
    
    return res.status(200).json({
      success: true,
      message: "Migrazione dati collaboratori completata con successo"
    });
  } catch (error) {
    console.error("Errore durante la migrazione dei dati collaboratori:", error);
    return res.status(500).json({
      success: false,
      error: "Errore durante la migrazione dei dati collaboratori"
    });
  }
});

// Eseguiamo la migrazione con script anziché via API
// per evitare le complicazioni del CSRF

// Migrazione dei dati da eseguire dalla console
export async function runMigration() {
  try {
    console.log("Inizio migrazione dei dati collaboratori...");
    await migrateAllCollaboratoriData();
    console.log("Migrazione dati collaboratori completata con successo");
    return true;
  } catch (error) {
    console.error("Errore durante la migrazione dei dati collaboratori:", error);
    return false;
  }
}

export default router;