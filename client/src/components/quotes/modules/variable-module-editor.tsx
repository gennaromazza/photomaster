import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  Info,
  List,
  ListChecks,
  Loader2,
  Plus,
  Save,
  Search,
  Settings2,
  ShieldAlert,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { formatCurrency } from "@/lib/utils";
import { refreshQuoteTotals } from "../utils/refresh-quote-totals";

// Tipi
interface SelectionOption {
  id: string;
  selectionId?: string;
  itemId: number;
  itemType: 'service' | 'product';
  name: string;
  description?: string;
  price: number;
  isSelected?: boolean;
  isDefault?: boolean;
}

interface ModuleSelection {
  id: string;
  moduleId?: number;
  name: string;
  description?: string;
  options: Array<SelectionOption>;
  minOptions?: number;
  maxOptions?: number;
  isRequired?: boolean;
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
  selections?: Array<ModuleSelection>;
  minSelections?: number;
  maxSelections?: number;
  isRequired?: boolean;
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
interface VariableModuleEditorProps {
  quoteId: number;
  module: QuoteModuleData | null;
  onSave: (moduleData: QuoteModuleData) => void;
  onCancel: () => void;
}

/**
 * Componente per la creazione e modifica di un modulo variabile
 * Responsabilità:
 * - Gestire il form per la creazione/modifica di un modulo variabile
 * - Permettere la definizione di gruppi di selezioni con opzioni multiple
 * - Definire limiti e condizioni per le selezioni del cliente
 */
export default function VariableModuleEditor({
  quoteId,
  module,
  onSave,
  onCancel,
}: VariableModuleEditorProps) {
  // Stati
  const [moduleSelections, setModuleSelections] = useState<ModuleSelection[]>([]);
  const [editingSelectionId, setEditingSelectionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  
  // Schema di validazione per il modulo
  const formSchema = z.object({
    name: z.string().min(1, "Il nome del modulo è obbligatorio"),
    description: z.string().optional(),
    minSelections: z.coerce.number().min(0).optional(),
    maxSelections: z.coerce.number().min(0).optional(),
    isRequired: z.boolean().default(false),
    discount: z.coerce.number().min(0).optional(),
    discountType: z.enum(["percentage", "amount"]).default("percentage"),
  });
  
  // Schema di validazione per la selezione
  const selectionFormSchema = z.object({
    name: z.string().min(1, "Il nome della selezione è obbligatorio"),
    description: z.string().optional(),
    minOptions: z.coerce.number().min(0).optional(),
    maxOptions: z.coerce.number().min(0).optional(),
    isRequired: z.boolean().default(false),
  });
  
  // Inizializzo i form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: module?.name || "",
      description: module?.description || "",
      minSelections: module?.minSelections || 0,
      maxSelections: module?.maxSelections || 0,
      isRequired: module?.isRequired || false,
      discount: module?.discount || 0,
      discountType: module?.discountType || "percentage",
    },
  });
  
  const selectionForm = useForm<z.infer<typeof selectionFormSchema>>({
    resolver: zodResolver(selectionFormSchema),
    defaultValues: {
      name: "",
      description: "",
      minOptions: 0,
      maxOptions: 0,
      isRequired: false,
    },
  });
  
  // Recupero prodotti e servizi
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });
  
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  // Filtri per ricerca
  const filteredServices = services.filter(
    (service) => service.name.toLowerCase().includes(search.toLowerCase())
  );
  
  const filteredProducts = products.filter(
    (product) => product.name.toLowerCase().includes(search.toLowerCase())
  );
  
  // Inizializzo le selezioni quando si modifica un modulo esistente
  useEffect(() => {
    if (module && module.selections && module.selections.length > 0) {
      // Assicurati che ogni selezione e opzione abbia un ID
      const selectionsWithIds = module.selections.map(selection => ({
        ...selection,
        id: selection.id || uuidv4(),
        options: selection.options.map(option => ({
          ...option,
          id: option.id || uuidv4(),
        }))
      }));
      setModuleSelections(selectionsWithIds);
    }
  }, [module]);
  
  // Gestisco l'aggiunta di una nuova selezione
  const handleAddSelection = (values: z.infer<typeof selectionFormSchema>) => {
    const newSelection: ModuleSelection = {
      id: editingSelectionId || uuidv4(),
      name: values.name,
      description: values.description,
      options: [],
      minOptions: values.minOptions,
      maxOptions: values.maxOptions,
      isRequired: values.isRequired,
    };
    
    if (editingSelectionId) {
      // Modifica selezione esistente
      const existingSelectionIndex = moduleSelections.findIndex(s => s.id === editingSelectionId);
      
      if (existingSelectionIndex !== -1) {
        const updatedSelections = [...moduleSelections];
        // Mantieni le opzioni esistenti
        newSelection.options = moduleSelections[existingSelectionIndex].options;
        updatedSelections[existingSelectionIndex] = newSelection;
        setModuleSelections(updatedSelections);
      }
    } else {
      // Aggiunta nuova selezione
      setModuleSelections([...moduleSelections, newSelection]);
    }
    
    // Reset form e stato di editing
    selectionForm.reset({
      name: "",
      description: "",
      minOptions: 0,
      maxOptions: 0,
      isRequired: false,
    });
    setEditingSelectionId(null);
  };
  
  // Gestisco la modifica di una selezione esistente
  const handleEditSelection = (selectionId: string) => {
    const selection = moduleSelections.find(s => s.id === selectionId);
    if (!selection) return;
    
    selectionForm.reset({
      name: selection.name,
      description: selection.description || "",
      minOptions: selection.minOptions || 0,
      maxOptions: selection.maxOptions || 0,
      isRequired: selection.isRequired || false,
    });
    
    setEditingSelectionId(selectionId);
  };
  
  // Gestisco l'eliminazione di una selezione
  const handleDeleteSelection = (selectionId: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questa selezione?")) {
      setModuleSelections(moduleSelections.filter(s => s.id !== selectionId));
      
      if (editingSelectionId === selectionId) {
        selectionForm.reset({
          name: "",
          description: "",
          minOptions: 0,
          maxOptions: 0,
          isRequired: false,
        });
        setEditingSelectionId(null);
      }
    }
  };
  
  // Aggiungi servizio come opzione a una selezione
  const handleAddServiceOption = (service: Service, selectionId: string) => {
    const selectionIndex = moduleSelections.findIndex(s => s.id === selectionId);
    if (selectionIndex === -1) return;
    
    // Controlla se il servizio è già presente nella selezione
    const existingOptionIndex = moduleSelections[selectionIndex].options.findIndex(
      option => option.itemId === service.id && option.itemType === "service"
    );
    
    if (existingOptionIndex !== -1) {
      // Il servizio è già presente
      setIsServiceDialogOpen(false);
      return;
    }
    
    // Aggiungi il servizio come nuova opzione
    const newOption: SelectionOption = {
      id: uuidv4(),
      selectionId,
      itemId: service.id,
      itemType: "service",
      name: service.name,
      description: service.description,
      price: service.price,
      isSelected: false,
      isDefault: false,
    };
    
    const updatedSelections = [...moduleSelections];
    updatedSelections[selectionIndex].options.push(newOption);
    setModuleSelections(updatedSelections);
    
    setIsServiceDialogOpen(false);
  };
  
  // Aggiungi prodotto come opzione a una selezione
  const handleAddProductOption = (product: Product, selectionId: string) => {
    const selectionIndex = moduleSelections.findIndex(s => s.id === selectionId);
    if (selectionIndex === -1) return;
    
    // Controlla se il prodotto è già presente nella selezione
    const existingOptionIndex = moduleSelections[selectionIndex].options.findIndex(
      option => option.itemId === product.id && option.itemType === "product"
    );
    
    if (existingOptionIndex !== -1) {
      // Il prodotto è già presente
      setIsProductDialogOpen(false);
      return;
    }
    
    // Aggiungi il prodotto come nuova opzione
    const newOption: SelectionOption = {
      id: uuidv4(),
      selectionId,
      itemId: product.id,
      itemType: "product",
      name: product.name,
      description: product.description,
      price: product.price,
      isSelected: false,
      isDefault: false,
    };
    
    const updatedSelections = [...moduleSelections];
    updatedSelections[selectionIndex].options.push(newOption);
    setModuleSelections(updatedSelections);
    
    setIsProductDialogOpen(false);
  };
  
  // Rimuovi un'opzione da una selezione
  const handleRemoveOption = (selectionId: string, optionId: string) => {
    const selectionIndex = moduleSelections.findIndex(s => s.id === selectionId);
    if (selectionIndex === -1) return;
    
    const updatedSelections = [...moduleSelections];
    updatedSelections[selectionIndex].options = updatedSelections[selectionIndex].options.filter(
      option => option.id !== optionId
    );
    setModuleSelections(updatedSelections);
  };
  
  // Imposta un'opzione come predefinita
  const handleSetDefaultOption = (selectionId: string, optionId: string, isDefault: boolean) => {
    const selectionIndex = moduleSelections.findIndex(s => s.id === selectionId);
    if (selectionIndex === -1) return;
    
    const updatedSelections = [...moduleSelections];
    const optionIndex = updatedSelections[selectionIndex].options.findIndex(
      option => option.id === optionId
    );
    
    if (optionIndex !== -1) {
      updatedSelections[selectionIndex].options[optionIndex].isDefault = isDefault;
      setModuleSelections(updatedSelections);
    }
  };
  
  // Calcola il subtotale considerando le opzioni predefinite
  const calculateSubtotal = (): number => {
    let subtotal = 0;
    
    moduleSelections.forEach(selection => {
      // Aggiungi il prezzo di tutte le opzioni predefinite
      selection.options.forEach(option => {
        if (option.isDefault) {
          subtotal += option.price;
        }
      });
    });
    
    return subtotal;
  };
  
  // Calcola il totale del modulo considerando lo sconto
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
    if (moduleSelections.length === 0) {
      alert("Aggiungi almeno una selezione al modulo");
      return;
    }

    // Valida limiti selezioni
    if (values.minSelections && values.maxSelections && 
        values.minSelections > values.maxSelections) {
      alert("Il numero minimo di selezioni non può essere maggiore del massimo");
      return;  
    }

    // Valida opzioni in ogni selezione
    for (const selection of moduleSelections) {
      if (selection.minOptions && selection.maxOptions && 
          selection.minOptions > selection.maxOptions) {
        alert(`Selezione "${selection.name}": il minimo di opzioni non può superare il massimo`);
        return;
      }
      if (selection.isRequired && (!selection.options || selection.options.length === 0)) {
        alert(`Selezione "${selection.name}" è obbligatoria ma non ha opzioni`);
        return;
      }
    }
    
    // Verifica che ogni selezione abbia almeno un'opzione
    const emptySelections = moduleSelections.filter(selection => selection.options.length === 0);
    if (emptySelections.length > 0) {
      alert(`Aggiungi almeno un'opzione alla selezione "${emptySelections[0].name}"`);
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
      type: "variable",
      subtotal,
      discount: values.discount,
      discountType: values.discountType,
      total,
      selections: moduleSelections,
      minSelections: values.minSelections,
      maxSelections: values.maxSelections,
      isRequired: values.isRequired,
    };
    
    // Richiama la funzione di salvataggio
    onSave(moduleData);
  };
  
  // Verifica se ci sono selezioni disponibili
  const hasSelections = moduleSelections.length > 0;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">
          {module ? "Modifica Modulo Variabile" : "Nuovo Modulo Variabile"}
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
                    Informazioni generali e limitazioni del modulo variabile
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
                          <Input placeholder="es. Personalizza il tuo album" {...field} />
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <FormField
                      control={form.control}
                      name="minSelections"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimo Selezioni</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Numero minimo di categorie selezionabili
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="maxSelections"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Massimo Selezioni</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Numero massimo di categorie selezionabili (0 = illimitato)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="isRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Modulo Obbligatorio</FormLabel>
                          <FormDescription>
                            Il cliente deve selezionare almeno un'opzione in questo modulo
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </form>
          </Form>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <ListChecks className="h-5 w-5 mr-2 text-primary/70" />
                Selezioni del Modulo
              </CardTitle>
              <CardDescription>
                Definisci le categorie di scelta che il cliente potrà personalizzare
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...selectionForm}>
                <form
                  onSubmit={selectionForm.handleSubmit(handleAddSelection)}
                  className="border rounded-md p-4 mb-6"
                >
                  <h3 className="text-base font-medium mb-4">
                    {editingSelectionId ? "Modifica Selezione" : "Aggiungi Nuova Selezione"}
                  </h3>
                  
                  <div className="space-y-4">
                    <FormField
                      control={selectionForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Selezione</FormLabel>
                          <FormControl>
                            <Input placeholder="es. Tipo di Copertina" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={selectionForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrizione (opzionale)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descrivi questa categoria di scelta..."
                              rows={2}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={selectionForm.control}
                        name="minOptions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimo Opzioni</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Quante opzioni deve selezionare il cliente
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={selectionForm.control}
                        name="maxOptions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Massimo Opzioni</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              0 = illimitato
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={selectionForm.control}
                      name="isRequired"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                id="selection-required"
                              />
                              <label
                                htmlFor="selection-required"
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                Selezione Obbligatoria
                              </label>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    {editingSelectionId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          selectionForm.reset({
                            name: "",
                            description: "",
                            minOptions: 0,
                            maxOptions: 0,
                            isRequired: false,
                          });
                          setEditingSelectionId(null);
                        }}
                      >
                        Annulla Modifica
                      </Button>
                    )}
                    <Button type="submit">
                      {editingSelectionId ? "Aggiorna Selezione" : "Aggiungi Selezione"}
                    </Button>
                  </div>
                </form>
              </Form>
              
              {/* Elenco delle selezioni */}
              {moduleSelections.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-md">
                  <ListChecks className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <h3 className="text-base font-medium mb-1">Nessuna selezione</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Aggiungi selezioni con le opzioni che il cliente potrà scegliere
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {moduleSelections.map((selection) => (
                    <Card key={selection.id} className="mb-4">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-base flex items-center">
                              {selection.name}
                              {selection.isRequired && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Obbligatoria
                                </Badge>
                              )}
                            </CardTitle>
                            {selection.description && (
                              <CardDescription>{selection.description}</CardDescription>
                            )}
                            <div className="flex items-center mt-1 text-xs text-muted-foreground">
                              <span>
                                {selection.minOptions !== undefined && selection.minOptions > 0
                                  ? `Min: ${selection.minOptions}`
                                  : "Min: nessuno"}
                              </span>
                              <span className="mx-2">|</span>
                              <span>
                                {selection.maxOptions !== undefined && selection.maxOptions > 0
                                  ? `Max: ${selection.maxOptions}`
                                  : "Max: illimitato"}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditSelection(selection.id)}
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSelection(selection.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-3">
                          {/* Opzioni della selezione */}
                          {selection.options.length > 0 ? (
                            <div className="border rounded-md overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[50px]">Default</TableHead>
                                    <TableHead>Opzione</TableHead>
                                    <TableHead className="text-right">Prezzo</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {selection.options.map((option) => (
                                    <TableRow key={option.id}>
                                      <TableCell>
                                        <div className="flex items-center justify-center">
                                          <div
                                            className={`w-5 h-5 rounded-sm border flex items-center justify-center cursor-pointer ${
                                              option.isDefault 
                                                ? "bg-primary border-primary text-primary-foreground" 
                                                : "border-input"
                                            }`}
                                            onClick={() => 
                                              handleSetDefaultOption(selection.id, option.id, !option.isDefault)
                                            }
                                          >
                                            {option.isDefault && <Check className="h-3 w-3" />}
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center">
                                          <Badge
                                            variant="outline"
                                            className="mr-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
                                          >
                                            {option.itemType === "service" ? "S" : "P"}
                                          </Badge>
                                          <div>
                                            <div className="font-medium">{option.name}</div>
                                            {option.description && (
                                              <div className="text-xs text-muted-foreground">
                                                {option.description}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatCurrency(option.price)}
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => handleRemoveOption(selection.id, option.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground border border-dashed rounded-md">
                              Nessuna opzione aggiunta a questa selezione
                            </div>
                          )}
                          
                          {/* Pulsanti per aggiungere opzioni */}
                          <div className="flex justify-end space-x-2 pt-2">
                            <Dialog>
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
                                    Cerca e seleziona un servizio da aggiungere come opzione
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
                                            onClick={() => handleAddServiceOption(service, selection.id)}
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
                                  <Button variant="outline" onClick={() => setSearch("")}>
                                    Annulla
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            
                            <Dialog>
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
                                    Cerca e seleziona un prodotto da aggiungere come opzione
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
                                            onClick={() => handleAddProductOption(product, selection.id)}
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
                                  <Button variant="outline" onClick={() => setSearch("")}>
                                    Annulla
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-5">
          <div className="space-y-6">
            <Form {...form}>
              <Card>
                <CardHeader>
                  <CardTitle>Riepilogo Modulo</CardTitle>
                  <CardDescription>
                    Anteprima costi e sconto del modulo variabile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Subtotale (opzioni default):</span>
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
                    <span className="font-medium">Totale di base:</span>
                    <span className="text-xl font-semibold">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                  
                  <div className="bg-amber-50 p-3 rounded-md text-amber-800 text-sm">
                    <div className="flex items-start">
                      <ShieldAlert className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        Il prezzo finale dipenderà dalle scelte del cliente tra le opzioni disponibili.
                        Il totale qui visualizzato considera solo le opzioni impostate come predefinite.
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="w-full flex justify-between space-x-2">
                    <Button type="button" variant="outline" onClick={onCancel}>
                      Annulla
                    </Button>
                    <Button
                      type="submit"
                      form="moduleForm"
                      disabled={moduleSelections.length === 0}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {module ? "Aggiorna Modulo" : "Salva Modulo"}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </Form>
            
            <Card>
              <CardHeader>
                <CardTitle>Guida ai Moduli Variabili</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Cos'è una selezione?</h4>
                  <p className="text-sm text-muted-foreground">
                    Una selezione è una categoria di scelta (es. "Tipo copertina")
                    con varie opzioni tra cui il cliente può scegliere.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Opzioni predefinite</h4>
                  <p className="text-sm text-muted-foreground">
                    Le opzioni marcate come "default" saranno preselezionate
                    e considerate nel prezzo base del preventivo.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Requisiti e limiti</h4>
                  <p className="text-sm text-muted-foreground">
                    Puoi impostare requisiti minimi e massimi sia per il numero
                    di selezioni che per le opzioni all'interno di ciascuna selezione.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}