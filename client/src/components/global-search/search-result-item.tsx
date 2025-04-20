import React from 'react';
import { useLocation } from 'wouter';
import { SearchResult, SearchResultType } from '@/hooks/use-global-search';
import { Calendar, Users, FileText, File, Image } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

// Icone per ogni tipo di risultato
const TypeIcons: Record<SearchResultType, React.ReactNode> = {
  cliente: <Users className="h-4 w-4" />,
  evento: <Calendar className="h-4 w-4" />,
  preventivo: <FileText className="h-4 w-4" />,
  contratto: <File className="h-4 w-4" />,
  galleria: <Image className="h-4 w-4" />,
};

// Etichette per ogni tipo di risultato
const TypeLabels: Record<SearchResultType, string> = {
  cliente: 'Cliente',
  evento: 'Evento',
  preventivo: 'Preventivo',
  contratto: 'Contratto',
  galleria: 'Galleria',
};

// Colori per ogni tipo di risultato
const TypeColors: Record<SearchResultType, string> = {
  cliente: 'bg-blue-50 text-blue-700 border-blue-200',
  evento: 'bg-purple-50 text-purple-700 border-purple-200',
  preventivo: 'bg-amber-50 text-amber-700 border-amber-200',
  contratto: 'bg-green-50 text-green-700 border-green-200',
  galleria: 'bg-pink-50 text-pink-700 border-pink-200',
};

interface SearchResultItemProps {
  result: SearchResult;
  onSelect: () => void;
  isActive?: boolean;
}

/**
 * Componente che mostra un singolo risultato di ricerca nella lista dei suggerimenti
 */
export function SearchResultItem({ result, onSelect, isActive = false }: SearchResultItemProps) {
  const [, navigate] = useLocation();

  const handleClick = () => {
    navigate(result.path);
    onSelect();
  };
  
  return (
    <div
      className={cn(
        "px-4 py-2 cursor-pointer flex items-start gap-3 transition-colors",
        isActive ? "bg-muted" : "hover:bg-muted"
      )}
      onClick={handleClick}
    >
      {/* Immagine se disponibile, altrimenti icona */}
      {result.imageUrl ? (
        <div className="flex-shrink-0 w-10 h-10 rounded-md overflow-hidden">
          <img
            src={result.imageUrl}
            alt={result.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="flex-shrink-0 w-8 h-8 rounded bg-muted flex items-center justify-center">
          {TypeIcons[result.type]}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate text-sm">{result.title}</p>
          <span className={cn("text-xs px-1.5 py-0.5 rounded-full border", TypeColors[result.type])}>
            {TypeLabels[result.type]}
          </span>
        </div>
        
        {result.subtitle && (
          <p className="text-xs text-muted-foreground truncate mt-1">
            {result.subtitle}
          </p>
        )}
        
        {result.createdAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Creato il {formatDate(new Date(result.createdAt))}
          </p>
        )}
      </div>
    </div>
  );
}