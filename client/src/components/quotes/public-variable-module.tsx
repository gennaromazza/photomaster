import React, { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { Calendar, Info, ImageOff, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
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
  serviceCategory?: string;
  productCategory?: string;
  bundleCategory?: string;
  serviceCategoryDescription?: string;
  productCategoryDescription?: string;
  bundleCategoryDescription?: string;
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
  disabled?: boolean;
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

// Interfaccia per raggruppare gli elementi per categoria
interface CategoryGroup {
  category: string;
  items: {
    item: ModuleItem;
    index: number;
  }[];
}

export function PublicVariableModule({ module, onSelectionChange, disabled = false }: PublicVariableModuleProps) {
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
  const [validationError, setValidationError] = useState<string | null>(null);

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
  
  // Formatta un messaggio informativo sui vincoli di selezione
  const getSelectionConstraintsMessage = (): string | null => {
    const hasMinConstraint = module.minSelectCount && module.minSelectCount > 0;
    const hasMaxConstraint = module.maxSelectCount && module.maxSelectCount > 0;
    
    if (!hasMinConstraint && !hasMaxConstraint) {
      return null;
    }
    
    if (hasMinConstraint && hasMaxConstraint) {
      if (module.minSelectCount === module.maxSelectCount) {
        return `Devi selezionare esattamente ${module.minSelectCount} ${module.minSelectCount === 1 ? 'opzione' : 'opzioni'}.`;
      } else {
        return `Devi selezionare da ${module.minSelectCount} a ${module.maxSelectCount} opzioni.`;
      }
    } else if (hasMinConstraint) {
      return `Devi selezionare almeno ${module.minSelectCount} ${module.minSelectCount === 1 ? 'opzione' : 'opzioni'}.`;
    } else if (hasMaxConstraint) {
      return `Puoi selezionare al massimo ${module.maxSelectCount} ${module.maxSelectCount === 1 ? 'opzione' : 'opzioni'}.`;
    }
    
    return null;
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

  // Calcola il totale in base agli elementi selezionati e valida la selezione
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

    // Verifica se la selezione è valida
    const validation = isSelectionValid();
    setValidationError(validation.isValid ? null : (validation.message || null));

    // Notifica il componente padre della selezione
    if (onSelectionChange) {
      const selectedItemIds = selectedItems.map(selected => selected.id);
      console.log(`[LOG] Cambiata selezione modulo ${module.id}, elementi selezionati (IDs):`, selectedItemIds);
      onSelectionChange(module.id, selectedItemIds);
    }
  }, [selectedItems, module, onSelectionChange]);

  // Gestisce il cambio di selezione di un item
  const handleItemSelect = (itemId: number, index: number, checked: boolean) => {
    // Se il modulo è disabilitato (ad es. dopo la firma) non permettere modifiche
    if (disabled) {
      return;
    }

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
  
  // Ottiene la descrizione della categoria di un elemento
  const getCategoryDescription = (item: ModuleItem): string | undefined => {
    return item.serviceCategoryDescription || 
           item.productCategoryDescription || 
           item.bundleCategoryDescription;
  };
  
  // Ottiene la categoria di un elemento
  const getCategory = (item: ModuleItem): string => {
    return item.serviceCategory || 
           item.productCategory || 
           item.bundleCategory || 
           "";
  };

  // Verifica se è possibile selezionare altri item (in base al maxSelectCount)
  const canSelectMore = (): boolean => {
    if (!module.maxSelectCount) return true;
    return selectedItems.length < module.maxSelectCount;
  };
  
  // Verifica se la selezione corrente rispetta i vincoli min/max
  const isSelectionValid = (): { isValid: boolean; message?: string } => {
    // Controllo sul minimo
    if (module.minSelectCount && selectedItems.length < module.minSelectCount) {
      return { 
        isValid: false, 
        message: `Devi selezionare almeno ${module.minSelectCount} ${module.minSelectCount === 1 ? 'elemento' : 'elementi'}.` 
      };
    }
    
    // Controllo sul massimo
    if (module.maxSelectCount && selectedItems.length > module.maxSelectCount) {
      return { 
        isValid: false, 
        message: `Puoi selezionare al massimo ${module.maxSelectCount} ${module.maxSelectCount === 1 ? 'elemento' : 'elementi'}.` 
      };
    }
    
    // Tutto ok
    return { isValid: true };
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

  // Raggruppa gli elementi per categoria se disponibile
  const groupByCategory = (): CategoryGroup[] => {
    const groups: CategoryGroup[] = [];
    const uncategorized: { item: ModuleItem, index: number }[] = [];
    
    // Prima raggruppiamo gli elementi in un oggetto per deduplica
    const uniqueCategories = new Map<string, { items: { item: ModuleItem, index: number }[] }>();
    
    module.items.forEach((item: ModuleItem, index: number) => {
      if (!item || !item.id) return;
      
      // Estrai la categoria (se presente)
      const category = getCategory(item);
      
      // Se non ha categoria, aggiungilo agli elementi senza categoria
      if (!category) {
        uncategorized.push({ item, index });
        return;
      }
      
      // Ottieni o crea il gruppo per questa categoria
      if (!uniqueCategories.has(category)) {
        uniqueCategories.set(category, { items: [] });
      }
      
      // Aggiungi l'elemento al gruppo
      const group = uniqueCategories.get(category);
      if (group) {
        group.items.push({ item, index });
      }
    });
    
    // Converti la mappa in un array
    uniqueCategories.forEach((value, key) => {
      groups.push({
        category: key,
        items: value.items
      });
    });
    
    // Se ci sono elementi senza categoria, aggiungili come ultimo gruppo
    if (uncategorized.length > 0) {
      groups.push({ category: "", items: uncategorized });
    }
    
    // Ordina i gruppi alfabeticamente per categoria
    groups.sort((a, b) => {
      // Gli elementi senza categoria sempre in fondo
      if (a.category === "") return 1;
      if (b.category === "") return -1;
      return a.category.localeCompare(b.category);
    });
    
    return groups;
  };
  
  // Ottieni gli elementi raggruppati per categoria
  const categoryGroups = groupByCategory();
  const hasCategories = categoryGroups.length > 1 || (categoryGroups.length === 1 && categoryGroups[0].category !== "");
  
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
            {disabled && (
              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">Confermato</Badge>
            )}
          </CardTitle>
          <Badge variant="outline" className="font-normal bg-primary/10">
            {formatCurrency(total)}
          </Badge>
        </div>

        {/* Descrizione del modulo */}
        {module.description && (
          <div className="mt-2 p-2 bg-muted/20 rounded-md border border-muted/30">
            <p className="text-sm">{module.description}</p>
          </div>
        )}

        {/* Data di scadenza */}
        {module.expiryDate && (
          <div className="flex items-center text-xs text-muted-foreground mt-2">
            <Calendar className="h-3 w-3 mr-1" />
            <span>
              Valido fino al {format(new Date(module.expiryDate), "dd/MM/yyyy", { locale: it })}
            </span>
          </div>
        )}
        
        {/* Sezione guida alla selezione */}
        {!disabled ? (
          <div className={`mt-3 border ${validationError ? 'border-amber-300' : 'border-muted'} rounded-md overflow-hidden`}>
            <div className={`${validationError ? 'bg-amber-50' : 'bg-primary/10'} px-3 py-2 text-xs font-medium flex items-center`}>
              {validationError ? (
                <AlertTriangle className="h-4 w-4 mr-1.5 text-amber-600" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              )}
              {validationError ? 'Attenzione: Selezione incompleta' : 'Guida alla selezione'}
            </div>
            <div className={`p-3 text-xs ${validationError ? 'bg-amber-50/50' : 'bg-muted/10'}`}>
              {/* Errore di validazione */}
              {validationError && (
                <div className="p-2 rounded-md bg-amber-100/50 border border-amber-200 mb-3">
                  <p className="text-amber-800 font-medium flex items-start">
                    <AlertTriangle className="h-4 w-4 mr-1.5 mt-0.5 flex-shrink-0 text-amber-600" />
                    <span>{validationError}</span>
                  </p>
                </div>
              )}
              
              <ul className="space-y-2 list-none">
                {/* Requisiti di selezione */}
                <li className="p-2 rounded-md bg-primary/5 border border-primary/10">
                  <p className="font-medium mb-1 text-sm flex items-center">
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-primary" />
                    Requisiti di selezione:
                  </p>
                  <ul className="pl-5 space-y-1 list-disc text-muted-foreground">
                    {module.minSelectCount && module.maxSelectCount && module.minSelectCount === module.maxSelectCount ? (
                      <li>
                        <span>Seleziona <span className="font-semibold text-foreground">esattamente {module.minSelectCount}</span> {module.minSelectCount === 1 ? 'opzione' : 'opzioni'}</span>
                      </li>
                    ) : (
                      <>
                        {module.minSelectCount ? (
                          <li>
                            <span>Seleziona <span className="font-semibold text-foreground">almeno {module.minSelectCount}</span> {module.minSelectCount === 1 ? 'opzione' : 'opzioni'}</span>
                          </li>
                        ) : null}
                        {module.maxSelectCount ? (
                          <li>
                            <span>Puoi selezionare <span className="font-semibold text-foreground">massimo {module.maxSelectCount}</span> {module.maxSelectCount === 1 ? 'opzione' : 'opzioni'}</span>
                          </li>
                        ) : null}
                      </>
                    )}
                  </ul>
                </li>
                
                {/* Informazioni sulle categorie e le opzioni obbligatorie */}
                {hasRequiredItems && (
                  <li className="p-2 rounded-md bg-amber-50 border border-amber-100">
                    <p className="font-medium mb-1 text-sm flex items-center text-amber-800">
                      <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                      Opzioni obbligatorie:
                    </p>
                    <p className="text-amber-700">
                      Le opzioni contrassegnate come <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Obbligatorio</span> sono già preselezionate e non possono essere deselezionate.
                    </p>
                  </li>
                )}
                
                {/* Stato attuale della selezione */}
                <li className="p-2 rounded-md bg-muted/20 border border-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Info className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      <span>Stato selezione:</span>
                    </span>
                    <span className="font-medium">
                      {selectedItems.length} {selectedItems.length === 1 ? 'opzione selezionata' : 'opzioni selezionate'}
                    </span>
                  </div>
                </li>
              </ul>
              
              {validationError && (
                <div className="mt-3 text-center">
                  <p className="text-amber-600 text-xs italic">
                    È necessario completare la selezione secondo i requisiti sopra indicati per poter procedere.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
        
        {/* Badge di stato per preventivo firmato */}
        {disabled && (
          <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-md">
            <p className="text-xs text-green-700 flex items-center">
              <CheckCircle className="h-3 w-3 mr-1.5" />
              <span>Le opzioni di questo modulo sono state confermate e non possono essere modificate.</span>
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4">
        <div className="space-y-6">
          {hasCategories ? (
            /* Visualizzazione per categorie */
            categoryGroups.map((group, groupIndex) => (
              <div key={`category-${groupIndex}`} className="space-y-3">
                {/* Titolo e descrizione della categoria */}
                {group.category && (
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold border-b pb-1 mb-1">{group.category}</h3>
                    {getCategoryDescription(group.items[0].item) && (
                      <p className="text-xs text-muted-foreground">
                        {getCategoryDescription(group.items[0].item)}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Elementi della categoria */}
                {group.items.map(({ item, index }) => {
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
                          disabled={disabled || (!itemSelectable && !isSelected)}
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
                              {isRequired && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                  Obbligatorio
                                </span>
                              )}
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
                            <div className="mt-2 w-full h-36 rounded-md overflow-hidden bg-muted/40 relative">
                              {imageState.hasError ? (
                                <div className="w-full h-full flex items-center justify-center bg-muted">
                                  <div className="text-muted-foreground flex flex-col items-center">
                                    <ImageOff className="h-8 w-8 mb-2 opacity-70" />
                                    <span className="text-xs">Immagine non disponibile</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <img 
                                    src={imagePath}
                                    alt={name || "Immagine prodotto"}
                                    className="w-full h-full object-contain p-1"
                                    onError={() => handleImageError(item.id)}
                                    onLoad={() => handleImageLoad(item.id)}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          <div className="text-sm text-muted-foreground mt-2">
                            Quantità: {item.quantity} x {formatCurrency(item.unitPrice)}
                            {item.hasDiscount && item.discountedPrice !== undefined && (
                              <span className="text-green-600 ml-2">
                                (-{item.discountType === 'percentage' 
                                  ? `${item.discountValue}%` 
                                  : formatCurrency(item.discountValue || 0)})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            /* Visualizzazione senza categorie (originale) */
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
                        disabled={disabled || (!itemSelectable && !isSelected)}
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
                            {isRequired && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                Obbligatorio
                              </span>
                            )}
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
                          <div className="mt-2 w-full h-36 rounded-md overflow-hidden bg-muted/40 relative">
                            {imageState.hasError ? (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <div className="text-muted-foreground flex flex-col items-center">
                                  <ImageOff className="h-8 w-8 mb-2 opacity-70" />
                                  <span className="text-xs">Immagine non disponibile</span>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <img 
                                  src={imagePath}
                                  alt={name || "Immagine prodotto"}
                                  className="w-full h-full object-contain p-1"
                                  onError={() => handleImageError(item.id)}
                                  onLoad={() => handleImageLoad(item.id)}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        <div className="text-sm text-muted-foreground mt-2">
                          Quantità: {item.quantity} x {formatCurrency(item.unitPrice)}
                          {item.hasDiscount && item.discountedPrice !== undefined && (
                            <span className="text-green-600 ml-2">
                              (-{item.discountType === 'percentage' 
                                ? `${item.discountValue}%` 
                                : formatCurrency(item.discountValue || 0)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col border-t pt-3 bg-muted/10">
        {/* Messaggio di errore validazione */}
        {!disabled && validationError && (
          <div className="w-full mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-xs text-red-700 flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1.5" />
              <span>{validationError}</span>
            </p>
          </div>
        )}
        <div className="flex justify-between w-full">
          <div>
            <p className="text-sm text-muted-foreground">
              Elementi selezionati: {selectedItems.length}
              {module.minSelectCount && ` (minimo: ${module.minSelectCount})`}
              {module.maxSelectCount && ` (massimo: ${module.maxSelectCount})`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Totale:</p>
            <p className="font-medium text-lg">{formatCurrency(total)}</p>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}