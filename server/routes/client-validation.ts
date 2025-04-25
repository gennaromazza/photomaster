import { Router } from "express";
import { checkExistingClient, searchClients } from "../controllers/client-validation-controller";

const router = Router();

// Endpoint pubblici per verificare l'esistenza dei clienti
router.post("/check-existing", checkExistingClient);
router.get("/search", searchClients);

export default router;