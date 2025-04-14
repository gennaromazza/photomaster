import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
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
  CardHeader,
  CardTitle,
  CardDescription,
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
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
  ChevronDown,
  Edit,
  CheckCircle2,
  HelpCircle,
  Users2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Tipi base per il modulo
interface SelectionOption {
  id?: string; // Uso string come ID univoco generato lato client
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
  id?: string; // Uso string come ID univoco generato lato client
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

// Schema di validazione per il modulo variabile
const variableModuleSchema = z.object({
  name: z.string().min(1, "Il nome del modulo è obbligatorio"),
  description: z.string().optional(),
  type: z.literal("variable"),
  minSelections: z.coerce.number().min(0).default(0),
  maxSelections: z.coerce.number().min(0).default(0),
  isRequired: z.boolean().default(false),
});

interface VariableModuleEditorProps {
  quoteId: number;
  module: QuoteModuleData | null;
  onSave: (module: QuoteModuleData) => void;
  onCancel: () => void;
}

/**
 * Componente per la creazione e modifica di moduli variabili
 * Responsabilità: Gestire la configurazione di moduli con opzioni selezionabili dal cliente
 */
export default function VariableModuleEditor({
  quoteId,
  module,
  onSave,
  onCancel,
}: VariableModuleEditorProps) {
  // Stati per la gestione dell'editor
  const [activeTab, setActiveTab] = useState("info");
  const [selections, setSelections] = useState<ModuleSelection[]>(module?.selections || []);
  const [editingSelection, setEditingSelection] = useState<ModuleSelection | null>(null);
  const [editingSelectionIndex, setEditingSelectionIndex] = useState<number | null>(null);
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<"service" | "product">("service");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectionName, setSelectionName] = useState("");
  const [selectionDescription, setSelectionDescription] = useState("");
  const [selectionRequired, setSelectionRequired] = useState(false);
  const [minOptions, setMinOptions] = useState(0);
  const [maxOptions, setMaxOptions] = useState(0);
  const [selectionOptions, setSelectionOptions] = useState<SelectionOption[]>([]);
  
  // Recupero dati prodotti e servizi
  const { data: services = [], isLoading: isServicesLoading } = useQuery<any[]>({
    queryKey: ["/api/services"],
  });
  
  const { data: products = [], isLoading: isProductsLoading } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });
  
  // Setup del form
  const form = useForm<z.infer<typeof variableModuleSchema>>({
    resolver: zodResolver(variableModuleSchema),
    defaultValues: {
      name: module?.name || "",
      description: module?.description || "",
      type: "variable" as const,
      minSelections: module?.minSelections || 0,
      maxSelections: module?.maxSelections || 0,
      isRequired: module?.isRequired || false,
    },
  });
  
  // Inizializza le selezioni se in modalità modifica
  useEffect(() => {
    if (module?.selections) {
      setSelections(module.selections);
    }
  }, [module]);
  
  // Reinizializza l'editor delle selezioni
  const resetSelectionEditor = () => {
    setEditingSelection(null);
    setEditingSelectionIndex(null);
    setSelectionName("");
    setSelectionDescription("");
    setSelectionRequired(false);
    setMinOptions(0);
    setMaxOptions(0);
    setSelectionOptions([]);
  };
  
  // Prepara l'editor per modificare una selezione esistente
  const editSelection = (selection: ModuleSelection, index: number) => {
    setEditingSelection(selection);
    setEditingSelectionIndex(index);
    setSelectionName(selection.name);
    setSelectionDescription(selection.description || "");
    setSelectionRequired(selection.isRequired || false);
    setMinOptions(selection.minOptions || 0);
    setMaxOptions(selection.maxOptions || 0);
    setSelectionOptions(selection.options || []);
    setIsSelectionOpen(true);
  };
  
  // Aggiungi una nuova opzione alla selezione corrente
  const handleAddOption = () => {
    if (!selectedItemId) return;
    
    const itemType = selectedItemType;
    const itemsList = itemType === "service" ? services : products;
    const selectedItem = itemsList.find((item: any) => item.id === selectedItemId);
    
    if (!selectedItem) return;
    
    // Verifica se l'opzione è già presente
    const isDuplicate = selectionOptions.some(
      (option) => option.itemId === selectedItemId && option.itemType === itemType
    );
    
    if (isDuplicate) {
      alert("Questo elemento è già presente in questa selezione");
      return;
    }
    
    const newOption: SelectionOption = {
      id: uuidv4(),  // genera ID univoco lato client
      itemId: selectedItem.id,
      itemType,
      name: selectedItem.name,
      description: selectedItem.description || "",
      price: selectedItem.price,
      isDefault: false,
      isSelected: false,
    };
    
    setSelectionOptions([...selectionOptions, newOption]);
    setSelectedItemId(null);
  };
  
  // Rimuovi un'opzione dalla selezione corrente
  const handleRemoveOption = (index: number) => {
    const newOptions = [...selectionOptions];
    newOptions.splice(index, 1);
    setSelectionOptions(newOptions);
  };
  
  // Salva la selezione corrente (nuova o modificata)
  const handleSaveSelection = () => {
    if (!selectionName || selectionOptions.length === 0) {
      alert("Il nome della selezione e almeno un'opzione sono obbligatori");
      return;
    }
    
    // Validazione dei limiti di selezione
    if (minOptions > selectionOptions.length) {
      alert(`Il minimo di opzioni (${minOptions}) non può essere maggiore del numero totale di opzioni (${selectionOptions.length})`);
      return;
    }
    
    if (maxOptions > 0 && maxOptions < minOptions) {
      alert("Il massimo di opzioni non può essere minore del minimo");
      return;
    }
    
    if (maxOptions > selectionOptions.length) {
      alert(`Il massimo di opzioni (${maxOptions}) non può essere maggiore del numero totale di opzioni (${selectionOptions.length})`);
      return;
    }
    
    const selection: ModuleSelection = {
      id: editingSelection?.id || uuidv4(),
      name: selectionName,
      description: selectionDescription,
      options: selectionOptions,
      minOptions,
      maxOptions,
      isRequired: selectionRequired,
    };
    
    let newSelections;
    if (editingSelectionIndex !== null) {
      // Modifica una selezione esistente
      newSelections = [...selections];
      newSelections[editingSelectionIndex] = selection;
    } else {
      // Aggiunge una nuova selezione
      newSelections = [...selections, selection];
    }
    
    setSelections(newSelections);
    setIsSelectionOpen(false);
    resetSelectionEditor();
  };
  
  // Rimuovi una selezione
  const handleRemoveSelection = (index: number) => {
    if (confirm("Sei sicuro di voler rimuovere questa selezione?")) {
      const newSelections = [...selections];
      newSelections.splice(index, 1);
      setSelections(newSelections);
    }
  };
  
  // Gestione submit form
  const onSubmit = (values: z.infer<typeof variableModuleSchema>) => {
    if (selections.length === 0) {
      alert("Aggiungi almeno una selezione al modulo");
      return;
    }
    
    const moduleData: QuoteModuleData = {
      ...values,
      quoteId,
      selections,
      id: module?.id,
    };
    
    onSave(moduleData);
  };

  return (
    <div className="border rounded-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">
          {module ? "Modifica" : "Crea"} Modulo Variabile
        </h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info">Informazioni Base</TabsTrigger>
          <TabsTrigger value="selections">Selezioni Cliente</TabsTrigger>
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
                      <Input placeholder="es. Selezione Album" {...field} />
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
                        placeholder="Descrivi brevemente questo modulo..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minSelections"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Minimo Selezioni
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          className="ml-1 h-5 w-5 p-0 inline-flex"
                          asChild
                        >
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => {
                            field.onChange(
                              e.target.value === "" ? 0 : parseInt(e.target.value)
                            );
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        0 = nessun minimo richiesto
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
                      <FormLabel>
                        Massimo Selezioni
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          className="ml-1 h-5 w-5 p-0 inline-flex"
                          asChild
                        >
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => {
                            field.onChange(
                              e.target.value === "" ? 0 : parseInt(e.target.value)
                            );
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        0 = nessun limite massimo
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
                        Il cliente deve compilare questo modulo
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
            </form>
          </Form>
          
          <div className="flex justify-end mt-6">
            <Button
              variant="outline"
              onClick={() => setActiveTab("selections")}
              className="mr-2"
            >
              Continua
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="selections" className="py-4 space-y-6">
          {/* Gestione selezioni */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Selezioni per il Cliente</CardTitle>
                  <CardDescription>
                    Crea gruppi di opzioni tra cui il cliente potrà scegliere
                  </CardDescription>
                </div>
                <Sheet open={isSelectionOpen} onOpenChange={setIsSelectionOpen}>
                  <SheetTrigger asChild>
                    <Button onClick={() => resetSelectionEditor()}>
                      <Plus className="h-4 w-4 mr-1" />
                      Aggiungi Selezione
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>
                        {editingSelection ? "Modifica Selezione" : "Nuova Selezione"}
                      </SheetTitle>
                      <SheetDescription>
                        Crea un gruppo di opzioni tra cui il cliente potrà scegliere
                      </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <FormLabel htmlFor="selectionName">Nome Selezione</FormLabel>
                        <Input
                          id="selectionName"
                          placeholder="es. Scegli il tipo di album"
                          value={selectionName}
                          onChange={(e) => setSelectionName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <FormLabel htmlFor="selectionDescription">Descrizione</FormLabel>
                        <Textarea
                          id="selectionDescription"
                          placeholder="Descrivi questa selezione al cliente..."
                          value={selectionDescription}
                          onChange={(e) => setSelectionDescription(e.target.value)}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <FormLabel htmlFor="minOptions">Minimo Opzioni</FormLabel>
                          <Input
                            id="minOptions"
                            type="number"
                            min="0"
                            value={minOptions}
                            onChange={(e) => setMinOptions(parseInt(e.target.value) || 0)}
                          />
                          <p className="text-xs text-muted-foreground">
                            0 = nessun minimo
                          </p>
                        </div>
                        <div className="space-y-2">
                          <FormLabel htmlFor="maxOptions">Massimo Opzioni</FormLabel>
                          <Input
                            id="maxOptions"
                            type="number"
                            min="0"
                            value={maxOptions}
                            onChange={(e) => setMaxOptions(parseInt(e.target.value) || 0)}
                          />
                          <p className="text-xs text-muted-foreground">
                            0 = nessun limite
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="selectionRequired"
                          checked={selectionRequired}
                          onCheckedChange={setSelectionRequired}
                        />
                        <FormLabel htmlFor="selectionRequired">
                          Selezione Obbligatoria
                        </FormLabel>
                      </div>
                      
                      <Separator />
                      
                      {/* Aggiunta opzioni */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm">Aggiungi Opzioni</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
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
                          <div className="space-y-2">
                            <FormLabel>
                              {selectedItemType === "service" ? "Servizio" : "Prodotto"}
                            </FormLabel>
                            <Select
                              value={selectedItemId?.toString() || ""}
                              onValueChange={(value) => setSelectedItemId(parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={`Seleziona ${selectedItemType === "service" ? "servizio" : "prodotto"}`}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedItemType === "service"
                                  ? services.map((service: any) => (
                                      <SelectItem
                                        key={service.id}
                                        value={service.id.toString()}
                                      >
                                        {service.name} - {formatCurrency(service.price)}
                                      </SelectItem>
                                    ))
                                  : products.map((product: any) => (
                                      <SelectItem
                                        key={product.id}
                                        value={product.id.toString()}
                                      >
                                        {product.name} - {formatCurrency(product.price)}
                                      </SelectItem>
                                    ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddOption}
                          disabled={!selectedItemId}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Aggiungi Opzione
                        </Button>
                      </div>
                      
                      <Separator />
                      
                      {/* Lista opzioni */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Opzioni ({selectionOptions.length})</h4>
                        {selectionOptions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nessuna opzione aggiunta. Aggiungi almeno un'opzione.
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Prezzo</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectionOptions.map((option, index) => (
                                <TableRow key={option.id}>
                                  <TableCell className="font-medium">
                                    {option.name}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {option.itemType === "service"
                                        ? "Servizio"
                                        : "Prodotto"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(option.price)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveOption(index)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </div>
                    <SheetFooter>
                      <Button
                        type="button"
                        variant="default"
                        onClick={handleSaveSelection}
                        disabled={
                          !selectionName || selectionOptions.length === 0
                        }
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Salva Selezione
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>
            </CardHeader>
            <CardContent>
              {selections.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-lg">
                  <Users2 className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-2">
                    Nessuna selezione creata.
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crea almeno una selezione per il cliente.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetSelectionEditor();
                      setIsSelectionOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Aggiungi La Prima Selezione
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {selections.map((selection, index) => (
                    <Card key={selection.id} className="overflow-hidden">
                      <Collapsible className="w-full">
                        <div className="flex items-center justify-between p-4">
                          <div className="flex-1">
                            <div className="flex items-start">
                              <div>
                                <h4 className="text-sm font-medium">{selection.name}</h4>
                                {selection.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {selection.description}
                                  </p>
                                )}
                              </div>
                              <Badge
                                variant={selection.isRequired ? "default" : "outline"}
                                className="ml-2"
                              >
                                {selection.isRequired ? "Obbligatorio" : "Opzionale"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <div>
                                Opzioni: {selection.options.length}
                              </div>
                              {selection.minOptions !== undefined && selection.minOptions > 0 && (
                                <div>
                                  Min: {selection.minOptions}
                                </div>
                              )}
                              {selection.maxOptions !== undefined && selection.maxOptions > 0 && (
                                <div>
                                  Max: {selection.maxOptions}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => editSelection(selection, index)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveSelection(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>
                        <CollapsibleContent>
                          <Separator />
                          <div className="p-4">
                            <h5 className="text-xs font-medium mb-2">Opzioni:</h5>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead className="text-right">Prezzo</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selection.options.map((option) => (
                                  <TableRow key={option.id}>
                                    <TableCell className="font-medium">
                                      {option.name}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="text-xs">
                                        {option.itemType === "service"
                                          ? "Servizio"
                                          : "Prodotto"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(option.price)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Istruzioni per il cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Anteprima per il Cliente</CardTitle>
              <CardDescription>
                Ecco come apparirà questo modulo al cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-md bg-muted/30">
                  <h4 className="font-medium mb-2">Istruzioni per il Cliente:</h4>
                  <p className="text-sm text-muted-foreground">
                    {form.watch("name") ? form.watch("name") : "Questo modulo"} ti permette di personalizzare la tua scelta.
                    {form.watch("description") && (
                      <span className="block mt-2">{form.watch("description")}</span>
                    )}
                  </p>
                  
                  {form.watch("minSelections") > 0 || form.watch("maxSelections") > 0 ? (
                    <div className="mt-2 p-2 bg-background rounded border text-sm">
                      <span className="font-medium">Nota:</span>
                      {form.watch("minSelections") > 0 && (
                        <span>
                          {" "}
                          Devi completare almeno {form.watch("minSelections")}{" "}
                          {form.watch("minSelections") === 1
                            ? "selezione"
                            : "selezioni"}.
                        </span>
                      )}
                      {form.watch("maxSelections") > 0 && (
                        <span>
                          {" "}
                          Puoi completare massimo {form.watch("maxSelections")}{" "}
                          {form.watch("maxSelections") === 1
                            ? "selezione"
                            : "selezioni"}.
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
                
                {selections.length > 0 && (
                  <div className="border-l-4 border-primary/20 pl-4 py-2">
                    <span className="text-sm text-primary font-medium">
                      {selections.length} {selections.length === 1 ? "selezione" : "selezioni"} disponibili
                    </span>
                    <ul className="mt-2 space-y-2 text-sm">
                      {selections.map((selection) => (
                        <li key={selection.id} className="flex items-center text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-primary/60" />
                          {selection.name}
                          {selection.isRequired && (
                            <Badge variant="default" className="ml-2 text-[10px] px-1 py-0">
                              Richiesto
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
              <Button onClick={form.handleSubmit(onSubmit)} disabled={selections.length === 0}>
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