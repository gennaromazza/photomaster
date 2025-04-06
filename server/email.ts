import { MailService } from '@sendgrid/mail';
import { User } from "../shared/schema";

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
  const subject = "Nuova registrazione utente";
  const text = `
Ciao Admin,

Un nuovo utente si è registrato sulla piattaforma Studio Arte.

Dettagli dell'utente:
- Nome completo: ${user.fullName}
- Username: ${user.username}
- Email: ${user.email}
- Ruolo richiesto: ${user.role}

Per approvare o rifiutare questa richiesta, accedi al pannello di amministrazione.

Saluti,
Studio Arte
`;

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
  const subject = "Account Studio Arte approvato";
  const text = `
Ciao ${user.fullName},

Il tuo account su Studio Arte è stato approvato e ora è attivo.

Puoi accedere utilizzando le tue credenziali.

Saluti,
Studio Arte
`;

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
  const subject = "Account Studio Arte disabilitato";
  const text = `
Ciao ${user.fullName},

Il tuo account su Studio Arte è stato disabilitato.

Per maggiori informazioni, contatta l'amministratore.

Saluti,
Studio Arte
`;

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
  const subject = "Reset Password Studio Arte";
  const text = `
Ciao ${user.fullName},

Hai richiesto il reset della password per il tuo account su Studio Arte.

Per completare il reset della password, clicca sul seguente link:
${resetUrl}

Questo link è valido per 24 ore.
Se non hai richiesto il reset della password, puoi ignorare questa email.

Saluti,
Studio Arte
`;

  return await sendEmail({
    to: user.email,
    subject,
    text,
  });
}