import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Service, ServiceItem } from '@shared/schema';
import Layout from '@/components/layout/layout';
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
import { 
  ChevronLeft, 
  Edit, 
  Trash2, 
  Tag, 
  Package, 
  Image,
  ShoppingBasket,
  PriceTag,
  Badge as BadgeIcon,
  Percent,
  Info,
  Check,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// Formatta il prezzo in Euro
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
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

const ServiceDetailPage = () => {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('info');
  
  // Recupera i dettagli del servizio
  const serviceQuery = useQuery<Service>({
    queryKey: [`/api/services/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/services/${id}`);
      if (!res.ok) throw new Error('Errore nel caricamento del servizio');
      return await res.json();
    }
  });
  
  // Recupera i prodotti inclusi nel servizio (se composito)
  const serviceItemsQuery = useQuery<ServiceItem[]>({
    queryKey: [`/api/service-items/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/service-items/${id}`);
      if (!res.ok) throw new Error('Errore nel caricamento dei prodotti inclusi');
      return await res.json();
    },
    enabled: !!serviceQuery.data?.isComposite,
  });
  
  // Query per ottenere i dettagli di un prodotto tramite ID
  const getProductQuery = (productId: number) => {
    return useQuery<Service>({
      queryKey: [`/api/services/${productId}`],
      queryFn: async () => {
        const res = await fetch(`/api/services/${productId}`);
        if (!res.ok) throw new Error('Errore nel caricamento del prodotto');
        return await res.json();
      },
      enabled: !!productId,
    });
  };
  
  // Recupera i dettagli dei prodotti inclusi nel servizio
  const includedProductQueries = serviceItemsQuery.data?.map(item => {
    return {
      item,
      query: getProductQuery(item.productId)
    };
  }) || [];
  
  const service = serviceQuery.data;
  const isLoading = serviceQuery.isLoading || (service?.isComposite && serviceItemsQuery.isLoading);
  
  const handleEdit = () => {
    navigate(`/services?edit=${id}`);
  };
  
  const handleBack = () => {
    navigate('/services');
  };
  
  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="mb-8">
            <Button variant="ghost" onClick={handleBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Torna ai servizi
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  if (!service) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="mb-8">
            <Button variant="ghost" onClick={handleBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Torna ai servizi
            </Button>
          </div>
          
          <Card className="p-8 text-center">
            <CardTitle className="mb-4">Servizio non trovato</CardTitle>
            <CardDescription>
              Il servizio richiesto non esiste o è stato rimosso.
            </CardDescription>
            <CardFooter className="justify-center mt-6">
              <Button onClick={handleBack}>
                Torna alla lista dei servizi
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Layout>
    );
  }
  
  const hasDiscount = service.hasDiscount && service.discountValue;
  const displayPrice = hasDiscount 
    ? calculateDiscountedPrice(
        service.price, 
        service.hasDiscount, 
        service.discountType || 'percentage', 
        service.discountValue
      )
    : service.price;
    
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="mb-8">
          <Button variant="ghost" onClick={handleBack}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Torna ai servizi
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Colonna principale */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold">{service.name}</h1>
                <div className="mt-2 flex items-center space-x-2">
                  {service.type === 'service' ? (
                    <Badge variant="secondary">Servizio</Badge>
                  ) : (
                    <Badge variant="secondary">Prodotto</Badge>
                  )}
                  
                  {service.isComposite && (
                    <Badge variant="outline">Composito</Badge>
                  )}
                  
                  {service.isActive ? (
                    <Badge variant="default">Attivo</Badge>
                  ) : (
                    <Badge variant="destructive">Disattivato</Badge>
                  )}
                </div>
              </div>
              
              <Button onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Modifica
              </Button>
            </div>
            
            {service.imagePath && (
              <div className="relative w-full h-64 overflow-hidden rounded-lg">
                <img 
                  src={service.imagePath} 
                  alt={service.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="info">
                  <Info className="mr-2 h-4 w-4" />
                  Informazioni
                </TabsTrigger>
                {service.isComposite && (
                  <TabsTrigger value="products">
                    <ShoppingBasket className="mr-2 h-4 w-4" />
                    Prodotti inclusi
                  </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="info" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Dettagli</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Descrizione</h3>
                      <p className="mt-1">{service.description || 'Nessuna descrizione disponibile'}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Prezzo</h3>
                        <p className="mt-1 font-semibold text-lg">{formatPrice(displayPrice)}</p>
                        
                        {hasDiscount && (
                          <div className="flex items-center mt-1">
                            <p className="text-sm line-through text-muted-foreground">
                              {formatPrice(service.price)}
                            </p>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {service.discountType === 'percentage' 
                                ? `-${service.discountValue}%` 
                                : `-${formatPrice(service.discountValue || 0)}`}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      {service.type === 'product' && (
                        <>
                          {service.sku && (
                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">SKU</h3>
                              <p className="mt-1">{service.sku}</p>
                            </div>
                          )}
                          
                          {service.stock !== null && service.stock !== undefined && (
                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">Disponibilità</h3>
                              <p className="mt-1">{service.stock} {service.unit || 'unità'}</p>
                            </div>
                          )}
                        </>
                      )}
                      
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Imponibile</h3>
                        <p className="mt-1 flex items-center">
                          {service.taxable ? (
                            <>
                              <Check className="h-4 w-4 text-green-500 mr-1" />
                              <span>Sì</span>
                            </>
                          ) : (
                            <>
                              <X className="h-4 w-4 text-red-500 mr-1" />
                              <span>No</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {service.isComposite && (
                <TabsContent value="products" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Prodotti inclusi in questo servizio</CardTitle>
                      <CardDescription>
                        Questo servizio composito include i seguenti prodotti
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="divide-y">
                        {includedProductQueries.length > 0 ? (
                          includedProductQueries.map(({ item, query }) => {
                            const product = query.data;
                            
                            if (query.isLoading) {
                              return (
                                <div key={item.id} className="py-4">
                                  <Skeleton className="h-6 w-full mb-2" />
                                  <Skeleton className="h-4 w-1/2" />
                                </div>
                              );
                            }
                            
                            if (!product) return null;
                            
                            return (
                              <div key={item.id} className="py-4">
                                <div className="flex items-start">
                                  {product.imagePath && (
                                    <div className="mr-4 flex-shrink-0">
                                      <img 
                                        src={product.imagePath} 
                                        alt={product.name}
                                        className="w-16 h-16 object-cover rounded-md"
                                      />
                                    </div>
                                  )}
                                  
                                  <div className="flex-grow">
                                    <h3 className="font-medium">{product.name}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      {product.description ? (
                                        <>
                                          {product.description.length > 100 
                                            ? product.description.substring(0, 100) + '...' 
                                            : product.description}
                                        </>
                                      ) : (
                                        'Nessuna descrizione'
                                      )}
                                    </p>
                                    
                                    <div className="mt-2 flex justify-between items-center">
                                      <div className="text-sm">
                                        Quantità: {item.quantity || 1}
                                      </div>
                                      <div className="font-semibold">
                                        {formatPrice(product.price)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-6 text-center text-muted-foreground">
                            {serviceItemsQuery.isLoading 
                              ? 'Caricamento prodotti in corso...' 
                              : 'Nessun prodotto incluso in questo servizio'}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
          
          {/* Colonna laterale */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Riepilogo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Prezzo base</span>
                  <span>{formatPrice(service.price)}</span>
                </div>
                
                {hasDiscount && (
                  <div className="flex justify-between items-center text-red-500">
                    <span>Sconto</span>
                    <span>
                      {service.discountType === 'percentage' 
                        ? `-${service.discountValue}%` 
                        : `-${formatPrice(service.discountValue || 0)}`}
                    </span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between items-center font-bold">
                  <span>Prezzo finale</span>
                  <span>{formatPrice(displayPrice)}</span>
                </div>
                
                {service.taxable && (
                  <div className="text-xs text-muted-foreground text-right">
                    * Prezzo con IVA inclusa
                  </div>
                )}
              </CardContent>
            </Card>
            
            {service.isComposite && (
              <Card>
                <CardHeader>
                  <CardTitle>Prodotti inclusi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {includedProductQueries.length > 0 ? (
                      <>
                        <div className="text-sm font-medium">
                          Questo servizio include {includedProductQueries.length} prodotti:
                        </div>
                        <ul className="list-disc pl-5 space-y-1">
                          {includedProductQueries.map(({ item, query }) => {
                            const product = query.data;
                            if (!product) return null;
                            
                            return (
                              <li key={item.id} className="text-sm">
                                {product.name} 
                                {item.quantity && item.quantity > 1 ? ` (x${item.quantity})` : ''}
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    ) : (
                      <div className="text-center text-muted-foreground text-sm">
                        {serviceItemsQuery.isLoading 
                          ? 'Caricamento prodotti in corso...' 
                          : 'Nessun prodotto incluso in questo servizio'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ServiceDetailPage;