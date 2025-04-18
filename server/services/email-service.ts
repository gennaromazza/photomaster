import sgMail from '@sendgrid/mail';
import { db } from '../db';
import { settings } from '@shared/schema';

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
}

/**
 * Invia un'email utilizzando SendGrid
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
    return true;
  } catch (error) {
    console.error('Errore nell\'invio dell\'email:', error);
    return false;
  }
}