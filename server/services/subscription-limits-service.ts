/**
 * Servizio per la gestione dei limiti basati su abbonamento
 * Gestisce i limiti di spazio galleria, email SendGrid e altre risorse
 * in base al piano di abbonamento del fotografo
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { emailLimitService, EmailPriority } from './email-limit-service';

// Tipi di piani di abbonamento
export enum SubscriptionPlan {
  FREE = 'free',             // Piano gratuito (funzionalità limitate)
  BASIC = 'basic',           // Piano base
  PROFESSIONAL = 'pro',      // Piano professionale
  BUSINESS = 'business',     // Piano business/aziendale
  ENTERPRISE = 'enterprise'  // Piano personalizzato per grandi studi
}

// Limiti per ciascun piano di abbonamento
export interface PlanLimits {
  // Limiti di spazio
  storageGB: number;          // Spazio di archiviazione in GB
  
  // Limiti email
  emailsPerDay: number;       // Email inviate al giorno
  emailsPerMonth: number;     // Email inviate al mese
  
  // Limiti galleria
  maxGalleries: number;       // Numero massimo di gallerie
  maxPhotosPerGallery: number;// Numero massimo di foto per galleria
  maxVideosPerGallery: number;// Numero massimo di video per galleria
  maxResolutionMB: number;    // Risoluzione massima per foto in MB
  
  // Limiti clienti
  maxClients: number;         // Numero massimo di clienti
  
  // Funzionalità
  allowSelections: boolean;   // Consente selezioni foto ai clienti
  allowComments: boolean;     // Consente commenti nelle gallerie
  allowWatermark: boolean;    // Consente filigrana personalizzata
  allowDownloads: boolean;    // Consente download di immagini
  customDomain: boolean;      // Consente dominio personalizzato
}

// Configurazione predefinita per ciascun piano
const PLAN_CONFIGURATIONS: Record<SubscriptionPlan, PlanLimits> = {
  [SubscriptionPlan.FREE]: {
    storageGB: 1,
    emailsPerDay: 50,
    emailsPerMonth: 500,
    maxGalleries: 5,
    maxPhotosPerGallery: 100,
    maxVideosPerGallery: 0,
    maxResolutionMB: 5,
    maxClients: 10,
    allowSelections: false,
    allowComments: false,
    allowWatermark: false,
    allowDownloads: false,
    customDomain: false
  },
  [SubscriptionPlan.BASIC]: {
    storageGB: 5,
    emailsPerDay: 100,
    emailsPerMonth: 1000,
    maxGalleries: 20,
    maxPhotosPerGallery: 300,
    maxVideosPerGallery: 5,
    maxResolutionMB: 10,
    maxClients: 50,
    allowSelections: true,
    allowComments: true,
    allowWatermark: true,
    allowDownloads: true,
    customDomain: false
  },
  [SubscriptionPlan.PROFESSIONAL]: {
    storageGB: 20,
    emailsPerDay: 300,
    emailsPerMonth: 3000,
    maxGalleries: 50,
    maxPhotosPerGallery: 800,
    maxVideosPerGallery: 15,
    maxResolutionMB: 20,
    maxClients: 200,
    allowSelections: true,
    allowComments: true,
    allowWatermark: true,
    allowDownloads: true,
    customDomain: true
  },
  [SubscriptionPlan.BUSINESS]: {
    storageGB: 50,
    emailsPerDay: 1000,
    emailsPerMonth: 10000,
    maxGalleries: 150,
    maxPhotosPerGallery: 2000,
    maxVideosPerGallery: 50,
    maxResolutionMB: 30,
    maxClients: 500,
    allowSelections: true,
    allowComments: true,
    allowWatermark: true,
    allowDownloads: true,
    customDomain: true
  },
  [SubscriptionPlan.ENTERPRISE]: {
    storageGB: 250,
    emailsPerDay: 5000,
    emailsPerMonth: 50000,
    maxGalleries: 500,
    maxPhotosPerGallery: 5000,
    maxVideosPerGallery: 200,
    maxResolutionMB: 50,
    maxClients: 2000,
    allowSelections: true,
    allowComments: true,
    allowWatermark: true,
    allowDownloads: true,
    customDomain: true
  }
};

/**
 * Classe per la gestione dei limiti basati sull'abbonamento
 */
export class SubscriptionLimitsService {
  
  /**
   * Ottiene il piano di abbonamento di un utente
   * @param userId ID dell'utente
   * @returns Piano di abbonamento
   */
  async getUserPlan(userId: number): Promise<SubscriptionPlan> {
    try {
      // Ottieni i dati dell'abbonamento dal database
      const [subscription] = await db.execute(
        sql`SELECT plan FROM user_subscriptions WHERE user_id = ${userId} AND status = 'active'`
      );
      
      return (subscription?.plan as SubscriptionPlan) || SubscriptionPlan.FREE;
    } catch (error) {
      console.error('Errore nel recupero del piano di abbonamento:', error);
      // In caso di errore, ritorna il piano gratuito
      return SubscriptionPlan.FREE;
    }
  }
  
  /**
   * Ottiene i limiti per il piano di abbonamento di un utente
   * @param userId ID dell'utente
   * @returns Limiti del piano
   */
  async getUserLimits(userId: number): Promise<PlanLimits> {
    const plan = await this.getUserPlan(userId);
    return PLAN_CONFIGURATIONS[plan];
  }
  
  /**
   * Verifica se un utente può inviare un'email in base al suo piano
   * @param userId ID dell'utente
   * @param priority Priorità dell'email
   * @returns True se l'email può essere inviata, False altrimenti
   */
  async canUserSendEmail(userId: number, priority: EmailPriority = EmailPriority.MEDIUM): Promise<boolean> {
    try {
      // Ottieni il piano dell'utente
      const userPlan = await this.getUserPlan(userId);
      
      // Ottieni i limiti del piano
      const planLimits = PLAN_CONFIGURATIONS[userPlan];
      
      // Imposta i limiti di invio email per questo utente
      emailLimitService.updateConfig({
        dailyLimit: planLimits.emailsPerDay,
        monthlyLimit: planLimits.emailsPerMonth
      });
      
      // Verifica se l'utente può inviare l'email
      return await emailLimitService.canSendEmail(priority);
    } catch (error) {
      console.error('Errore nella verifica dei limiti di invio email per l\'utente:', error);
      // In caso di errore, consentire solo le email critiche
      return priority === EmailPriority.CRITICAL;
    }
  }
  
  /**
   * Verifica se un utente può caricare una nuova foto o video in una galleria
   * @param userId ID dell'utente
   * @param galleryId ID della galleria
   * @param fileSize Dimensione del file in MB
   * @param fileType Tipo di file ('photo' o 'video')
   * @returns Un oggetto che indica se il caricamento è consentito e il motivo in caso contrario
   */
  async canUploadToGallery(
    userId: number, 
    galleryId: number, 
    fileSize: number,
    fileType: 'photo' | 'video' = 'photo'
  ): Promise<{allowed: boolean, reason?: string}> {
    try {
      // Ottieni i limiti dell'utente
      const limits = await this.getUserLimits(userId);
      
      // Controlla la dimensione massima del file
      if (fileSize > limits.maxResolutionMB) {
        return {
          allowed: false,
          reason: `La dimensione del file (${fileSize}MB) supera il limite massimo (${limits.maxResolutionMB}MB) consentito dal tuo piano.`
        };
      }
      
      // Controlla lo spazio di archiviazione totale utilizzato
      const [storageUsed] = await db.execute(
        sql`SELECT SUM(size_mb) as total FROM gallery_storage_usage WHERE user_id = ${userId}`
      );
      
      const totalUsedMB = (storageUsed?.total || 0) as number;
      const totalUsedGB = totalUsedMB / 1024;
      
      if (totalUsedGB + (fileSize / 1024) > limits.storageGB) {
        return {
          allowed: false,
          reason: `Non hai abbastanza spazio disponibile. Utilizzo: ${totalUsedGB.toFixed(2)}GB/${limits.storageGB}GB. Aggiorna il tuo piano per ottenere più spazio.`
        };
      }
      
      // Controlla il numero di elementi nella galleria
      if (fileType === 'photo') {
        const [photoCount] = await db.execute(
          sql`SELECT COUNT(*) as count FROM photos WHERE chapter_id IN (SELECT id FROM gallery_chapters WHERE gallery_id = ${galleryId})`
        );
        
        if ((photoCount?.count || 0) as number >= limits.maxPhotosPerGallery) {
          return {
            allowed: false,
            reason: `Hai raggiunto il limite massimo di ${limits.maxPhotosPerGallery} foto per galleria. Aggiorna il tuo piano per caricare più foto.`
          };
        }
      } else if (fileType === 'video') {
        const [videoCount] = await db.execute(
          sql`SELECT COUNT(*) as count FROM gallery_videos WHERE gallery_id = ${galleryId}`
        );
        
        if ((videoCount?.count || 0) as number >= limits.maxVideosPerGallery) {
          return {
            allowed: false,
            reason: `Hai raggiunto il limite massimo di ${limits.maxVideosPerGallery} video per galleria. Aggiorna il tuo piano per caricare più video.`
          };
        }
      }
      
      // Se tutti i controlli sono superati, il caricamento è consentito
      return { allowed: true };
    } catch (error) {
      console.error('Errore nella verifica dei limiti di caricamento:', error);
      return {
        allowed: false,
        reason: 'Si è verificato un errore durante la verifica dei limiti di caricamento. Riprova più tardi.'
      };
    }
  }
  
  /**
   * Verifica se un utente può creare una nuova galleria
   * @param userId ID dell'utente
   * @returns Un oggetto che indica se la creazione è consentita e il motivo in caso contrario
   */
  async canCreateGallery(userId: number): Promise<{allowed: boolean, reason?: string}> {
    try {
      // Ottieni i limiti dell'utente
      const limits = await this.getUserLimits(userId);
      
      // Controlla il numero di gallerie esistenti
      const [galleryCount] = await db.execute(
        sql`SELECT COUNT(*) as count FROM galleries WHERE user_id = ${userId}`
      );
      
      if ((galleryCount?.count || 0) as number >= limits.maxGalleries) {
        return {
          allowed: false,
          reason: `Hai raggiunto il limite massimo di ${limits.maxGalleries} gallerie. Aggiorna il tuo piano per creare più gallerie.`
        };
      }
      
      // Se tutti i controlli sono superati, la creazione è consentita
      return { allowed: true };
    } catch (error) {
      console.error('Errore nella verifica dei limiti di creazione galleria:', error);
      return {
        allowed: false,
        reason: 'Si è verificato un errore durante la verifica dei limiti di creazione galleria. Riprova più tardi.'
      };
    }
  }
  
  /**
   * Verifica se una funzionalità è disponibile per un utente in base al suo piano
   * @param userId ID dell'utente
   * @param feature Nome della funzionalità da verificare
   * @returns True se la funzionalità è disponibile, False altrimenti
   */
  async isFeatureAvailable(userId: number, feature: keyof PlanLimits): Promise<boolean> {
    try {
      const limits = await this.getUserLimits(userId);
      
      // Se la funzionalità è booleana, verifica direttamente
      if (typeof limits[feature] === 'boolean') {
        return limits[feature] as boolean;
      }
      
      // Per le funzionalità numeriche, verifica se il valore è maggiore di zero
      return (limits[feature] as number) > 0;
    } catch (error) {
      console.error(`Errore nella verifica della disponibilità della funzionalità ${feature}:`, error);
      return false;
    }
  }
  
  /**
   * Registra l'utilizzo dello spazio di archiviazione
   * @param userId ID dell'utente
   * @param galleryId ID della galleria
   * @param fileSizeMB Dimensione del file in MB
   */
  async trackStorageUsage(userId: number, galleryId: number, fileSizeMB: number): Promise<void> {
    try {
      await db.execute(
        sql`INSERT INTO gallery_storage_usage (user_id, gallery_id, size_mb, upload_date)
            VALUES (${userId}, ${galleryId}, ${fileSizeMB}, ${new Date().toISOString()})`
      );
    } catch (error) {
      console.error('Errore nel tracciamento dell\'utilizzo dello spazio:', error);
    }
  }
  
  /**
   * Ottiene l'utilizzo attuale dello spazio per un utente
   * @param userId ID dell'utente
   * @returns Oggetto con informazioni sull'utilizzo
   */
  async getStorageUsage(userId: number): Promise<{usedMB: number, usedGB: number, totalGB: number, percentUsed: number}> {
    try {
      // Ottieni l'utilizzo totale dello spazio
      const [storageUsed] = await db.execute(
        sql`SELECT SUM(size_mb) as total FROM gallery_storage_usage WHERE user_id = ${userId}`
      );
      
      const totalUsedMB = (storageUsed?.total || 0) as number;
      const totalUsedGB = totalUsedMB / 1024;
      
      // Ottieni i limiti del piano
      const limits = await this.getUserLimits(userId);
      const percentUsed = (totalUsedGB / limits.storageGB) * 100;
      
      return {
        usedMB: totalUsedMB,
        usedGB: totalUsedGB,
        totalGB: limits.storageGB,
        percentUsed: percentUsed
      };
    } catch (error) {
      console.error('Errore nel recupero dell\'utilizzo dello spazio:', error);
      return {
        usedMB: 0,
        usedGB: 0,
        totalGB: 0,
        percentUsed: 0
      };
    }
  }
}

// Crea un'istanza singleton del servizio
export const subscriptionLimitsService = new SubscriptionLimitsService();