import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { QuoteModuleData, ModuleItem } from "@/types/module-types";
import { v4 as uuidv4 } from "uuid";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Calculator,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
  PackageCheck,
  Leaf,
  Receipt,
  HelpCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Schema di validazione per il modulo fisso
const fixedModuleSchema = z.object({
  name: z.string().min(1, "Il nome del modulo è obbligatorio"),
  description: z.string().optional(),
  type: z.literal("fixed"),
  discount: z.coerce.number().min(0).optional(),
  discountType: z.enum(["percentage", "amount"]).default("percentage"),
});

interface FixedModuleEditorProps {
  quoteId: number;
  module: QuoteModuleData | null;
  onSave: (module: QuoteModuleData) => void;
  onCancel: () => void;
}

/**
 * Componente per la creazione e modifica di moduli fissi
 * Responsabilità: Gestire la configurazione di moduli con servizi e prodotti fissi
 */
export default function FixedModuleEditor({
  quoteId,
  module,
  onSave,
  onCancel,
}: FixedModuleEditorProps) {
  // Stati per la gestione dell'editor
  const [activeTab, setActiveTab] = useState("info");
  const [items, setItems] = useState<ModuleItem[]>(module?.items || []);
  const [selectedItemType, setSelectedItemType] = useState<"service" | "product">("service");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNote, setItemNote] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [subtotal, setSubtotal] = useState(module?.subtotal || 0);
  const [total, setTotal] = useState(module?.total || 0);
  
  // Recupero dati prodotti e servizi
  const { data: services = [], isLoading: isServicesLoading } = useQuery<any[]>({
    queryKey: ["/api/services"],
  });
  
  const { data: products = [], isLoading: isProductsLoading } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });
  
  // Setup del form
  const form = useForm<z.infer<typeof fixedModuleSchema>>({
    resolver: zodResolver(fixedModuleSchema),
    defaultValues: {
      name: module?.name || "",
      description: module?.description || "",
      type: "fixed" as const,
      discount: module?.discount || 0,
      discountType: module?.discountType || "percentage",
    },
  });
  
  // Popola gli items all'inizio se in modalità modifica
  useEffect(() => {
    if (module?.items) {
      setItems(module.items);
      setSubtotal(module.subtotal || 0);
      setTotal(module.total || 0);
    }
  }, [module]);
  
  // Calcola i totali
  useEffect(() => {
    calculateTotals();
  }, [items, form.watch("discount"), form.watch("discountType")]);
  
  // Funzione per calcolare i totali del modulo
  const calculateTotals = () => {
    setCalculating(true);
    try {
      let moduleSubtotal = 0;
      let moduleTotal = 0;
      
      // Calcola il subtotale sommando tutti gli item
      items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        moduleSubtotal += itemTotal;
      });
      
      // Applica lo sconto
      const discount = form.watch("discount") || 0;
      const discountType = form.watch("discountType");
      
      if (discount > 0) {
        if (discountType === "percentage") {
          const discountAmount = (moduleSubtotal * discount) / 100;
          moduleTotal = moduleSubtotal - discountAmount;
        } else {
          moduleTotal = moduleSubtotal - discount;
        }
      } else {
        moduleTotal = moduleSubtotal;
      }
      
      // Assicurati che il totale non sia negativo
      moduleTotal = Math.max(0, moduleTotal);
      
      setSubtotal(moduleSubtotal);
      setTotal(moduleTotal);
    } catch (error) {
      console.error("Errore nel calcolo dei totali:", error);
    } finally {
      setCalculating(false);
    }
  };
  
  // Aggiungi un item al modulo
  const handleAddItem = () => {
    if (!selectedItemId) return;
    
    const itemType = selectedItemType;
    const itemsList = itemType === "service" ? services : products;
    const selectedItem = itemsList.find((item: any) => item.id === selectedItemId);
    
    if (!selectedItem) return;
    
    const newItem: ModuleItem = {
      itemId: selectedItem.id,
      itemType,
      name: selectedItem.name,
      description: selectedItem.description || "",
      price: selectedItem.price,
      quantity: itemQuantity,
      note: itemNote,
      total: selectedItem.price * itemQuantity,
    };
    
    setItems([...items, newItem]);
    resetItemForm();
  };
  
  // Rimuovi un item dal modulo
  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };
  
  // Resetta i campi del form per l'aggiunta di un item
  const resetItemForm = () => {
    setSelectedItemId(null);
    setItemQuantity(1);
    setItemNote("");
  };
  
  // Formatta un prezzo
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price / 100);
  };
  
  // Gestisce la submission del form
  const onSubmit = (values: z.infer<typeof fixedModuleSchema>) => {
    if (items.length === 0) {
      alert("Aggiungi almeno un servizio o prodotto al modulo");
      return;
    }
    
    const moduleData: QuoteModuleData = {
      ...values,
      quoteId,
      items,
      subtotal,
      total,
      id: module?.id,
    };
    
    onSave(moduleData);
  };

  return (
    <div className="border rounded-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">
          {module ? "Modifica" : "Crea"} Modulo Fisso
        </h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info">Informazioni Base</TabsTrigger>
          <TabsTrigger value="items">Servizi e Prodotti</TabsTrigger>
        </TabsList>
        
        <TabsContent value="info" className="py-4">
          <Form {...form}>
            <form className="space-y-4">
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
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrivi brevemente questo modulo"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sconto</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => {
                            field.onChange(
                              e.target.value === "" ? 0 : parseFloat(e.target.value)
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Sconto</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentuale (%)</SelectItem>
                          <SelectItem value="amount">Importo (€)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
          
          <div className="flex justify-end mt-6">
            <Button
              variant="outline"
              onClick={() => setActiveTab("items")}
              className="mr-2"
            >
              Continua
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="items" className="py-4 space-y-6">
          {/* Aggiungi Servizi/Prodotti */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Aggiungi Servizi e Prodotti</CardTitle>
              <CardDescription>
                Seleziona i servizi e i prodotti inclusi in questo modulo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    value={selectedItemType}
                    onValueChange={(value: "service" | "product") => {
                      setSelectedItemType(value);
                      setSelectedItemId(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Servizio</SelectItem>
                      <SelectItem value="product">Prodotto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <FormLabel>
                    {selectedItemType === "service" ? "Servizio" : "Prodotto"}
                  </FormLabel>
                  <Select
                    value={selectedItemId?.toString() || ""}
                    onValueChange={(value) => setSelectedItemId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Seleziona ${selectedItemType === "service" ? "servizio" : "prodotto"}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedItemType === "service"
                        ? services.map((service: any) => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                              {service.name} - {formatPrice(service.price)}
                            </SelectItem>
                          ))
                        : products.map((product: any) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} - {formatPrice(product.price)}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <FormLabel>Quantità</FormLabel>
                  <Input
                    type="number"
                    min="1"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                
                <div>
                  <FormLabel>Note (opzionale)</FormLabel>
                  <Input
                    placeholder="es. Formato specifico, colore, ecc."
                    value={itemNote}
                    onChange={(e) => setItemNote(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!selectedItemId}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Aggiungi
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Lista items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Elementi Inclusi</CardTitle>
              <CardDescription>
                Elementi inclusi in questo modulo: {items.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Nessun elemento aggiunto. Aggiungi servizi o prodotti sopra.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Elemento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Qtà</TableHead>
                      <TableHead className="text-right">Prezzo</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {item.name}
                          {item.note && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Note: {item.note}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.itemType === "service" ? "Servizio" : "Prodotto"}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatPrice(item.price * item.quantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          
          {/* Riepilogo e totali */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Riepilogo Modulo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotale</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {form.watch("discount") > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      Sconto{" "}
                      {form.watch("discountType") === "percentage"
                        ? `(${form.watch("discount")}%)`
                        : ""}
                    </span>
                    <span>
                      -{" "}
                      {form.watch("discountType") === "percentage"
                        ? formatPrice((subtotal * form.watch("discount")) / 100)
                        : formatPrice(form.watch("discount"))}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Totale</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Pulsanti di azione */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab("info")}>
              Indietro
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={onCancel}>
                Annulla
              </Button>
              <Button onClick={form.handleSubmit(onSubmit)} disabled={items.length === 0}>
                <Save className="h-4 w-4 mr-1" />
                Salva Modulo
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}