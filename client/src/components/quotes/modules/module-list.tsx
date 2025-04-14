import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Edit, ListChecks, Trash2, GripVertical, Lock, BookOpen } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ModuleData {
  id?: number;
  name: string;
  description?: string;
  type: 'fixed' | 'variable';
  position?: number;
  subtotal?: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  total?: number;
  items?: any[];
  selections?: any[];
}

interface ModuleListProps {
  modules: ModuleData[];
  onEditModule: (moduleId: number) => void;
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
            <div className="flex items-start">
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
                  {formatCurrency(module.total || 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {getModuleContentSummary(module)}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="details" className="border-0">
                <AccordionTrigger className="py-2 text-sm">
                  Dettagli modulo
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-2">
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">Tipo modulo</div>
                      <div>{module.type === "fixed" ? "Fisso (selezionato dal fotografo)" : "Variabile (personalizzabile dal cliente)"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">Sconto applicato</div>
                      <div>{getEffectiveDiscount(module)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">Subtotale</div>
                      <div>{formatCurrency(module.subtotal || 0)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">Totale modulo</div>
                      <div className="font-medium">{formatCurrency(module.total || 0)}</div>
                    </div>
                  </div>
                  
                  {/* Contenuto del modulo (fisso) */}
                  {module.type === "fixed" && module.items && module.items.length > 0 && (
                    <div className="mt-3">
                      <div className="text-muted-foreground text-xs mb-2">Contenuto del modulo:</div>
                      <div className="text-xs space-y-1">
                        {module.items.map((item, index) => (
                          <div key={`${item.itemType}-${item.itemId}-${index}`} className="flex justify-between py-1 px-2 rounded hover:bg-muted/50">
                            <div>
                              <span>{item.name}</span>
                              <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                            </div>
                            <div>{formatCurrency(item.total || (item.price * item.quantity))}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Contenuto del modulo (variabile) */}
                  {module.type === "variable" && module.selections && module.selections.length > 0 && (
                    <div className="mt-3">
                      <div className="text-muted-foreground text-xs mb-2">Categorie di scelta:</div>
                      <div className="text-xs space-y-1">
                        {module.selections.map((selection, index) => (
                          <div key={index} className="p-2 border rounded-md mb-2">
                            <div className="font-medium mb-1">{selection.name}</div>
                            {selection.options && selection.options.length > 0 ? (
                              <div className="pl-2 space-y-1 mt-1">
                                {selection.options.map((option: any, optIdx: number) => (
                                  <div key={optIdx} className="flex justify-between text-xs py-0.5">
                                    <div className="flex items-center">
                                      {option.isDefault && (
                                        <Badge variant="outline" className="h-4 text-[10px] mr-1">Default</Badge>
                                      )}
                                      <span>{option.name}</span>
                                    </div>
                                    <div>{formatCurrency(option.price)}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-muted-foreground italic pl-2">Nessuna opzione</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
          
          <CardFooter className="border-t p-3 flex justify-end">
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => module.id && onEditModule(module.id)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Modifica
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Elimina
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Vuoi eliminare questo modulo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Questa azione non può essere annullata. Il modulo "{module.name}" verrà
                      rimosso definitivamente dal preventivo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={() => module.id && onDeleteModule(module.id)}
                    >
                      Elimina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}