import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | number, formatString: string = "d MMMM yyyy") {
  return format(new Date(date), formatString, { locale: it });
}

export function formatCurrency(amount: number, currency: string = "EUR") {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

export function getStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
    case "signed":
    case "available":
      return "green";
    case "in-progress":
    case "in progress":
    case "in corso":
      return "amber";
    case "pending":
    case "upcoming":
    case "prossimo":
      return "blue";
    case "cancelled":
    case "busy":
    case "occupato":
      return "red";
    default:
      return "default";
  }
}

export function getStatusText(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
      return "Completato";
    case "signed":
      return "Firmato";
    case "available":
      return "Disponibile";
    case "in-progress":
    case "in progress":
      return "In Corso";
    case "pending":
      return "In Attesa";
    case "upcoming":
    case "prossimo":
      return "Prossimo";
    case "cancelled":
      return "Annullato";
    case "busy":
    case "occupato":
      return "Occupato";
    default:
      return status;
  }
}

export function getDaysLeftText(dueDate: Date | string) {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return "Oggi";
  } else if (diffDays === 1) {
    return "Domani";
  } else if (diffDays < 0) {
    return "Scaduto";
  } else if (diffDays <= 7) {
    return `${diffDays} giorni`;
  } else {
    return `${Math.floor(diffDays / 7)} settimane`;
  }
}

export function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
