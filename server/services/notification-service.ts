import { db } from "../db";
import { v4 as uuidv4 } from "uuid";

export interface Notification {
  id: string;
  userId: number;
  type: 'quote_signed' | 'payment_received' | 'event_reminder' | 'system';
  title: string;
  message: string;
  link?: string;
  resourceId?: number;
  resourceType?: string;
  metadata?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

// Sistema di memorizzazione in-memory per le notifiche
// In una implementazione produttiva, questo dovrebbe essere sostituito con un database
let notifications: Notification[] = [];

/**
 * Crea una nuova notifica
 */
export async function createNotification(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>): Promise<Notification> {
  const newNotification: Notification = {
    id: uuidv4(),
    ...notification,
    read: false,
    createdAt: new Date()
  };
  
  notifications.push(newNotification);
  
  return newNotification;
}

/**
 * Ottieni tutte le notifiche per un utente
 */
export async function getNotificationsForUser(userId: number): Promise<Notification[]> {
  return notifications
    .filter(n => n.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Segna una notifica come letta
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const index = notifications.findIndex(n => n.id === notificationId);
  if (index === -1) return false;
  
  notifications[index].read = true;
  return true;
}

/**
 * Segna tutte le notifiche di un utente come lette
 */
export async function markAllNotificationsAsRead(userId: number): Promise<number> {
  let count = 0;
  
  notifications = notifications.map(n => {
    if (n.userId === userId && !n.read) {
      count++;
      return { ...n, read: true };
    }
    return n;
  });
  
  return count;
}

/**
 * Elimina notifiche più vecchie di N giorni
 */
export async function cleanupOldNotifications(days: number = 30): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  const oldLength = notifications.length;
  notifications = notifications.filter(n => n.createdAt >= cutoff);
  
  return oldLength - notifications.length;
}

/**
 * Crea una notifica per un preventivo firmato
 */
export async function createQuoteSignedNotification(
  userId: number,
  quoteId: number,
  clientName: string,
  quoteTitle: string
): Promise<Notification> {
  return createNotification({
    userId,
    type: 'quote_signed',
    title: 'Preventivo firmato',
    message: `Il preventivo "${quoteTitle}" è stato firmato da ${clientName}`,
    link: `/quotes/${quoteId}`,
    resourceId: quoteId,
    resourceType: 'quote',
  });
}

/**
 * Crea una notifica per un pagamento ricevuto
 */
export async function createPaymentReceivedNotification(
  userId: number,
  quoteId: number,
  clientName: string,
  amount: number,
  currency: string = "EUR"
): Promise<Notification> {
  const formattedAmount = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency
  }).format(amount);
  
  return createNotification({
    userId,
    type: 'payment_received',
    title: 'Pagamento ricevuto',
    message: `Ricevuto pagamento di ${formattedAmount} da ${clientName}`,
    link: `/quotes/${quoteId}/payments`,
    resourceId: quoteId,
    resourceType: 'payment',
  });
}

/**
 * Crea una notifica di promemoria evento
 */
export async function createEventReminderNotification(
  userId: number,
  eventId: number,
  eventTitle: string,
  eventDate: Date
): Promise<Notification> {
  const formattedDate = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(eventDate);
  
  return createNotification({
    userId,
    type: 'event_reminder',
    title: 'Promemoria evento',
    message: `L'evento "${eventTitle}" è programmato per ${formattedDate}`,
    link: `/events/${eventId}`,
    resourceId: eventId,
    resourceType: 'event',
  });
}

/**
 * Crea una notifica di sistema generica
 */
export async function createSystemNotification(
  userId: number,
  title: string,
  message: string,
  link?: string
): Promise<Notification> {
  return createNotification({
    userId,
    type: 'system',
    title,
    message,
    link,
  });
}