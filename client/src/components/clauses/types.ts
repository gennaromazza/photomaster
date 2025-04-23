/**
 * Tipi e utilities per le clausole contrattuali
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
  updatedAt: string | null;
  category?: {
    id: number;
    name: string;
    description: string | null;
  } | null;
}

export interface QuoteClause {
  id: number;
  quoteId: number;
  clauseId: number;
  isAccepted: boolean;
  createdAt: string;
  clause?: ContractClause;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
}

export interface CreateClauseData {
  title: string;
  content: string;
  categoryId?: number | null;
  eventType?: string | null;
  isRequired?: boolean;
  isActive?: boolean;
  order?: number;
}

export interface UpdateClauseData extends Partial<CreateClauseData> {}

/**
 * Utility per determinare se una clausola è generica o specifica
 */
export function getClauseType(clause: ContractClause): 'generica' | 'categoria' | 'evento' | 'specifica' {
  if (!clause.categoryId && !clause.eventType) {
    return 'generica';
  } else if (clause.categoryId && !clause.eventType) {
    return 'categoria';
  } else if (!clause.categoryId && clause.eventType) {
    return 'evento';
  } else {
    return 'specifica';
  }
}

/**
 * Funzione per formattare la descrizione del tipo di clausola
 */
export function formatClauseType(clause: ContractClause): string {
  const type = getClauseType(clause);
  
  switch (type) {
    case 'generica':
      return 'Clausola generica (applicabile a tutti i preventivi)';
    case 'categoria':
      return `Specifica per categoria: ${clause.category?.name || 'N/A'}`;
    case 'evento':
      return `Specifica per tipo evento: ${clause.eventType}`;
    case 'specifica':
      return `Specifica per categoria "${clause.category?.name || 'N/A'}" e tipo evento "${clause.eventType}"`;
    default:
      return 'Tipo non definito';
  }
}