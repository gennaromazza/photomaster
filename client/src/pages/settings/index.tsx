import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Settings } from "@shared/schema";
import { z } from "zod";

const generalSettingsSchema = z.object({
  companyName: z.string().min(1, "Il nome dell'azienda è obbligatorio"),
  companyEmail: z.string().email("Inserisci un indirizzo email valido"),
  companyPhone: z.string().optional(),
  companyAddress: z.string().optional(),
  colorTheme: z.string().default("default"),
});

const SettingsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });
  
  const generalForm = useForm<z.infer<typeof generalSettingsSchema>>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      companyName: settings?.companyName || "",
      companyEmail: settings?.companyEmail || "",
      companyPhone: settings?.companyPhone || "",
      companyAddress: settings?.companyAddress || "",
      colorTheme: settings?.colorTheme || "default",
    },
    values: {
      companyName: settings?.companyName || "",
      companyEmail: settings?.companyEmail || "",
      companyPhone: settings?.companyPhone || "",
      companyAddress: settings?.companyAddress || "",
      colorTheme: settings?.colorTheme || "default",
    },
  });
  
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<Settings>) => {
      const response = await apiRequest("PUT", "/api/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni sono state aggiornate con successo.",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio delle impostazioni.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmitGeneral = (data: z.infer<typeof generalSettingsSchema>) => {
    updateSettingsMutation.mutate(data);
  };
  
  if (isLoading) {
    return (
      <div className="lg:px-8 px-4 mt-6 lg:mt-8 flex justify-center">
        <div className="animate-pulse text-gray-500">Caricamento impostazioni...</div>
      </div>
    );
  }
  
  return (
    <div className="lg:px-8 px-4 mt-6 lg:mt-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-gray-900">Impostazioni</h1>
          <p className="mt-1 text-gray-500">Personalizza la tua applicazione</p>
        </div>
      </div>
      
      <Tabs defaultValue="general" className="max-w-4xl">
        <TabsList className="mb-8">
          <TabsTrigger value="general">Generali</TabsTrigger>
          <TabsTrigger value="templates">Template</TabsTrigger>
          <TabsTrigger value="services">Servizi & Prodotti</TabsTrigger>
          <TabsTrigger value="config">Configurazioni</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Form {...generalForm}>
            <form onSubmit={generalForm.handleSubmit(onSubmitGeneral)}>
              <Card>
                <CardHeader>
                  <CardTitle>Informazioni Azienda</CardTitle>
                  <CardDescription>
                    Queste informazioni verranno mostrate nei documenti e nelle comunicazioni con i clienti.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={generalForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Studio</FormLabel>
                        <FormControl>
                          <Input placeholder="Studio Arté" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={generalForm.control}
                    name="companyEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="info@studioarte.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={generalForm.control}
                    name="companyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono</FormLabel>
                        <FormControl>
                          <Input placeholder="+39 02 1234567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={generalForm.control}
                    name="companyAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Indirizzo</FormLabel>
                        <FormControl>
                          <Input placeholder="Via della Fotografia 42, Milano" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium mb-4">Aspetto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-md p-4 cursor-pointer hover:border-primary transition-colors">
                        <div className="h-20 bg-[#3F4F78] rounded-md mb-2"></div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="default-theme">Predefinito</Label>
                          <input 
                            type="radio" 
                            id="default-theme" 
                            value="default" 
                            checked={generalForm.watch("colorTheme") === "default"}
                            onChange={() => generalForm.setValue("colorTheme", "default")}
                          />
                        </div>
                      </div>
                      
                      <div className="border rounded-md p-4 cursor-pointer hover:border-primary transition-colors">
                        <div className="h-20 bg-[#896A50] rounded-md mb-2"></div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="brown-theme">Marrone Elegante</Label>
                          <input 
                            type="radio" 
                            id="brown-theme" 
                            value="brown" 
                            checked={generalForm.watch("colorTheme") === "brown"}
                            onChange={() => generalForm.setValue("colorTheme", "brown")}
                          />
                        </div>
                      </div>
                      
                      <div className="border rounded-md p-4 cursor-pointer hover:border-primary transition-colors">
                        <div className="h-20 bg-[#486B5F] rounded-md mb-2"></div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="green-theme">Verde Natura</Label>
                          <input 
                            type="radio" 
                            id="green-theme" 
                            value="green" 
                            checked={generalForm.watch("colorTheme") === "green"}
                            onChange={() => generalForm.setValue("colorTheme", "green")}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? (
                      <span className="flex items-center">
                        <i className="ri-loader-4-line animate-spin mr-2"></i>
                        Salvataggio...
                      </span>
                    ) : "Salva Modifiche"}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </TabsContent>
        
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Template Documenti</CardTitle>
              <CardDescription>
                Personalizza i template per contratti e preventivi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="contract-template">Template Contratto</Label>
                <Textarea 
                  id="contract-template"
                  className="mt-2 min-h-48 font-mono text-sm"
                  placeholder="Inserisci il template per i contratti..."
                  defaultValue={settings?.contractTemplate || ""}
                />
                <p className="text-sm text-gray-500 mt-2">
                  Utilizza le variabili come {'{cliente_nome}'}, {'{evento_data}'}, ecc.
                </p>
              </div>
              
              <div>
                <Label htmlFor="quote-template">Template Preventivo</Label>
                <Textarea 
                  id="quote-template"
                  className="mt-2 min-h-48 font-mono text-sm"
                  placeholder="Inserisci il template per i preventivi..."
                  defaultValue={settings?.quoteTemplate || ""}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="auto-email" />
                <Label htmlFor="auto-email">Invia automaticamente email quando crei un nuovo documento</Label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>Salva Template</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Servizi e Prodotti</CardTitle>
              <CardDescription>
                Gestisci i servizi e prodotti che offri ai clienti.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-medium">Servizi</h3>
                <Button variant="outline">
                  <i className="ri-add-line mr-2"></i>
                  Nuovo Servizio
                </Button>
              </div>
              
              <div className="border rounded-md">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Pacchetto Matrimonio Standard</h4>
                      <p className="text-sm text-gray-500">Servizio fotografico completo per matrimonio, 8 ore di copertura</p>
                    </div>
                    <div className="font-medium">€1.800,00</div>
                  </div>
                </div>
                
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Pacchetto Matrimonio Premium</h4>
                      <p className="text-sm text-gray-500">Servizio fotografico e video completo per matrimonio, 12 ore di copertura</p>
                    </div>
                    <div className="font-medium">€2.800,00</div>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Album Fotografico 30x30</h4>
                      <p className="text-sm text-gray-500">Album fotografico di alta qualità, 30 pagine</p>
                    </div>
                    <div className="font-medium">€350,00</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="taxRate">Aliquota IVA (%)</Label>
                  <Input 
                    id="taxRate" 
                    className="w-20" 
                    type="number" 
                    defaultValue={settings?.taxRate || 22} 
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>Salva Modifiche</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="config">
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Categorie Servizi</CardTitle>
                <CardDescription>
                  Gestione delle categorie per servizi ed eventi
                </CardDescription>
              </CardHeader>
              <CardContent className="prose">
                <p>
                  Crea e gestisci le categorie che verranno utilizzate per classificare i tuoi servizi.
                  Le categorie possono essere utilizzate per organizzare i servizi, filtrare gli eventi e
                  generare statistiche.
                </p>
                <ul className="mt-4">
                  <li>Assegna colori personalizzati</li>
                  <li>Imposta lo stato attivo/inattivo</li>
                  <li>Aggiungi descrizioni dettagliate</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <a href="/settings/categories">Gestisci Categorie</a>
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Origini Lead</CardTitle>
                <CardDescription>
                  Gestione delle fonti di acquisizione clienti
                </CardDescription>
              </CardHeader>
              <CardContent className="prose">
                <p>
                  Configura le diverse origini da cui provengono i tuoi clienti e lead.
                  Traccia l'efficacia dei tuoi canali di marketing e ottimizza la tua strategia commerciale.
                </p>
                <ul className="mt-4">
                  <li>Social media, fiere, passaparola</li>
                  <li>Imposta lo stato attivo/inattivo</li>
                  <li>Monitora le conversioni per origine</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <a href="/settings/origins">Gestisci Origini</a>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Il tuo Account</CardTitle>
              <CardDescription>
                Gestisci le impostazioni del tuo account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-medium">
                  MR
                </div>
                <div>
                  <h3 className="font-medium">Marco Rossi</h3>
                  <p className="text-sm text-gray-500">admin@example.com</p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" className="mt-2" defaultValue="admin@example.com" />
              </div>
              
              <div>
                <Label htmlFor="password">Nuova Password</Label>
                <Input id="password" type="password" className="mt-2" />
              </div>
              
              <div>
                <Label htmlFor="confirm-password">Conferma Password</Label>
                <Input id="confirm-password" type="password" className="mt-2" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                Esci
              </Button>
              <Button>Aggiorna Account</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
