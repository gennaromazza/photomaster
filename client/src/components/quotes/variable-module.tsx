import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Save, Plus, Copy, Calendar, Link, HelpCircle } from "lucide-react";
import { QuoteModuleData, QuoteModuleItemData } from "./module-selector";
import { formatCurrency } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  calculateItemTotals,
  calculateModuleTotals,
  formatPrice
} from "@/lib/moduleCalculations";
import {
  getItemNameAndDescription
} from "@/lib/module-utils";
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';


interface VariableModuleProps {
  quoteId: number;
  module?: QuoteModuleData;
  onSave: (module: QuoteModuleData) => void;
  onCancel: () => void;
  onDelete?: (moduleId: number) => void;
}

export function VariableModule({ quoteId, module, onSave, onCancel, onDelete }: VariableModuleProps) {
  const { toast } = useToast();
  const isEdit = !!module?.id;

  const [formData, setFormData] = useState<QuoteModuleData>(() => {
    console.log("Inizializzazione modulo variabile:", module);

    const defaults = {
      quoteId,
      name: "",
      type: "variable" as const,
      status: "active" as const,
      items: [] as QuoteModuleItemData[],
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maxSelections: 0 // Added maxSelections default
    };

    if (!module) {
      return defaults;
    }

    return {
      ...defaults,
      id: module.id,
      name: module.name || defaults.name,
      description: module.description || undefined,
      status: module.status || defaults.status,
      items: Array.isArray(module.items) && module.items.length > 0 ? [...module.items] : defaults.items,
      shareToken: module.shareToken,
      expiryDate: module.expiryDate ? new Date(module.expiryDate) : defaults.expiryDate,
      discount: module.discount,
      discountType: module.discountType,
      position: module.position,
      subtotal: module.subtotal,
      total: module.total,
      updatedAt: module.updatedAt,
      createdAt: module.createdAt,
      maxSelections: module.maxSelections || 0 // Added maxSelections handling
    };
  });

  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableBundles, setAvailableBundles] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [selectedCount, setSelectedCount] = useState(0);


  useEffect(() => {
    if (module?.shareToken) {
      setShareUrl(`${window.location.origin}/quotes/modules/${module.shareToken}`);
    }
  }, [module]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const servicesResponse = await fetch('/api/services');
        if (servicesResponse.ok) {
          const allItems = await servicesResponse.json();
          const services = allItems.filter((item: any) => item.type === 'service');
          const products = allItems.filter((item: any) => item.type === 'product');
          setAvailableServices(services || []);
          setAvailableProducts(products || []);
        }

        const bundlesResponse = await fetch('/api/service-bundles');
        if (bundlesResponse.ok) {
          const bundles = await bundlesResponse.json();
          setAvailableBundles(bundles || []);
        }
      } catch (error) {
        console.error("Errore nel caricamento dei servizi, prodotti o pacchetti:", error);
        toast({
          title: "Errore",
          description: "Impossibile caricare i servizi, prodotti o pacchetti",
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSetExpiryDate = (date?: Date) => {
    setFormData(prev => ({ ...prev, expiryDate: date }));
  };

  const addItem = () => {
    const newItem: QuoteModuleItemData = {
      quantity: 1,
      unitPrice: 0,
      hasDiscount: false,
      total: 0,
      isSelected: false,
      selectionRequired: false,
      isDefault: false,
      selectionOrder: formData.items.length + 1,
      id: Date.now() //Adding a temporary id
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = useCallback((index: number, field: keyof QuoteModuleItemData, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value
      };

      if (field === 'serviceId') {
        if (!value) {
          newItems[index].serviceId = undefined;
          newItems[index].serviceName = undefined;
          newItems[index].serviceDescription = undefined;
          newItems[index].unitPrice = 0;
          newItems[index].total = 0;
        } else {
          const selectedService = availableServices.find(s => s.id === parseInt(value));
          if (selectedService) {
            newItems[index].serviceId = selectedService.id;
            newItems[index].unitPrice = selectedService.price;
            newItems[index].serviceName = selectedService.name;
            newItems[index].serviceDescription = selectedService.description;
            newItems[index].total = newItems[index].quantity * selectedService.price;
          }
        }
      }

      if (field === 'productId' && value) {
        const selectedProduct = availableProducts.find(p => p.id === parseInt(value));
        if (selectedProduct) {
          newItems[index].productId = selectedProduct.id;
          newItems[index].unitPrice = selectedProduct.price;
          newItems[index].productName = selectedProduct.name;
          newItems[index].productDescription = selectedProduct.description;
          newItems[index].total = newItems[index].quantity * selectedProduct.price;
        }
      }

      if (field === 'bundleId' && value) {
        const selectedBundle = availableBundles.find(b => b.id === parseInt(value));
        if (selectedBundle) {
          newItems[index].bundleId = selectedBundle.id;
          newItems[index].unitPrice = selectedBundle.discountedPrice || selectedBundle.totalPrice;
          newItems[index].bundleName = selectedBundle.name;
          newItems[index].bundleDescription = selectedBundle.description;
          newItems[index].total = newItems[index].quantity * (selectedBundle.discountedPrice || selectedBundle.totalPrice);
        }
      }

      if (['quantity', 'unitPrice', 'hasDiscount', 'discountType', 'discountValue'].includes(field)) {
        const { total } = calculateItemTotals(newItems[index]);
        newItems[index].total = total;
      }

      if (field === 'hasDiscount') {
        newItems[index].hasDiscount = value;
        if (!value) {
          newItems[index].discountType = 'percentage';
          newItems[index].discountValue = 0;
          newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
        }
      }

      return { ...prev, items: newItems };
    });
  }, [availableServices, availableProducts, availableBundles]);

  const calculateRequiredTotal = useCallback(() => {
    return formData.items
      .filter(item => item.selectionRequired)
      .reduce((total, item) => total + (Number(item.total) || 0), 0);
  }, [formData.items]);

  const calculateMaxTotal = useCallback(() => {
    return calculateModuleTotals(formData.items);
  }, [formData.items]);

  const copyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copiato",
        description: "Il link di configurazione è stato copiato negli appunti"
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Campo obbligatorio",
        description: "Inserisci il nome del modulo",
        variant: "destructive"
      });
      return;
    }

    if (formData.items.length === 0) {
      toast({
        title: "Nessun elemento",
        description: "Aggiungi almeno un servizio o pacchetto al modulo",
        variant: "destructive"
      });
      return;
    }

    const invalidItem = formData.items.find(item => !item.serviceId && !item.bundleId && !item.productId);
    if (invalidItem) {
      toast({
        title: "Elemento incompleto",
        description: "Seleziona un servizio, un prodotto o un pacchetto per ogni elemento del modulo",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const dataToSave = {
        ...formData,
        expiryDate: formData.expiryDate instanceof Date
          ? formData.expiryDate.toISOString()
          : formData.expiryDate
      };

      const result = await onSave(dataToSave);
      if (result) {
        toast({
          title: isEdit ? "Modulo aggiornato" : "Modulo creato",
          description: `Il modulo "${formData.name}" è stato ${isEdit ? 'aggiornato' : 'aggiunto'} al preventivo`
        });
      }
    } catch (error) {
      console.error("Errore nel salvataggio del modulo:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare il modulo",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (onDelete && formData.id) {
      onDelete(formData.id);
    }
  };

  // Function to handle item selection changes
  const handleItemSelection = (itemId: number, selected: boolean) => {
    const updatedItems = formData.items.map(item => {
      if (item.id === itemId) {
        return { ...item, isSelected: selected };
      }
      return item;
    });
    setFormData(prev => ({ ...prev, items: updatedItems }));
    setSelectedCount(updatedItems.filter(item => item.isSelected).length)
  };

  // Function to check if more selections can be made
  const canSelectMore = () => {
    if (!formData.maxSelections || formData.maxSelections === 0) return true;
    return selectedCount < formData.maxSelections;
  };

  // Function to calculate selection progress
  const getProgressPercentage = () => {
    if (!formData.maxSelections || formData.maxSelections === 0) return 0;
    return (selectedCount / formData.maxSelections) * 100;
  };

  useEffect(() => {
    const count = formData.items.filter(item => item.isSelected).length;
    setSelectedCount(count);
  }, [formData.items]);


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-playfair text-xl">
          {isEdit ? "Modifica Modulo Variabile" : "Nuovo Modulo Variabile"}
        </CardTitle>
        <CardDescription>
          Crea un modulo con opzioni tra cui il cliente potrà scegliere
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="name">Nome del modulo *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="es. Opzioni aggiuntive, Upgrade servizi, ecc."
              />
            </div>
            <div>
              <Label htmlFor="description">Descrizione (opzionale)</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleChange}
                placeholder="Descrizione che vedrà anche il cliente durante la configurazione"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="maxSelections">Massimo numero di selezioni</Label>
              <Input
                id="maxSelections"
                name="maxSelections"
                type="number"
                min={0}
                value={formData.maxSelections}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="border rounded-md p-4 space-y-4 bg-muted/20">
          <h4 className="font-medium flex items-center">
            <Link className="h-4 w-4 mr-2" />
            Configurazioni di condivisione
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expiryDate">Data di scadenza del link</Label>
              <div className="mt-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.expiryDate ? (
                        format(new Date(formData.expiryDate), "PPP", { locale: it })
                      ) : (
                        <span>Seleziona una data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={formData.expiryDate ? new Date(formData.expiryDate) : undefined}
                      onSelect={handleSetExpiryDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {isEdit && shareUrl && (
              <div className="space-y-2">
                <Label>Link di configurazione</Label>
                <div className="flex">
                  <Input value={shareUrl} readOnly className="rounded-r-none" />
                  <Button
                    variant="outline"
                    className="rounded-l-none"
                    onClick={copyShareUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Questo link permette al cliente di configurare le opzioni di questo modulo.
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">Opzioni configurabili dal cliente</h4>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi opzione
            </Button>
          </div>

          {formData.items.length === 0 ? (
            <div className="text-center py-8 border rounded-md border-dashed">
              <p className="text-muted-foreground">Nessuna opzione aggiunta</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi la prima opzione
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.items.map((item, index) => {
                const isDisabled = !canSelectMore() && !item.isSelected;

                return (
                  <Card key={item.id} className={cn("overflow-hidden", isDisabled && "opacity-50 cursor-not-allowed")}>
                    <div className="p-4 border-b bg-muted/30">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <h5 className="font-medium">Opzione #{index + 1}</h5>
                          {item.selectionRequired && (
                            <Badge variant="default" className="text-xs">Obbligatoria</Badge>
                          )}
                          {item.isDefault && (
                            <Badge variant="outline" className="text-xs">Preselezionata</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">Seleziona un tipo di elemento</span>
                          <div className="h-px flex-1 bg-border"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label
                              htmlFor={`serviceId-${index}`}
                              className="flex items-center gap-1"
                            >
                              <span className="h-2 w-2 rounded-full bg-primary opacity-75"></span>
                              Servizio
                            </Label>
                            <div className="flex gap-2">
                              <Select
                                value={item.serviceId?.toString() || ""}
                                onValueChange={(value) => {
                                  if (value) {
                                    handleItemChange(index, 'serviceId', parseInt(value));
                                    handleItemChange(index, 'productId', undefined);
                                    handleItemChange(index, 'bundleId', undefined);

                                    const selectedService = availableServices.find(s => s.id === parseInt(value));
                                    if (selectedService) {
                                      handleItemChange(index, 'unitPrice', selectedService.price);
                                      handleItemChange(index, 'serviceName', selectedService.name);
                                      handleItemChange(index, 'serviceDescription', selectedService.description);
                                      const qty = item.quantity || 1;
                                      handleItemChange(index, 'total', qty * selectedService.price);
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger className={item.serviceId ? "border-primary/50 bg-primary/5" : ""}>
                                  <SelectValue placeholder="Seleziona un servizio" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableServices.map(service => (
                                    <SelectItem key={service.id} value={service.id.toString()}>
                                      {service.name} ({formatCurrency(service.price)})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label
                              htmlFor={`productId-${index}`}
                              className="flex items-center gap-1"
                            >
                              <span className="h-2 w-2 rounded-full bg-amber-500 opacity-75"></span>
                              Prodotto
                            </Label>
                            <div className="flex gap-2">
                              <Select
                                value={item.productId?.toString() || ""}
                                onValueChange={(value) => {
                                  if (value) {
                                    handleItemChange(index, 'productId', parseInt(value));
                                    handleItemChange(index, 'serviceId', undefined);
                                    handleItemChange(index, 'bundleId', undefined);

                                    const selectedProduct = availableProducts.find(p => p.id === parseInt(value));
                                    if (selectedProduct) {
                                      handleItemChange(index, 'unitPrice', selectedProduct.price);
                                      handleItemChange(index, 'productName', selectedProduct.name);
                                      handleItemChange(index, 'productDescription', selectedProduct.description);
                                      const qty = item.quantity || 1;
                                      handleItemChange(index, 'total', qty * selectedProduct.price);
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger className={item.productId ? "border-amber-500/50 bg-amber-500/5" : ""}>
                                  <SelectValue placeholder="Seleziona un prodotto" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableProducts.map(product => (
                                    <SelectItem key={product.id} value={product.id.toString()}>
                                      {product.name} ({formatCurrency(product.price)})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label
                              htmlFor={`bundleId-${index}`}
                              className="flex items-center gap-1"
                            >
                              <span className="h-2 w-2 rounded-full bg-green-500 opacity-75"></span>
                              Pacchetto
                            </Label>
                            <div className="flex gap-2">
                              <Select
                                value={item.bundleId?.toString() || ""}
                                onValueChange={(value) => {
                                  if (value) {
                                    handleItemChange(index, 'bundleId', parseInt(value));
                                    handleItemChange(index, 'serviceId', undefined);
                                    handleItemChange(index, 'productId', undefined);

                                    const selectedBundle = availableBundles.find(b => b.id === parseInt(value));
                                    if (selectedBundle) {
                                      const bundlePrice = selectedBundle.discountedPrice || selectedBundle.totalPrice;
                                      handleItemChange(index, 'unitPrice', bundlePrice);
                                      handleItemChange(index, 'bundleName', selectedBundle.name);
                                      handleItemChange(index, 'bundleDescription', selectedBundle.description);
                                      const qty = item.quantity || 1;
                                      handleItemChange(index, 'total', qty * bundlePrice);
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger className={item.bundleId ? "border-green-500/50 bg-green-500/5" : ""}>
                                  <SelectValue placeholder="Seleziona un pacchetto" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableBundles.map(bundle => (
                                    <SelectItem key={bundle.id} value={bundle.id.toString()}>
                                      {bundle.name} ({formatCurrency(bundle.discountedPrice || bundle.totalPrice)})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`quantity-${index}`}>Quantità</Label>
                          <Input
                            id={`quantity-${index}`}
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                          />
                        </div>

                        <div>
                          <Label htmlFor={`unitPrice-${index}`}>Prezzo unitario (€)</Label>
                          <Input
                            id={`unitPrice-${index}`}
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                          />
                        </div>

                        <div className="flex items-end">
                          <Button
                            variant={item.hasDiscount ? "default" : "outline"}
                            className="w-full"
                            onClick={() => handleItemChange(index, 'hasDiscount', !item.hasDiscount)}
                          >
                            {item.hasDiscount ? "Sconto applicato" : "Aggiungi sconto"}
                          </Button>
                        </div>
                      </div>

                      {item.hasDiscount && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border rounded-md bg-muted/20">
                          <div>
                            <Label htmlFor={`discountType-${index}`}>Tipo di sconto</Label>
                            <Select
                              value={item.discountType || "percentage"}
                              onValueChange={(value) => handleItemChange(index, 'discountType', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">Percentuale (%)</SelectItem>
                                <SelectItem value="fixed">Importo fisso (€)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor={`discountValue-${index}`}>
                              {item.discountType === 'fixed' ? 'Importo sconto (€)' : 'Percentuale sconto (%)'}
                            </Label>
                            <Input
                              id={`discountValue-${index}`}
                              type="number"
                              min={0}
                              max={item.discountType === 'percentage' ? 100 : undefined}
                              step={item.discountType === 'percentage' ? 1 : 0.01}
                              value={item.discountValue || 0}
                              onChange={(e) => handleItemChange(index, 'discountValue', parseFloat(e.target.value))}
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border rounded-md">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`required-${index}`}
                            checked={item.selectionRequired}
                            onCheckedChange={(checked) => {
                              handleItemChange(index, 'selectionRequired', checked);
                              if (checked) {
                                handleItemChange(index, 'isDefault', true);
                              }
                            }}
                          />
                          <Label htmlFor={`required-${index}`}>Opzione obbligatoria</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`default-${index}`}
                            checked={item.isDefault}
                            onCheckedChange={(checked) => handleItemChange(index, 'isDefault', checked)}
                            disabled={item.selectionRequired}
                          />
                          <Label htmlFor={`default-${index}`}>Preselezionata</Label>
                        </div>

                        <div className="col-span-2">
                          <Label htmlFor={`selectionOrder-${index}`}>Ordine di visualizzazione</Label>
                          <Input
                            id={`selectionOrder-${index}`}
                            type="number"
                            min={1}
                            value={item.selectionOrder || (index + 1)}
                            onChange={(e) => handleItemChange(index, 'selectionOrder', parseInt(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t flex justify-between items-center">
                        <div>
                          {item.hasDiscount && item.discountedPrice !== undefined && (
                            <div className="text-sm">
                              <span className="text-muted-foreground line-through mr-2">
                                {formatCurrency(item.unitPrice)}
                              </span>
                              <Badge variant="outline" className="font-normal">
                                {item.discountType === 'percentage' ? `-${item.discountValue}%` : `-${formatCurrency(item.discountValue || 0)}`}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-muted-foreground">Totale:</span>
                          <span className="text-lg font-medium ml-2">
                            {formatCurrency(item.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              <div className="mt-6 p-4 border rounded-lg bg-muted/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Opzioni obbligatorie:</span>
                    <span className="text-lg font-medium ml-2">
                      {formatCurrency(calculateRequiredTotal())}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">Massimo possibile:</span>
                    <span className="text-xl font-bold ml-2">
                      {formatCurrency(calculateMaxTotal())}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {formData.maxSelections > 0 && (
          <Progress value={getProgressPercentage()} className="mt-2" />
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Annulla
          </Button>

          {isEdit && onDelete && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </Button>
          )}
        </div>

        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isEdit ? "Aggiorna" : "Salva"} modulo
        </Button>
      </CardFooter>
    </Card>
  );
}
  // Ricalcola i totali quando cambiano le selezioni
  useEffect(() => {
    const { subtotal, total } = calculateModuleTotals(moduleData.selections || []);
    setModuleData(prev => ({
      ...prev,
      subtotal,
      total
    }));
  }, [moduleData.selections]);
