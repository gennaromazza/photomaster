import { Router, Request, Response } from "express";
import { db } from "../db";
import { collaborators, eventiCollaboratori, pagamentiCollaboratori, montaggi } from "@shared/schema";
import { eq } from "drizzle-orm";
import { verifyCollaboratorToken, generateCollaboratorToken } from "../utils/token";

const router = Router();

// Middleware per verificare il token del collaboratore
const verifyToken = async (req: Request, res: Response, next: Function) => {
  try {
    const { id } = req.params;
    const token = req.query.token as string || req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ error: "Token di accesso non fornito" });
    }
    
    const collaboratorId = parseInt(id, 10);
    
    // Verifica il token
    if (!verifyCollaboratorToken(token, collaboratorId)) {
      return res.status(403).json({ error: "Token non valido o scaduto" });
    }
    
    // Verifica che il token corrisponda a quello salvato nel DB
    const [collaborator] = await db
      .select()
      .from(collaborators)
      .where(eq(collaborators.id, collaboratorId))
      .limit(1);
    
    if (!collaborator || collaborator.dashboardToken !== token) {
      return res.status(403).json({ error: "Token non valido per questo collaboratore" });
    }
    
    next();
  } catch (error) {
    console.error("Errore durante la verifica del token:", error);
    res.status(500).json({ error: "Errore durante la verifica dell'autenticazione" });
  }
};

// Endpoint per la dashboard pubblica del collaboratore
router.get("/:id/dashboard-public", verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collaboratorId = parseInt(id, 10);
    
    // Recupera i dati del collaboratore
    const [collaboratore] = await db
      .select()
      .from(collaborators)
      .where(eq(collaborators.id, collaboratorId))
      .limit(1);
    
    if (!collaboratore) {
      return res.status(404).json({ error: "Collaboratore non trovato" });
    }
    
    // Recupera gli eventi assegnati al collaboratore
    const eventi = await db
      .select()
      .from(eventiCollaboratori)
      .where(eq(eventiCollaboratori.collaboratoreId, collaboratorId));
    
    // Recupera i pagamenti del collaboratore
    const pagamenti = await db
      .select()
      .from(pagamentiCollaboratori)
      .where(eq(pagamentiCollaboratori.collaboratoreId, collaboratorId));
    
    // Recupera i montaggi assegnati al collaboratore
    const montaggiAssegnati = await db
      .select()
      .from(montaggi)
      .where(eq(montaggi.collaboratoreId, collaboratorId));
    
    // Formatta e restituisci i dati
    res.json({
      collaboratore: {
        id: collaboratore.id,
        nome: `${collaboratore.firstName} ${collaboratore.lastName}`,
        ruolo: collaboratore.role,
        profileImage: collaboratore.profileImage
      },
      eventi,
      pagamenti,
      montaggi: montaggiAssegnati
    });
  } catch (error) {
    console.error("Errore durante il recupero della dashboard pubblica:", error);
    res.status(500).json({ error: "Errore durante il recupero dei dati della dashboard" });
  }
});

// Endpoint per generare o rigenerare un token di accesso
router.post("/:id/generate-dashboard-token", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collaboratorId = parseInt(id, 10);
    
    // Verifica l'autenticazione dell'utente (deve essere un admin)
    // Nota: in ambiente di sviluppo usiamo l'utente mock
    if (!req.isAuthenticated() && process.env.NODE_ENV !== 'development') {
      return res.status(401).json({ error: "Non autorizzato" });
    }
    
    // Recupera il collaboratore
    const [collaboratore] = await db
      .select()
      .from(collaborators)
      .where(eq(collaborators.id, collaboratorId))
      .limit(1);
    
    if (!collaboratore) {
      return res.status(404).json({ error: "Collaboratore non trovato" });
    }
    
    // Genera un nuovo token
    const newToken = generateCollaboratorToken(collaboratorId);
    
    // Salva il token nel database
    await db
      .update(collaborators)
      .set({ dashboardToken: newToken })
      .where(eq(collaborators.id, collaboratorId));
    
    // Restituisci il nuovo token
    res.json({ 
      token: newToken,
      dashboardUrl: `${req.protocol}://${req.get('host')}/dashboard-collaboratore-public?id=${collaboratorId}&token=${newToken}`
    });
  } catch (error) {
    console.error("Errore durante la generazione del token:", error);
    res.status(500).json({ error: "Errore durante la generazione del token di accesso" });
  }
});

export default router;