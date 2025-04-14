import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit, Trash2, GripVertical, Check, X, Package, ListChecks } from "lucide-react";

// Tipi comuni per i moduli
interface ModuleItem {
  id?: number;
  moduleId?: number;
  itemId: number;
  itemType: 'service' | 'product';
  name: string;
  description?: string;
  price: number;
  quantity: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  total?: number;
  note?: string;
}

interface SelectionOption {
  id?: string;
  selectionId?: string;
  itemId: number;
  itemType: 'service' | 'product';
  name: string;
  description?: string;
  price: number;
  isSelected?: boolean;
  isDefault?: boolean;
}

interface ModuleSelection {
  id?: string;
  moduleId?: number;
  name: string;
  description?: string;
  options: Array<SelectionOption>;
  minOptions?: number;
  maxOptions?: number;
  isRequired?: boolean;
}

interface QuoteModuleData {
  id?: number;
  quoteId: number;
  name: string;
  description?: string;
  type: 'fixed' | 'variable';
  position?: number;
  subtotal?: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  total?: number;
  items?: Array<ModuleItem>;
  selections?: Array<ModuleSelection>;
  minSelections?: number;
  maxSelections?: number;
  isRequired?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ModuleListProps {
  modules: QuoteModuleData[];
  onEdit: (module: QuoteModuleData) => void;
  onDelete: (moduleId: number) => void;
  onReorder?: (sourceIndex: number, destinationIndex: number) => void;
}

/**
 * Componente per visualizzare e gestire la lista dei moduli
 * Responsabilità: Visualizzare, permettere l'editing e la cancellazione dei moduli
 */
export default function ModuleList({
  modules,
  onEdit,
  onDelete,
  onReorder,
}: ModuleListProps) {
  if (!modules.length) {
    return (
      <div className="text-center py-10 border border-dashed rounded-lg">
        <div className="mb-3 text-muted-foreground opacity-50">
          <Package className="h-10 w-10 mx-auto mb-2" />
        </div>
        <h3 className="text-lg font-medium mb-2">Nessun modulo</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          I moduli ti permettono di organizzare servizi e prodotti in gruppi. Aggiungi il primo modulo
          per iniziare a strutturare il tuo preventivo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {modules.map((module, index) => (
        <Card key={module.id} className="relative group">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2">
                {/* Per futura implementazione drag&drop */}
                {onReorder && (
                  <div className="cursor-grab opacity-50 hover:opacity-100 pt-1">
                    <GripVertical className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <div className="flex items-center">
                    <CardTitle className="text-lg">{module.name}</CardTitle>
                    <Badge className="ml-2" variant={module.type === "fixed" ? "default" : "secondary"}>
                      {module.type === "fixed" ? "Fisso" : "Variabile"}
                    </Badge>
                  </div>
                  {module.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {module.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex space-x-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(module)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => module.id && onDelete(module.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {module.type === "fixed" ? (
              // Contenuto per moduli fissi
              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Elementi inclusi
                </h4>
                <ul className="divide-y">
                  {module.items?.map((item) => (
                    <li key={item.id} className="py-2 flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {item.name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center mt-0.5">
                          <Badge variant="outline" className="mr-2 text-[10px] px-1 py-0">
                            {item.itemType === "service" ? "Servizio" : "Prodotto"}
                          </Badge>
                          {item.quantity > 1 && (
                            <span>Qtà: {item.quantity}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              // Contenuto per moduli variabili
              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Selezioni cliente
                </h4>
                <ul className="divide-y">
                  {module.selections?.map((selection) => (
                    <li key={selection.id} className="py-2">
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-sm">
                          {selection.name}
                        </div>
                        <div className="text-xs">
                          {selection.isRequired ? (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              Richiesto
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Opzionale
                            </Badge>
                          )}
                        </div>
                      </div>
                      {selection.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {selection.description}
                        </div>
                      )}
                      <div className="mt-1.5 flex items-center text-xs text-muted-foreground space-x-2">
                        <span>{selection.options.length} opzioni</span>
                        {selection.minOptions !== undefined && selection.minOptions > 0 && (
                          <span>Min: {selection.minOptions}</span>
                        )}
                        {selection.maxOptions !== undefined && selection.maxOptions > 0 && (
                          <span>Max: {selection.maxOptions}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                
                <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                  <div className="flex items-start">
                    <ListChecks className="h-3.5 w-3.5 mr-1.5 mt-0.5 text-primary/70" />
                    <div>
                      <span className="font-medium">Configurazione cliente:</span>
                      {module.isRequired && <span className="ml-1">Modulo obbligatorio</span>}
                      {module.minSelections !== undefined && module.minSelections > 0 && (
                        <span className="ml-1">Min: {module.minSelections} selezioni</span>
                      )}
                      {module.maxSelections !== undefined && module.maxSelections > 0 && (
                        <span className="ml-1">Max: {module.maxSelections} selezioni</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <Separator className="my-3" />
            
            <div className="flex justify-between items-center">
              <div className="text-sm">
                {module.discount && module.discount > 0 ? (
                  <div className="flex items-center text-muted-foreground">
                    <span>Subtotale: {formatCurrency(module.subtotal || 0)}</span>
                    <span className="mx-2">•</span>
                    <span>
                      Sconto: 
                      {module.discountType === "percentage"
                        ? ` ${module.discount}%`
                        : ` ${formatCurrency(module.discount)}`}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    Nessuno sconto applicato
                  </span>
                )}
              </div>
              <div className="text-base font-medium">
                {formatCurrency(module.total || 0)}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}