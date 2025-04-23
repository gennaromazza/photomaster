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
import { GoogleCalendarIntegration } from "@/components/settings/google-calendar-integration";

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
          <TabsTrigger value="emails">Email</TabsTrigger>
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
        
        <TabsContent value="emails">
          <Card>
            <CardHeader>
              <CardTitle>Template Email</CardTitle>
              <CardDescription>
                Personalizza i template per le email automatiche inviate dal sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Email di Conferma Preventivo</h3>
                  <div className="rounded-md border border-muted p-4 mb-4 bg-muted/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <p className="text-sm font-medium">Email inviata al cliente dopo la firma di un preventivo</p>
                    </div>
                    <Textarea 
                      id="emailQuoteSignedClient"
                      className="min-h-32 font-mono text-sm"
                      placeholder="Gentile {cliente_nome}, grazie per aver confermato il preventivo '{preventivo_titolo}'..."
                      defaultValue={settings?.emailQuoteSignedClient || `Gentile {cliente_nome},

Grazie per aver firmato il preventivo "{preventivo_titolo}".

Confermiamo di aver ricevuto la tua accettazione e procederemo con l'organizzazione del servizio fotografico.
Ti contatteremo a breve per definire tutti i dettagli.

Cordiali saluti,
{studio_nome}
{studio_telefono}
{studio_email}`}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Variabili disponibili: {'{cliente_nome}'}, {'{preventivo_titolo}'}, {'{studio_nome}'}, {'{studio_email}'}, {'{studio_telefono}'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Notifica Amministratore per Firma Preventivo</h3>
                  <div className="rounded-md border border-muted p-4 mb-4 bg-muted/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <p className="text-sm font-medium">Email inviata all'amministratore quando un cliente firma un preventivo</p>
                    </div>
                    <Textarea 
                      id="emailQuoteSignedAdmin"
                      className="min-h-32 font-mono text-sm"
                      placeholder="Nuovo preventivo firmato da {cliente_nome}..."
                      defaultValue={settings?.emailQuoteSignedAdmin || `Nuovo preventivo firmato!

Il preventivo "{preventivo_titolo}" è stato firmato da {cliente_nome}.

Dettagli:
- Cliente: {cliente_nome}
- Preventivo: {preventivo_titolo}
- Data firma: {data_firma}
- Firma: {firma}

Accedi alla piattaforma per visualizzare tutti i dettagli.`}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Variabili disponibili: {'{cliente_nome}'}, {'{preventivo_titolo}'}, {'{data_firma}'}, {'{firma}'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Notifica Registrazione Utente</h3>
                  <div className="rounded-md border border-muted p-4 mb-4 bg-muted/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <p className="text-sm font-medium">Email inviata all'amministratore quando un nuovo utente si registra</p>
                    </div>
                    <Textarea 
                      id="emailRegistrationNotification"
                      className="min-h-32 font-mono text-sm"
                      placeholder="Nuovo utente registrato: {utente_nome}..."
                      defaultValue={settings?.emailRegistrationNotification || `Nuovo utente registrato!

Un nuovo utente si è registrato alla piattaforma.

Dettagli:
- Nome: {utente_nome}
- Email: {utente_email}
- Username: {utente_username}

Accedi alla piattaforma per approvare o rifiutare questa registrazione.`}
                    />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Notifica Approvazione Account</h3>
                  <div className="rounded-md border border-muted p-4 mb-4 bg-muted/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <p className="text-sm font-medium">Email inviata all'utente quando il suo account viene approvato</p>
                    </div>
                    <Textarea 
                      id="emailApprovalNotification"
                      className="min-h-32 font-mono text-sm"
                      placeholder="Gentile {utente_nome}, il tuo account è stato approvato..."
                      defaultValue={settings?.emailApprovalNotification || `Gentile {utente_nome},

Siamo lieti di informarti che il tuo account è stato approvato!

Ora puoi accedere alla piattaforma utilizzando le tue credenziali.

Studio {studio_nome}
{studio_email}
{studio_telefono}`}
                    />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Notifica Disabilitazione Account</h3>
                  <div className="rounded-md border border-muted p-4 mb-4 bg-muted/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <p className="text-sm font-medium">Email inviata all'utente quando il suo account viene disabilitato</p>
                    </div>
                    <Textarea 
                      id="emailDisabledNotification"
                      className="min-h-32 font-mono text-sm"
                      placeholder="Gentile {utente_nome}, il tuo account è stato disabilitato..."
                      defaultValue={settings?.emailDisabledNotification || `Gentile {utente_nome},

Ti informiamo che il tuo account è stato temporaneamente disabilitato.

Per maggiori informazioni, contatta l'amministratore della piattaforma.

Studio {studio_nome}
{studio_email}
{studio_telefono}`}
                    />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Notifica Reset Password</h3>
                  <div className="rounded-md border border-muted p-4 bg-muted/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <p className="text-sm font-medium">Email inviata all'utente per il reset della password</p>
                    </div>
                    <Textarea 
                      id="emailPasswordReset"
                      className="min-h-32 font-mono text-sm"
                      placeholder="Gentile {utente_nome}, ecco il link per resettare la tua password..."
                      defaultValue={settings?.emailPasswordReset || `Gentile {utente_nome},

Abbiamo ricevuto una richiesta di reset della password per il tuo account.

Per procedere con il reset della password, clicca sul seguente link:
{reset_url}

Se non hai richiesto questo reset, ignora questa email.

Il link scadrà tra 4 ore.

Cordiali saluti,
Studio {studio_nome}`}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={() => {
                  const data = {
                    emailQuoteSignedClient: (document.getElementById('emailQuoteSignedClient') as HTMLTextAreaElement)?.value,
                    emailQuoteSignedAdmin: (document.getElementById('emailQuoteSignedAdmin') as HTMLTextAreaElement)?.value,
                    emailRegistrationNotification: (document.getElementById('emailRegistrationNotification') as HTMLTextAreaElement)?.value,
                    emailApprovalNotification: (document.getElementById('emailApprovalNotification') as HTMLTextAreaElement)?.value,
                    emailDisabledNotification: (document.getElementById('emailDisabledNotification') as HTMLTextAreaElement)?.value,
                    emailPasswordReset: (document.getElementById('emailPasswordReset') as HTMLTextAreaElement)?.value,
                  };
                  updateSettingsMutation.mutate(data);
                }}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? (
                  <span className="flex items-center">
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Salvataggio...
                  </span>
                ) : "Salva Template Email"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="config">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Integrazioni */}
            <GoogleCalendarIntegration />
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
            
            <Card>
              <CardHeader>
                <CardTitle>Clausole Contrattuali</CardTitle>
                <CardDescription>
                  Gestione delle clausole per preventivi e contratti
                </CardDescription>
              </CardHeader>
              <CardContent className="prose">
                <p>
                  Crea e gestisci le clausole legali che verranno incluse nei tuoi preventivi e contratti.
                  Puoi personalizzare quali clausole sono obbligatorie e associarle a categorie di servizi.
                </p>
                <ul className="mt-4">
                  <li>Clausole personalizzate per tipo di servizio</li>
                  <li>Testo formattato per maggiore chiarezza</li>
                  <li>Ordina e organizza per importanza</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <a href="/clauses">Gestisci Clausole</a>
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Filigrana Preventivi</CardTitle>
                <CardDescription>
                  Personalizza la filigrana dei preventivi condivisi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="watermark-text">Testo Filigrana</Label>
                    <Input 
                      id="watermark-text" 
                      placeholder="ImageStudio" 
                      defaultValue={
                        (settings?.additionalSettings as any)?.watermark?.text || 
                        settings?.companyName || 
                        "ImageStudio"
                      }
                      onChange={(e) => {
                        const currentSettings = settings?.additionalSettings || {};
                        const watermarkSettings = (currentSettings as any)?.watermark || {};
                        
                        updateSettingsMutation.mutate({
                          additionalSettings: {
                            ...currentSettings,
                            watermark: {
                              ...watermarkSettings,
                              text: e.target.value
                            }
                          }
                        });
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Testo che apparirà come filigrana nei preventivi condivisi
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="watermark-opacity">Opacità</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          id="watermark-opacity" 
                          type="range" 
                          min="1" 
                          max="20" 
                          defaultValue={
                            ((settings?.additionalSettings as any)?.watermark?.opacity || 0.07) * 100
                          }
                          onChange={(e) => {
                            const currentSettings = settings?.additionalSettings || {};
                            const watermarkSettings = (currentSettings as any)?.watermark || {};
                            const opacityValue = Number(e.target.value) / 100;
                            
                            updateSettingsMutation.mutate({
                              additionalSettings: {
                                ...currentSettings,
                                watermark: {
                                  ...watermarkSettings,
                                  opacity: opacityValue
                                }
                              }
                            });
                          }}
                        />
                        <span className="text-sm">
                          {Math.round(((settings?.additionalSettings as any)?.watermark?.opacity || 0.07) * 100)}%
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="watermark-rotation">Rotazione</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          id="watermark-rotation" 
                          type="range" 
                          min="-45" 
                          max="45" 
                          defaultValue={
                            (settings?.additionalSettings as any)?.watermark?.rotate || -30
                          }
                          onChange={(e) => {
                            const currentSettings = settings?.additionalSettings || {};
                            const watermarkSettings = (currentSettings as any)?.watermark || {};
                            
                            updateSettingsMutation.mutate({
                              additionalSettings: {
                                ...currentSettings,
                                watermark: {
                                  ...watermarkSettings,
                                  rotate: Number(e.target.value)
                                }
                              }
                            });
                          }}
                        />
                        <span className="text-sm">
                          {(settings?.additionalSettings as any)?.watermark?.rotate || -30}°
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Posizione Filigrana</Label>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <div 
                        className={`border rounded-md p-2 text-center cursor-pointer hover:border-primary transition-colors ${
                          ((settings?.additionalSettings as any)?.watermark?.position || "center") === "top" 
                            ? "border-primary bg-primary/5" 
                            : ""
                        }`}
                        onClick={() => {
                          const currentSettings = settings?.additionalSettings || {};
                          const watermarkSettings = (currentSettings as any)?.watermark || {};
                          
                          updateSettingsMutation.mutate({
                            additionalSettings: {
                              ...currentSettings,
                              watermark: {
                                ...watermarkSettings,
                                position: "top"
                              }
                            }
                          });
                        }}
                      >
                        Alto
                      </div>
                      <div 
                        className={`border rounded-md p-2 text-center cursor-pointer hover:border-primary transition-colors ${
                          ((settings?.additionalSettings as any)?.watermark?.position || "center") === "center" 
                            ? "border-primary bg-primary/5" 
                            : ""
                        }`}
                        onClick={() => {
                          const currentSettings = settings?.additionalSettings || {};
                          const watermarkSettings = (currentSettings as any)?.watermark || {};
                          
                          updateSettingsMutation.mutate({
                            additionalSettings: {
                              ...currentSettings,
                              watermark: {
                                ...watermarkSettings,
                                position: "center"
                              }
                            }
                          });
                        }}
                      >
                        Centro
                      </div>
                      <div 
                        className={`border rounded-md p-2 text-center cursor-pointer hover:border-primary transition-colors ${
                          ((settings?.additionalSettings as any)?.watermark?.position || "center") === "bottom" 
                            ? "border-primary bg-primary/5" 
                            : ""
                        }`}
                        onClick={() => {
                          const currentSettings = settings?.additionalSettings || {};
                          const watermarkSettings = (currentSettings as any)?.watermark || {};
                          
                          updateSettingsMutation.mutate({
                            additionalSettings: {
                              ...currentSettings,
                              watermark: {
                                ...watermarkSettings,
                                position: "bottom"
                              }
                            }
                          });
                        }}
                      >
                        Basso
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="border rounded-md p-4 relative overflow-hidden bg-muted/20 h-40">
                      <div className="text-center text-sm text-muted-foreground mb-2">Anteprima</div>
                      <div className="relative h-full bg-white rounded-sm p-2">
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-primary/10">
                          Contenuto Preventivo
                        </div>
                        {/* Miniatura della filigrana */}
                        <div className={`absolute inset-0 flex ${
                          ((settings?.additionalSettings as any)?.watermark?.position || "center") === "top" 
                            ? "items-start pt-4" 
                            : ((settings?.additionalSettings as any)?.watermark?.position || "center") === "bottom"
                              ? "items-end pb-4" 
                              : "items-center"
                        } justify-center overflow-hidden pointer-events-none`}>
                          <div 
                            className="whitespace-nowrap mx-4 font-bold"
                            style={{
                              opacity: (settings?.additionalSettings as any)?.watermark?.opacity || 0.07,
                              color: "var(--primary)",
                              transform: `rotate(${(settings?.additionalSettings as any)?.watermark?.rotate || -30}deg)`,
                              fontSize: "1.2rem"
                            }}
                          >
                            {(settings?.additionalSettings as any)?.watermark?.text || settings?.companyName || "ImageStudio"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <div className="text-xs text-muted-foreground w-full text-center">
                  Le modifiche vengono salvate automaticamente
                </div>
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
