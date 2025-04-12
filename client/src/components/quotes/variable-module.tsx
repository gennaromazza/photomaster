import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Save, Plus, Copy, Calendar, Link, HelpCircle } from "lucide-react";
import { QuoteModuleData, QuoteModuleItemData } from "./module-selector";
import { formatCurrency } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { it } from "date-fns/locale";

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

  const [formData, setFormData] = useState<QuoteModuleData>({
    quoteId,
    name: "",
    type: "variable",
    status: "active",
    items: [],
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default a 7 giorni da oggi
    ...module
  });

  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableBundles, setAvailableBundles] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");

  // Genera l'URL di condivisione se il modulo ha già un token
  useEffect(() => {
    if (module?.shareToken) {
      setShareUrl(`${window.location.origin}/quotes/modules/${module.shareToken}`);
    }
  }, [module]);

  // Carica servizi, prodotti e pacchetti disponibili
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Carica i servizi e prodotti
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

  // Imposta la data di scadenza
  const handleSetExpiryDate = (date?: Date) => {
    setFormData(prev => ({ ...prev, expiryDate: date }));
  };

  // Aggiunge un nuovo elemento vuoto al modulo
  const addItem = () => {
    const newItem: QuoteModuleItemData = {
      quantity: 1,
      unitPrice: 0,
      hasDiscount: false,
      total: 0,
      isSelected: false,
      selectionRequired: false,
      isDefault: false,
      selectionOrder: formData.items.length + 1
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
  const handleItemChange = (index: number, field: keyof QuoteModuleItemData, value: any) => {
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
          newItems[index].unitPrice = selectedService.price;
          newItems[index].serviceName = selectedService.name;
          newItems[index].serviceDescription = selectedService.description;
          // Resetta gli altri campi
          newItems[index].bundleId = undefined;
          newItems[index].bundleName = undefined;
          newItems[index].bundleDescription = undefined;
          newItems[index].productId = undefined;
          newItems[index].productName = undefined;
          newItems[index].productDescription = undefined;
        }
      }

      // Se il campo è productId, aggiorna anche il prezzo unitario con il prezzo del prodotto
      if (field === 'productId' && value) {
        const selectedProduct = availableProducts.find(p => p.id === parseInt(value));
        if (selectedProduct) {
          newItems[index].unitPrice = selectedProduct.price;
          newItems[index].productName = selectedProduct.name;
          newItems[index].productDescription = selectedProduct.description;
          // Resetta gli altri campi
          newItems[index].serviceId = undefined;
          newItems[index].serviceName = undefined;
          newItems[index].serviceDescription = undefined;
          newItems[index].bundleId = undefined;
          newItems[index].bundleName = undefined;
          newItems[index].bundleDescription = undefined;
        }
      }

      // Se il campo è bundleId, aggiorna anche il prezzo unitario con il prezzo del pacchetto
      if (field === 'bundleId' && value) {
        const selectedBundle = availableBundles.find(b => b.id === parseInt(value));
        if (selectedBundle) {
          newItems[index].unitPrice = selectedBundle.discountedPrice || selectedBundle.totalPrice;
          newItems[index].bundleName = selectedBundle.name;
          newItems[index].bundleDescription = selectedBundle.description;
          // Resetta gli altri campi
          newItems[index].serviceId = undefined;
          newItems[index].serviceName = undefined;
          newItems[index].serviceDescription = undefined;
          newItems[index].productId = undefined;
          newItems[index].productName = undefined;
          newItems[index].productDescription = undefined;
        }
      }

      // Ricalcola il totale
      if (['quantity', 'unitPrice', 'hasDiscount', 'discountType', 'discountValue'].includes(field)) {
        const qty = newItems[index].quantity || 1;
        const unitPrice = newItems[index].unitPrice || 0;
        const hasDiscount = newItems[index].hasDiscount || false;
        
        if (!hasDiscount) {
          newItems[index].total = qty * unitPrice;
          newItems[index].discountedPrice = undefined;
        } else {
          const discountType = newItems[index].discountType || 'percentage';
          const discountValue = newItems[index].discountValue || 0;
          
          if (discountType === 'percentage') {
            const discountedPrice = unitPrice * (1 - (discountValue / 100));
            newItems[index].discountedPrice = discountedPrice;
            newItems[index].total = qty * discountedPrice;
          } else { // fixed
            const discountedPrice = Math.max(0, unitPrice - discountValue);
            newItems[index].discountedPrice = discountedPrice;
            newItems[index].total = qty * discountedPrice;
          }
        }
      }

      return { ...prev, items: newItems };
    });
  };

  // Calcola il totale del modulo per gli elementi obbligatori
  const calculateRequiredTotal = () => {
    return formData.items
      .filter(item => item.selectionRequired)
      .reduce((total, item) => total + (item.total || 0), 0);
  };

  // Calcola il totale massimo possibile (tutti gli elementi selezionati)
  const calculateMaxTotal = () => {
    return formData.items.reduce((total, item) => total + (item.total || 0), 0);
  };

  // Copia l'URL di condivisione negli appunti
  const copyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copiato",
        description: "Il link di configurazione è stato copiato negli appunti"
      });
    }
  };

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
      // Prepara i dati da salvare, assicurandosi che la data sia in formato stringa ISO
      const dataToSave = {
        ...formData,
        // Se expiryDate è un oggetto Date, lo convertiamo in stringa ISO, altrimenti lo lasciamo invariato
        expiryDate: formData.expiryDate instanceof Date 
          ? formData.expiryDate.toISOString() 
          : formData.expiryDate
      };
      
      onSave(dataToSave);
      toast({
        title: isEdit ? "Modulo aggiornato" : "Modulo creato",
        description: `Il modulo "${formData.name}" è stato ${isEdit ? 'aggiornato' : 'aggiunto'} al preventivo`
      });
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
          {isEdit ? "Modifica Modulo Variabile" : "Nuovo Modulo Variabile"}
        </CardTitle>
        <CardDescription>
          Crea un modulo con opzioni tra cui il cliente potrà scegliere
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Nome e descrizione del modulo */}
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
          </div>
        </div>

        {/* Configurazioni di condivisione */}
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

        {/* Elementi del modulo */}
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
              {formData.items.map((item, index) => (
                <Card key={index} className="overflow-hidden">
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
                    
                    {/* Opzioni di selezione per moduli variabili */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border rounded-md">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`required-${index}`}
                          checked={item.selectionRequired}
                          onCheckedChange={(checked) => {
                            handleItemChange(index, 'selectionRequired', checked);
                            // Se imposto come obbligatorio, deve essere anche preselezionato
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
              ))}

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