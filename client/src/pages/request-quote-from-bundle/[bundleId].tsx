import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/layout/layout";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  ArrowLeft, 
  User, 
  Package as PackageIcon,
  Save,
  Check,
  Mail,
  Phone,
  Calendar as CalendarIcon
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import cn from 'classnames';

// Schema di validazione per il form
const quoteFromBundleSchema = z.object({
  firstName: z.string().min(1, "Il nome è obbligatorio"),
  lastName: z.string().min(1, "Il cognome è obbligatorio"),
  email: z.string().email("Email non valida").min(1, "L'email è obbligatoria"),
  phone: z.string().optional(),
  address: z.string().optional(),
  message: z.string().optional(),
  eventDate: z.date().optional(),
  eventLocation: z.string().optional(),
  eventType: z.string().optional(),
  fullName: z.string().optional(),
});

type QuoteFromBundleFormValues = z.infer<typeof quoteFromBundleSchema>;

export default function RequestQuoteFromBundlePage() {
  const { bundleId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const form = useForm<QuoteFromBundleFormValues>({
    resolver: zodResolver(quoteFromBundleSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      message: "",
      eventDate: addDays(new Date(), 60), // Default 60 giorni da oggi
      eventLocation: "",
      eventType: "matrimonio",
      fullName: "",
    },
  });

  // Query per ottenere i dettagli del bundle
  const { data: bundle, isLoading: isLoadingBundle } = useQuery({
    queryKey: ["/api/service-bundles", bundleId],
    queryFn: async () => {
      if (!bundleId) return null;
      const res = await fetch(`/api/service-bundles/${bundleId}`);
      if (!res.ok) throw new Error("Errore nel caricamento del pacchetto");
      return res.json();
    },
    enabled: !!bundleId,
  });

  // Query per ottenere gli elementi del bundle
  const { data: bundleItems = [], isLoading: isLoadingBundleItems } = useQuery({
    queryKey: ["/api/service-bundles", bundleId, "items"],
    queryFn: async () => {
      if (!bundleId) return [];
      try {
        const res = await fetch(`/api/service-bundles/${bundleId}/items`);
        if (!res.ok) throw new Error("Errore nel caricamento degli elementi del pacchetto");
        
        const items = await res.json();
        
        // Arricchisci con i dettagli del servizio per ogni elemento del pacchetto
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
            console.error(`Errore durante il recupero del servizio ${item.serviceId}:`, error);
            return {
              ...item,
              service: {
                id: item.serviceId,
                name: "Servizio non disponibile",
                price: 0,
                description: "",
              },
            };
          }
        }));
        
        return itemsWithServices;
      } catch (error) {
        console.error('Errore durante il recupero degli elementi del pacchetto:', error);
        throw new Error('Errore nel caricamento degli elementi del pacchetto');
      }
    },
    enabled: !!bundleId,
  });

  // Query per ottenere le impostazioni dello studio
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Errore nel caricamento delle impostazioni');
      return await res.json();
    }
  });

  // Mutation per creare il preventivo dal bundle
  const createQuoteFromBundleMutation = useMutation({
    mutationFn: async (formData: QuoteFromBundleFormValues) => {
      const res = await apiRequest("POST", "/api/bundle-leads/create-quote", {
        ...formData,
        bundleId: Number(bundleId),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Errore durante la creazione del preventivo");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Richiesta inviata con successo",
        description: "La tua richiesta di preventivo è stata inviata. Ti contatteremo presto!",
      });
      
      // Memorizza i dati del cliente nel localStorage per la pagina di conferma
      localStorage.setItem("requestedQuoteClientName", `${form.getValues().firstName} ${form.getValues().lastName}`);
      localStorage.setItem("requestedQuoteClientEmail", form.getValues().email || "");
      
      // Reindirizza alla pagina di conferma
      navigate(`/bundles/request-success?quoteId=${data.quoteId}`);
    },
    onError: (error: Error) => {
      console.error("Errore creazione preventivo:", error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la creazione del preventivo",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Formattazione prezzo in Euro
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(price / 100);
  };

  // Determina il nome del cliente
  const clientFullName = useMemo(() => {
    const firstName = form.watch("firstName");
    const lastName = form.watch("lastName");
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return "";
  }, [form.watch("firstName"), form.watch("lastName")]);

  // Aggiorna il campo fullName quando cambiano firstName/lastName
  useEffect(() => {
    if (clientFullName) {
      form.setValue("fullName", clientFullName);
    }
  }, [clientFullName, form]);

  // Form submit handler
  const onSubmit = (data: QuoteFromBundleFormValues) => {
    setIsSubmitting(true);
    createQuoteFromBundleMutation.mutate(data);
  };

  // Loading state
  if (isLoadingBundle || isLoadingBundleItems) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Caricamento dati del pacchetto...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Handle bundle not found
  if (!bundle) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <PackageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Pacchetto non trovato</h2>
              <p className="text-muted-foreground mb-6">
                Il pacchetto richiesto non esiste o non è più disponibile.
              </p>
              <Button onClick={() => navigate("/bundles")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Torna ai Pacchetti
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => navigate(`/bundles/detail/${bundleId}`)} className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna al Pacchetto
            </Button>
            <h1 className="text-3xl font-bold">Richiedi Preventivo</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonna sinistra - Form principale */}
          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Informazioni Cliente</CardTitle>
                    <CardDescription>
                      Inserisci i tuoi dati per richiedere un preventivo personalizzato
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Mario" {...field} />
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
                            <FormLabel>Cognome</FormLabel>
                            <FormControl>
                              <Input placeholder="Rossi" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="mario.rossi@example.com" {...field} />
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
                              <Input placeholder="+39 123 456 7890" {...field} />
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
                            <Input placeholder="Via Roma 123, Milano" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Dettagli Evento</CardTitle>
                    <CardDescription>
                      Fornisci informazioni sull'evento per un preventivo più accurato
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="eventType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo di Evento</FormLabel>
                          <FormControl>
                            <Input placeholder="Matrimonio, Battesimo, ecc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="eventDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Data Evento</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP", { locale: it })
                                    ) : (
                                      <span>Scegli una data</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date()}
                                  locale={it}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="eventLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Luogo Evento</FormLabel>
                            <FormControl>
                              <Input placeholder="Location, Città" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Note e Richieste</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Inserisci eventuali richieste particolari o dettagli aggiuntivi..."
                              className="min-h-24"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/bundles/detail/${bundleId}`)}
                  >
                    Annulla
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Invio in corso...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Richiedi Preventivo
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Colonna destra - Riepilogo pacchetto */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PackageIcon className="mr-2 h-5 w-5 text-primary" />
                  Riepilogo Pacchetto
                </CardTitle>
                <CardDescription>
                  Dettagli del pacchetto selezionato
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{bundle.name}</h3>
                  <p className="text-sm text-muted-foreground">{bundle.description}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Servizi inclusi:</h4>
                  <div className="space-y-2">
                    {bundleItems.map((item: any, index: number) => (
                      <div key={index} className="flex items-start space-x-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">{item.service.name}</span>
                          {item.quantity > 1 && (
                            <span className="text-muted-foreground ml-1">x{item.quantity}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Prezzo originale:</span>
                    <span className="text-sm line-through">{formatPrice(bundle.totalPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Sconto:</span>
                    <span className="text-sm">
                      {bundle.discountType === 'percentage' 
                        ? `-${bundle.discountValue}%` 
                        : `-${formatPrice(bundle.discountValue)}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-medium">
                    <span>Prezzo finale:</span>
                    <span className="text-primary">{formatPrice(bundle.discountedPrice)}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {clientFullName ? clientFullName : "Inserisci i tuoi dati"}
                    </span>
                  </div>
                  {form.watch("email") && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{form.watch("email")}</span>
                    </div>
                  )}
                  {form.watch("phone") && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{form.watch("phone")}</span>
                    </div>
                  )}
                  {form.watch("eventDate") && (
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{format(form.watch("eventDate"), "PPP", { locale: it })}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Richiedi un preventivo personalizzato basato su questo pacchetto. Ti contatteremo al più presto!
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}