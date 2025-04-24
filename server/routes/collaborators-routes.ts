import { Router } from "express";
import {
  getCollaboratorEvents,
  addCollaboratorEvent,
  getCollaboratorPayments,
  addCollaboratorPayment,
  getCollaboratorEditing,
  addCollaboratorEditing,
  updateCollaboratorEditing,
  getCollaboratorDashboard
} from "../controllers/collaborators-controller";
import { csrfProtection } from "../auth";

const router = Router();

/**
 * Rotte standardizzate in inglese per la gestione del modulo Collaboratori
 */

// Eventos collaboratori
router.get("/collaborators/:id/events", getCollaboratorEvents);
router.post("/collaborators/:id/events", csrfProtection, addCollaboratorEvent);

// Pagamenti collaboratori
router.get("/collaborators/:id/payments", getCollaboratorPayments);
router.post("/collaborators/:id/payments", csrfProtection, addCollaboratorPayment);

// Montaggi collaboratori
router.get("/collaborators/:id/editing", getCollaboratorEditing);
router.post("/collaborators/:id/editing", csrfProtection, addCollaboratorEditing);
router.patch("/collaborators/:id/editing/:editingId", csrfProtection, updateCollaboratorEditing);

// Dashboard collaboratore (statistiche)
router.get("/collaborators/:id/dashboard", getCollaboratorDashboard);

export default router;