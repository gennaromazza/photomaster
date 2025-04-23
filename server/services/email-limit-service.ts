/**
 * Servizio per la gestione dei limiti di invio email SendGrid
 * Permette di monitorare e limitare il numero di email inviate
 * per non superare i limiti del piano SendGrid
 * e distribuire l'invio di grandi volumi di email su più giorni se necessario
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

// Interfaccia per la configurazione dei limiti
export interface EmailLimitConfig {
  dailyLimit: number;         // Limite giornaliero di email (dal piano SendGrid)
  monthlyLimit?: number;      // Limite mensile di email (opzionale)
  warningThreshold: number;   // Soglia di avviso (percentuale 0-1)
  emergencyReserve: number;   // Email da riservare per comunicazioni critiche
}

// Stato attuale dell'utilizzo
export interface EmailUsageStatus {
  sentToday: number;          // Email inviate oggi
  sentThisMonth: number;      // Email inviate questo mese
  remainingToday: number;     // Email rimanenti oggi
  remainingThisMonth: number; // Email rimanenti questo mese
  isLimitReached: boolean;    // Se il limite è stato raggiunto
  isWarningReached: boolean;  // Se la soglia di avviso è stata raggiunta
}

// Configurazione predefinita
const DEFAULT_CONFIG: EmailLimitConfig = {
  dailyLimit: 100,           // Piano gratuito SendGrid = 100 email al giorno
  monthlyLimit: 3000,        // 100 * 30 giorni = 3000 al mese
  warningThreshold: 0.8,     // Avvisa quando viene raggiunto l'80% del limite
  emergencyReserve: 5        // Tieni 5 email per comunicazioni critiche
};

// Priorità delle email
export enum EmailPriority {
  LOW = 'low',               // Notifiche di bassa priorità (promemoria, newsletter)
  MEDIUM = 'medium',         // Notifiche informative (aggiornamenti stato)
  HIGH = 'high',             // Notifiche importanti (pagamenti, conferme)
  CRITICAL = 'critical'      // Comunicazioni critiche (accesso, sicurezza)
}

/**
 * Classe per la gestione dei limiti di invio email
 */
export class EmailLimitService {
  private config: EmailLimitConfig;
  
  constructor(config: Partial<EmailLimitConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };
  }
  
  /**
   * Ottiene lo stato attuale dell'utilizzo delle email
   */
  async getUsageStatus(): Promise<EmailUsageStatus> {
    try {
      // Ottiene la data di inizio del giorno corrente
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Ottiene la data di inizio del mese corrente
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Ottiene il numero di email inviate oggi dalla tabella dei log
      const [todayResult] = await db.execute(
        sql`SELECT COUNT(*) as count FROM email_logs WHERE sent_at >= ${today.toISOString()}`
      );
      
      // Ottiene il numero di email inviate questo mese
      const [monthResult] = await db.execute(
        sql`SELECT COUNT(*) as count FROM email_logs WHERE sent_at >= ${startOfMonth.toISOString()}`
      );
      
      const sentToday = (todayResult?.count || 0) as number;
      const sentThisMonth = (monthResult?.count || 0) as number;
      
      const remainingToday = Math.max(0, this.config.dailyLimit - sentToday);
      const remainingThisMonth = this.config.monthlyLimit 
        ? Math.max(0, this.config.monthlyLimit - sentThisMonth)
        : remainingToday; // Se non c'è limite mensile, usa quello giornaliero
      
      return {
        sentToday,
        sentThisMonth,
        remainingToday,
        remainingThisMonth,
        isLimitReached: remainingToday <= this.config.emergencyReserve,
        isWarningReached: sentToday >= (this.config.dailyLimit * this.config.warningThreshold)
      };
    } catch (error) {
      console.error('Errore nel recupero dello stato di utilizzo delle email:', error);
      
      // In caso di errore, ritorna uno stato conservativo
      return {
        sentToday: 0,
        sentThisMonth: 0,
        remainingToday: this.config.dailyLimit,
        remainingThisMonth: this.config.monthlyLimit || this.config.dailyLimit,
        isLimitReached: false,
        isWarningReached: false
      };
    }
  }
  
  /**
   * Verifica se è possibile inviare un'email in base ai limiti e alla priorità
   * @param priority Priorità dell'email
   * @returns True se l'email può essere inviata, False altrimenti
   */
  async canSendEmail(priority: EmailPriority = EmailPriority.MEDIUM): Promise<boolean> {
    try {
      const status = await this.getUsageStatus();
      
      // Se non abbiamo raggiunto il limite, possiamo inviare l'email
      if (!status.isLimitReached) {
        return true;
      }
      
      // Se abbiamo raggiunto il limite, controlla la priorità
      if (priority === EmailPriority.CRITICAL) {
        // Le email critiche possono sempre essere inviate
        return true;
      }
      
      // Per le altre priorità, verifica se ci sono ancora email disponibili
      if (priority === EmailPriority.HIGH) {
        // Le email ad alta priorità possono essere inviate se non abbiamo 
        // esaurito completamente il limite
        return status.remainingToday > 0;
      }
      
      // Le email a media e bassa priorità non possono essere inviate se abbiamo 
      // raggiunto la soglia di avviso
      return !status.isWarningReached;
    } catch (error) {
      console.error('Errore nella verifica dei limiti di invio email:', error);
      
      // In caso di errore, consentiamo solo le email critiche
      return priority === EmailPriority.CRITICAL;
    }
  }
  
  /**
   * Registra l'invio di un'email nel log
   * @param to Destinatario dell'email
   * @param subject Oggetto dell'email
   * @param priority Priorità dell'email
   */
  async logEmailSent(to: string, subject: string, priority: EmailPriority = EmailPriority.MEDIUM): Promise<void> {
    try {
      await db.execute(
        sql`INSERT INTO email_logs (recipient, subject, priority, sent_at)
            VALUES (${to}, ${subject}, ${priority}, ${new Date().toISOString()})`
      );
    } catch (error) {
      console.error('Errore nella registrazione dell\'invio dell\'email:', error);
    }
  }
  
  /**
   * Ottiene le statistiche di invio email
   */
  async getEmailStats() {
    try {
      // Ottiene gli ultimi 30 giorni
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Ottiene il conteggio giornaliero
      const dailyStats = await db.execute(
        sql`SELECT 
            DATE(sent_at) as date,
            COUNT(*) as count
           FROM email_logs 
           WHERE sent_at >= ${thirtyDaysAgo.toISOString()}
           GROUP BY DATE(sent_at)
           ORDER BY date ASC`
      );
      
      // Ottiene il conteggio per priorità
      const priorityStats = await db.execute(
        sql`SELECT 
            priority,
            COUNT(*) as count
           FROM email_logs 
           WHERE sent_at >= ${thirtyDaysAgo.toISOString()}
           GROUP BY priority`
      );
      
      return {
        daily: dailyStats,
        byPriority: priorityStats
      };
    } catch (error) {
      console.error('Errore nel recupero delle statistiche di invio email:', error);
      return {
        daily: [],
        byPriority: []
      };
    }
  }
  
  /**
   * Aggiorna la configurazione dei limiti
   * @param newConfig Nuova configurazione dei limiti
   */
  updateConfig(newConfig: Partial<EmailLimitConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }
}

// Crea un'istanza singleton del servizio
export const emailLimitService = new EmailLimitService();