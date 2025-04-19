import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, Plus, Search, X, PlusCircle, Trash, BookOpen, ChevronsUpDown, AlertCircle, Eye } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { roundToTwoDecimals } from "@/lib/moduleCalculations";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

// Interfaccia per le opzioni di selezione
interface SelectionOption {
  id: string;
  selectionId: string;
  itemId: number;
  itemType: 'service' | 'product';
  name: string;
  description?: string;
  price: number;
  isDefault?: boolean;
  isRequired?: boolean;
  position?: number;
}

// Interfaccia per le selezioni
interface ModuleSelection {
  id: string;
  moduleId?: number;
  name: string;
  description?: string;
  minOptions?: number;
  maxOptions?: number;
  isRequired?: boolean;
  options: SelectionOption[];
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
  selections?: ModuleSelection[];
  shareToken?: string;
  expiryDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface VariableModuleEditorProps {
  quoteId: number;
  module: QuoteModule | null;
  onSave: (module: QuoteModule) => void;
  onCancel: () => void;
}

/**
 * Componente per la creazione e modifica di un modulo variabile
 * Responsabilità:
 * - Gestire il form per la creazione/modifica di un modulo variabile
 * - Permettere la configurazione di categorie di selezione e opzioni
 * - Calcolare i totali minimi e massimi in base alle selezioni possibili
 */
export default function VariableModuleEditor({
  quoteId,
  module,
  onSave,
  onCancel,
}: VariableModuleEditorProps) {
  // Stati
  const [moduleSelections, setModuleSelections] = useState<ModuleSelection[]>([]);
  const [activeSelectionId, setActiveSelectionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingSelection, setIsAddingSelection] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{ id: number; type: 'service' | 'product'; name: string; price: number; description?: string }[]>([]);
  
  // Schema di validazione del form
  const formSchema = z.object({
    name: z.string().min(1, "Il nome del modulo è obbligatorio"),
    description: z.string().optional(),
    discount: z.coerce.number().min(0).optional(),
    discountType: z.enum(["percentage", "amount"]).default("percentage"),
  });
  
  // Schema di validazione per le selezioni
  const selectionSchema = z.object({
    name: z.string().min(1, "Il nome della categoria è obbligatorio"),
    description: z.string().optional(),
    minOptions: z.coerce.number().min(0).default(0),
    maxOptions: z.coerce.number().min(1).optional(),
    isRequired: z.boolean().default(false),
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
  
  // Inizializzo il form per le selezioni
  const selectionForm = useForm<z.infer<typeof selectionSchema>>({
    resolver: zodResolver(selectionSchema),
    defaultValues: {
      name: "",
      description: "",
      minOptions: 0,
      maxOptions: undefined,
      isRequired: false,
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
  
  // Gestione stato di caricamento e dati del modulo
  const [isLoadingModuleData, setIsLoadingModuleData] = useState<boolean>(false);
  const [fullModuleData, setFullModuleData] = useState<QuoteModule | null>(null);
  
  // Carica i dati completi del modulo
  useEffect(() => {
    const loadFullModuleData = async () => {
      // Se non è in modalità modifica o se i dati sono già stati caricati, non fare nulla
      if (!module?.id || fullModuleData) {
        return;
      }
      
      console.log("Caricamento dati completi del modulo:", module.id);
      setIsLoadingModuleData(true);
      
      try {
        const response = await fetch(`/api/modules/${module.id}`);
        if (response.ok) {
          const data = await response.json();
          console.log("Dati completi caricati:", data);
          setFullModuleData(data);
        } else {
          console.error("Errore nel caricamento dei dati completi:", response.statusText);
        }
      } catch (error) {
        console.error("Errore nella richiesta dei dati completi:", error);
      } finally {
        setIsLoadingModuleData(false);
      }
    };
    
    loadFullModuleData();
  }, [module?.id]);
  
  // Inizializza il modulo quando i dati completi vengono caricati
  useEffect(() => {
    // Determina quale oggetto modulo usare per l'inizializzazione
    const moduleToUse = fullModuleData || module;
    console.log("Inizializzazione modulo con:", moduleToUse);
    
    if (!moduleToUse) {
      // Reset completo se non c'è un modulo
      console.log("Reset completo: nessun modulo fornito");
      form.reset({
        name: "",
        description: "",
        discount: 0,
        discountType: "percentage"
      });
      setModuleSelections([]);
      return;
    }
    
    // Prima fase: inizializzazione del form principale
    console.log("Inizializzazione form con dati esistenti:", {
      name: moduleToUse.name,
      description: moduleToUse.description,
      discount: moduleToUse.discount,
      discountType: moduleToUse.discountType
    });
    
    form.reset({
      name: moduleToUse.name || "",
      description: moduleToUse.description || "",
      discount: moduleToUse.discount || 0,
      discountType: moduleToUse.discountType || "percentage",
    });
    
    // Seconda fase: gestione delle selezioni
    if (moduleToUse.selections && Array.isArray(moduleToUse.selections) && moduleToUse.selections.length > 0) {
      console.log("Selezioni originali:", moduleToUse.selections);
      
      // Per evitare duplicazioni, prima trasformiamo le selezioni in una mappa basata sui loro ID o nomi
      const selectionMap = new Map();
      
      // Raggruppa le opzioni per categoria per evitare duplicati
      moduleToUse.selections.forEach(selection => {
        if (!selection) return;
        
        const key = selection.id || selection.name;
        if (!key) return;
        
        // Se la selezione esiste già nella mappa, unisci le opzioni senza duplicati
        if (selectionMap.has(key)) {
          const existingSelection = selectionMap.get(key);
          
          // Unisci le opzioni rimuovendo i duplicati (in base all'itemId)
          if (Array.isArray(selection.options) && Array.isArray(existingSelection.options)) {
            const optionsMap = new Map();
            
            // Prima aggiungi le opzioni esistenti
            existingSelection.options.forEach(opt => {
              if (opt && opt.itemId) {
                optionsMap.set(opt.itemId, opt);
              }
            });
            
            // Poi aggiungi o sovrascrivi con le nuove opzioni
            selection.options.forEach(opt => {
              if (opt && opt.itemId) {
                optionsMap.set(opt.itemId, opt);
              }
            });
            
            // Aggiorna le opzioni con la lista deduplicate
            existingSelection.options = Array.from(optionsMap.values());
          }
        } else {
          // Altrimenti, aggiungi la selezione alla mappa
          selectionMap.set(key, { ...selection });
        }
      });
      
      // Converti la mappa in un array di selezioni
      const uniqueSelections = Array.from(selectionMap.values());
      
      // Assicuriamoci che tutti i dati siano correttamente formattati
      const formattedSelections = uniqueSelections.map(selection => {
        if (!selection) return null;
        
        // Assicuriamoci che la selezione abbia un ID
        const selectionId = selection.id || uuidv4();
        
        // Formatta le opzioni della selezione se esistono
        const formattedOptions = Array.isArray(selection.options) 
          ? selection.options.map(option => {
              if (!option) return null;
              return {
                ...option,
                id: option.id || uuidv4(),
                selectionId: selectionId
              };
            }).filter(Boolean) // Rimuove gli elementi null
          : [];
          
        return {
          ...selection,
          id: selectionId,
          options: formattedOptions,
          name: selection.name || "",
          minOptions: selection.minOptions ?? 0,
          maxOptions: selection.maxOptions,
          isRequired: selection.isRequired ?? false,
          description: selection.description || "",
          position: selection.position ?? 0
        };
      }).filter(Boolean); // Rimuove gli elementi null
      
      console.log("Selezioni formattate dopo deduplicazione:", formattedSelections);
      setModuleSelections(formattedSelections);
    } else {
      console.log("Nessuna selezione presente nel modulo");
      setModuleSelections([]);
    }
  }, [fullModuleData, module, form.reset]);
  
  // Filtra servizi e prodotti in base alla ricerca
  const filteredServices = services.filter(service => 
    service.type === 'service' && 
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Ottiene la selezione attiva
  const getActiveSelection = (): ModuleSelection | undefined => {
    if (!activeSelectionId) return undefined;
    return moduleSelections.find(selection => selection.id === activeSelectionId);
  };
  
  // Apre il form per aggiungere una nuova selezione
  const handleAddSelection = () => {
    selectionForm.reset({
      name: "",
      description: "",
      minOptions: 0,
      maxOptions: undefined,
      isRequired: false,
    });
    setSelectedItems([]);
    setIsAddingSelection(true);
    setActiveSelectionId(null);
  };
  
  // Apre il form per modificare una selezione esistente
  const handleEditSelection = (selectionId: string) => {
    const selection = moduleSelections.find(s => s.id === selectionId);
    if (!selection) return;
    
    selectionForm.reset({
      name: selection.name,
      description: selection.description || "",
      minOptions: selection.minOptions || 0,
      maxOptions: selection.maxOptions,
      isRequired: selection.isRequired || false,
    });
    
    setActiveSelectionId(selectionId);
    setIsAddingSelection(false);
  };
  
  // Toast notification hook
  const { toast } = useToast();
  
  // Mutation per aggiornare il modulo dopo la rimozione di una selezione
  const updateModuleMutation = useMutation({
    mutationFn: async (updatedModule: QuoteModule) => {
      // Se il modulo non ha un ID, non possiamo aggiornarlo nel database
      if (!updatedModule.id) {
        return updatedModule;
      }
      
      const url = `/api/modules/${updatedModule.id}`;
      console.log(`Aggiornamento modulo variabile all'URL ${url}:`, updatedModule);
      
      const res = await apiRequest("PUT", url, updatedModule);
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Modulo aggiornato con successo dopo la rimozione della categoria:", data);
      
      // Aggiorna la cache per una risposta immediata
      if (data.id) {
        queryClient.invalidateQueries([`/api/quotes/${quoteId}/modules`]);
        queryClient.invalidateQueries([`/api/modules/${data.id}`]);
      }
      
      toast({
        title: "Categoria rimossa",
        description: "La categoria di selezione è stata rimossa dal modulo",
      });
    },
    onError: (error) => {
      console.error("Errore nell'aggiornamento del modulo:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la rimozione della categoria",
        variant: "destructive",
      });
    },
  });

  // Rimuove una selezione con aggiornamento immediato sul server
  const handleRemoveSelection = (selectionId: string) => {
    if (window.confirm("Sei sicuro di voler rimuovere questa categoria di selezione?")) {
      // Troviamo la selezione per capire quali elementi vanno eliminati
      const selectionToRemove = moduleSelections.find(s => s.id === selectionId);
      
      // Prima aggiorniamo lo stato locale per un feedback immediato
      setModuleSelections(prev => prev.filter(s => s.id !== selectionId));
      
      if (activeSelectionId === selectionId) {
        setActiveSelectionId(null);
        selectionForm.reset();
      }
      
      // Se il modulo ha un ID, dobbiamo aggiornare anche il server
      if (module?.id) {
        // Prepariamo i dati del modulo con la selezione rimossa
        const updatedSelections = moduleSelections.filter(s => s.id !== selectionId);
        
        const moduleData: QuoteModule = {
          ...module,
          name: form.getValues("name"),
          description: form.getValues("description"),
          discount: form.getValues("discount"),
          discountType: form.getValues("discountType"),
          selections: updatedSelections,
          // Mantieni gli altri campi invariati
          type: "variable",
          quoteId
        };
        
        // Per ogni opzione nella selezione rimossa, dobbiamo anche eliminare i record nel database
        // ma solo se esistono items persistenti (con ID) associati al modulo
        if (selectionToRemove && module.id && selectionToRemove.options) {
          // Filtriamo solo le opzioni che hanno un ID (che sono già salvate nel DB)
          const itemsToDelete = selectionToRemove.options.filter(option => option.id);
          
          // Per ogni item da eliminare, chiamiamo l'endpoint DELETE
          itemsToDelete.forEach(async (item) => {
            try {
              // Chiamiamo l'endpoint DELETE per ogni elemento del modulo
              console.log(`Eliminazione item ${item.id} del modulo ${module.id}`);
              await apiRequest("DELETE", `/api/quotes/${quoteId}/items/${item.id}`);
            } catch (error) {
              console.error(`Errore nell'eliminazione dell'item ${item.id}:`, error);
            }
          });
        }
        
        // Inviamo l'aggiornamento al server
        updateModuleMutation.mutate(moduleData);
      }
    }
  };
  
  // Salva una nuova selezione
  const handleSaveNewSelection = (data: z.infer<typeof selectionSchema>) => {
    if (selectedItems.length === 0) {
      alert("Devi aggiungere almeno un'opzione alla selezione");
      return;
    }
    
    const newSelectionId = uuidv4();
    
    const newSelection: ModuleSelection = {
      id: newSelectionId,
      name: data.name,
      description: data.description,
      minOptions: data.minOptions || 0,
      maxOptions: data.maxOptions,
      isRequired: data.isRequired,
      options: selectedItems.map((item, index) => ({
        id: uuidv4(),
        selectionId: newSelectionId,
        itemId: item.id,
        itemType: item.type,
        name: item.name,
        description: item.description,
        price: item.price,
        isDefault: index === 0, // Il primo item è selezionato di default
        isRequired: false,
        position: index + 1,
      })),
      position: moduleSelections.length + 1,
    };
    
    setModuleSelections(prev => [...prev, newSelection]);
    setIsAddingSelection(false);
    setSelectedItems([]);
    selectionForm.reset();
  };
  
  // Aggiorna una selezione esistente
  const handleUpdateSelection = (data: z.infer<typeof selectionSchema>) => {
    if (!activeSelectionId) return;
    
    const activeSelection = moduleSelections.find(s => s.id === activeSelectionId);
    if (!activeSelection) return;
    
    if (activeSelection.options.length === 0 && selectedItems.length === 0) {
      alert("Devi aggiungere almeno un'opzione alla selezione");
      return;
    }
    
    setModuleSelections(prev => prev.map(selection => {
      if (selection.id !== activeSelectionId) return selection;
      
      const updatedOptions = [...selection.options];
      
      // Aggiungi nuovi item selezionati
      selectedItems.forEach(item => {
        // Verifica se l'item esiste già
        const exists = updatedOptions.some(option => 
          (option.itemType === 'service' && option.itemId === item.id && item.type === 'service') ||
          (option.itemType === 'product' && option.itemId === item.id && item.type === 'product')
        );
        
        if (!exists) {
          updatedOptions.push({
            id: uuidv4(),
            selectionId: activeSelectionId,
            itemId: item.id,
            itemType: item.type,
            name: item.name,
            description: item.description,
            price: item.price,
            isDefault: false,
            isRequired: false,
            position: updatedOptions.length + 1,
          });
        }
      });
      
      return {
        ...selection,
        name: data.name,
        description: data.description,
        minOptions: data.minOptions || 0,
        maxOptions: data.maxOptions,
        isRequired: data.isRequired,
        options: updatedOptions,
      };
    }));
    
    setActiveSelectionId(null);
    setSelectedItems([]);
    selectionForm.reset();
  };
  
  // Aggiunge un servizio alla selezione
  const handleAddServiceToSelection = (service: Service) => {
    setSelectedItems(prev => {
      // Verifica se il servizio esiste già
      const exists = prev.some(item => item.id === service.id && item.type === 'service');
      if (exists) return prev;
      
      return [...prev, {
        id: service.id,
        type: 'service',
        name: service.name,
        description: service.description,
        price: service.price,
      }];
    });
  };
  
  // Aggiunge un prodotto alla selezione
  const handleAddProductToSelection = (product: Product) => {
    setSelectedItems(prev => {
      // Verifica se il prodotto esiste già
      const exists = prev.some(item => item.id === product.id && item.type === 'product');
      if (exists) return prev;
      
      return [...prev, {
        id: product.id,
        type: 'product',
        name: product.name,
        description: product.description,
        price: product.price,
      }];
    });
  };
  
  // Rimuove un item selezionato
  const handleRemoveSelectedItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };
  
  // Rimuove un'opzione da una selezione esistente
  const handleRemoveOptionFromSelection = (selectionId: string, optionId: string) => {
    setModuleSelections(prev => prev.map(selection => {
      if (selection.id !== selectionId) return selection;
      
      return {
        ...selection,
        options: selection.options.filter(option => option.id !== optionId),
      };
    }));
  };
  
  // Imposta un'opzione come predefinita
  const handleSetDefaultOption = (selectionId: string, optionId: string) => {
    setModuleSelections(prev => prev.map(selection => {
      if (selection.id !== selectionId) return selection;
      
      return {
        ...selection,
        options: selection.options.map(option => ({
          ...option,
          isDefault: option.id === optionId,
        })),
      };
    }));
  };
  
  // Imposta un'opzione come obbligatoria
  const handleSetRequiredOption = (selectionId: string, optionId: string, isRequired: boolean) => {
    setModuleSelections(prev => prev.map(selection => {
      if (selection.id !== selectionId) return selection;
      
      return {
        ...selection,
        options: selection.options.map(option => 
          option.id === optionId 
            ? { ...option, isRequired } 
            : option
        ),
      };
    }));
  };
  
  // Calcola il prezzo minimo del modulo (considerando le opzioni obbligatorie e predefinite)
  const calculateMinPrice = (): number => {
    return moduleSelections.reduce((total, selection) => {
      if (selection.isRequired) {
        // Se la selezione è obbligatoria, aggiungi il prezzo minimo tra le opzioni
        const requiredOptions = selection.options.filter(option => option.isRequired);
        
        if (requiredOptions.length > 0) {
          // Se ci sono opzioni obbligatorie, aggiungi il loro prezzo
          return total + requiredOptions.reduce((sum, option) => sum + option.price, 0);
        } else {
          // Altrimenti, aggiungi il prezzo dell'opzione predefinita o dell'opzione meno costosa
          const defaultOption = selection.options.find(option => option.isDefault);
          if (defaultOption) {
            return total + defaultOption.price;
          } else if (selection.options.length > 0) {
            // Trova l'opzione meno costosa
            const cheapestOption = selection.options.reduce(
              (min, option) => option.price < min.price ? option : min,
              selection.options[0]
            );
            return total + cheapestOption.price;
          }
        }
      }
      
      return total;
    }, 0);
  };
  
  // Calcola il prezzo massimo del modulo (considerando tutte le opzioni disponibili)
  const calculateMaxPrice = (): number => {
    return moduleSelections.reduce((total, selection) => {
      // Aggiungi il prezzo di tutte le opzioni non esclusive (se maxOptions non è specificato)
      if (!selection.maxOptions || selection.maxOptions > 1) {
        return total + selection.options.reduce((sum, option) => sum + option.price, 0);
      } else {
        // Se maxOptions è 1, aggiungi il prezzo dell'opzione più costosa
        if (selection.options.length > 0) {
          const mostExpensiveOption = selection.options.reduce(
            (max, option) => option.price > max.price ? option : max,
            selection.options[0]
          );
          return total + mostExpensiveOption.price;
        }
      }
      
      return total;
    }, 0);
  };
  
  // Gestisce il submit del form principale
  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    if (moduleSelections.length === 0) {
      alert("Devi aggiungere almeno una categoria di selezione");
      return;
    }
    
    // Verifica che tutte le selezioni abbiano almeno un'opzione
    const invalidSelections = moduleSelections.filter(selection => selection.options.length === 0);
    if (invalidSelections.length > 0) {
      alert(`Le seguenti categorie non hanno opzioni: ${invalidSelections.map(s => s.name).join(", ")}`);
      return;
    }
    
    // Calcola i prezzi
    const minPrice = calculateMinPrice();
    const maxPrice = calculateMaxPrice();
    
    // Prepara i dati del modulo
    const moduleData: QuoteModule = {
      ...module,
      id: module?.id,
      quoteId,
      name: data.name,
      description: data.description || "",
      type: 'variable',
      subtotal: minPrice,
      discount: data.discount && data.discount > 0 ? data.discount : undefined,
      discountType: data.discount && data.discount > 0 ? data.discountType : undefined,
      total: minPrice,
      selections: moduleSelections,
    };
    
    // Chiama la callback di salvataggio
    onSave(moduleData);
  };
  
  // Ottieni il numero di selezioni
  const selectionCount = moduleSelections.length;
  
  // Loading state
  if (isLoadingServices || isLoadingProducts) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
      </div>
    );
  }
  
  // Render selezione attiva o nuova selezione
  const renderSelectionForm = () => {
    const activeSelection = getActiveSelection();
    
    return (
      <Form {...selectionForm}>
        <form onSubmit={selectionForm.handleSubmit(
          isAddingSelection ? handleSaveNewSelection : handleUpdateSelection
        )}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {isAddingSelection ? "Nuova Categoria" : "Modifica Categoria"}
                  </CardTitle>
                  <CardDescription>
                    {isAddingSelection
                      ? "Crea una nuova categoria di selezione"
                      : "Modifica la categoria selezionata"}
                  </CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  type="button"
                  onClick={() => {
                    setActiveSelectionId(null);
                    setIsAddingSelection(false);
                    selectionForm.reset();
                    setSelectedItems([]);
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Torna alle categorie
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={selectionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Categoria</FormLabel>
                    <FormControl>
                      <Input placeholder="es. Formato Album" {...field} />
                    </FormControl>
                    <FormDescription>
                      Il nome della categoria di scelta che verrà mostrato al cliente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={selectionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descrivi questa categoria di scelta..." 
                        className="resize-none min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Una breve descrizione per spiegare al cliente cosa deve scegliere
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={selectionForm.control}
                  name="minOptions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero minimo opzioni</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          {...field} 
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            field.onChange(isNaN(value) ? 0 : Math.max(0, value));
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Quante opzioni il cliente deve scegliere come minimo
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
                      <FormLabel>Numero massimo opzioni</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          placeholder="Illimitato" 
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : undefined;
                            field.onChange(isNaN(value as number) ? undefined : Math.max(1, value as number));
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Quante opzioni il cliente può scegliere come massimo
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Categoria obbligatoria</FormLabel>
                      <FormDescription>
                        Il cliente deve selezionare almeno un'opzione
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
              
              <Separator />
              
              <div>
                <Label>Opzioni disponibili</Label>
                <div className="mt-2 flex flex-col sm:flex-row gap-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="flex-1" variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Aggiungi Servizi
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Seleziona Servizi</DialogTitle>
                        <DialogDescription>
                          Aggiungi servizi come opzioni per questa categoria
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="relative my-2">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Cerca servizio..." 
                          className="pl-10"
                          value={searchTerm} 
                          onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                        {searchTerm && (
                          <X 
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
                            onClick={() => setSearchTerm("")}
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
                                onClick={() => handleAddServiceToSelection(service)}
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
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="flex-1" variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Aggiungi Prodotti
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Seleziona Prodotti</DialogTitle>
                        <DialogDescription>
                          Aggiungi prodotti come opzioni per questa categoria
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="relative my-2">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Cerca prodotto..." 
                          className="pl-10"
                          value={searchTerm} 
                          onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                        {searchTerm && (
                          <X 
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
                            onClick={() => setSearchTerm("")}
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
                                onClick={() => handleAddProductToSelection(product)}
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
              </div>
              
              <div>
                <Label>Item selezionati</Label>
                {/* Nuove opzioni selezionate */}
                {selectedItems.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {selectedItems.map((item, index) => (
                      <Card key={`new-${index}`} className="overflow-hidden">
                        <CardContent className="py-3 px-4 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(item.price)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleRemoveSelectedItem(index)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                
                {/* Opzioni esistenti (solo in modalità modifica) */}
                {activeSelection && activeSelection.options.length > 0 && (
                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Opzioni esistenti
                    </Label>
                    <div className="space-y-2">
                      {activeSelection.options.map((option) => (
                        <Card key={option.id} className="overflow-hidden">
                          <CardContent className="py-3 px-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium">
                                  {option.name}
                                  {option.isDefault && (
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                      Predefinito
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {formatCurrency(option.price)}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className={option.isDefault ? "text-primary bg-primary/10" : ""}
                                  title="Imposta come predefinito"
                                  onClick={() => handleSetDefaultOption(activeSelection.id, option.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => handleRemoveOptionFromSelection(activeSelection.id, option.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center">
                              <Checkbox
                                id={`option-required-${option.id}`}
                                checked={option.isRequired || false}
                                onCheckedChange={(checked) => 
                                  handleSetRequiredOption(activeSelection.id, option.id, checked === true)
                                }
                              />
                              <label
                                htmlFor={`option-required-${option.id}`}
                                className="ml-2 text-sm font-medium"
                              >
                                Opzione obbligatoria
                              </label>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Messaggio quando non ci sono opzioni */}
                {selectedItems.length === 0 && (!activeSelection || activeSelection.options.length === 0) && (
                  <div className="text-center border border-dashed rounded-lg p-4 mt-2">
                    <p className="text-muted-foreground">
                      Nessuna opzione selezionata. Aggiungi servizi o prodotti come opzioni.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline"
                onClick={() => {
                  setActiveSelectionId(null);
                  setIsAddingSelection(false);
                  selectionForm.reset();
                  setSelectedItems([]);
                }}
              >
                Annulla
              </Button>
              
              <Button 
                type="submit"
                disabled={selectedItems.length === 0 && (!activeSelection || activeSelection.options.length === 0)}
              >
                {isAddingSelection ? "Aggiungi Categoria" : "Aggiorna Categoria"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    );
  };
  
  // Render lista selezioni
  const renderSelectionsList = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium">Categorie di Selezione</h3>
          <Button 
            size="sm"
            onClick={handleAddSelection}
          >
            <Plus className="mr-1 h-4 w-4" />
            Aggiungi Categoria
          </Button>
        </div>
        
        {moduleSelections.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">
                Nessuna categoria di selezione aggiunta.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={handleAddSelection}
              >
                <PlusCircle className="mr-1 h-4 w-4" />
                Crea la prima categoria
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {moduleSelections.map((selection) => (
              <Card key={selection.id} className="overflow-hidden">
                <CardHeader className="py-3 pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">
                      {selection.name}
                      {selection.isRequired && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Obbligatoria
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditSelection(selection.id)}
                      >
                        <ChevronsUpDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleRemoveSelection(selection.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {selection.description && (
                    <CardDescription className="mt-1">
                      {selection.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="py-0 px-4 pb-2">
                  <div className="text-xs text-muted-foreground">
                    {selection.options.length} 
                    {selection.options.length === 1 ? ' opzione' : ' opzioni'} 
                    {selection.minOptions && selection.minOptions > 0 ? 
                      ` (min: ${selection.minOptions})` : 
                      ''}
                    {selection.maxOptions ? 
                      ` (max: ${selection.maxOptions})` : 
                      ''}
                  </div>
                  
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selection.options.slice(0, 3).map((option) => (
                      <Badge 
                        key={option.id} 
                        variant="secondary"
                        className="text-xs"
                      >
                        {option.name}
                        {option.isDefault && <span className="ml-1 text-primary">✓</span>}
                      </Badge>
                    ))}
                    {selection.options.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{selection.options.length - 3} altre
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        <div className="bg-muted/40 p-3 rounded-md text-sm">
          <div className="font-medium text-primary mb-1">Suggerimento:</div>
          <p className="text-muted-foreground">
            Crea categorie per le differenti scelte, ad esempio "Formato Album", "Numero di pagine", "Tipo di copertina", etc.
            Per ogni categoria, aggiungi diverse opzioni tra cui il cliente potrà scegliere.
          </p>
        </div>
      </div>
    );
  };
  
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
                        <FormLabel>Descrizione</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descrivi il modulo..." 
                            className="resize-none min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Una breve descrizione per spiegare al cliente cosa personalizzare
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </form>
          </Form>
          
          {/* Modulo di gestione selezioni o lista selezioni */}
          {activeSelectionId || isAddingSelection ? renderSelectionForm() : renderSelectionsList()}
        </div>
        
        <div className="lg:col-span-5">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Riepilogo Modulo</CardTitle>
              <CardDescription>
                Anteprima del modulo variabile e costi stimati
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
                <Label className="text-xs">Categorie di Selezione</Label>
                {moduleSelections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessuna categoria aggiunta</p>
                ) : (
                  <ul className="text-sm space-y-2 mt-2">
                    {moduleSelections.map((selection) => (
                      <li key={selection.id} className="flex justify-between">
                        <span>
                          {selection.name}
                          {selection.isRequired && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (obbligatoria)
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {selection.options.length} opzioni
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm">Prezzo Minimo</div>
                  <div className="font-medium">
                    {moduleSelections.length > 0 
                      ? formatCurrency(calculateMinPrice())
                      : "-"}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm">Prezzo Massimo</div>
                  <div className="font-medium">
                    {moduleSelections.length > 0 
                      ? formatCurrency(calculateMaxPrice())
                      : "-"}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm mb-2">Sconto sul modulo</div>
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
              
              {moduleSelections.length === 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 rounded-md p-3 text-sm flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300">Attenzione</p>
                    <p className="mt-1">Il modulo non ha categorie di selezione. Aggiungi almeno una categoria.</p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button 
                className="w-full" 
                type="submit"
                form="moduleForm"
                disabled={moduleSelections.length === 0}
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