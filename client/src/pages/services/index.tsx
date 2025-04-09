import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { Plus, Edit, Trash2, Tag, Package } from 'lucide-react';
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
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

const ServicesPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [activeTab, setActiveTab] = useState<string>('services');
  
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
  
  // Invio del form per creazione/modifica
  const onSubmit = (data: ServiceFormValues) => {
    if (editingService) {
      updateServiceMutation.mutate({
        ...data,
        id: editingService.id,
      });
    } else {
      createServiceMutation.mutate(data);
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
                          <DropdownMenuItem onClick={() => handleDelete(service.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
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
                              service.discountType,
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
                              product.discountType,
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
                      {product.stock !== null && (
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Modifica' : 'Aggiungi'} {form.getValues('type') === 'service' ? 'Servizio' : 'Prodotto'}
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
                      <Textarea {...field} />
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
                        <SelectItem value="">Nessuna categoria</SelectItem>
                        {categoriesQuery.data?.map((category) => (
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
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prezzo (€) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) * 100)}
                          value={field.value / 100}
                        />
                      </FormControl>
                      <FormDescription>Il prezzo in Euro</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {form.getValues('type') === 'product' && (
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Disponibilità</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {form.getValues('type') === 'product' && (
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Codice prodotto (SKU)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unità di misura</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="pz, ore, giorni, ..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="hasDiscount"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Applica Sconto</FormLabel>
                      <FormDescription>
                        Attiva per applicare uno sconto a questo {form.getValues('type') === 'service' ? 'servizio' : 'prodotto'}
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo di sconto</FormLabel>
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
                        <FormLabel>Valore dello sconto</FormLabel>
                        <FormControl>
                          {form.watch('discountType') === 'percentage' ? (
                            <Input
                              type="number"
                              {...field}
                              min={0}
                              max={100}
                            />
                          ) : (
                            <Input
                              type="number"
                              {...field}
                              min={0}
                              max={form.watch('price')}
                              onChange={(e) => field.onChange(Number(e.target.value) * 100)}
                              value={field.value ? field.value / 100 : 0}
                            />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
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
                  disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                >
                  {createServiceMutation.isPending || updateServiceMutation.isPending ? (
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