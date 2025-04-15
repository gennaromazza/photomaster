import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, FileText, BoxSelect } from "lucide-react";
import { QuoteModule } from "./types";
import { formatCurrency } from "@/lib/utils";

interface ModuleListProps {
  modules: QuoteModule[];
  onEditModule?: (module: QuoteModule) => void;
  onDeleteModule?: (moduleId: number) => void;
}

/**
 * Componente per la visualizzazione della lista dei moduli
 * Responsabilità:
 * - Mostrare i moduli con descrizione, tipo e totale
 * - Gestire le operazioni di modifica ed eliminazione dei moduli
 */
export default function ModuleList({
  modules,
  onEditModule,
  onDeleteModule
}: ModuleListProps) {
  if (!modules || modules.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground mb-6">
          Nessun modulo presente in questo preventivo.
        </p>
        <p className="text-sm text-muted-foreground mb-2">
          I moduli ti permettono di raggruppare prodotti e servizi in modo organizzato.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Puoi creare moduli fissi (scelti da te) o variabili (con opzioni per il cliente).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {modules.map((module) => (
        <div
          key={module.id}
          className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {module.type === "fixed" ? (
                  <FileText className="h-5 w-5 text-primary/70" />
                ) : (
                  <BoxSelect className="h-5 w-5 text-primary/70" />
                )}
                <h3 className="font-medium text-lg">{module.name}</h3>
              </div>
              
              {module.description && (
                <p className="text-muted-foreground text-sm mt-1 ml-7">
                  {module.description}
                </p>
              )}
              
              <div className="flex gap-4 mt-2 ml-7">
                <div className="text-xs text-muted-foreground">
                  {module.type === "fixed" ? (
                    <>Modulo Fisso</>
                  ) : (
                    <>Modulo Variabile</>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {module.type === "fixed" ? (
                    <>
                      {module.items?.length || 0} elementi
                    </>
                  ) : (
                    <>
                      {module.selections?.length || 0} categorie
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="text-lg font-semibold">
                {formatCurrency(module.total || module.subtotal || 0)}
              </div>
              
              <div className="flex gap-2">
                {onEditModule && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditModule(module)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Modifica
                  </Button>
                )}
                
                {onDeleteModule && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => module.id && onDeleteModule(module.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}