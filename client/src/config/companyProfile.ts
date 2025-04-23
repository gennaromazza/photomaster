import { useQuery } from "@tanstack/react-query";
import { Settings } from "@shared/schema";

/**
 * Hook personalizzato per recuperare i dati del profilo aziendale
 * Centralizza l'accesso alle informazioni dell'azienda in tutta l'applicazione
 */
export function useCompanyProfile() {
  const { 
    data: settings, 
    isLoading, 
    isError,
    error
  } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    staleTime: 5 * 60 * 1000, // 5 minuti di cache
  });

  const companyName = settings?.companyName || "Studio Fotografico";
  const companyEmail = settings?.companyEmail || "";
  const companyPhone = settings?.companyPhone || "";
  const companyAddress = settings?.companyAddress || "";
  const companyLogo = settings?.companyLogo || "";
  
  // Valori per la filigrana (watermark)
  const watermarkText = (settings?.additionalSettings as any)?.watermark?.text || companyName;
  const watermarkOpacity = (settings?.additionalSettings as any)?.watermark?.opacity || 0.3;
  const watermarkRotate = (settings?.additionalSettings as any)?.watermark?.rotate || -30;
  
  // Dati formattati per uso comune
  const companyInfoString = [companyName, companyAddress, companyPhone, companyEmail]
    .filter(Boolean)
    .join(" • ");

  return {
    settings,
    isLoading,
    isError,
    error,
    companyName,
    companyEmail,
    companyPhone,
    companyAddress,
    companyLogo,
    companyInfoString,
    watermark: {
      text: watermarkText,
      opacity: watermarkOpacity,
      rotate: watermarkRotate
    }
  };
}

/**
 * Funzione per generare link di contatto (email, WhatsApp, ecc.)
 */
export function getEmailUrl(email: string): string {
  return `mailto:${email}`;
}

export function getWhatsAppUrl(phone: string): string {
  // Rimuovi spazi, trattini e altri caratteri non numerici
  const cleanPhone = phone.replace(/\s+|-|\(|\)|\+/g, "");
  // Se inizia con 0, rimuovilo e aggiungi 39 (prefisso italiano)
  const formattedPhone = cleanPhone.startsWith("0") 
    ? `39${cleanPhone.substring(1)}` 
    : cleanPhone.startsWith("39") 
      ? cleanPhone 
      : `39${cleanPhone}`;
  return `https://wa.me/${formattedPhone}`;
}

/**
 * Costanti per l'azienda
 */
export const DEFAULT_COMPANY_NAME = "Studio Fotografico";