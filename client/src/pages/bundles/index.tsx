import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { ServiceBundle, Service } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { TemplatePreviews } from '@/components/bundles/template-preview';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Layout from '@/components/layout/layout';
import { Plus, Edit, Trash2, Tag, Package, Gift, ArrowLeft, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useLocation, Link } from 'wouter';
import { ImageUpload } from '@/components/ui/image-upload';

// Formattazione prezzo in Euro
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price / 100);
};

// Schema per il form di creazione/modifica di un pacchetto
const bundleFormSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio'),
  description: z.string().optional(),
  image: z.string().optional(),
  imagePath: z.string().optional(),
  // I prezzi totali e scontati verranno calcolati in base ai servizi inclusi
  totalPrice: z.coerce.number().min(0),
  discountedPrice: z.coerce.number().min(0),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.coerce.number().min(0),
  isActive: z.boolean().default(true),
  categoryId: z.coerce.number().optional(),
  templateStyle: z.enum(['elegant', 'modern', 'minimal', 'bold']).default('elegant'),
});

// Schema per gli elementi del pacchetto
const bundleItemSchema = z.object({
  serviceId: z.coerce.number().min(1, 'Servizio obbligatorio'),
  quantity: z.coerce.number().min(1, 'Quantità obbligatoria').default(1),
});

type BundleFormValues = z.infer<typeof bundleFormSchema>;
type BundleItemValues = z.infer<typeof bundleItemSchema>;

const ServiceBundlesPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<ServiceBundle | null>(null);
  const [selectedItems, setSelectedItems] = useState<(BundleItemValues & { service: Service })[]>([]);
  const [tempItem, setTempItem] = useState<BundleItemValues>({ serviceId: 0, quantity: 1 });
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedTemplateStyle, setSelectedTemplateStyle] = useState<'elegant' | 'modern' | 'minimal' | 'bold'>('elegant');
  
  const [, navigate] = useLocation();
  
  // Recupera tutti i pacchetti
  const bundlesQuery = useQuery<ServiceBundle[]>({
    queryKey: ['/api/service-bundles'],
    queryFn: async () => {
      const res = await fetch('/api/service-bundles');
      if (!res.ok) throw new Error('Errore nel caricamento dei pacchetti');
      return await res.json();
    }
  });
  
  // Recupera tutti i servizi e prodotti disponibili
  const servicesQuery = useQuery<Service[]>({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const res = await fetch('/api/services');
      if (!res.ok) throw new Error('Errore nel caricamento dei servizi');
      return await res.json();
    }
  });
  
  // Recupera le categorie
  const categoriesQuery = useQuery({
    queryKey: ['/api/service-categories'],
    queryFn: async () => {
      const res = await fetch('/api/service-categories');
      if (!res.ok) throw new Error('Errore nel caricamento delle categorie');
      return await res.json();
    }
  });
  
  // Recupera gli elementi di un pacchetto specifico
  const getBundleItems = async (bundleId: number) => {
    const res = await fetch(`/api/service-bundles/${bundleId}/items`);
    if (!res.ok) throw new Error('Errore nel caricamento degli elementi del pacchetto');
    return await res.json();
  };
  
  // Form per creare/modificare un pacchetto
  const form = useForm<BundleFormValues>({
    resolver: zodResolver(bundleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      totalPrice: 0,
      discountedPrice: 0,
      discountType: 'percentage',
      discountValue: 10,
      isActive: true,
    },
  });
  
  // Operazioni di creazione/modifica/eliminazione pacchetto
  const createBundleMutation = useMutation({
    mutationFn: async (data: BundleFormValues) => {
      // Prima crea il pacchetto
      const bundleRes = await apiRequest('POST', '/api/service-bundles', data);
      const bundle = await bundleRes.json();
      
      // Poi aggiungi gli elementi
      for (const item of selectedItems) {
        await apiRequest('POST', '/api/service-bundle-items', {
          bundleId: bundle.id,
          serviceId: item.serviceId,
          quantity: item.quantity,
        });
      }
      
      return bundle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-bundles'] });
      setIsOpen(false);
      form.reset();
      setSelectedItems([]);
      toast({
        title: 'Pacchetto creato',
        description: 'Il pacchetto è stato creato con successo',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Si è verificato un errore: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  const updateBundleMutation = useMutation({
    mutationFn: async (data: BundleFormValues & { id: number }) => {
      const { id, ...updateData } = data;
      
      // Prima aggiorna il pacchetto
      const bundleRes = await apiRequest('PUT', `/api/service-bundles/${id}`, updateData);
      const bundle = await bundleRes.json();
      
      // TODO: In una versione più avanzata, si potrebbero gestire anche gli aggiornamenti
      // degli elementi del pacchetto, ma per ora li lasciamo invariati
      
      return bundle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-bundles'] });
      setIsOpen(false);
      setEditingBundle(null);
      setSelectedItems([]);
      form.reset();
      toast({
        title: 'Pacchetto aggiornato',
        description: 'Il pacchetto è stato aggiornato con successo',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Si è verificato un errore: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  const deleteBundleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/service-bundles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-bundles'] });
      toast({
        title: 'Pacchetto eliminato',
        description: 'Il pacchetto è stato eliminato con successo',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Si è verificato un errore: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Gestione apertura del form per creazione nuovo pacchetto
  const handleAddNew = () => {
    setSelectedTemplateStyle('elegant');
    form.reset({
      name: '',
      description: '',
      totalPrice: 0,
      discountedPrice: 0,
      discountType: 'percentage',
      discountValue: 10,
      isActive: true,
      templateStyle: 'elegant',
    });
    setEditingBundle(null);
    setSelectedItems([]);
    setIsOpen(true);
  };
  
  // Gestione apertura del form per modifica pacchetto esistente
  const handleEdit = async (bundle: ServiceBundle) => {
    try {
      // Recupera gli elementi del pacchetto
      const items = await getBundleItems(bundle.id);
      
      // Compone la lista di elementi selezionati
      const itemsWithServices = items.map((item: any) => {
        const service = servicesQuery.data?.find(s => s.id === item.serviceId);
        return {
          ...item,
          service,
        };
      });
      
      setSelectedItems(itemsWithServices);
      
      // Reset dell'immagine selezionata, usiamo quella esistente
      setSelectedImageFile(null);
      
      // Stampa di debug per verificare il percorso dell'immagine
      console.log('Percorso immagine pacchetto da modificare:', bundle.imagePath);
      
      // Verifica esplicita che il percorso dell'immagine sia una stringa valida
      let imagePath = bundle.imagePath;
      if (imagePath && typeof imagePath === 'string' && imagePath.startsWith('/uploads/')) {
        console.log('Percorso immagine valido:', imagePath);
      } else {
        console.log('Percorso immagine non valido o non presente, verrà impostato come vuoto');
        imagePath = '';
      }
      
      // Utilizziamo un breve timeout per assicurarci che il form sia completamente renderizzato
      // prima di impostare i valori
      setTimeout(() => {
        const templateStyle = bundle.templateStyle || 'elegant';
        setSelectedTemplateStyle(templateStyle as 'elegant' | 'modern' | 'minimal' | 'bold');
        
        form.reset({
          name: bundle.name,
          description: bundle.description || '',
          imagePath: imagePath,
          totalPrice: bundle.totalPrice,
          discountedPrice: bundle.discountedPrice,
          discountType: bundle.discountType as 'percentage' | 'fixed',
          discountValue: bundle.discountValue,
          isActive: bundle.isActive,
          categoryId: bundle.categoryId || undefined,
          templateStyle: templateStyle as 'elegant' | 'modern' | 'minimal' | 'bold',
        });
        
        setEditingBundle({
          ...bundle,
          imagePath: imagePath,  // Aggiorniamo anche l'oggetto bundle per sicurezza
        });
        
        setIsOpen(true);
      }, 0);
    } catch (error) {
      console.error('Errore durante il recupero degli elementi del pacchetto:', error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante il recupero degli elementi del pacchetto',
        variant: 'destructive',
      });
    }
  };
  
  // Gestione eliminazione pacchetto
  const handleDelete = (id: number) => {
    if (confirm('Sei sicuro di voler eliminare questo pacchetto?')) {
      deleteBundleMutation.mutate(id);
    }
  };
  
  // Aggiunge un elemento al pacchetto
  const handleAddItem = () => {
    if (tempItem.serviceId === 0) return;
    
    const service = servicesQuery.data?.find(s => s.id === tempItem.serviceId);
    if (!service) return;
    
    // Verifica se l'elemento è già presente
    const existingItemIndex = selectedItems.findIndex(item => item.serviceId === tempItem.serviceId);
    
    if (existingItemIndex >= 0) {
      // Aggiorna la quantità dell'elemento esistente
      const updatedItems = [...selectedItems];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + tempItem.quantity,
      };
      setSelectedItems(updatedItems);
    } else {
      // Aggiungi un nuovo elemento
      setSelectedItems([
        ...selectedItems,
        {
          ...tempItem,
          service,
        },
      ]);
    }
    
    // Resetta il form temporaneo
    setTempItem({ serviceId: 0, quantity: 1 });
    
    // Aggiorna i prezzi totale e scontato
    recalculatePrices();
  };
  
  // Rimuove un elemento dal pacchetto
  const handleRemoveItem = (index: number) => {
    const updatedItems = [...selectedItems];
    updatedItems.splice(index, 1);
    setSelectedItems(updatedItems);
    
    // Aggiorna i prezzi totale e scontato
    recalculatePrices(updatedItems);
  };
  
  // Calcola i prezzi totale e scontato in base agli elementi selezionati
  const recalculatePrices = (items = selectedItems) => {
    // Calcola il prezzo totale (somma dei prezzi di tutti gli elementi)
    const totalPrice = items.reduce((sum, item) => {
      const price = item.service?.price || 0;
      return sum + (price * item.quantity);
    }, 0);
    
    // Calcola il prezzo scontato in base al tipo di sconto
    let discountedPrice = totalPrice;
    const discountType = form.getValues('discountType');
    const discountValue = form.getValues('discountValue');
    
    if (discountType === 'percentage') {
      discountedPrice = totalPrice - Math.round((totalPrice * discountValue) / 100);
    } else if (discountType === 'fixed') {
      discountedPrice = Math.max(0, totalPrice - discountValue * 100); // Converti in centesimi
    }
    
    // Aggiorna i campi del form
    form.setValue('totalPrice', totalPrice);
    form.setValue('discountedPrice', discountedPrice);
  };
  
  // Funzione per caricare l'immagine del pacchetto
  const uploadImage = async (): Promise<string | undefined> => {
    if (!selectedImageFile) return undefined;
    
    try {
      const formData = new FormData();
      formData.append('image', selectedImageFile);
      
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Errore durante il caricamento dell\'immagine');
      }
      
      const data = await response.json();
      return data.imagePath;
    } catch (error) {
      console.error('Errore upload immagine:', error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante il caricamento dell\'immagine',
        variant: 'destructive',
      });
      return undefined;
    }
  };

  // Invio del form
  const onSubmit = async (data: BundleFormValues) => {
    if (selectedItems.length === 0) {
      toast({
        title: 'Errore',
        description: 'Devi aggiungere almeno un servizio o prodotto al pacchetto',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Se c'è un'immagine selezionata, caricala
      let updatedData = { ...data };
      
      if (selectedImageFile) {
        const imagePath = await uploadImage();
        if (imagePath) {
          updatedData.imagePath = imagePath;
        }
      }
      
      if (editingBundle) {
        updateBundleMutation.mutate({
          ...updatedData,
          id: editingBundle.id,
        });
      } else {
        createBundleMutation.mutate(updatedData);
      }
    } catch (error) {
      console.error('Errore durante il salvataggio del pacchetto:', error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante il salvataggio del pacchetto',
        variant: 'destructive',
      });
    }
  };
  
  // Helper per ottenere il nome della categoria
  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return 'Nessuna categoria';
    const category = categoriesQuery.data?.find((c: any) => c.id === categoryId);
    return category ? category.name : 'Categoria sconosciuta';
  };
  
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => navigate('/services')} className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Servizi e Prodotti
            </Button>
            <h1 className="text-3xl font-bold">Pacchetti</h1>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Crea Nuovo Pacchetto
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bundlesQuery.data?.map(bundle => (
            <Card key={bundle.id} className="h-full flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="mb-1">{bundle.name}</CardTitle>
                    <CardDescription>
                      {getCategoryName(bundle.categoryId || undefined)}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleEdit(bundle)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifica
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(bundle.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Elimina
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                {bundle.imagePath && (
                  <div className="w-full h-32 mb-4 overflow-hidden rounded-md">
                    <img 
                      src={bundle.imagePath} 
                      alt={bundle.name} 
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {bundle.description || 'Nessuna descrizione'}
                </p>
                
                <div className="mb-4">
                  <p className="text-sm font-medium mb-1">Risparmio:</p>
                  <div className="flex items-center">
                    <p className="text-sm line-through text-muted-foreground mr-2">
                      {formatPrice(bundle.totalPrice)}
                    </p>
                    <Badge variant="outline">
                      {bundle.discountType === 'percentage' 
                        ? `-${bundle.discountValue}%` 
                        : `-${formatPrice(bundle.discountValue)}`}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-lg font-bold text-primary">
                  {formatPrice(bundle.discountedPrice)}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <div>
                  {bundle.isActive ? (
                    <Badge variant="default">Attivo</Badge>
                  ) : (
                    <Badge variant="destructive">Disattivato</Badge>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`/bundles/detail/${bundle.id}`, '_blank')}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Anteprima
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
          
          {(!bundlesQuery.data || bundlesQuery.data.length === 0) && (
            <Card className="col-span-full p-8 text-center">
              <p className="text-muted-foreground mb-4">
                Nessun pacchetto disponibile.
              </p>
              <Button onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" />
                Crea il tuo primo pacchetto
              </Button>
            </Card>
          )}
        </div>
      </div>
      
      {/* Dialog per aggiungere/modificare un pacchetto */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              {editingBundle ? 'Modifica' : 'Crea'} Pacchetto
            </DialogTitle>
            <DialogDescription>
              Un pacchetto è un gruppo di servizi e/o prodotti venduti insieme con uno sconto.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Pacchetto *</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Campo per il caricamento dell'immagine */}
              <FormField
                control={form.control}
                name="imagePath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Immagine del Pacchetto</FormLabel>
                    <FormControl>
                      <ImageUpload
                        onImageChange={(file) => {
                          setSelectedImageFile(file);
                        }}
                        initialImage={form.getValues('imagePath')}
                        currentImageUrl={typeof editingBundle?.imagePath === 'string' ? editingBundle.imagePath : undefined}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value) || undefined)}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona una categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Nessuna categoria</SelectItem>
                        {categoriesQuery.data?.map((category: any) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="border rounded-md p-4">
                <h3 className="text-lg font-medium mb-2">Elementi del Pacchetto</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Aggiungi servizi e prodotti a questo pacchetto.
                </p>
                
                <div className="grid grid-cols-12 gap-2 mb-4">
                  <div className="col-span-8">
                    <Select
                      value={tempItem.serviceId.toString()}
                      onValueChange={(value) => setTempItem({ ...tempItem, serviceId: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona servizio o prodotto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Seleziona...</SelectItem>
                        {servicesQuery.data?.map(service => (
                          <SelectItem key={service.id} value={service.id.toString()}>
                            {service.name} - {formatPrice(service.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      value={tempItem.quantity}
                      onChange={(e) => setTempItem({ ...tempItem, quantity: parseInt(e.target.value) || 1 })}
                      placeholder="Qtà"
                    />
                  </div>
                  <div className="col-span-2">
                    <Button type="button" onClick={handleAddItem} className="w-full">
                      Aggiungi
                    </Button>
                  </div>
                </div>
                
                {selectedItems.length > 0 ? (
                  <div className="border rounded-md divide-y">
                    {selectedItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2">
                        <div className="flex-grow">
                          <p className="font-medium">{item.service?.name}</p>
                          <div className="flex justify-between">
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(item.service?.price || 0)} x {item.quantity}
                            </p>
                            <p className="text-sm font-medium">
                              {formatPrice((item.service?.price || 0) * item.quantity)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    
                    <div className="p-2 flex justify-between font-medium">
                      <span>Totale (senza sconto):</span>
                      <span>{formatPrice(form.getValues('totalPrice'))}</span>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-md p-4 text-center text-muted-foreground">
                    Nessun elemento aggiunto al pacchetto.
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo di Sconto</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Ricalcola i prezzi quando cambia il tipo di sconto
                          setTimeout(() => recalculatePrices(), 0);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Tipo di sconto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentuale (%)</SelectItem>
                          <SelectItem value="fixed">Importo fisso (€)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="discountValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valore Sconto</FormLabel>
                      <FormControl>
                        {form.watch('discountType') === 'percentage' ? (
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseInt(e.target.value) || 0);
                              // Ricalcola i prezzi quando cambia il valore dello sconto
                              setTimeout(() => recalculatePrices(), 0);
                            }}
                          />
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseInt(e.target.value) || 0);
                              // Ricalcola i prezzi quando cambia il valore dello sconto
                              setTimeout(() => recalculatePrices(), 0);
                            }}
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-base">Riepilogo Prezzi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-muted-foreground">Prezzo Totale:</div>
                      <div className="text-right">{formatPrice(form.watch('totalPrice'))}</div>
                      
                      <div className="text-muted-foreground">Sconto:</div>
                      <div className="text-right">
                        {form.watch('discountType') === 'percentage'
                          ? `${form.watch('discountValue')}%`
                          : formatPrice(form.watch('discountValue'))}
                      </div>
                      
                      <div className="font-medium">Prezzo Scontato:</div>
                      <div className="text-right font-medium text-primary">
                        {formatPrice(form.watch('discountedPrice'))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Pacchetto Attivo</FormLabel>
                      <FormDescription>
                        Questo pacchetto è disponibile per essere venduto
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
              
              {/* Template Style Selection */}
              <FormField
                control={form.control}
                name="templateStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stile Template</FormLabel>
                    <FormDescription>
                      Scegli lo stile grafico per la pagina di dettaglio del pacchetto
                    </FormDescription>
                    <FormControl>
                      <div className="space-y-4">
                        <div className="hidden">
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedTemplateStyle(value as 'elegant' | 'modern' | 'minimal' | 'bold');
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona uno stile" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="elegant">Elegante</SelectItem>
                              <SelectItem value="modern">Moderno</SelectItem>
                              <SelectItem value="minimal">Minimalista</SelectItem>
                              <SelectItem value="bold">Audace</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <TemplatePreviews
                          bundleName={form.watch('name') || "Pacchetto Fotografico"}
                          bundleImagePath={form.watch('imagePath')}
                          selectedStyle={field.value as 'elegant' | 'modern' | 'minimal' | 'bold'}
                          onSelectStyle={(style) => {
                            field.onChange(style);
                            setSelectedTemplateStyle(style);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Annulla
                </Button>
                <Button 
                  type="submit"
                  disabled={createBundleMutation.isPending || updateBundleMutation.isPending}
                >
                  {createBundleMutation.isPending || updateBundleMutation.isPending ? (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : null}
                  {editingBundle ? 'Aggiorna Pacchetto' : 'Crea Pacchetto'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ServiceBundlesPage;