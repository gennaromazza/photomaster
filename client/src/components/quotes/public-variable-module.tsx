import React, { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { Calendar, Info, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { 
  calculateItemTotal, 
  calculateModuleTotal, 
  getItemNameAndDescription,
  getItemImagePath
} from "@/lib/module-utils";

interface ModuleItem {
  id: number;
  total: number;
  unitPrice: number;
  quantity: number;
  hasDiscount?: boolean;
  discountType?: string;
  discountValue?: number;
  discountedPrice?: number;
  serviceImagePath?: string;
  productImagePath?: string;
  bundleImagePath?: string;
  serviceName?: string;
  productName?: string;
  bundleName?: string;
  serviceDescription?: string;
  productDescription?: string;
  bundleDescription?: string;
  minSelectCount?: number;
}

interface Module {
  id: number;
  name: string;
  description?: string;
  type: string;
  expiryDate?: string;
  minSelectCount?: number;
  maxSelectCount?: number;
  items: ModuleItem[];
}

interface PublicVariableModuleProps {
  module: Module;
  onSelectionChange?: (moduleId: number, selectedItems: number[]) => void;
}

// Interfaccia per gli elementi selezionati
interface SelectedItem {
  id: number;
  index: number;
  isRequired: boolean;
}

// Interfaccia per lo stato di caricamento delle immagini
interface ImageLoadStateItem {
  hasError: boolean;
  isLoading: boolean;
}

export function PublicVariableModule({ module, onSelectionChange }: PublicVariableModuleProps) {
  // Controllo preventivo
  if (!module || !module.items) {
    console.error("Module o module.items non definito:", module);
    return (
      <Card className="mb-4 border border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">
            Modulo variabile non disponibile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Le opzioni di questo modulo non sono attualmente disponibili.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Stato per la selezione degli elementi (usando ID invece di indici)
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [total, setTotal] = useState(0);

  // Teniamo traccia dello stato di caricamento delle immagini
  const [imageLoadState, setImageLoadState] = useState<{[key: number]: ImageLoadStateItem}>({});

  // Controlla se sono obbligatori item con minSelectCount
  const hasRequiredItems = (module.items || []).some((item: ModuleItem) => 
    item && item.minSelectCount && item.minSelectCount > 0
  );

  // Funzione per controllare se un item è richiesto
  const isItemRequired = (item: ModuleItem): boolean => {
    return Boolean(item && item.minSelectCount && item.minSelectCount > 0);
  };

  // Inizializza gli item selezionati in base al minSelectCount
  useEffect(() => {
    const initialSelected: SelectedItem[] = [];

    if (module.items && Array.isArray(module.items)) {
      module.items.forEach((item: ModuleItem, index: number) => {
        if (!item || !item.id) return;

        if (isItemRequired(item)) {
          initialSelected.push({
            id: item.id,
            index: index,
            isRequired: true
          });
        }
      });
    }

    setSelectedItems(initialSelected);

    // Inizializza lo stato per il caricamento delle immagini
    const initialImageLoadState: {[key: number]: ImageLoadStateItem} = {};
    if (module.items && Array.isArray(module.items)) {
      module.items.forEach((item: ModuleItem) => {
        if (item && item.id) {
          initialImageLoadState[item.id] = {
            hasError: false,
            isLoading: true
          };
        }
      });
    }
    setImageLoadState(initialImageLoadState);
  }, [module.items]);

  // Calcola il totale in base agli elementi selezionati
  useEffect(() => {
    // Calcola il totale degli elementi selezionati
    let sum = 0;
    selectedItems.forEach(selected => {
      const item = module.items.find((item: ModuleItem) => item.id === selected.id);
      if (item) {
        sum += Number(item.total || 0);
      }
    });
    setTotal(sum);

    // Notifica il componente padre della selezione
    if (onSelectionChange) {
      const selectedItemIds = selectedItems.map(selected => selected.id);
      console.log(`[LOG] Cambiata selezione modulo ${module.id}, elementi selezionati (IDs):`, selectedItemIds);
      onSelectionChange(module.id, selectedItemIds);
    }
  }, [selectedItems, module, onSelectionChange]);

  // Gestisce il cambio di selezione di un item
  const handleItemSelect = (itemId: number, index: number, checked: boolean) => {
    if (!itemId) {
      console.error(`[ERRORE] Tentativo di selezionare un item senza ID valido nel modulo ${module.id}`);
      return;
    }

    if (checked) {
      // Verifica se l'elemento può essere selezionato
      if (!canSelectMore() && !isItemSelected(itemId) && !isItemRequired(module.items[index])) {
        return;
      }

      setSelectedItems(prev => [
        ...prev, 
        {
          id: itemId,
          index: index,
          isRequired: isItemRequired(module.items[index])
        }
      ]);
    } else {
      // Non permettere la deselezione se è un item obbligatorio
      const item = module.items[index];
      if (isItemRequired(item)) {
        return;
      }

      setSelectedItems(prev => prev.filter(selected => selected.id !== itemId));
    }
  };

  // Verifica se un elemento è selezionato per ID
  const isItemSelected = (itemId: number): boolean => {
    return selectedItems.some(selected => selected.id === itemId);
  };

  // Verifica se è possibile selezionare altri item (in base al maxSelectCount)
  const canSelectMore = (): boolean => {
    if (!module.maxSelectCount) return true;
    return selectedItems.length < module.maxSelectCount;
  };

  // Controlla se un item è selezionabile
  const isItemSelectable = (item: any, index: number): boolean => {
    if (!item || !item.id) return false;

    // Se è già selezionato o è obbligatorio, è selezionabile
    if (isItemSelected(item.id) || isItemRequired(item)) {
      return true;
    }

    // Altrimenti controllo se ho raggiunto il limite massimo
    return canSelectMore();
  };

  // Gestisce errori di caricamento immagini
  const handleImageError = (itemId: number) => {
    setImageLoadState(prev => ({
      ...prev,
      [itemId]: { hasError: true, isLoading: false }
    }));
  };

  // Gestisce il completamento del caricamento delle immagini
  const handleImageLoad = (itemId: number) => {
    setImageLoadState(prev => ({
      ...prev,
      [itemId]: { hasError: false, isLoading: false }
    }));
  };

  // Verifica se il modulo è scaduto
  const isExpired = module.expiryDate 
    ? new Date(module.expiryDate) < new Date() 
    : false;

  return (
    <Card className="mb-4 border border-primary/20 overflow-hidden">
      <CardHeader className="bg-primary/5 border-b pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center text-base">
            <span>{module.name}</span>
            {isExpired && (
              <Badge variant="destructive" className="ml-2">Scaduto</Badge>
            )}
          </CardTitle>
          <Badge variant="outline" className="font-normal bg-primary/10">
            {formatCurrency(total)}
          </Badge>
        </div>
        {module.description && (
          <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
        )}

        {module.expiryDate && (
          <div className="flex items-center text-xs text-muted-foreground mt-2">
            <Calendar className="h-3 w-3 mr-1" />
            <span>
              Valido fino al {format(new Date(module.expiryDate), "dd/MM/yyyy", { locale: it })}
            </span>
          </div>
        )}

        {(module.minSelectCount || module.maxSelectCount) && (
          <div className="flex items-center mt-2 text-xs p-2 bg-muted/40 rounded-md">
            <Info className="h-3 w-3 mr-1 text-muted-foreground" />
            <span>
              {module.minSelectCount && `Seleziona almeno ${module.minSelectCount} opzioni. `}
              {module.maxSelectCount && `Puoi selezionare massimo ${module.maxSelectCount} opzioni.`}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4">
        <div className="space-y-3">
          {module.items.map((item: any, index: number) => {
            if (!item || !item.id) return null;

            const isRequired = isItemRequired(item);
            const isSelected = isItemSelected(item.id);
            const itemSelectable = isItemSelectable(item, index);
            const { name, description } = getItemNameAndDescription(item);
            const imagePath = getItemImagePath(item);
            const imageState = imageLoadState[item.id] || { hasError: false, isLoading: true };

            return (
              <div 
                key={item.id} 
                className={`border rounded-md p-3 transition-colors ${
                  isSelected 
                    ? 'bg-primary/10 border-primary/30' 
                    : !itemSelectable
                      ? 'bg-muted/20 opacity-60'
                      : 'bg-muted/20 hover:bg-muted/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Checkbox 
                    id={`item-${module.id}-${item.id}`}
                    checked={isSelected}
                    disabled={!itemSelectable && !isSelected}
                    onCheckedChange={(checked) => handleItemSelect(item.id, index, Boolean(checked))}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <Label 
                        htmlFor={`item-${module.id}-${item.id}`}
                        className={`font-medium cursor-pointer ${isRequired ? 'after:content-["*"] after:text-red-500 after:ml-0.5' : ''}`}
                      >
                        {name}
                      </Label>
                      <Badge variant="outline" className={isSelected ? 'bg-primary/20' : ''}>
                        {formatCurrency(item.total)}
                      </Badge>
                    </div>

                    {/* Descrizione del prodotto/servizio */}
                    {description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {description}
                      </p>
                    )}

                    {/* Immagine del prodotto/servizio se disponibile */}
                    {imagePath && (
                      <div className="mt-2 w-full h-28 rounded-md overflow-hidden bg-muted/40">
                        {imageState.hasError ? (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <div className="text-muted-foreground flex flex-col items-center">
                              <ImageOff className="h-8 w-8 mb-2 opacity-70" />
                              <span className="text-xs">Immagine non disponibile</span>
                            </div>
                          </div>
                        ) : (
                          <img 
                            src={imagePath}
                            alt={name || "Immagine prodotto"}
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(item.id)}
                            onLoad={() => handleImageLoad(item.id)}
                          />
                        )}
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground mt-2">
                      Quantità: {item.quantity} x {formatCurrency(item.unitPrice)}
                      {item.hasDiscount && item.discountedPrice !== undefined && (
                        <span className="text-green-600 ml-2">
                          (-{item.discountType === 'percentage' 
                            ? `${item.discountValue}%` 
                            : formatCurrency(item.discountValue)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-3 bg-muted/10">
        <div>
          <p className="text-sm text-muted-foreground">Elementi selezionati: {selectedItems.length}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Totale:</p>
          <p className="font-medium text-lg">{formatCurrency(total)}</p>
        </div>
      </CardFooter>
    </Card>
  );
}