// Definizione dei ruoli collaboratori centralizzata
export const COLLABORATOR_ROLES = [
  { value: "fotografo", label: "Fotografo" },
  { value: "videomaker", label: "Videomaker" },
  { value: "assistente", label: "Assistente" },
  { value: "grafico", label: "Grafico" },
  { value: "pilotaDrone", label: "Pilota Drone" },
  { value: "montatore", label: "Montatore" },
  { value: "altro", label: "Altro" }
];

// Funzione per ottenere l'etichetta di un ruolo
export function getRoleLabel(roleValue: string): string {
  const role = COLLABORATOR_ROLES.find(r => r.value === roleValue);
  return role ? role.label : roleValue;
}

// Definizione stati collaboratori centralizzata
export const COLLABORATOR_STATUS = [
  { value: "attivo", label: "Attivo" },
  { value: "inattivo", label: "Inattivo" },
  { value: "sospeso", label: "Sospeso" }
];

// Funzione per ottenere l'etichetta di uno stato
export function getStatusLabel(statusValue: string): string {
  const status = COLLABORATOR_STATUS.find(s => s.value === statusValue);
  return status ? status.label : statusValue;
}

// Definizione stati montaggi
export const MONTAGGIO_STATUS = [
  { value: "da_iniziare", label: "Da iniziare" },
  { value: "in_lavorazione", label: "In lavorazione" },
  { value: "in_revisione", label: "In revisione" },
  { value: "completato", label: "Completato" },
  { value: "consegnato", label: "Consegnato" }
];

// Funzione per ottenere l'etichetta di uno stato montaggio
export function getMontaggioStatusLabel(statusValue: string): string {
  const status = MONTAGGIO_STATUS.find(s => s.value === statusValue);
  return status ? status.label : statusValue;
}

// Definizione priorità montaggi
export const MONTAGGIO_PRIORITY = [
  { value: "bassa", label: "Bassa" },
  { value: "normale", label: "Normale" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" }
];

// Funzione per ottenere l'etichetta di una priorità
export function getMontaggioPriorityLabel(priorityValue: string): string {
  const priority = MONTAGGIO_PRIORITY.find(p => p.value === priorityValue);
  return priority ? priority.label : priorityValue;
}