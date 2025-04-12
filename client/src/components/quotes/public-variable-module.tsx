import React, { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { Calendar, Info } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface PublicVariableModuleProps {
  module: any;
  onSelectionChange?: (moduleId: number, selectedItems: number[]) => void;
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

  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [total, setTotal] = useState(0);

  // Controlla se sono obbligatori item con minSelectCount
  const hasRequiredItems = (module.items || []).some((item: any) => item.minSelectCount && item.minSelectCount > 0);
  
  // Inizializza gli item selezionati in base al minSelectCount
  useEffect(() => {
    const initialSelected: number[] = [];
    module.items.forEach((item: any, index: number) => {
      if (item.minSelectCount && item.minSelectCount > 0) {
        initialSelected.push(index);
      }
    });
    setSelectedItems(initialSelected);
  }, [module.items]);

  // Calcola il totale in base agli elementi selezionati
  useEffect(() => {
    let sum = 0;
    selectedItems.forEach(index => {
      const item = module.items[index];
      if (item) {
        sum += item.total || 0;
      }
    });
    setTotal(sum);
    
    if (onSelectionChange) {
      // Verifica che gli elementi selezionati siano validi e abbiano un ID
      const selectedItemIds = selectedItems
        .filter(index => index >= 0 && index < module.items.length)
        .map(index => {
          const item = module.items[index];
          if (!item || !item.id) {
            console.log(`[LOG] Item selezionato senza ID valido nel modulo ${module.id}, index: ${index}`, item);
            return null;
          }
          return item.id;
        })
        .filter(Boolean);
      
      console.log(`[LOG] Cambiata selezione modulo ${module.id}, elementi selezionati (IDs):`, selectedItemIds);
      onSelectionChange(module.id, selectedItemIds);
    }
  }, [selectedItems, module, onSelectionChange]);

  // Gestisce il cambio di selezione di un item
  const handleItemSelect = (index: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, index]);
    } else {
      // Non permettere la deselezione se è un item obbligatorio
      const item = module.items[index];
      if (item.minSelectCount && item.minSelectCount > 0) {
        return;
      }
      setSelectedItems(prev => prev.filter(i => i !== index));
    }
  };

  // Verifica se è possibile selezionare altri item (in base al maxSelectCount)
  const canSelectMore = () => {
    if (!module.maxSelectCount) return true;
    return selectedItems.length < module.maxSelectCount;
  };

  // Controlla se un item è selezionabile
  const isItemSelectable = (index: number) => {
    const item = module.items[index];
    // Se è già selezionato o è obbligatorio, è selezionabile
    if (selectedItems.includes(index) || (item.minSelectCount && item.minSelectCount > 0)) {
      return true;
    }
    // Altrimenti controllo se ho raggiunto il limite massimo
    return canSelectMore();
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
            const isRequired = item.minSelectCount && item.minSelectCount > 0;
            const isSelected = selectedItems.includes(index);
            
            return (
              <div 
                key={index} 
                className={`border rounded-md p-3 transition-colors ${
                  isSelected 
                    ? 'bg-primary/10 border-primary/30' 
                    : !isItemSelectable(index)
                      ? 'bg-muted/20 opacity-60'
                      : 'bg-muted/20 hover:bg-muted/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Checkbox 
                    id={`item-${module.id}-${index}`}
                    checked={isSelected}
                    disabled={!isItemSelectable(index) && !isSelected}
                    onCheckedChange={(checked) => handleItemSelect(index, Boolean(checked))}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <Label 
                        htmlFor={`item-${module.id}-${index}`}
                        className={`font-medium cursor-pointer ${isRequired ? 'after:content-["*"] after:text-red-500 after:ml-0.5' : ''}`}
                      >
                        {item.serviceName || item.productName || item.bundleName || "Servizio/Prodotto"}
                      </Label>
                      <Badge variant="outline" className={isSelected ? 'bg-primary/20' : ''}>
                        {formatCurrency(item.total)}
                      </Badge>
                    </div>
                    
                    {/* Descrizione del prodotto/servizio */}
                    {(item.serviceDescription || item.productDescription || item.bundleDescription) && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {item.serviceDescription || item.productDescription || item.bundleDescription}
                      </p>
                    )}
                    
                    {/* Immagine del prodotto/servizio se disponibile */}
                    {(item.serviceImagePath || item.productImagePath || item.bundleImagePath) && (
                      <div className="mt-2 w-full h-28 rounded-md overflow-hidden bg-muted/40">
                        <img 
                          src={item.serviceImagePath || item.productImagePath || item.bundleImagePath} 
                          alt={item.serviceName || item.productName || item.bundleName || "Immagine prodotto"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const imagePath = item.serviceImagePath || item.productImagePath || item.bundleImagePath;
                            console.log(`[LOG] Errore caricamento immagine modulo variabile: ${imagePath}`);
                            
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; // Previene loop di errori
                            target.style.display = 'none'; // Nasconde l'immagine
                            target.alt = 'Immagine non disponibile';
                            
                            // Aggiungiamo un container per l'icona fallback
                            const parent = target.parentElement;
                            if (parent) {
                              parent.classList.add('flex', 'items-center', 'justify-center', 'bg-muted');
                              
                              // Verifichiamo che l'icona non sia già stata aggiunta
                              if (!parent.querySelector('.fallback-icon')) {
                                const icon = document.createElement('div');
                                icon.className = 'fallback-icon text-muted-foreground';
                                icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>';
                                parent.appendChild(icon);
                              }
                            }
                          }}
                        />
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