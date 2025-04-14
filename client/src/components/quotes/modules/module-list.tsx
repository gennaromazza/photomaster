import React from "react";
import { 
  Card, 
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash, Package2, List, InfoIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Interfacce per le tipologie di moduli
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
}

/**
 * Componente per visualizzare la lista dei moduli di un preventivo
 * Responsabilità: 
 * - Visualizzare tutti i moduli con i loro dettagli principali
 * - Fornire azioni per modificare o eliminare i moduli
 */
export default function ModuleList({ modules, onEdit, onDelete }: ModuleListProps) {
  if (modules.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed rounded-lg">
        <Package2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <h3 className="text-lg font-medium mb-1">Nessun modulo</h3>
        <p className="text-muted-foreground mb-3">
          Aggiungi moduli fissi o variabili al preventivo per iniziare
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {modules.map((module) => (
        <Card key={module.id} className="overflow-hidden border">
          <CardHeader className="py-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-lg flex items-center">
                  {module.name}
                </CardTitle>
                <Badge variant={module.type === "fixed" ? "secondary" : "outline"}>
                  {module.type === "fixed" ? "Fisso" : "Variabile"}
                </Badge>
              </div>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(module)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(module.id!)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {module.description && (
              <CardDescription>{module.description}</CardDescription>
            )}
          </CardHeader>
          
          <CardContent className="py-3">
            <div className="space-y-2">
              {module.type === "fixed" && module.items && module.items.length > 0 && (
                <div className="text-sm">
                  <div className="flex items-center mb-1 text-muted-foreground">
                    <List className="h-4 w-4 mr-1" />
                    <span>{module.items.length} elementi</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-1.5 mt-2">
                    {module.items.slice(0, 3).map((item) => (
                      <div 
                        key={`${item.itemType}-${item.itemId}`}
                        className="text-sm flex justify-between items-center py-1 px-2 bg-muted/30 rounded"
                      >
                        <div className="font-medium flex items-center">
                          <Badge variant="outline" className="mr-2 px-1.5 py-0 text-xs">
                            {item.itemType === "service" ? "S" : "P"}
                          </Badge>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate max-w-[180px]">{item.name}</span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  {item.description && <div className="text-xs mt-1">{item.description}</div>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div>
                          {item.quantity > 1 && (
                            <span className="text-xs text-muted-foreground mr-2">
                              {item.quantity}x
                            </span>
                          )}
                          <span>{formatCurrency(item.total || item.price * item.quantity)}</span>
                        </div>
                      </div>
                    ))}
                    
                    {module.items.length > 3 && (
                      <div className="text-xs text-center text-muted-foreground py-1">
                        + altri {module.items.length - 3} elementi
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {module.type === "variable" && module.selections && module.selections.length > 0 && (
                <div className="text-sm">
                  <div className="flex items-center mb-1 text-muted-foreground">
                    <List className="h-4 w-4 mr-1" />
                    <span>{module.selections.length} selezioni</span>
                    
                    {(module.minSelections !== undefined || module.maxSelections !== undefined) && (
                      <span className="ml-2 text-xs">
                        {module.minSelections !== undefined && `Min: ${module.minSelections}`}
                        {module.minSelections !== undefined && module.maxSelections !== undefined && ', '}
                        {module.maxSelections !== undefined && `Max: ${module.maxSelections}`}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-1.5 mt-2">
                    {module.selections.slice(0, 3).map((selection) => (
                      <div key={selection.id} className="py-1 px-2 bg-muted/30 rounded">
                        <div className="flex justify-between">
                          <div className="font-medium flex items-center">
                            {selection.name}
                            {selection.isRequired && (
                              <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                                Obbligatorio
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            {selection.options.length} opzioni
                            {(selection.minOptions !== undefined || selection.maxOptions !== undefined) && (
                              <span className="ml-1">
                                ({selection.minOptions !== undefined && `Min: ${selection.minOptions}`}
                                {selection.minOptions !== undefined && selection.maxOptions !== undefined && ', '}
                                {selection.maxOptions !== undefined && `Max: ${selection.maxOptions}`})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {module.selections.length > 3 && (
                      <div className="text-xs text-center text-muted-foreground py-1">
                        + altre {module.selections.length - 3} selezioni
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="py-3 bg-muted/20 flex justify-between">
            <div className="flex items-center">
              {module.discount && module.discount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center mr-2 text-muted-foreground">
                        <InfoIcon className="h-3.5 w-3.5 mr-0.5" />
                        <span className="text-xs">
                          {module.discountType === "percentage" 
                            ? `Sconto ${module.discount}%` 
                            : `Sconto ${formatCurrency(module.discount)}`}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <div className="text-xs">
                        <div>Subtotale: {formatCurrency(module.subtotal || 0)}</div>
                        <div>
                          Sconto: {module.discountType === "percentage" 
                            ? `${module.discount}%` 
                            : formatCurrency(module.discount)}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="font-medium">
              {formatCurrency(module.total || 0)}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}