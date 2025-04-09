import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Service } from '@shared/schema';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import Layout from '@/components/layout/layout';
import { Plus, Edit, Trash2, Tag, Package, Image } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import ServiceItemsManager from '@/components/services/service-items-manager';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Link } from 'wouter';

// Formattazione prezzo in Euro
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price / 100);
};

// Form schema per creare/modificare un servizio
const serviceFormSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Il prezzo deve essere maggiore o uguale a 0'),
  type: z.enum(['service', 'product']),
  categoryId: z.coerce.number().optional(),
  isActive: z.boolean().default(true),
  hasDiscount: z.boolean().default(false),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.coerce.number().optional(),
  sku: z.string().optional(),
  stock: z.coerce.number().optional(),
  unit: z.string().optional(),
  taxable: z.boolean().default(true),
  isComposite: z.boolean().default(false),
  productIds: z.array(z.number()).optional(),
  image: z.any().optional(), // File di immagine
  imagePath: z.string().optional(), // Percorso dell'immagine salvata
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

const ServicesPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [activeTab, setActiveTab] = useState<string>('services');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [autoCalculatePrice, setAutoCalculatePrice] = useState(true);
  
  const [, navigate] = useLocation();
  
  // Recupera tutti i servizi
  const servicesQuery = useQuery<Service[]>({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const res = await fetch('/api/services');
      if (!res.ok) throw new Error('Errore nel caricamento dei servizi');
      return await res.json();
    }
  });
  
  // Recupera le categorie di servizi
  const categoriesQuery = useQuery({
    queryKey: ['/api/service-categories'],
    queryFn: async () => {
      const res = await fetch('/api/service-categories');
      if (!res.ok) throw new Error('Errore nel caricamento delle categorie');
      return await res.json();
    }
  });
  
  // Filtra i servizi in base al tipo (servizio o prodotto)
  const services = servicesQuery.data?.filter(s => s.type === 'service') || [];
  const products = servicesQuery.data?.filter(s => s.type === 'product') || [];
  
  // Form per creare/modificare un servizio
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      type: 'service',
      isActive: true,
      hasDiscount: false,
      discountType: 'percentage',
      discountValue: 0,
      taxable: true,
    },
  });
  
  // Operazioni di creazione/modifica servizio
  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      return await apiRequest('POST', '/api/services', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setIsOpen(false);
      form.reset();
      toast({
        title: 'Servizio creato',
        description: 'Il servizio è stato creato con successo',
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
  
  const updateServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormValues & { id: number }) => {
      const { id, ...updateData } = data;
      return await apiRequest('PUT', `/api/services/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setIsOpen(false);
      setEditingService(null);
      form.reset();
      toast({
        title: 'Servizio aggiornato',
        description: 'Il servizio è stato aggiornato con successo',
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
  
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: 'Servizio eliminato',
        description: 'Il servizio è stato eliminato con successo',
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
  
  // Gestione apertura del form per creazione nuovo servizio
  const handleAddNew = (type: 'service' | 'product') => {
    form.reset({
      name: '',
      description: '',
      price: 0,
      type,
      isActive: true,
      hasDiscount: false,
      discountType: 'percentage',
      discountValue: 0,
      taxable: true,
    });
    setEditingService(null);
    setIsOpen(true);
  };
  
  // Gestione apertura del form per modifica servizio esistente
  const handleEdit = (service: Service) => {
    form.reset({
      name: service.name,
      description: service.description || '',
      price: service.price,
      type: service.type as 'service' | 'product',
      categoryId: service.categoryId || undefined,
      isActive: service.isActive,
      hasDiscount: service.hasDiscount || false,
      discountType: service.discountType as 'percentage' | 'fixed' || 'percentage',
      discountValue: service.discountValue || 0,
      sku: service.sku || '',
      stock: service.stock || 0,
      unit: service.unit || '',
      taxable: service.taxable,
    });
    setEditingService(service);
    setIsOpen(true);
  };
  
  // Funzione per calcolare automaticamente il prezzo del servizio basato sui prodotti selezionati
  const updateServicePrice = (productIds: number[]) => {
    if (!autoCalculatePrice) return;
    
    let totalPrice = 0;
    productIds.forEach(id => {
      const product = products.find(p => p.id === id);
      if (product) {
        // Considera il prezzo scontato se applicabile
        if (product.hasDiscount && product.discountValue) {
          totalPrice += calculateDiscountedPrice(
            product.price,
            product.hasDiscount,
            product.discountType || 'percentage',
            product.discountValue
          );
        } else {
          totalPrice += product.price;
        }
      }
    });
    
    form.setValue('price', totalPrice);
  };
  
  // Gestione dell'upload dell'immagine
  const handleImageUpload = async (file: File | null): Promise<string | undefined> => {
    if (!file) return undefined;
    
    setUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Errore durante l\'upload dell\'immagine');
      }
      
      const result = await response.json();
      return result.imagePath;
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Non è stato possibile caricare l\'immagine',
        variant: 'destructive',
      });
      return undefined;
    } finally {
      setUploadingImage(false);
    }
  };

  // Invio del form per creazione/modifica
  const onSubmit = async (data: ServiceFormValues) => {
    try {
      console.log("Submitting form with data:", data);
      
      // Se c'è un'immagine da caricare, esegue l'upload
      if (data.image && data.image instanceof File) {
        console.log("Uploading image file:", data.image.name);
        const imagePath = await handleImageUpload(data.image);
        if (imagePath) {
          console.log("Image uploaded successfully, path:", imagePath);
          data.imagePath = imagePath;
        }
      } else if (editingService?.imagePath) {
        // Mantieni l'immagine esistente se non ne è stata caricata una nuova
        console.log("Keeping existing image path:", editingService.imagePath);
        data.imagePath = editingService.imagePath;
      }
      
      // Rimuove il campo image perché non fa parte del modello di dati
      const { image, ...submitData } = data;
      
      // Log dei dati che verranno inviati all'API
      console.log("Final data to submit:", submitData);
      
      if (editingService) {
        updateServiceMutation.mutate({
          ...submitData,
          id: editingService.id,
        });
      } else {
        createServiceMutation.mutate(submitData);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante il salvataggio',
        variant: 'destructive',
      });
    }
  };
  
  // Gestione eliminazione servizio
  const handleDelete = (id: number) => {
    if (confirm('Sei sicuro di voler eliminare questo servizio?')) {
      deleteServiceMutation.mutate(id);
    }
  };
  
  // Helper per ottenere il nome della categoria
  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return 'Nessuna categoria';
    const category = categoriesQuery.data?.find(c => c.id === categoryId);
    return category ? category.name : 'Categoria sconosciuta';
  };

  // Calcola il prezzo scontato (se applicabile)
  const calculateDiscountedPrice = (price: number, hasDiscount: boolean, discountType?: string, discountValue?: number) => {
    if (!hasDiscount || !discountValue) return price;
    
    if (discountType === 'percentage') {
      return price - Math.round((price * discountValue) / 100);
    } else if (discountType === 'fixed') {
      return Math.max(0, price - discountValue);
    }
    
    return price;
  };
  
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Servizi e Prodotti</h1>
          <div className="space-x-2">
            <Button onClick={() => navigate('/bundles')}>
              <Package className="mr-2 h-4 w-4" />
              Gestisci Pacchetti
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi Nuovo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Cosa vuoi aggiungere?</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAddNew('service')}>
                  Nuovo Servizio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddNew('product')}>
                  Nuovo Prodotto
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="services">Servizi</TabsTrigger>
            <TabsTrigger value="products">Prodotti</TabsTrigger>
          </TabsList>
          
          <TabsContent value="services">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(service => (
                <Card key={service.id} className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="mb-1">{service.name}</CardTitle>
                        <CardDescription>
                          {getCategoryName(service.categoryId)}
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
                          <DropdownMenuItem onClick={() => handleEdit(service)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifica
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/services/${service.id}`)}>
                            <Tag className="mr-2 h-4 w-4" />
                            Visualizza dettagli
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(service.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {service.imagePath && (
                      <div className="mb-4">
                        <img 
                          src={service.imagePath} 
                          alt={service.name}
                          className="w-full h-32 object-cover rounded-md mb-2"
                        />
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {service.description || 'Nessuna descrizione'}
                    </p>
                    
                    {service.hasDiscount && service.discountValue && (
                      <div className="mb-2">
                        <p className="text-sm line-through text-muted-foreground">
                          {formatPrice(service.price)}
                        </p>
                        <div className="flex items-center">
                          <p className="text-lg font-bold text-primary">
                            {formatPrice(calculateDiscountedPrice(
                              service.price,
                              service.hasDiscount,
                              service.discountType || 'percentage',
                              service.discountValue
                            ))}
                          </p>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {service.discountType === 'percentage' 
                              ? `-${service.discountValue}%` 
                              : `-${formatPrice(service.discountValue)}`}
                          </Badge>
                        </div>
                      </div>
                    )}
                    
                    {!service.hasDiscount && (
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(service.price)}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <div className="flex items-center">
                      {service.taxable ? (
                        <Badge variant="secondary">Imponibile</Badge>
                      ) : (
                        <Badge variant="outline">Non imponibile</Badge>
                      )}
                    </div>
                    <div>
                      {service.isActive ? (
                        <Badge variant="default">Attivo</Badge>
                      ) : (
                        <Badge variant="destructive">Disattivato</Badge>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
              
              {services.length === 0 && (
                <Card className="col-span-full p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    Nessun servizio disponibile.
                  </p>
                  <Button onClick={() => handleAddNew('service')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Aggiungi il tuo primo servizio
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="products">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <Card key={product.id} className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="mb-1">{product.name}</CardTitle>
                        <CardDescription>
                          {getCategoryName(product.categoryId)}
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
                          <DropdownMenuItem onClick={() => handleEdit(product)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifica
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(product.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {product.imagePath && (
                      <div className="mb-4">
                        <img 
                          src={product.imagePath} 
                          alt={product.name}
                          className="w-full h-32 object-cover rounded-md mb-2"
                        />
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {product.description || 'Nessuna descrizione'}
                    </p>
                    
                    <div className="flex items-center mb-4">
                      {product.sku && (
                        <Badge variant="outline" className="mr-2">
                          SKU: {product.sku}
                        </Badge>
                      )}
                      {product.unit && (
                        <Badge variant="outline">
                          Unità: {product.unit}
                        </Badge>
                      )}
                    </div>
                    
                    {product.hasDiscount && product.discountValue && (
                      <div className="mb-2">
                        <p className="text-sm line-through text-muted-foreground">
                          {formatPrice(product.price)}
                        </p>
                        <div className="flex items-center">
                          <p className="text-lg font-bold text-primary">
                            {formatPrice(calculateDiscountedPrice(
                              product.price,
                              product.hasDiscount,
                              product.discountType || 'percentage',
                              product.discountValue
                            ))}
                          </p>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {product.discountType === 'percentage' 
                              ? `-${product.discountValue}%` 
                              : `-${formatPrice(product.discountValue)}`}
                          </Badge>
                        </div>
                      </div>
                    )}
                    
                    {!product.hasDiscount && (
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(product.price)}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <div className="flex items-center">
                      {product.stock !== null && product.stock !== undefined && (
                        <Badge variant="secondary">
                          Disponibilità: {product.stock}
                        </Badge>
                      )}
                    </div>
                    <div>
                      {product.isActive ? (
                        <Badge variant="default">Attivo</Badge>
                      ) : (
                        <Badge variant="destructive">Disattivato</Badge>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
              
              {products.length === 0 && (
                <Card className="col-span-full p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    Nessun prodotto disponibile.
                  </p>
                  <Button onClick={() => handleAddNew('product')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Aggiungi il tuo primo prodotto
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Dialog per aggiungere/modificare un servizio o prodotto */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="md:max-w-[700px] w-[95%]">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Modifica' : 'Aggiungi nuovo'} {form.getValues('type') === 'service' ? 'servizio' : 'prodotto'}
            </DialogTitle>
            <DialogDescription>
              Compila i campi per {editingService ? 'modificare' : 'aggiungere'} un {form.getValues('type') === 'service' ? 'servizio' : 'prodotto'}.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
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
                      <Textarea {...field} className="resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select
                        disabled={!!editingService}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona il tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="service">Servizio</SelectItem>
                          <SelectItem value="product">Prodotto</SelectItem>
                        </SelectContent>
                      </Select>
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
                        onValueChange={(value) => {
                          const parsedValue = parseInt(value);
                          field.onChange(parsedValue === 0 ? null : parsedValue);
                        }}
                        value={(field.value || "0").toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona una categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Nessuna categoria</SelectItem>
                          {categoriesQuery.data?.map(category => (
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
              </div>
              
              <div>
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>Immagine</FormLabel>
                      <FormControl>
                        <ImageUpload
                          {...fieldProps}
                          onImageChange={onChange}
                          currentImageUrl={editingService?.imagePath || undefined}
                          className="h-48"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {form.watch('type') === 'product' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Disponibilità</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unità di misura</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              {form.watch('type') === 'service' && (
                <FormField
                  control={form.control}
                  name="isComposite"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Servizio composito</FormLabel>
                        <FormDescription>
                          Questo servizio include prodotti
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
              )}
              
              {form.watch('isComposite') && form.getValues('type') === 'service' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <FormLabel>Seleziona i prodotti da includere nel servizio</FormLabel>
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormLabel>Calcolo automatico</FormLabel>
                          <FormControl>
                            <Switch
                              checked={autoCalculatePrice}
                              onCheckedChange={setAutoCalculatePrice}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormDescription className="mb-3">
                    Puoi selezionare più prodotti per creare un servizio composito. 
                    {autoCalculatePrice ? ' Il prezzo verrà calcolato automaticamente.' : ' Il prezzo può essere impostato manualmente.'}
                  </FormDescription>
                  
                  <div className="border rounded-md p-4 space-y-4">
                    {products.length > 0 ? (
                      <div className="grid gap-2">
                        {products.map(product => (
                          <div key={product.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`product-${product.id}`}
                              checked={form.watch('productIds')?.includes(product.id)}
                              onCheckedChange={(checked) => {
                                const currentProductIds = form.watch('productIds') || [];
                                let updatedProductIds;
                                
                                if (checked) {
                                  updatedProductIds = [...currentProductIds, product.id];
                                  form.setValue('productIds', updatedProductIds);
                                  
                                  // Aggiorna il prezzo totale sommando il prezzo del prodotto selezionato
                                  updateServicePrice(updatedProductIds);
                                } else {
                                  updatedProductIds = currentProductIds.filter(id => id !== product.id);
                                  form.setValue('productIds', updatedProductIds);
                                  
                                  // Aggiorna il prezzo totale rimuovendo il prezzo del prodotto deselezionato
                                  updateServicePrice(updatedProductIds);
                                }
                              }}
                            />
                            <label 
                              htmlFor={`product-${product.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex justify-between w-full"
                            >
                              <span>{product.name}</span>
                              <span className="text-muted-foreground">{formatPrice(product.price)}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        Non ci sono prodotti disponibili. Devi prima creare dei prodotti.
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prezzo (€) *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01"
                        disabled={form.watch('isComposite') && autoCalculatePrice}
                        onChange={(e) => {
                          // Converte il valore in centesimi
                          const valueInCents = Math.round(parseFloat(e.target.value) * 100);
                          field.onChange(valueInCents);
                        }}
                        value={field.value / 100} // Mostra il valore in euro
                      />
                    </FormControl>
                    <FormDescription>
                      {form.watch('isComposite') && autoCalculatePrice
                        ? 'Il prezzo è calcolato automaticamente in base ai prodotti selezionati'
                        : 'Inserisci il prezzo in euro (es. 129.99)'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hasDiscount"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Applica sconto</FormLabel>
                      <FormDescription>
                        Questo {form.getValues('type') === 'service' ? 'servizio' : 'prodotto'} ha uno sconto
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
              
              {form.watch('hasDiscount') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo di sconto</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona il tipo di sconto" />
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
                        <FormLabel>Valore sconto</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            step={form.watch('discountType') === 'fixed' ? "0.01" : "1"}
                            onChange={(e) => {
                              // Per gli sconti fissi, converte in centesimi
                              if (form.watch('discountType') === 'fixed') {
                                const valueInCents = Math.round(parseFloat(e.target.value) * 100);
                                field.onChange(valueInCents);
                              } else {
                                field.onChange(parseInt(e.target.value));
                              }
                            }}
                            value={
                              form.watch('discountType') === 'fixed' 
                                ? (field.value || 0) / 100 
                                : field.value
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          {form.watch('discountType') === 'percentage' 
                            ? 'Inserisci la percentuale di sconto (es. 10 per 10%)' 
                            : 'Inserisci l\'importo dello sconto in euro (es. 25.50)'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
                
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="taxable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Imponibile</FormLabel>
                        <FormDescription>
                          Soggetto a tassazione (IVA)
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
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Attivo</FormLabel>
                        <FormDescription>
                          Questo {form.getValues('type') === 'service' ? 'servizio' : 'prodotto'} è attivo e disponibile
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
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Annulla
                </Button>
                <Button 
                  type="submit"
                  disabled={createServiceMutation.isPending || updateServiceMutation.isPending || uploadingImage}
                >
                  {(createServiceMutation.isPending || updateServiceMutation.isPending || uploadingImage) ? (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : null}
                  {editingService ? 'Aggiorna' : 'Crea'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ServicesPage;