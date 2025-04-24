import { Router } from "express";
import {
  getEventDetails,
  getEventPayments,
  addEventPayment,
  getEventEditingTasks,
  addEventEditingTask,
  updateEventEditingTask,
  getEventsWithoutCollaborators
} from "../controllers/events-controller";
import { isAuthenticated } from "../middleware/auth";

/**
 * Router for the standardized English version of events API endpoints
 */

const router = Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Event details
router.get("/:id", getEventDetails);

// Event payments
router.get("/:id/payments", getEventPayments);
router.post("/:id/payments", addEventPayment);

// Event editing tasks
router.get("/:id/editing", getEventEditingTasks);
router.post("/:id/editing", addEventEditingTask);
router.patch("/:id/editing/:taskId", updateEventEditingTask);

// Special queries
router.get("/without-collaborators", getEventsWithoutCollaborators);

export default router;