import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Search,
  Trash2,
  PackageOpen,
  Loader2,
  Save,
  ShoppingCart,
  Info,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { refreshQuoteTotals } from "../utils/refresh-quote-totals";

// Tipi
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
  createdAt?: string;
  updatedAt?: string;
}

interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  category?: { name: string };
}

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  category?: { name: string };
}

// Props dell'editor
interface FixedModuleEditorProps {
  quoteId: number;
  module: QuoteModuleData | null;
  onSave: (moduleData: QuoteModuleData) => void;
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
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });
  
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  // Inizializzo gli elementi selezionati quando si modifica un modulo esistente
  useEffect(() => {
    if (module && module.items && module.items.length > 0) {
      setSelectedItems(module.items);
    }
  }, [module]);
  
  // Filtri per ricerca
  const filteredServices = services.filter(
    (service) => service.name.toLowerCase().includes(search.toLowerCase())
  );
  
  const filteredProducts = products.filter(
    (product) => product.name.toLowerCase().includes(search.toLowerCase())
  );
  
  // Aggiungi servizio al modulo
  const handleAddService = (service: Service) => {
    // Verifica se il servizio è già presente
    const existingIndex = selectedItems.findIndex(
      (item) => item.itemId === service.id && item.itemType === "service"
    );
    
    if (existingIndex !== -1) {
      // Incrementa la quantità se già presente
      const newItems = [...selectedItems];
      newItems[existingIndex].quantity += 1;
      // Aggiorna il totale dell'elemento
      newItems[existingIndex].total = calculateItemTotal(newItems[existingIndex]);
      setSelectedItems(newItems);
    } else {
      // Aggiungi nuovo elemento
      const newItem: ModuleItem = {
        itemId: service.id,
        itemType: "service",
        name: service.name,
        description: service.description,
        price: service.price,
        quantity: 1,
        total: service.price,
      };
      setSelectedItems([...selectedItems, newItem]);
    }
    
    setIsServiceDialogOpen(false);
  };
  
  // Aggiungi prodotto al modulo
  const handleAddProduct = (product: Product) => {
    // Verifica se il prodotto è già presente
    const existingIndex = selectedItems.findIndex(
      (item) => item.itemId === product.id && item.itemType === "product"
    );
    
    if (existingIndex !== -1) {
      // Incrementa la quantità se già presente
      const newItems = [...selectedItems];
      newItems[existingIndex].quantity += 1;
      // Aggiorna il totale dell'elemento
      newItems[existingIndex].total = calculateItemTotal(newItems[existingIndex]);
      setSelectedItems(newItems);
    } else {
      // Aggiungi nuovo elemento
      const newItem: ModuleItem = {
        itemId: product.id,
        itemType: "product",
        name: product.name,
        description: product.description,
        price: product.price,
        quantity: 1,
        total: product.price,
      };
      setSelectedItems([...selectedItems, newItem]);
    }
    
    setIsProductDialogOpen(false);
  };
  
  // Rimuovi elemento dal modulo
  const handleRemoveItem = (index: number) => {
    const newItems = [...selectedItems];
    newItems.splice(index, 1);
    setSelectedItems(newItems);
  };
  
  // Aggiorna quantità
  const handleQuantityChange = (index: number, quantity: number) => {
    if (quantity < 1) return;
    
    const newItems = [...selectedItems];
    newItems[index].quantity = quantity;
    // Aggiorna il totale dell'elemento
    newItems[index].total = calculateItemTotal(newItems[index]);
    setSelectedItems(newItems);
  };
  
  // Aggiorna sconto elemento
  const handleItemDiscountChange = (index: number, discount: number) => {
    const newItems = [...selectedItems];
    newItems[index].discount = discount;
    // Aggiorna il totale dell'elemento
    newItems[index].total = calculateItemTotal(newItems[index]);
    setSelectedItems(newItems);
  };
  
  // Aggiorna tipo sconto elemento
  const handleItemDiscountTypeChange = (index: number, discountType: "percentage" | "amount") => {
    const newItems = [...selectedItems];
    newItems[index].discountType = discountType;
    // Aggiorna il totale dell'elemento
    newItems[index].total = calculateItemTotal(newItems[index]);
    setSelectedItems(newItems);
  };
  
  // Calcola il totale di un singolo elemento considerando quantità e sconto
  const calculateItemTotal = (item: ModuleItem): number => {
    const baseTotal = item.price * item.quantity;
    
    if (!item.discount || item.discount <= 0) {
      return baseTotal;
    }
    
    if (item.discountType === "percentage") {
      return baseTotal - (baseTotal * item.discount) / 100;
    } else {
      return Math.max(0, baseTotal - item.discount);
    }
  };
  
  // Calcola subtotale del modulo (somma dei totali degli elementi)
  const calculateSubtotal = (): number => {
    return selectedItems.reduce((total, item) => total + (item.total || calculateItemTotal(item)), 0);
  };
  
  // Calcola totale del modulo considerando lo sconto a livello di modulo
  const calculateTotal = (): number => {
    const subtotal = calculateSubtotal();
    const discount = form.watch("discount") || 0;
    const discountType = form.watch("discountType");
    
    if (discount <= 0) {
      return subtotal;
    }
    
    if (discountType === "percentage") {
      return subtotal - (subtotal * discount) / 100;
    } else {
      return Math.max(0, subtotal - discount);
    }
  };
  
  // Gestione del salvataggio del modulo
  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    if (selectedItems.length === 0) {
      alert("Aggiungi almeno un elemento al modulo");
      return;
    }
    
    // Calcola i totali
    const subtotal = calculateSubtotal();
    const total = calculateTotal();
    
    // Prepara il modulo da salvare
    const moduleData: QuoteModuleData = {
      id: module?.id,
      quoteId,
      name: values.name,
      description: values.description,
      type: "fixed",
      subtotal,
      discount: values.discount,
      discountType: values.discountType,
      total,
      items: selectedItems,
    };
    
    // Assicurati che totali e sconti siano aggiornati
    moduleData.items = moduleData.items.map(item => ({
      ...item,
      total: calculateItemTotal(item)
    }));
    
    // Richiama la funzione di salvataggio
    onSave(moduleData);
  };
  
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
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informazioni Modulo</CardTitle>
                  <CardDescription>
                    Inserisci i dettagli generali del modulo
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
                          <Input placeholder="es. Pacchetto Base" {...field} />
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
                        <FormLabel>Descrizione (opzionale)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descrivi brevemente il modulo..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Elementi del Modulo</CardTitle>
                    <div className="flex space-x-2">
                      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Servizio
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Aggiungi Servizio</DialogTitle>
                            <DialogDescription>
                              Cerca e seleziona il servizio da aggiungere al modulo
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="py-4">
                            <div className="relative mb-4">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Cerca servizio..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                              />
                            </div>
                            
                            <div className="max-h-[300px] overflow-y-auto">
                              {filteredServices.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground">
                                  Nessun servizio trovato
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {filteredServices.map((service) => (
                                    <div
                                      key={service.id}
                                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                                      onClick={() => handleAddService(service)}
                                    >
                                      <div>
                                        <div className="font-medium">{service.name}</div>
                                        {service.category && (
                                          <div className="text-xs text-muted-foreground">
                                            {service.category.name}
                                          </div>
                                        )}
                                      </div>
                                      <div className="font-medium">
                                        {formatCurrency(service.price)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <DialogFooter>
                            <Button 
                              variant="outline" 
                              onClick={() => setIsServiceDialogOpen(false)}
                            >
                              Annulla
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      
                      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Prodotto
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Aggiungi Prodotto</DialogTitle>
                            <DialogDescription>
                              Cerca e seleziona il prodotto da aggiungere al modulo
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="py-4">
                            <div className="relative mb-4">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Cerca prodotto..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                              />
                            </div>
                            
                            <div className="max-h-[300px] overflow-y-auto">
                              {filteredProducts.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground">
                                  Nessun prodotto trovato
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {filteredProducts.map((product) => (
                                    <div
                                      key={product.id}
                                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                                      onClick={() => handleAddProduct(product)}
                                    >
                                      <div>
                                        <div className="font-medium">{product.name}</div>
                                        {product.category && (
                                          <div className="text-xs text-muted-foreground">
                                            {product.category.name}
                                          </div>
                                        )}
                                      </div>
                                      <div className="font-medium">
                                        {formatCurrency(product.price)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <DialogFooter>
                            <Button 
                              variant="outline" 
                              onClick={() => setIsProductDialogOpen(false)}
                            >
                              Annulla
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedItems.length === 0 ? (
                    <div className="text-center py-8 border border-dashed rounded-md">
                      <PackageOpen className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                      <h3 className="text-base font-medium mb-1">Nessun elemento</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Aggiungi servizi o prodotti al modulo
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsServiceDialogOpen(true)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Servizio
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsProductDialogOpen(true)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Prodotto
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Elemento</TableHead>
                            <TableHead className="w-[90px] text-center">Qtà</TableHead>
                            <TableHead className="w-[120px] text-right">Prezzo</TableHead>
                            <TableHead className="w-[150px] text-right">Sconto</TableHead>
                            <TableHead className="w-[100px] text-right">Totale</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItems.map((item, index) => (
                            <TableRow key={`${item.itemType}-${item.itemId}-${index}`}>
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  <Badge
                                    variant="outline"
                                    className="mr-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
                                  >
                                    {item.itemType === "service" ? "S" : "P"}
                                  </Badge>
                                  <div>
                                    <div>{item.name}</div>
                                    {item.description && (
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        {item.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-6 w-6 rounded-r-none"
                                    onClick={() => handleQuantityChange(index, item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                  >
                                    -
                                  </Button>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                                    className="h-6 w-10 rounded-none text-center p-0 text-xs"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-6 w-6 rounded-l-none"
                                    onClick={() => handleQuantityChange(index, item.quantity + 1)}
                                  >
                                    +
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.price)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={item.discount || 0}
                                    onChange={(e) => 
                                      handleItemDiscountChange(index, parseFloat(e.target.value) || 0)
                                    }
                                    className="h-7 w-14 text-right text-xs"
                                  />
                                  <Select
                                    value={item.discountType || "percentage"}
                                    onValueChange={(value: "percentage" | "amount") => 
                                      handleItemDiscountTypeChange(index, value)
                                    }
                                  >
                                    <SelectTrigger className="h-7 w-16 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="percentage">%</SelectItem>
                                      <SelectItem value="amount">€</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.total || calculateItemTotal(item))}
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleRemoveItem(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-5">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Riepilogo Modulo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">Subtotale:</span>
                      <span className="font-medium">
                        {formatCurrency(calculateSubtotal())}
                      </span>
                    </div>
                    
                    <div className="p-4 border rounded-md space-y-3">
                      <FormField
                        control={form.control}
                        name="discount"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex justify-between items-center">
                              <FormLabel>Sconto sul modulo:</FormLabel>
                              <div className="flex items-center space-x-2">
                                <FormControl>
                                  <Input 
                                    type="number"
                                    min={0}
                                    className="w-20 text-right"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                
                                <FormField
                                  control={form.control}
                                  name="discountType"
                                  render={({ field }) => (
                                    <FormItem>
                                      <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="w-16">
                                            <SelectValue placeholder="%" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="percentage">%</SelectItem>
                                          <SelectItem value="amount">€</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {form.watch("discount") > 0 && (
                        <div className="text-xs text-muted-foreground flex items-center">
                          <Info className="h-3 w-3 mr-1" />
                          <span>
                            {form.watch("discountType") === "percentage"
                              ? `Sconto del ${form.watch("discount")}% equivale a ${formatCurrency(
                                  (calculateSubtotal() * form.watch("discount")) / 100
                                )}`
                              : `Sconto di ${formatCurrency(form.watch("discount"))}`}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="h-[1px] bg-border my-2"></div>
                    
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium">Totale modulo:</span>
                      <span className="text-xl font-semibold">
                        {formatCurrency(calculateTotal())}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Guida Rapida</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium">Aggiungi elementi</h4>
                        <p className="text-sm text-muted-foreground">
                          Seleziona servizi e prodotti da includere nel modulo
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium">Personalizza quantità</h4>
                        <p className="text-sm text-muted-foreground">
                          Imposta quantità e sconti specifici per ciascun elemento
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium">Applica sconti</h4>
                        <p className="text-sm text-muted-foreground">
                          Aggiungi sconti a livello di modulo se necessario
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-3 bg-amber-50 text-amber-800 rounded-md text-sm flex items-start">
                      <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        Questo modulo è <strong>fisso</strong>, quindi il cliente non potrà modificare le selezioni. Per elementi personalizzabili dal cliente, usa un modulo <strong>variabile</strong>.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annulla
            </Button>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              {module ? "Aggiorna Modulo" : "Salva Modulo"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}