import React from 'react';
import { QuoteModuleData } from '@/types/module-types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Layers, LayoutGrid } from 'lucide-react';

interface ModuleListProps {
  modules: QuoteModuleData[];
  onEdit: (module: QuoteModuleData) => void;
  onDelete: (moduleId: number) => void;
}

/**
 * Componente per visualizzare la lista dei moduli esistenti
 * Responsabilità: Mostrare tutti i moduli con le relative azioni
 */
export default function ModuleList({ modules, onEdit, onDelete }: ModuleListProps) {
  if (modules.length === 0) {
    return <p className="text-muted-foreground text-center py-4">Nessun modulo presente.</p>;
  }

  // Funzione per formattare i prezzi
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price / 100);
  };

  return (
    <div className="space-y-4">
      {modules.map((module) => (
        <Card key={module.id} className="border hover:border-primary/20 transition-colors">
          <CardHeader className="p-4 flex flex-row items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg inline-flex items-center">
                  {module.type === 'fixed' ? (
                    <LayoutGrid className="h-4 w-4 mr-2 text-primary/80" />
                  ) : (
                    <Layers className="h-4 w-4 mr-2 text-primary/80" />
                  )}
                  {module.name}
                </CardTitle>
                <Badge variant={module.type === 'fixed' ? 'default' : 'secondary'} className="ml-2">
                  {module.type === 'fixed' ? 'Fisso' : 'Variabile'}
                </Badge>
              </div>
              <CardDescription className="mt-1">
                {module.description || 'Nessuna descrizione'}
              </CardDescription>
              <div className="flex flex-wrap gap-2 mt-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Totale:</span>{' '}
                  <span className="font-medium">{formatPrice(module.total || 0)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Elementi:</span>{' '}
                  <span className="font-medium">{module.items?.length || 0}</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs h-8"
                onClick={() => onEdit(module)}
              >
                <Edit className="h-3.5 w-3.5 mr-1" />
                Modifica
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(module.id as number)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Elimina
              </Button>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}