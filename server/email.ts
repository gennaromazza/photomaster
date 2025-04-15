import { MailService } from '@sendgrid/mail';
import { User } from "../shared/schema";
import { storage } from './storage';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Configura il servizio SendGrid
const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY!);

const ADMIN_EMAIL = "gennaro.mazzacane@gmail.com";
const FROM_EMAIL = "noreply@studioarte.it";

// Interfaccia per i parametri base dell'email
interface BaseEmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Interfaccia per i parametri dell'email per SendGrid
type SendGridEmailParams = {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
};

// Interfaccia per i dati sostituibili nei template
interface TemplateData {
  [key: string]: string | number | Date | undefined | null;
}

/**
 * Sostituisce le variabili in un template
 */
async function processTemplate(template: string | undefined | null, data: TemplateData): Promise<string> {
  if (!template) return '';
  
  // Ottieni le impostazioni dello studio
  const settings = await storage.getSettings();
  
  // Aggiungi le variabili dello studio
  const studioData = {
    studio_nome: settings?.companyName || 'Studio Arte',
    studio_email: settings?.companyEmail || 'info@studioarte.it',
    studio_telefono: settings?.companyPhone || '',
    studio_indirizzo: settings?.companyAddress || '',
    ...data
  };
  
  // Sostituisci le variabili nel template
  let processedTemplate = template;
  for (const [key, value] of Object.entries(studioData)) {
    if (value !== undefined && value !== null) {
      // Gestisci le date in modo speciale
      let formattedValue: string;
      // Verifica se è una data controllando se ha il metodo getMonth
      if (value && typeof value === 'object' && 'getMonth' in value) {
        formattedValue = format(value as Date, 'dd/MM/yyyy', { locale: it });
      } else {
        formattedValue = String(value);
      }
        
      // Sostituisci tutti gli occorrimenti
      const regex = new RegExp(`{${key}}`, 'g');
      processedTemplate = processedTemplate.replace(regex, formattedValue);
    }
  }
  
  return processedTemplate;
}

/**
 * Invia una email utilizzando il servizio SendGrid
 */
export async function sendEmail(params: BaseEmailParams): Promise<boolean> {
  try {
    const emailParams: SendGridEmailParams = {
      to: params.to,
      from: FROM_EMAIL,
      subject: params.subject,
      text: params.text ?? "",
      html: params.html ?? params.text ?? "",
    };
    
    await mailService.send(emailParams);
    console.log(`Email inviata a ${params.to}`);
    return true;
  } catch (error) {
    console.error('Errore nell\'invio dell\'email:', error);
    return false;
  }
}

/**
 * Invia una notifica all'amministratore per una nuova registrazione
 */
export async function sendRegistrationNotification(user: User): Promise<boolean> {
  const settings = await storage.getSettings();
  const subject = "Nuova registrazione utente";
  
  // Prepara i dati per il template
  const templateData: TemplateData = {
    utente_nome: user.fullName,
    utente_username: user.username,
    utente_email: user.email,
    utente_ruolo: user.role
  };
  
  // Ottieni il template dalle impostazioni o usa quello predefinito
  const defaultTemplate = `Nuovo utente registrato!

Un nuovo utente si è registrato alla piattaforma.

Dettagli:
- Nome: {utente_nome}
- Email: {utente_email}
- Username: {utente_username}
- Ruolo: {utente_ruolo}

Accedi alla piattaforma per approvare o rifiutare questa registrazione.`;

  // Processa il template con le variabili
  const text = await processTemplate(settings?.emailRegistrationNotification || defaultTemplate, templateData);

  return await sendEmail({
    to: ADMIN_EMAIL,
    subject,
    text,
  });
}

/**
 * Invia una notifica all'utente quando il suo account viene approvato
 */
export async function sendApprovalNotification(user: User): Promise<boolean> {
  const settings = await storage.getSettings();
  const subject = "Account Studio Arte approvato";
  
  // Prepara i dati per il template
  const templateData: TemplateData = {
    utente_nome: user.fullName,
    utente_email: user.email,
    utente_username: user.username
  };
  
  // Ottieni il template dalle impostazioni o usa quello predefinito
  const defaultTemplate = `Gentile {utente_nome},

Siamo lieti di informarti che il tuo account è stato approvato!

Ora puoi accedere alla piattaforma utilizzando le tue credenziali.

Studio {studio_nome}
{studio_email}
{studio_telefono}`;

  // Processa il template con le variabili
  const text = await processTemplate(settings?.emailApprovalNotification || defaultTemplate, templateData);

  return await sendEmail({
    to: user.email,
    subject,
    text,
  });
}

/**
 * Invia una notifica all'utente quando il suo account viene disabilitato
 */
export async function sendDisabledNotification(user: User): Promise<boolean> {
  const settings = await storage.getSettings();
  const subject = "Account Studio Arte disabilitato";
  
  // Prepara i dati per il template
  const templateData: TemplateData = {
    utente_nome: user.fullName,
    utente_email: user.email
  };
  
  // Ottieni il template dalle impostazioni o usa quello predefinito
  const defaultTemplate = `Gentile {utente_nome},

Ti informiamo che il tuo account è stato temporaneamente disabilitato.

Per maggiori informazioni, contatta l'amministratore della piattaforma.

Studio {studio_nome}
{studio_email}
{studio_telefono}`;

  // Processa il template con le variabili
  const text = await processTemplate(settings?.emailDisabledNotification || defaultTemplate, templateData);

  return await sendEmail({
    to: user.email,
    subject,
    text,
  });
}

/**
 * Invia un'email con il link per il reset della password
 */
export async function sendPasswordResetEmail(user: User, resetUrl: string): Promise<boolean> {
  const settings = await storage.getSettings();
  const subject = "Reset Password Studio Arte";
  
  // Prepara i dati per il template
  const templateData: TemplateData = {
    utente_nome: user.fullName,
    utente_email: user.email,
    reset_url: resetUrl
  };
  
  // Ottieni il template dalle impostazioni o usa quello predefinito
  const defaultTemplate = `Gentile {utente_nome},

Abbiamo ricevuto una richiesta di reset della password per il tuo account.

Per completare il reset della password, clicca sul seguente link:
{reset_url}

Questo link è valido per 24 ore.
Se non hai richiesto il reset della password, puoi ignorare questa email.

Cordiali saluti,
{studio_nome}
{studio_email}
{studio_telefono}`;

  // Processa il template con le variabili
  const text = await processTemplate(settings?.emailPasswordReset || defaultTemplate, templateData);

  return await sendEmail({
    to: user.email,
    subject,
    text,
  });
}

/**
 * Invia una notifica all'amministratore quando un preventivo viene firmato
 */
export async function sendQuoteSignedNotification(quote: any, clientName: string, signature: string): Promise<boolean> {
  const settings = await storage.getSettings();
  const subject = `Preventivo firmato: ${quote.title}`;
  
  // Prepara i dati per il template
  const today = new Date();
  const templateData: TemplateData = {
    cliente_nome: clientName,
    preventivo_titolo: quote.title,
    preventivo_id: quote.id,
    firma: signature,
    data_firma: today
  };
  
  // Ottieni il template dalle impostazioni o usa quello predefinito
  const defaultTemplate = `Nuovo preventivo firmato!

Il preventivo "{preventivo_titolo}" è stato firmato da {cliente_nome}.

Dettagli:
- Cliente: {cliente_nome}
- Preventivo: {preventivo_titolo}
- Data firma: {data_firma}
- Firma: {firma}

Accedi alla piattaforma per visualizzare tutti i dettagli.`;

  // Processa il template con le variabili
  const text = await processTemplate(settings?.emailQuoteSignedAdmin || defaultTemplate, templateData);

  return await sendEmail({
    to: ADMIN_EMAIL,
    subject,
    text,
  });
}

/**
 * Invia una conferma al cliente dopo la firma del preventivo
 */
export async function sendQuoteSignedConfirmation(clientEmail: string, clientName: string, quote: any): Promise<boolean> {
  if (!clientEmail) return false;
  
  const settings = await storage.getSettings();
  const subject = `Conferma firma: ${quote.title}`;
  
  // Prepara i dati per il template
  const templateData: TemplateData = {
    cliente_nome: clientName,
    preventivo_titolo: quote.title
  };
  
  // Ottieni il template dalle impostazioni o usa quello predefinito
  const defaultTemplate = `Gentile {cliente_nome},

Grazie per aver firmato il preventivo "{preventivo_titolo}".

Confermiamo di aver ricevuto la tua accettazione e procederemo con l'organizzazione del servizio fotografico.
Ti contatteremo a breve per definire tutti i dettagli.

Cordiali saluti,
{studio_nome}
{studio_telefono}
{studio_email}`;

  // Processa il template con le variabili
  const text = await processTemplate(settings?.emailQuoteSignedClient || defaultTemplate, templateData);

  return await sendEmail({
    to: clientEmail,
    subject,
    text,
  });
}