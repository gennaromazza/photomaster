import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trash2, Save, Plus, HelpCircle } from "lucide-react";
import { QuoteModuleData, QuoteModuleItemData } from "./module-selector";
import { formatCurrency } from "@/lib/utils";
import { 
  calculateItemTotal, 
  calculateModuleTotal, 
  resetItemFields 
} from "@/lib/module-utils";

interface FixedModuleProps {
  quoteId: number;
  module?: QuoteModuleData;
  onSave: (module: QuoteModuleData) => void;
  onCancel: () => void;
  onDelete?: (moduleId: number) => void;
}

export function FixedModule({ quoteId, module, onSave, onCancel, onDelete }: FixedModuleProps) {
  const { toast } = useToast();
  const isEdit = !!module?.id;

  const [formData, setFormData] = useState<QuoteModuleData>({
    quoteId,
    name: "",
    type: "fixed",
    status: "active",
    items: [],
    ...module
  });

  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableBundles, setAvailableBundles] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Carica servizi, pacchetti e prodotti disponibili
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Carica i servizi
        const servicesResponse = await fetch('/api/services');
        if (servicesResponse.ok) {
          const allItems = await servicesResponse.json();
          // Separiamo servizi e prodotti
          const services = allItems.filter((item: any) => item.type === 'service');
          const products = allItems.filter((item: any) => item.type === 'product');
          setAvailableServices(services || []);
          setAvailableProducts(products || []);
        }

        // Carica i pacchetti
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

  // Gestione del cambiamento dei campi del modulo
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Aggiunge un nuovo elemento vuoto al modulo
  const addItem = () => {
    const newItem: QuoteModuleItemData = {
      quantity: 1,
      unitPrice: 0,
      hasDiscount: false,
      total: 0
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  // Rimuove un elemento dal modulo
  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Gestisce il cambiamento dei campi di un elemento
  const handleItemChange = useCallback((index: number, field: keyof QuoteModuleItemData, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value
      };

      // Se il campo è serviceId, aggiorna anche il prezzo unitario con il prezzo del servizio
      if (field === 'serviceId' && value) {
        const selectedService = availableServices.find(s => s.id === parseInt(value));
        if (selectedService) {
          // Resetta i campi non pertinenti utilizzando l'utility di reset
          newItems[index] = resetItemFields(newItems[index], true);
          // Poi imposta i nuovi valori
          newItems[index].serviceId = selectedService.id;
          newItems[index].unitPrice = selectedService.price;
          newItems[index].serviceName = selectedService.name;
          newItems[index].serviceDescription = selectedService.description;
        }
      }

      // Se il campo è productId, aggiorna anche il prezzo unitario con il prezzo del prodotto
      if (field === 'productId' && value) {
        const selectedProduct = availableProducts.find(p => p.id === parseInt(value));
        if (selectedProduct) {
          // Resetta i campi non pertinenti utilizzando l'utility di reset
          newItems[index] = resetItemFields(newItems[index], true);
          // Poi imposta i nuovi valori
          newItems[index].productId = selectedProduct.id;
          newItems[index].unitPrice = selectedProduct.price;
          newItems[index].productName = selectedProduct.name;
          newItems[index].productDescription = selectedProduct.description;
        }
      }

      // Se il campo è bundleId, aggiorna anche il prezzo unitario con il prezzo del pacchetto
      if (field === 'bundleId' && value) {
        const selectedBundle = availableBundles.find(b => b.id === parseInt(value));
        if (selectedBundle) {
          // Resetta i campi non pertinenti utilizzando l'utility di reset
          newItems[index] = resetItemFields(newItems[index], true);
          // Poi imposta i nuovi valori
          newItems[index].bundleId = selectedBundle.id;
          newItems[index].unitPrice = selectedBundle.discountedPrice || selectedBundle.totalPrice;
          newItems[index].bundleName = selectedBundle.name;
          newItems[index].bundleDescription = selectedBundle.description;
        }
      }

      // Ricalcola il totale utilizzando la funzione utility
      if (['quantity', 'unitPrice', 'hasDiscount', 'discountType', 'discountValue'].includes(field)) {
        // Usa la funzione utility per calcolare il totale dell'elemento
        const { total, discountedPrice } = calculateItemTotal(newItems[index]);
        newItems[index].total = total;
        newItems[index].discountedPrice = discountedPrice;
      }

      return { ...prev, items: newItems };
    });
  }, [availableServices, availableProducts, availableBundles]);

  // Calcola il totale del modulo utilizzando la funzione utility
  const calculateTotal = useCallback(() => {
    return calculateModuleTotal(formData.items);
  }, [formData.items]);

  // Salva il modulo
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

    // Verifica che tutti gli elementi abbiano un servizio, un prodotto o un pacchetto selezionato
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
      const result = await onSave(formData);
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

  // Elimina il modulo
  const handleDelete = () => {
    if (onDelete && formData.id) {
      onDelete(formData.id);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-playfair text-xl">
          {isEdit ? "Modifica Modulo Fisso" : "Nuovo Modulo Fisso"}
        </CardTitle>
        <CardDescription>
          Aggiungi servizi e prodotti che saranno inclusi nel preventivo
        </CardDescription>
        <div className="p-3 mt-2 bg-muted/20 rounded-md text-sm text-muted-foreground border border-dashed">
          <p className="flex items-center gap-1">
            <HelpCircle className="h-4 w-4 text-primary" />
            <span className="font-medium">Guida rapida:</span>
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-1 text-xs">
            <li>I <span className="font-medium">moduli fissi</span> contengono elementi predefiniti scelti da te, non modificabili dal cliente</li>
            <li>Aggiungi servizi, prodotti e pacchetti utilizzando i menu a tendina</li>
            <li>Puoi specificare quantità e applicare sconti personalizzati per ogni elemento</li>
            <li>Il totale del modulo viene calcolato automaticamente</li>
          </ul>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Nome e descrizione del modulo */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="name">Nome del modulo *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-[220px] text-xs">Un nome breve e descrittivo per identificare questo modulo nel preventivo</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="es. Pacchetto base, Servizi aggiuntivi, ecc."
              />
            </div>

            <div>
              <Label htmlFor="description">Descrizione (opzionale)</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleChange}
                placeholder="Inserisci una descrizione per questo modulo"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Elementi del modulo */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">Elementi del modulo</h4>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi elemento
            </Button>
          </div>

          {formData.items.length === 0 ? (
            <div className="text-center py-8 border rounded-md border-dashed">
              <p className="text-muted-foreground">Nessun elemento aggiunto</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi il primo elemento
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="p-4 border-b bg-muted/30">
                    <div className="flex justify-between items-center">
                      <h5 className="font-medium">Elemento #{index + 1}</h5>
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="w-[240px] text-xs">Scegli un solo tipo per elemento: un servizio (cerchio blu), un prodotto (cerchio ambra) o un pacchetto (cerchio verde)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                                  // Resetta altri campi
                                  handleItemChange(index, 'productId', undefined);
                                  handleItemChange(index, 'bundleId', undefined);

                                  // Aggiorna automaticamente il prezzo e altri dettagli
                                  const selectedService = availableServices.find(s => s.id === parseInt(value));
                                  if (selectedService) {
                                    handleItemChange(index, 'unitPrice', selectedService.price);
                                    handleItemChange(index, 'serviceName', selectedService.name);
                                    handleItemChange(index, 'serviceDescription', selectedService.description);
                                    // Calcola il totale (prezzo x quantità)
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
                                  // Resetta altri campi
                                  handleItemChange(index, 'serviceId', undefined);
                                  handleItemChange(index, 'bundleId', undefined);

                                  // Aggiorna automaticamente il prezzo e altri dettagli
                                  const selectedProduct = availableProducts.find(p => p.id === parseInt(value));
                                  if (selectedProduct) {
                                    handleItemChange(index, 'unitPrice', selectedProduct.price);
                                    handleItemChange(index, 'productName', selectedProduct.name);
                                    handleItemChange(index, 'productDescription', selectedProduct.description);
                                    // Calcola il totale (prezzo x quantità)
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
                                  // Resetta altri campi
                                  handleItemChange(index, 'serviceId', undefined);
                                  handleItemChange(index, 'productId', undefined);

                                  // Aggiorna automaticamente il prezzo e altri dettagli
                                  const selectedBundle = availableBundles.find(b => b.id === parseInt(value));
                                  if (selectedBundle) {
                                    const bundlePrice = selectedBundle.discountedPrice || selectedBundle.totalPrice;
                                    handleItemChange(index, 'unitPrice', bundlePrice);
                                    handleItemChange(index, 'bundleName', selectedBundle.name);
                                    handleItemChange(index, 'bundleDescription', selectedBundle.description);
                                    // Calcola il totale (prezzo x quantità)
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
                        <div className="flex items-center gap-1">
                          <Label htmlFor={`quantity-${index}`}>Quantità</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="w-[180px] text-xs">Inserisci la quantità desiderata. Il totale viene calcolato automaticamente moltiplicando la quantità per il prezzo unitario.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Input
                          id={`quantity-${index}`}
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-1">
                          <Label htmlFor={`unitPrice-${index}`}>Prezzo unitario (€)</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="w-[200px] text-xs">Il prezzo viene automaticamente importato quando selezioni un servizio, prodotto o pacchetto. Puoi modificare manualmente questo valore se necessario.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild className="w-full">
                              <Button
                                variant={item.hasDiscount ? "default" : "outline"}
                                className="w-full"
                                onClick={() => handleItemChange(index, 'hasDiscount', !item.hasDiscount)}
                              >
                                {item.hasDiscount ? "Sconto applicato" : "Aggiungi sconto"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="w-[200px] text-xs">Aggiungi uno sconto percentuale o a importo fisso a questo elemento. Gli sconti vengono calcolati sul prezzo unitario.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
              ))}

              <div className="mt-6 p-4 border rounded-lg bg-muted/30">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Totale modulo:</span>
                  <span className="text-xl font-bold">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
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