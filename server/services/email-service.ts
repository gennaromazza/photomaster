import sgMail from '@sendgrid/mail';
import { db } from '../db';
import { settings } from '@shared/schema';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { sql } from 'drizzle-orm';
import { emailLimitService, EmailPriority } from './email-limit-service';
import { subscriptionLimitsService } from './subscription-limits-service';

// Inizializza SendGrid con la chiave API
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY non impostata. Le email non verranno inviate.');
}

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: any[];
  userId?: number;                     // ID dell'utente che invia l'email
  priority?: EmailPriority;            // Priorità dell'email
}

/**
 * Invia un'email utilizzando SendGrid, rispettando i limiti di invio
 * @param templateName Nome del template (opzionale, per futuri template personalizzati)
 * @param params Parametri dell'email (destinatario, oggetto, contenuto)
 * @returns Promise che restituisce true se l'invio è riuscito, false altrimenti
 */
export async function sendEmail(templateName: string, params: EmailParams): Promise<boolean> {
  try {
    // Se non è configurata la chiave API, simula l'invio
    if (!process.env.SENDGRID_API_KEY) {
      console.log('Simulazione invio email:', {
        template: templateName,
        to: params.to,
        subject: params.subject,
        content: params.html || params.text
      });
      return true;
    }
    
    // Imposta la priorità predefinita se non specificata
    const priority = params.priority || EmailPriority.MEDIUM;
    
    // Verifica i limiti di invio email
    const isAdmin = !params.userId; // Se non è specificato userId, assume sia un'email di sistema
    
    if (!isAdmin) {
      // Se non è un'email di sistema, verifica i limiti del piano utente
      const canSend = await subscriptionLimitsService.canUserSendEmail(params.userId, priority);
      if (!canSend) {
        console.warn(`Limite di invio email raggiunto per l'utente ${params.userId}. Email a ${params.to} non inviata.`);
        
        // Registra il tentativo fallito nel log
        await db.execute(
          sql`INSERT INTO email_logs (recipient, subject, priority, sent_at, user_id, status)
              VALUES (${params.to}, ${params.subject}, ${priority}, ${new Date().toISOString()}, ${params.userId}, 'failed_limit')`
        );
        
        return false;
      }
    } else {
      // Se è un'email di sistema, verifica i limiti globali
      const canSend = await emailLimitService.canSendEmail(priority);
      if (!canSend && priority !== EmailPriority.CRITICAL) {
        console.warn(`Limite globale di invio email raggiunto. Email a ${params.to} non inviata.`);
        return false;
      }
    }

    // Ottieni le impostazioni per l'email del mittente
    const [appSettings] = await db.select().from(settings);
    const fromEmail = appSettings?.companyEmail || 'info@imagestudio.com';
    const fromName = appSettings?.companyName || 'Image Studio';

    // Crea il contenuto dell'email nel formato richiesto da SendGrid
    const content: {type: string, value: string}[] = [];
    if (params.text) {
      content.push({
        type: 'text/plain',
        value: params.text
      });
    }
    if (params.html) {
      content.push({
        type: 'text/html',
        value: params.html
      });
    }

    // Assicuriamoci che ci sia almeno un contenuto
    if (content.length === 0 && (params.text || params.html)) {
      content.push({
        type: 'text/plain',
        value: params.text || params.html || 'Nessun contenuto fornito'
      });
    }

    const msg = {
      to: params.to,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: params.subject,
      content: content,
      attachments: params.attachments
    };

    await sgMail.send(msg as any);
    
    // Registra l'email inviata nel log
    if (params.userId) {
      await db.execute(
        sql`INSERT INTO email_logs (recipient, subject, priority, sent_at, user_id, status)
            VALUES (${params.to}, ${params.subject}, ${priority}, ${new Date().toISOString()}, ${params.userId}, 'sent')`
      );
    } else {
      // Email di sistema (senza userId)
      await db.execute(
        sql`INSERT INTO email_logs (recipient, subject, priority, sent_at, status)
            VALUES (${params.to}, ${params.subject}, ${priority}, ${new Date().toISOString()}, 'sent')`
      );
    }
    
    return true;
  } catch (error) {
    console.error('Errore nell\'invio dell\'email:', error);
    
    // Registra il fallimento nel log
    if (params.userId) {
      try {
        await db.execute(
          sql`INSERT INTO email_logs (recipient, subject, priority, sent_at, user_id, status)
              VALUES (${params.to}, ${params.subject}, ${priority}, ${new Date().toISOString()}, ${params.userId}, 'failed')`
        );
      } catch (logError) {
        console.error('Errore nella registrazione del fallimento dell\'invio:', logError);
      }
    }
    
    return false;
  }
}

interface PaymentNotificationParams {
  clientEmail: string;
  clientName: string;
  amount: number | string;
  description: string;
  quoteTitle: string;
  date: string;
}

/**
 * Invia una notifica di pagamento ricevuto al cliente
 * @param params Parametri per la notifica di pagamento
 * @returns Promise che restituisce true se l'invio è riuscito, false altrimenti
 */
export async function sendPaymentNotification(params: PaymentNotificationParams): Promise<boolean> {
  try {
    // Ottieni le impostazioni per ottenere eventuali template personalizzati
    const [appSettings] = await db.select().from(settings);
    
    // Formatta l'importo come valuta
    const formattedAmount = typeof params.amount === 'number' 
      ? params.amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
      : parseFloat(params.amount.toString()).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
    
    // Crea il soggetto dell'email
    const subject = `Conferma pagamento ricevuto: ${params.quoteTitle}`;
    
    // Crea il contenuto dell'email
    const text = `
      Gentile ${params.clientName},

      Confermiamo di aver ricevuto il tuo pagamento per il preventivo "${params.quoteTitle}".

      Dettagli del pagamento:
      - Importo: ${formattedAmount}
      - Data: ${params.date}
      - Descrizione: ${params.description}

      Grazie per la tua fiducia.

      Cordiali saluti,
      ${appSettings?.companyName || 'Image Studio'}
      ${appSettings?.companyPhone ? 'Tel: ' + appSettings.companyPhone : ''}
      ${appSettings?.companyEmail || 'info@imagestudio.com'}
    `;
    
    // Crea una versione HTML del contenuto
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Conferma Pagamento</h2>
        <p>Gentile ${params.clientName},</p>
        <p>Confermiamo di aver ricevuto il tuo pagamento per il preventivo <strong>"${params.quoteTitle}"</strong>.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #444;">Dettagli del pagamento:</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li><strong>Importo:</strong> ${formattedAmount}</li>
            <li><strong>Data:</strong> ${params.date}</li>
            <li><strong>Descrizione:</strong> ${params.description}</li>
          </ul>
        </div>
        
        <p>Grazie per la tua fiducia.</p>
        
        <p style="margin-top: 30px; color: #666;">
          Cordiali saluti,<br>
          <strong>${appSettings?.companyName || 'Image Studio'}</strong><br>
          ${appSettings?.companyPhone ? 'Tel: ' + appSettings.companyPhone + '<br>' : ''}
          ${appSettings?.companyEmail || 'info@imagestudio.com'}
        </p>
      </div>
    `;
    
    // Invia l'email
    return await sendEmail('payment_notification', {
      to: params.clientEmail,
      subject,
      text,
      html
    });
  } catch (error) {
    console.error('Errore nell\'invio della notifica di pagamento:', error);
    return false;
  }
}