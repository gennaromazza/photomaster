import { Router } from "express";
import * as notificationService from "../services/notification-service";
import { isAuthenticated } from "../auth";

const router = Router();

// Ottieni le notifiche dell'utente corrente
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Utente non autenticato" });
    }
    
    const notifications = await notificationService.getNotificationsForUser(userId);
    res.json(notifications);
  } catch (error) {
    console.error("Errore nel recupero delle notifiche:", error);
    res.status(500).json({ message: "Errore nel recupero delle notifiche" });
  }
});

// Segna una notifica come letta
router.post("/:id/read", isAuthenticated, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const success = await notificationService.markNotificationAsRead(notificationId);
    
    if (!success) {
      return res.status(404).json({ message: "Notifica non trovata" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Errore nell'aggiornamento della notifica:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento della notifica" });
  }
});

// Segna tutte le notifiche come lette
router.post("/read-all", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Utente non autenticato" });
    }
    
    const count = await notificationService.markAllNotificationsAsRead(userId);
    res.json({ success: true, count });
  } catch (error) {
    console.error("Errore nell'aggiornamento delle notifiche:", error);
    res.status(500).json({ message: "Errore nell'aggiornamento delle notifiche" });
  }
});

// Rotta di test per creare notifiche (solo per sviluppo)
router.post("/test", isAuthenticated, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ message: "Endpoint non disponibile" });
  }
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Utente non autenticato" });
    }
    
    // Crea una notifica di test per ogni tipo
    const quoteNotification = await notificationService.createQuoteSignedNotification(
      userId, 
      123, 
      "Mario Rossi", 
      "Matrimonio Rossi-Bianchi"
    );
    
    const paymentNotification = await notificationService.createPaymentReceivedNotification(
      userId,
      123,
      "Mario Rossi",
      1500
    );
    
    const eventNotification = await notificationService.createEventReminderNotification(
      userId,
      456,
      "Servizio fotografico Rossi-Bianchi",
      new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000) // 7 giorni nel futuro
    );
    
    const systemNotification = await notificationService.createSystemNotification(
      userId,
      "Aggiornamento sistema",
      "Il sistema è stato aggiornato con nuove funzionalità."
    );
    
    res.json({
      success: true,
      notifications: [
        quoteNotification,
        paymentNotification,
        eventNotification,
        systemNotification
      ]
    });
  } catch (error) {
    console.error("Errore nella creazione delle notifiche di test:", error);
    res.status(500).json({ message: "Errore nella creazione delle notifiche di test" });
  }
});

export default router;