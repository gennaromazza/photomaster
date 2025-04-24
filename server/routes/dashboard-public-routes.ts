import { Router, Request, Response } from "express";
import { db } from "../db";
import { collaborators, eventiCollaboratori, pagamentiCollaboratori, montaggi, eventCollaborators, events } from "@shared/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { verifyCollaboratorToken, generateCollaboratorToken } from "../utils/token";

// Estende l'interfaccia Request per includere il collaboratorId
declare global {
  namespace Express {
    interface Request {
      collaboratorId?: number;
    }
  }
}

const router = Router();

// Middleware per verificare il token del collaboratore
const verifyToken = async (req: Request, res: Response, next: Function) => {
  try {
    // Recupera l'ID collaboratore da params o query
    let id = req.params.id || req.query.id as string;
    const token = req.query.token as string || req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ error: "Token di accesso non fornito" });
    }
    
    if (!id) {
      return res.status(400).json({ error: "ID collaboratore non fornito" });
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
    
    // Salva l'ID collaboratore verificato nel request object per uso successivo
    req.collaboratorId = collaboratorId;
    
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
    
    // Recupera gli eventi assegnati al collaboratore (da entrambe le tabelle)
    // Prima da eventiCollaboratori (modulo nuovo)
    const eventiModuloNuovo = await db
      .select()
      .from(eventiCollaboratori)
      .where(eq(eventiCollaboratori.collaboratoreId, collaboratorId));
    
    // Poi da eventCollaborators (tabella originale)
    const eventiModuloOriginale = await db
      .select({
        id: eventCollaborators.id,
        collaboratoreId: eventCollaborators.collaboratorId,
        eventoId: eventCollaborators.eventId,
        ruolo: eventCollaborators.role,
        dataAssegnazione: sql`NOW()`, // Creiamo una data di assegnazione fittizia
        note: sql`NULL::text` // Note vuote
      })
      .from(eventCollaborators)
      .where(eq(eventCollaborators.collaboratorId, collaboratorId));
      
    // Combiniamo i risultati
    let eventi = [...eventiModuloNuovo, ...eventiModuloOriginale];
    
    // Se abbiamo eventi, recuperiamo i dettagli da eventi.id per arricchire i dati
    if (eventi.length > 0) {
      // Estrai tutti gli ID degli eventi
      const eventIds = eventi.map(e => e.eventoId);
      
      // Recupera i dettagli degli eventi
      const eventiDettagli = await db
        .select()
        .from(events)
        .where(inArray(events.id, eventIds));
        
      // Mappa i dettagli degli eventi agli eventi dei collaboratori
      eventi = eventi.map(evento => {
        const dettagli = eventiDettagli.find(e => e.id === evento.eventoId);
        return {
          ...evento,
          evento: dettagli || null,
        };
      });
    }
    
    // Recupera i pagamenti del collaboratore
    let pagamenti = await db
      .select()
      .from(pagamentiCollaboratori)
      .where(eq(pagamentiCollaboratori.collaboratoreId, collaboratorId));
      
    // Se abbiamo pagamenti, recuperiamo i dettagli degli eventi associati
    if (pagamenti.length > 0) {
      const eventIds = pagamenti.map(p => p.eventoId);
      
      // Recupera i dettagli degli eventi
      const eventiDettagli = await db
        .select({
          id: events.id,
          title: events.title
        })
        .from(events)
        .where(inArray(events.id, eventIds));
        
      // Mappa i dettagli degli eventi ai pagamenti
      pagamenti = pagamenti.map(pagamento => {
        const dettagli = eventiDettagli.find(e => e.id === pagamento.eventoId);
        return {
          ...pagamento,
          evento: dettagli || null,
        };
      });
    }
    
    // Recupera i montaggi assegnati al collaboratore
    let montaggiAssegnati = await db
      .select()
      .from(montaggi)
      .where(eq(montaggi.collaboratoreId, collaboratorId));
      
    // Se abbiamo montaggi, recuperiamo i dettagli degli eventi associati
    if (montaggiAssegnati.length > 0) {
      const eventIds = montaggiAssegnati.map(m => m.eventoId);
      
      // Recupera i dettagli degli eventi
      const eventiDettagli = await db
        .select({
          id: events.id,
          title: events.title
        })
        .from(events)
        .where(inArray(events.id, eventIds));
        
      // Mappa i dettagli degli eventi ai montaggi
      montaggiAssegnati = montaggiAssegnati.map(montaggio => {
        const dettagli = eventiDettagli.find(e => e.id === montaggio.eventoId);
        return {
          ...montaggio,
          evento: dettagli || null,
        };
      });
    }
    
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

// Nuovo endpoint con il formato dell'URL aggiornato
router.get("/dashboard-collaboratore-public", verifyToken, async (req: Request, res: Response) => {
  try {
    const collaboratorId = req.collaboratorId;
    
    if (!collaboratorId) {
      return res.status(400).json({ error: "ID collaboratore non fornito" });
    }
    
    // Recupera i dati del collaboratore
    const [collaboratore] = await db
      .select()
      .from(collaborators)
      .where(eq(collaborators.id, collaboratorId))
      .limit(1);
    
    if (!collaboratore) {
      return res.status(404).json({ error: "Collaboratore non trovato" });
    }
    
    // Recupera gli eventi assegnati al collaboratore (da entrambe le tabelle)
    // Prima da eventiCollaboratori (modulo nuovo)
    const eventiModuloNuovo = await db
      .select()
      .from(eventiCollaboratori)
      .where(eq(eventiCollaboratori.collaboratoreId, collaboratorId));
    
    // Poi da eventCollaborators (tabella originale)
    const eventiModuloOriginale = await db
      .select({
        id: eventCollaborators.id,
        collaboratoreId: eventCollaborators.collaboratorId,
        eventoId: eventCollaborators.eventId,
        ruolo: eventCollaborators.role,
        dataAssegnazione: sql`NOW()`, // Creiamo una data di assegnazione fittizia
        note: sql`NULL::text` // Note vuote
      })
      .from(eventCollaborators)
      .where(eq(eventCollaborators.collaboratorId, collaboratorId));
      
    // Combiniamo i risultati
    let eventi = [...eventiModuloNuovo, ...eventiModuloOriginale];
    
    // Se abbiamo eventi, recuperiamo i dettagli da eventi.id per arricchire i dati
    if (eventi.length > 0) {
      // Estrai tutti gli ID degli eventi
      const eventIds = eventi.map(e => e.eventoId);
      
      // Recupera i dettagli degli eventi
      const eventiDettagli = await db
        .select()
        .from(events)
        .where(inArray(events.id, eventIds));
        
      // Mappa i dettagli degli eventi agli eventi dei collaboratori
      eventi = eventi.map(evento => {
        const dettagli = eventiDettagli.find(e => e.id === evento.eventoId);
        return {
          ...evento,
          evento: dettagli || null,
        };
      });
    }
    
    // Recupera i pagamenti del collaboratore
    let pagamenti = await db
      .select()
      .from(pagamentiCollaboratori)
      .where(eq(pagamentiCollaboratori.collaboratoreId, collaboratorId));
      
    // Se abbiamo pagamenti, recuperiamo i dettagli degli eventi associati
    if (pagamenti.length > 0) {
      const eventIds = pagamenti.map(p => p.eventoId);
      
      // Recupera i dettagli degli eventi
      const eventiDettagli = await db
        .select({
          id: events.id,
          title: events.title
        })
        .from(events)
        .where(inArray(events.id, eventIds));
        
      // Mappa i dettagli degli eventi ai pagamenti
      pagamenti = pagamenti.map(pagamento => {
        const dettagli = eventiDettagli.find(e => e.id === pagamento.eventoId);
        return {
          ...pagamento,
          evento: dettagli || null,
        };
      });
    }
    
    // Recupera i montaggi assegnati al collaboratore
    let montaggiAssegnati = await db
      .select()
      .from(montaggi)
      .where(eq(montaggi.collaboratoreId, collaboratorId));
      
    // Se abbiamo montaggi, recuperiamo i dettagli degli eventi associati
    if (montaggiAssegnati.length > 0) {
      const eventIds = montaggiAssegnati.map(m => m.eventoId);
      
      // Recupera i dettagli degli eventi
      const eventiDettagli = await db
        .select({
          id: events.id,
          title: events.title
        })
        .from(events)
        .where(inArray(events.id, eventIds));
        
      // Mappa i dettagli degli eventi ai montaggi
      montaggiAssegnati = montaggiAssegnati.map(montaggio => {
        const dettagli = eventiDettagli.find(e => e.id === montaggio.eventoId);
        return {
          ...montaggio,
          evento: dettagli || null,
        };
      });
    }
    
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

export default router;