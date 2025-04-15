import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, Plus, Search, X, ImageOff, Info, AlertCircle, ShoppingCart, PlusCircle, Calculator, ChevronsUpDown, Trash, Edit, Eye } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { roundToTwoDecimals } from "@/lib/moduleCalculations";

// Interfacce per i servizi e prodotti
interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  imagePath?: string;
  type: 'service' | 'product';
}

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  imagePath?: string;
  type: 'service' | 'product';
}

// Interfaccia per gli elementi del modulo
interface ModuleItem {
  id?: number;
  moduleId?: number;
  serviceId?: number | null;
  bundleId?: number | null;
  productId?: number | null;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  notes?: string;
  hasDiscount: boolean;
  discountValue: number | null;
  discountType: 'percentage' | 'amount' | null;
  discountedPrice: number | null;
  total: number;
  position?: number;
}

// Interfaccia per il modulo
interface QuoteModule {
  id?: number;
  quoteId: number;
  name: string;
  description?: string;
  type: 'fixed' | 'variable';
  status?: 'draft' | 'active' | 'pending_selection' | 'completed';
  position?: number;
  subtotal?: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  total?: number;
  items?: ModuleItem[];
  shareToken?: string;
  expiryDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FixedModuleEditorProps {
  quoteId: number;
  module: QuoteModule | null;
  onSave: (module: QuoteModule) => void;
  onCancel: () => void;
}

/**
 * Componente per la creazione e modifica di un modulo fisso
 * Responsabilità:
 * - Gestire il form per la creazione/modifica di un modulo fisso
 * - Permettere la selezione di prodotti e servizi per il modulo
 * - Calcolare i totali e applicare sconti
 */
export default function FixedModuleEditor({
  quoteId,
  module,
  onSave,
  onCancel,
}: FixedModuleEditorProps) {
  // Stati
  const [selectedItems, setSelectedItems] = useState<ModuleItem[]>([]);
  const [searchType, setSearchType] = useState<'service' | 'product'>('service');
  const [search, setSearch] = useState("");
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  
  // Schema di validazione del form
  const formSchema = z.object({
    name: z.string().min(1, "Il nome del modulo è obbligatorio"),
    description: z.string().optional(),
    discount: z.coerce.number().min(0).optional(),
    discountType: z.enum(["percentage", "amount"]).default("percentage"),
  });
  
  // Inizializzo il form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: module?.name || "",
      description: module?.description || "",
      discount: module?.discount || 0,
      discountType: module?.discountType || "percentage",
    },
  });
  
  // Recupero servizi e prodotti disponibili
  const { data: services = [], isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    staleTime: 30000
  });
  
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    staleTime: 30000
  });
  
  // Inizializza gli elementi selezionati quando il modulo viene caricato
  useEffect(() => {
    if (module?.items && module.items.length > 0) {
      setSelectedItems(module.items);
    } else {
      setSelectedItems([]);
    }
  }, [module]);
  
  // Filtra servizi e prodotti in base alla ricerca
  const filteredServices = services.filter(service => 
    service.type === 'service' && 
    service.name.toLowerCase().includes(search.toLowerCase())
  );
  
  const filteredProducts = services.filter(service => 
    service.type === 'product' && 
    service.name.toLowerCase().includes(search.toLowerCase())
  );
  
  // Aggiunge un servizio al modulo
  const handleAddService = (service: Service) => {
    // Verifica se il servizio è già presente
    const existingItem = selectedItems.find(item => 
      item.serviceId === service.id
    );
    
    if (existingItem) {
      // Incrementa la quantità se già presente
      setSelectedItems(prev => 
        prev.map(item => 
          item.serviceId === service.id 
            ? { ...item, quantity: (item.quantity || 1) + 1 } 
            : item
        )
      );
    } else {
      // Aggiungi il nuovo servizio
      const newItem: ModuleItem = {
        serviceId: service.id,
        bundleId: null,
        productId: null,
        name: service.name,
        description: service.description,
        price: service.price,
        quantity: 1,
        hasDiscount: false,
        discountType: null,
        discountValue: null,
        discountedPrice: null,
        total: service.price,
        position: selectedItems.length + 1,
      };
      
      setSelectedItems(prev => [...prev, newItem]);
    }
    
    // Chiudi il dialog
    setIsServiceDialogOpen(false);
  };
  
  // Aggiunge un prodotto al modulo
  const handleAddProduct = (product: Product) => {
    // Verifica se il prodotto è già presente
    const existingItem = selectedItems.find(item => 
      item.productId === product.id
    );
    
    if (existingItem) {
      // Incrementa la quantità se già presente
      setSelectedItems(prev => 
        prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: (item.quantity || 1) + 1 } 
            : item
        )
      );
    } else {
      // Aggiungi il nuovo prodotto
      const newItem: ModuleItem = {
        serviceId: null,
        bundleId: null,
        productId: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        quantity: 1,
        hasDiscount: false,
        discountType: null,
        discountValue: null,
        discountedPrice: null,
        total: product.price,
        position: selectedItems.length + 1,
      };
      
      setSelectedItems(prev => [...prev, newItem]);
    }
    
    // Chiudi il dialog
    setIsProductDialogOpen(false);
  };
  
  // Rimuove un elemento dal modulo
  const handleRemoveItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };
  
  // Aggiorna la quantità di un elemento
  const handleUpdateQuantity = (index: number, quantity: number) => {
    setSelectedItems(prev => 
      prev.map((item, i) => 
        i === index 
          ? { 
              ...item, 
              quantity, 
              total: calculateItemTotal(item.price, quantity, item.hasDiscount, item.discountType, item.discountValue)
            } 
          : item
      )
    );
  };
  
  // Aggiorna le note di un elemento
  const handleUpdateNotes = (index: number, notes: string) => {
    setSelectedItems(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, notes } : item
      )
    );
  };
  
  // Aggiorna lo sconto di un elemento
  const handleUpdateDiscount = (index: number, params: { 
    hasDiscount: boolean, 
    discountType?: 'percentage' | 'amount' | null,
    discountValue?: number | null 
  }) => {
    setSelectedItems(prev => 
      prev.map((item, i) => {
        if (i !== index) return item;
        
        const updatedItem = { 
          ...item,
          hasDiscount: params.hasDiscount,
          discountType: params.hasDiscount ? (params.discountType || item.discountType || 'percentage') : null,
          discountValue: params.hasDiscount ? (params.discountValue ?? item.discountValue ?? 0) : null,
        };
        
        // Calcola il prezzo scontato e il totale
        if (updatedItem.hasDiscount && updatedItem.discountValue && updatedItem.discountValue > 0) {
          if (updatedItem.discountType === 'percentage') {
            const discountedPrice = roundToTwoDecimals(
              updatedItem.price * (1 - updatedItem.discountValue / 100)
            );
            updatedItem.discountedPrice = discountedPrice;
            updatedItem.total = roundToTwoDecimals(discountedPrice * updatedItem.quantity);
          } else {
            // Sconto fisso
            const discountedPrice = roundToTwoDecimals(
              Math.max(0, updatedItem.price - updatedItem.discountValue)
            );
            updatedItem.discountedPrice = discountedPrice;
            updatedItem.total = roundToTwoDecimals(discountedPrice * updatedItem.quantity);
          }
        } else {
          updatedItem.discountedPrice = null;
          updatedItem.total = roundToTwoDecimals(updatedItem.price * updatedItem.quantity);
        }
        
        return updatedItem;
      })
    );
  };
  
  // Calcola il totale di un elemento in base a prezzo, quantità e sconto
  const calculateItemTotal = (
    price: number, 
    quantity: number, 
    hasDiscount: boolean, 
    discountType: 'percentage' | 'amount' | null, 
    discountValue: number | null
  ): number => {
    if (!hasDiscount || !discountValue || discountValue <= 0) {
      return roundToTwoDecimals(price * quantity);
    }
    
    if (discountType === 'percentage') {
      const discountedPrice = price * (1 - discountValue / 100);
      return roundToTwoDecimals(discountedPrice * quantity);
    } else {
      const discountedPrice = Math.max(0, price - discountValue);
      return roundToTwoDecimals(discountedPrice * quantity);
    }
  };
  
  // Calcola il subtotale del modulo (somma degli elementi senza sconto sul modulo)
  const calculateSubtotal = (): number => {
    return selectedItems.reduce((sum, item) => sum + item.total, 0);
  };
  
  // Calcola il totale del modulo (subtotale - sconto sul modulo)
  const calculateTotal = (): number => {
    const subtotal = calculateSubtotal();
    const discountValue = form.watch('discount') || 0;
    const discountType = form.watch('discountType');
    
    if (discountValue <= 0) return subtotal;
    
    if (discountType === 'percentage') {
      return roundToTwoDecimals(subtotal * (1 - discountValue / 100));
    } else {
      return roundToTwoDecimals(Math.max(0, subtotal - discountValue));
    }
  };
  
  // Gestisce il submit del form
  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    // Calcola totali
    const subtotal = calculateSubtotal();
    const total = calculateTotal();
    
    // Prepara i dati del modulo
    const moduleData: QuoteModule = {
      ...module,
      id: module?.id,
      quoteId,
      name: data.name,
      description: data.description || "",
      type: 'fixed',
      subtotal,
      discount: data.discount && data.discount > 0 ? data.discount : undefined,
      discountType: data.discount && data.discount > 0 ? data.discountType : undefined,
      total,
      items: selectedItems,
    };
    
    // Chiama la callback di salvataggio
    onSave(moduleData);
  };
  
  // Controlla se ci sono elementi selezionati
  const hasItems = selectedItems.length > 0;
  
  // Loading state
  if (isLoadingServices || isLoadingProducts) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">
          {module ? "Modifica Modulo Fisso" : "Nuovo Modulo Fisso"}
        </h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna alla lista
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} id="moduleForm">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informazioni Modulo</CardTitle>
                  <CardDescription>
                    Informazioni generali del modulo fisso
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Modulo</FormLabel>
                        <FormControl>
                          <Input placeholder="es. Pacchetto Standard" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrizione</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descrivi il modulo..." 
                            className="resize-none min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Una breve descrizione per spiegare al cliente cosa include questo modulo
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </form>
          </Form>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Elementi del Modulo</CardTitle>
              <CardDescription>
                Seleziona i servizi e prodotti da includere in questo modulo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex-1" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Aggiungi Servizio
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Seleziona Servizio</DialogTitle>
                      <DialogDescription>
                        Cerca e seleziona un servizio da aggiungere al modulo
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="relative my-2">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Cerca servizio..." 
                        className="pl-10"
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                      />
                      {search && (
                        <X 
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
                          onClick={() => setSearch("")}
                        />
                      )}
                    </div>
                    
                    <ScrollArea className="max-h-[60vh]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                        {filteredServices.length === 0 ? (
                          <div className="col-span-full text-center py-8 text-muted-foreground">
                            Nessun servizio trovato
                          </div>
                        ) : (
                          filteredServices.map((service) => (
                            <Card 
                              key={service.id} 
                              className="cursor-pointer hover:border-primary/50 transition-colors"
                              onClick={() => handleAddService(service)}
                            >
                              <CardContent className="p-4 flex">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-base truncate">{service.name}</h4>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {service.description || "Nessuna descrizione"}
                                  </p>
                                  <div className="mt-2 text-sm font-medium">
                                    {formatCurrency(service.price)}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                    
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Chiudi</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex-1" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Aggiungi Prodotto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Seleziona Prodotto</DialogTitle>
                      <DialogDescription>
                        Cerca e seleziona un prodotto da aggiungere al modulo
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="relative my-2">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Cerca prodotto..." 
                        className="pl-10"
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                      />
                      {search && (
                        <X 
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
                          onClick={() => setSearch("")}
                        />
                      )}
                    </div>
                    
                    <ScrollArea className="max-h-[60vh]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                        {filteredProducts.length === 0 ? (
                          <div className="col-span-full text-center py-8 text-muted-foreground">
                            Nessun prodotto trovato
                          </div>
                        ) : (
                          filteredProducts.map((product) => (
                            <Card 
                              key={product.id} 
                              className="cursor-pointer hover:border-primary/50 transition-colors"
                              onClick={() => handleAddProduct(product)}
                            >
                              <CardContent className="p-4 flex">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-base truncate">{product.name}</h4>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {product.description || "Nessuna descrizione"}
                                  </p>
                                  <div className="mt-2 text-sm font-medium">
                                    {formatCurrency(product.price)}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                    
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Chiudi</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {selectedItems.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-lg">
                  <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">
                    Nessun elemento aggiunto al modulo.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aggiungi servizi o prodotti utilizzando i pulsanti sopra.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedItems.map((item, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium text-base truncate">{item.name}</h4>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive h-8 w-8"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs">Quantità</Label>
                                <div className="flex items-center mt-1">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-r-none"
                                    onClick={() => handleUpdateQuantity(index, Math.max(1, item.quantity - 1))}
                                    disabled={item.quantity <= 1}
                                  >
                                    <span className="sr-only">Diminuisci</span>
                                    <span>-</span>
                                  </Button>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                                    className="h-8 w-16 rounded-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-l-none"
                                    onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                                  >
                                    <span className="sr-only">Aumenta</span>
                                    <span>+</span>
                                  </Button>
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-xs">Prezzo unitario</Label>
                                <p className="text-sm font-medium mt-2">
                                  {formatCurrency(item.price)}
                                </p>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-xs flex items-center">
                                <span className="mr-1">Note</span>
                                <span className="text-muted-foreground">(opzionale)</span>
                              </Label>
                              <Input
                                className="mt-1"
                                placeholder="Note specifiche per questo elemento..."
                                value={item.notes || ""}
                                onChange={(e) => handleUpdateNotes(index, e.target.value)}
                              />
                            </div>
                            
                            <div>
                              <div className="flex items-center mb-2">
                                <Label className="text-xs mr-2">Applica sconto</Label>
                                <input 
                                  type="checkbox" 
                                  checked={item.hasDiscount} 
                                  onChange={(e) => handleUpdateDiscount(index, { hasDiscount: e.target.checked })}
                                  className="h-4 w-4"
                                />
                              </div>
                              
                              {item.hasDiscount && (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                  <Select
                                    value={item.discountType || 'percentage'}
                                    onValueChange={(value) => handleUpdateDiscount(index, { 
                                      hasDiscount: true, 
                                      discountType: value as 'percentage' | 'amount' 
                                    })}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="percentage">Percentuale</SelectItem>
                                      <SelectItem value="amount">Importo</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  
                                  <Input
                                    type="number"
                                    className="w-24"
                                    min="0"
                                    step={item.discountType === 'percentage' ? '1' : '0.01'}
                                    max={item.discountType === 'percentage' ? '100' : undefined}
                                    value={item.discountValue || 0}
                                    onChange={(e) => handleUpdateDiscount(index, {
                                      hasDiscount: true,
                                      discountValue: parseFloat(e.target.value)
                                    })}
                                  />
                                  
                                  <div className="text-sm">
                                    {item.discountType === 'percentage' ? '%' : '€'}
                                  </div>
                                  
                                  {item.hasDiscount && item.discountValue && item.discountValue > 0 && (
                                    <div className="text-sm text-muted-foreground">
                                      Prezzo scontato: <span className="font-medium">{formatCurrency(item.discountedPrice || 0)}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <div className="border-t px-4 py-2 bg-muted/30 flex justify-between items-center">
                        <div className="text-sm">Totale elemento:</div>
                        <div className="font-medium">{formatCurrency(item.total)}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-5">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Riepilogo Modulo</CardTitle>
              <CardDescription>
                Anteprima del modulo e totali
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Nome Modulo</Label>
                <p className="font-medium">
                  {form.watch('name') || "Modulo senza nome"}
                </p>
              </div>
              
              {form.watch('description') && (
                <div className="space-y-1">
                  <Label className="text-xs">Descrizione</Label>
                  <p className="text-sm">
                    {form.watch('description')}
                  </p>
                </div>
              )}
              
              <Separator />
              
              <div className="space-y-1">
                <Label className="text-xs">Elementi Inclusi</Label>
                {selectedItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessun elemento aggiunto</p>
                ) : (
                  <ul className="text-sm space-y-2 mt-2">
                    {selectedItems.map((item, index) => (
                      <li key={index} className="flex justify-between">
                        <span>{item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}</span>
                        <span className="font-medium">{formatCurrency(item.total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <div className="text-sm">Subtotale</div>
                <div className="font-medium">{formatCurrency(calculateSubtotal())}</div>
              </div>
              
              <div>
                <div className="flex items-center mb-2">
                  <Label className="text-xs mr-2">Sconto sul modulo</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Form {...form}>
                    <div className="flex flex-wrap gap-2 items-center">
                      <FormField
                        control={form.control}
                        name="discountType"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">Percentuale</SelectItem>
                                <SelectItem value="amount">Importo</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="discount"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step={form.watch('discountType') === 'percentage' ? '1' : '0.01'}
                                max={form.watch('discountType') === 'percentage' ? '100' : undefined}
                                className="w-24"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <div className="text-sm">
                        {form.watch('discountType') === 'percentage' ? '%' : '€'}
                      </div>
                    </div>
                  </Form>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center font-semibold text-lg">
                <div>Totale Modulo</div>
                <div>{formatCurrency(calculateTotal())}</div>
              </div>
              
              {!hasItems && (
                <div className="bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 rounded-md p-3 text-sm flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300">Attenzione</p>
                    <p className="mt-1">Il modulo è vuoto. Aggiungi almeno un servizio o prodotto.</p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button 
                className="w-full" 
                type="submit"
                form="moduleForm"
                disabled={!hasItems}
              >
                {module?.id ? "Aggiorna Modulo" : "Crea Modulo"}
              </Button>
              <Button variant="outline" className="w-full" onClick={onCancel}>
                Annulla
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}