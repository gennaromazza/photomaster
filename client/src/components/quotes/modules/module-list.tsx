import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash, ListChecks, Lock, BookOpen, BookMarked } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ModuleData {
  id: number;
  name: string;
  description?: string;
  type: 'fixed' | 'variable';
  subtotal?: number;
  total?: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  items?: any[];
  selections?: any[];
}

interface ModuleListProps {
  modules: ModuleData[];
  onEditModule: (module: ModuleData) => void;
  onDeleteModule: (moduleId: number) => void;
  onReorderModules?: (modules: ModuleData[]) => void;
}

/**
 * Componente per la visualizzazione della lista dei moduli
 * Responsabilità:
 * - Mostrare tutti i moduli del preventivo
 * - Permettere la modifica e cancellazione dei moduli
 * - Gestire il riordino dei moduli (se abilitato)
 */
export default function ModuleList({
  modules,
  onEditModule,
  onDeleteModule,
  onReorderModules,
}: ModuleListProps) {
  // Calcola lo sconto effettivo in base al tipo
  const getEffectiveDiscount = (module: ModuleData): string => {
    if (!module.discount || module.discount <= 0) {
      return "Nessuno";
    }
    
    if (module.discountType === "percentage") {
      return `${module.discount}%`;
    } else {
      return formatCurrency(module.discount);
    }
  };
  
  // Ottieni una descrizione breve degli elementi nel modulo
  const getModuleContentSummary = (module: ModuleData): string => {
    if (module.type === "fixed" && module.items) {
      const count = module.items.length;
      return `${count} element${count !== 1 ? "i" : "o"}`;
    } else if (module.type === "variable" && module.selections) {
      const count = module.selections.length;
      return `${count} categori${count !== 1 ? "e" : "a"} di scelta`;
    }
    return "Vuoto";
  };
  
  // Se non ci sono moduli, mostra un messaggio
  if (modules.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 pb-6 text-center">
          <ListChecks className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <CardTitle className="text-lg mb-2">Nessun modulo</CardTitle>
          <CardDescription className="mb-4">
            Aggiungi moduli fissi o variabili per strutturare il preventivo
          </CardDescription>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {modules.map((module) => (
        <Card key={module.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base flex items-center">
                  <span className="mr-2">{module.name}</span>
                  <Badge
                    variant={module.type === "fixed" ? "secondary" : "outline"}
                    className="text-xs font-normal"
                  >
                    {module.type === "fixed" ? (
                      <Lock className="h-3 w-3 mr-1" />
                    ) : (
                      <BookOpen className="h-3 w-3 mr-1" />
                    )}
                    {module.type === "fixed" ? "Fisso" : "Variabile"}
                  </Badge>
                </CardTitle>
                {module.description && (
                  <CardDescription className="mt-1">
                    {module.description}
                  </CardDescription>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {formatCurrency(module.total || module.subtotal || 0)}
                </div>
                {module.discount && module.discount > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Sconto: {getEffectiveDiscount(module)}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">
                  {getModuleContentSummary(module)}
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => onEditModule(module)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Modifica
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-destructive"
                  onClick={() => onDeleteModule(module.id)}
                >
                  <Trash className="h-3.5 w-3.5 mr-1" />
                  Elimina
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}