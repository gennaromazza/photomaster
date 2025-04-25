import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ServiceBundle, Service, Settings } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, Check } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';

// Formattazione prezzo in Euro
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price / 100);
};

// Schema per il form di richiesta preventivo da pacchetto
const requestBundleQuoteSchema = z.object({
  firstName: z.string().min(1, "Il nome è obbligatorio"),
  lastName: z.string().min(1, "Il cognome è obbligatorio"),
  email: z.string().email("Email non valida").min(1, "L'email è obbligatoria"),
  phone: z.string().optional(),
  address: z.string().optional(),
  eventType: z.string().min(1, "Il tipo di evento è obbligatorio"),
  eventDate: z.date().optional(),
  location: z.string().optional(), // Cambio da eventLocation a location per allineamento con il DB
  message: z.string().optional(),
});

type RequestBundleQuoteValues = z.infer<typeof requestBundleQuoteSchema>;

export default function RequestQuoteFromBundlePage() {
  const { bundleId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Form di richiesta preventivo
  const form = useForm<RequestBundleQuoteValues>({
    resolver: zodResolver(requestBundleQuoteSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      eventType: 'matrimonio',
      eventDate: undefined,
      location: '', // Cambio da eventLocation a location per allineamento con il DB
      message: '',
    },
  });

  // Query per recuperare i dettagli del pacchetto
  const bundleQuery = useQuery({
    queryKey: [`/api/service-bundles/${bundleId}`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/service-bundles/${bundleId}`);
        if (!res.ok) throw new Error('Errore nel caricamento del pacchetto');
        return await res.json();
      } catch (error) {
        console.error('Errore durante il recupero del pacchetto:', error);
        throw new Error('Errore nel caricamento del pacchetto');
      }
    }
  });

  // Query per recuperare gli elementi del pacchetto
  const bundleItemsQuery = useQuery({
    queryKey: [`/api/service-bundles/${bundleId}/items`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/service-bundles/${bundleId}/items`);
        if (!res.ok) throw new Error('Errore nel caricamento degli elementi del pacchetto');
        const items = await res.json();
        
        // Recuperare i dettagli completi di ogni servizio incluso nel pacchetto
        const itemsWithServices = await Promise.all(items.map(async (item: any) => {
          try {
            const serviceRes = await fetch(`/api/services/${item.serviceId}`);
            if (!serviceRes.ok) throw new Error(`Errore nel caricamento del servizio ${item.serviceId}`);
            const service = await serviceRes.json();
            return {
              ...item,
              service,
            };
          } catch (error) {
            console.error(`Errore recupero servizio ${item.serviceId}:`, error);
            return {
              ...item,
              service: { id: item.serviceId, name: 'Servizio non disponibile', price: 0 },
            };
          }
        }));
        
        return itemsWithServices;
      } catch (error) {
        console.error('Errore durante il recupero degli elementi del pacchetto:', error);
        throw new Error('Errore nel caricamento degli elementi del pacchetto');
      }
    },
    enabled: !!bundleQuery.data,
  });
  
  // Query per recuperare le impostazioni dello studio
  const settingsQuery = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Errore nel caricamento delle impostazioni');
        return await res.json();
      } catch (error) {
        console.error('Errore durante il recupero delle impostazioni:', error);
        throw new Error('Errore nel caricamento delle impostazioni');
      }
    }
  });

  // Mutazione per creare il preventivo da pacchetto
  const createQuoteMutation = useMutation({
    mutationFn: async (data: RequestBundleQuoteValues) => {
      // Aggiungi l'ID del bundle ai dati della richiesta
      const requestData = {
        ...data,
        bundleId: parseInt(bundleId ?? '0'),
      };
      
      const res = await apiRequest('POST', '/api/bundle-leads/create-quote', requestData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Preventivo richiesto',
        description: 'La tua richiesta di preventivo è stata inviata con successo. Ti contatteremo presto!',
      });
      // Reindirizza alla pagina di successo
      navigate('/bundles/request-success');
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Si è verificato un errore: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Handler per l'invio del form
  const onSubmit = (data: RequestBundleQuoteValues) => {
    createQuoteMutation.mutate(data);
  };

  // Se i dati sono in caricamento, mostra un indicatore di caricamento
  if (bundleQuery.isLoading || settingsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Se si è verificato un errore, mostra un messaggio di errore
  if (bundleQuery.error || settingsQuery.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Errore</h1>
        <p className="text-gray-600 mb-6 text-center">
          Si è verificato un errore durante il caricamento dei dati. Riprova più tardi.
        </p>
        <Button onClick={() => navigate('/bundles')}>
          Torna ai Pacchetti
        </Button>
      </div>
    );
  }

  const bundle = bundleQuery.data as ServiceBundle;
  const bundleItems = bundleItemsQuery.data || [];
  const settings = settingsQuery.data as Settings;

  // Combina bundle e bundleItems per avere un oggetto completo
  const bundleWithItems = {
    ...bundle,
    items: bundleItems,
  };

  return (
    <div className="bg-white min-h-screen pb-16">
      {/* Header */}
      <div className="bg-primary/10 py-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/bundles/detail/${bundleId}`)}
              className="hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna al Pacchetto
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Richiedi Preventivo</h1>
          <p className="text-lg text-gray-600">
            Basato sul pacchetto <strong>{bundle.name}</strong>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <Card className="mb-6 border-gray-200">
              <CardHeader className="pb-2">
                <h2 className="text-xl font-bold text-gray-900">I tuoi dati</h2>
                <p className="text-sm text-gray-500">
                  Inserisci i tuoi dati per ricevere un preventivo personalizzato
                </p>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="firstName"
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
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cognome *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefono</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Indirizzo</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="eventType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo di Evento *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona il tipo di evento" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="matrimonio">Matrimonio</SelectItem>
                                <SelectItem value="battesimo">Battesimo</SelectItem>
                                <SelectItem value="comunione">Comunione</SelectItem>
                                <SelectItem value="cresima">Cresima</SelectItem>
                                <SelectItem value="compleanno">Compleanno</SelectItem>
                                <SelectItem value="evento_aziendale">Evento Aziendale</SelectItem>
                                <SelectItem value="altro">Altro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="eventDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Data dell'Evento</FormLabel>
                            <DatePicker
                              date={field.value}
                              setDate={field.onChange}
                              locale={it}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="eventLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Luogo dell'Evento</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Messaggio o Note Aggiuntive</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={4} />
                          </FormControl>
                          <FormDescription>
                            Includi eventuali dettagli specifici o richieste particolari
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-4 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(`/bundles/detail/${bundleId}`)}
                      >
                        Annulla
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createQuoteMutation.isPending}
                        className="min-w-[150px]"
                      >
                        {createQuoteMutation.isPending ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Invio in corso...
                          </span>
                        ) : 'Richiedi Preventivo'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Bundle Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <Card className="shadow-md border-gray-200 overflow-hidden">
                <div className="h-2 bg-primary"></div>
                <CardHeader className="pb-2">
                  <h2 className="text-xl font-bold text-gray-900">{bundle.name}</h2>
                  <p className="text-sm text-gray-500">
                    Riepilogo del pacchetto selezionato
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bundle.description && (
                    <p className="text-sm text-gray-600">{bundle.description}</p>
                  )}
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Servizi Inclusi</h3>
                    <ul className="space-y-2">
                      {bundleWithItems.items?.map((item: any, index: number) => (
                        <li key={index} className="flex items-start space-x-2 text-sm">
                          <Check className="h-4 w-4 text-primary mt-0.5" />
                          <div>
                            <span className="text-gray-800">{item.service.name}</span>
                            {item.quantity > 1 && (
                              <span className="text-gray-500"> ({item.quantity}x)</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Prezzo Totale:</span>
                      <span className="text-gray-500 line-through">{formatPrice(bundle.totalPrice)}</span>
                    </div>
                    {bundle.discountType && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Sconto:</span>
                        <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                          {bundle.discountType === 'percentage' 
                            ? `-${bundle.discountValue}%` 
                            : `-${formatPrice(bundle.discountValue)}`}
                        </Badge>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-900">Prezzo Finale:</span>
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(bundle.discountedPrice || bundle.totalPrice)}
                      </span>
                    </div>
                  </div>
                  
                  {bundle.depositAmount > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Acconto Richiesto:</span>
                          <span className="font-semibold text-gray-900">{formatPrice(bundle.depositAmount)}</span>
                        </div>
                        {bundle.installmentsCount > 1 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Rate:</span>
                            <span className="text-gray-900">{bundle.installmentsCount}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <div className="text-sm text-gray-500 text-center px-4">
                Compilando e inviando questo modulo accetti che i tuoi dati siano elaborati in conformità con la nostra <a href="#" className="text-primary hover:underline">Informativa sulla Privacy</a>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}