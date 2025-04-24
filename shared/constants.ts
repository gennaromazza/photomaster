// Configurazioni centralizzate per l'applicazione

// Ruoli per i collaboratori
export const COLLABORATOR_ROLES = [
  { id: "fotografo", label: "Fotografo" },
  { id: "videografo", label: "Videografo" },
  { id: "assistente", label: "Assistente" },
  { id: "drone", label: "Operatore Drone" },
  { id: "editor", label: "Editor" },
  { id: "makeup", label: "Make-up Artist" },
] as const;

// Tipo TypeScript per i ruoli collaboratori
export type CollaboratorRole = typeof COLLABORATOR_ROLES[number]["id"];

// Stati per i collaboratori
export const COLLABORATOR_STATUSES = [
  { id: "available", label: "Disponibile" },
  { id: "busy", label: "Occupato" },
] as const;

// Tipo TypeScript per gli stati dei collaboratori
export type CollaboratorStatus = typeof COLLABORATOR_STATUSES[number]["id"];

// Funzione per ottenere l'etichetta dal valore
export function getRoleLabel(roleId: string): string {
  const role = COLLABORATOR_ROLES.find(r => r.id === roleId);
  return role ? role.label : roleId;
}

// Funzione per ottenere l'etichetta dallo stato
export function getStatusLabel(statusId: string): string {
  const status = COLLABORATOR_STATUSES.find(s => s.id === statusId);
  return status ? status.label : statusId;
}