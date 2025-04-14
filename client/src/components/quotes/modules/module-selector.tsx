import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Package, Layers, Lock, BookOpen, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DialogFooter } from "@/components/ui/dialog";

// Interfacce base
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

interface ModuleSelectorProps {
  onSelectModuleType: (type: "fixed" | "variable") => void;
}

/**
 * Componente per selezionare e creare nuovi moduli
 * Responsabilità: 
 * - Mostrare le opzioni di moduli disponibili
 * - Spiegare all'utente la differenza tra moduli fissi e variabili
 * - Raccogliere la selezione dell'utente e richiamare la funzione per creare un nuovo modulo
 */
export default function ModuleSelector({
  onSelectModuleType,
}: ModuleSelectorProps) {

  const { data: services = [], isLoading: isLoadingServices, error: servicesError } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    staleTime: 30000,
    retry: 2
  });

  const { data: products = [], isLoading: isLoadingProducts, error: productsError } = useQuery<Product[]>({
    queryKey: ["/api/products"], 
    staleTime: 30000,
    retry: 2
  });

  // Gestione errori e loading
  if (servicesError || productsError) {
    return (
      <div className="text-red-500 p-4 text-center">
        Errore nel caricamento dei dati. Riprova più tardi.
      </div>
    );
  }

  if (isLoadingServices || isLoadingProducts) {
    return <div className="p-4 text-center">Caricamento dati...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium">Scegli il tipo di modulo</h2>
      
      <Tabs defaultValue="fixed" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fixed">
            <Lock className="h-4 w-4 mr-2" />
            Modulo Fisso
          </TabsTrigger>
          <TabsTrigger value="variable">
            <BookOpen className="h-4 w-4 mr-2" />
            Modulo Variabile
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="fixed" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-4">
              <h3 className="text-base font-semibold">Cos'è un Modulo Fisso?</h3>
              <p className="text-sm text-muted-foreground">
                I moduli fissi contengono servizi e prodotti predefiniti che il cliente non può modificare.
                Sono perfetti per pacchetti standard, dove sei tu a decidere esattamente cosa è incluso.
              </p>
              
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-primary" />
                      Pacchetti predefiniti
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 text-xs text-muted-foreground">
                    Crea pacchetti all-inclusive con servizi e prodotti fissi
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Package className="h-4 w-4 mr-2 text-primary" />
                      Preventivi chiari
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 text-xs text-muted-foreground">
                    Il cliente vede esattamente cosa è incluso e a quale prezzo
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div>
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-2">
                  <Badge variant="secondary" className="mb-2 w-fit">
                    <Lock className="h-3 w-3 mr-1" />
                    Fisso
                  </Badge>
                  <CardTitle className="text-base">Pacchetto Base</CardTitle>
                  <CardDescription className="text-xs">
                    Esempio di modulo fisso
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3 text-xs grow">
                  <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                    <li>Servizio fotografico (4 ore)</li>
                    <li>100 foto post-prodotte</li>
                    <li>Album digitale</li>
                    <li>Backup su cloud</li>
                  </ul>
                </CardContent>
                <CardFooter className="border-t text-sm pt-3">
                  <div className="w-full flex justify-between">
                    <span className="text-muted-foreground">Prezzo</span>
                    <span className="font-medium">€ 1.200,00</span>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
          
          <div className="bg-muted/40 p-3 rounded-md flex items-start space-x-2 text-sm">
            <div className="text-primary font-medium min-w-[130px]">Guida fotografo:</div>
            <div className="text-muted-foreground">
              Crea un modulo fisso per ogni pacchetto standard che offri, ad esempio "Pacchetto Base", "Pacchetto Premium", ecc.
              Indica chiaramente cosa include ogni pacchetto e il prezzo totale. Puoi applicare uno sconto all'intero modulo.
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => onSelectModuleType("fixed")}
              className="w-full sm:w-auto"
            >
              Crea Modulo Fisso
            </Button>
          </DialogFooter>
        </TabsContent>

        <TabsContent value="variable" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-4">
              <h3 className="text-base font-semibold">Cos'è un Modulo Variabile?</h3>
              <p className="text-sm text-muted-foreground">
                I moduli variabili offrono opzioni tra cui il cliente può scegliere.
                Puoi creare diverse categorie di selezione e per ognuna definire
                quali opzioni il cliente può selezionare.
              </p>
              
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Layers className="h-4 w-4 mr-2 text-primary" />
                      Personalizzazione
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 text-xs text-muted-foreground">
                    Il cliente personalizza il preventivo scegliendo tra le opzioni che definisci
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <BookOpen className="h-4 w-4 mr-2 text-primary" />
                      Interattività
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 text-xs text-muted-foreground">
                    Coinvolgi il cliente nel processo di personalizzazione del servizio
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div>
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-2">
                  <Badge variant="outline" className="mb-2 w-fit">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Variabile
                  </Badge>
                  <CardTitle className="text-base">Album Personalizzato</CardTitle>
                  <CardDescription className="text-xs">
                    Esempio di modulo variabile
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3 text-xs grow">
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">Formato Album:</p>
                      <ul className="list-disc list-inside text-muted-foreground ml-2">
                        <li>30x30 cm <span className="text-primary">✓</span></li>
                        <li>25x25 cm</li>
                        <li>20x20 cm</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">Numero Pagine:</p>
                      <ul className="list-disc list-inside text-muted-foreground ml-2">
                        <li>40 pagine <span className="text-primary">✓</span></li>
                        <li>60 pagine</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t text-sm pt-3">
                  <div className="w-full flex justify-between">
                    <span className="text-muted-foreground">Prezzo</span>
                    <span className="font-medium">Variabile</span>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
          
          <div className="bg-muted/40 p-3 rounded-md flex items-start space-x-2 text-sm">
            <div className="text-primary font-medium min-w-[130px]">Guida fotografo:</div>
            <div className="text-muted-foreground">
              Usa i moduli variabili quando vuoi che il cliente scelga tra diverse opzioni.
              Ad esempio, puoi creare un modulo "Album" e far scegliere al cliente il formato, la copertina e il numero di pagine.
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => onSelectModuleType("variable")}
              className="w-full sm:w-auto"
            >
              Crea Modulo Variabile
            </Button>
          </DialogFooter>
        </TabsContent>
      </Tabs>
    </div>
  );
}