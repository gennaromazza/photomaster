/**
 * Rappresenta una clausola contrattuale
 */
export interface ContractClause {
  id: number;
  title: string;
  content: string;
  categoryId: number | null;
  eventType: string | null;
  isRequired: boolean;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dati per la creazione o l'aggiornamento di una clausola
 */
export interface CreateClauseData {
  title: string;
  content: string;
  categoryId: number | null;
  eventType: string | null;
  isRequired: boolean;
  isActive: boolean;
  order: number;
}

/**
 * Categoria di servizio associabile a una clausola
 */
export interface ServiceCategory {
  id: number;
  name: string;
}

/**
 * Formatta il tipo di clausola in base alle sue associazioni
 */
export function formatClauseType(clause: ContractClause): string {
  if (clause.categoryId && clause.eventType) {
    return `Categoria ${clause.categoryId} - ${clause.eventType}`;
  } else if (clause.categoryId) {
    return `Categoria ${clause.categoryId}`;
  } else if (clause.eventType) {
    return clause.eventType;
  } else {
    return 'Generale';
  }
}