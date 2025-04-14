import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, BookOpen, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Service, Product } from "@/types"; // Assuming these types are defined elsewhere

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
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Aggiungi Modulo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Aggiungi Nuovo Modulo</DialogTitle>
          <DialogDescription>
            I moduli ti aiutano a organizzare i preventivi in sezioni logiche
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Tabs defaultValue="fixed" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="fixed" className="flex items-center">
                <Lock className="h-4 w-4 mr-2" />
                Modulo Fisso
              </TabsTrigger>
              <TabsTrigger value="variable" className="flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                Modulo Variabile
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fixed" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-4">
                  <h3 className="text-base font-semibold">Cos'è un Modulo Fisso?</h3>
                  <p className="text-sm text-muted-foreground">
                    I moduli fissi contengono elementi pre-selezionati da te. Questi elementi non
                    possono essere modificati dal cliente e vengono sempre inclusi nel preventivo.
                  </p>

                  <h4 className="text-sm font-medium mt-4">Ideale per:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                    <li>Servizi base sempre inclusi nel pacchetto</li>
                    <li>Prodotti che fai pagare insieme e non separatamente</li>
                    <li>Pacchetti predefiniti con prezzo fisso</li>
                    <li>Elementi obbligatori del servizio</li>
                  </ul>

                  <h4 className="text-sm font-medium mt-4">Vantaggi:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                    <li>Maggiore controllo sui servizi offerti</li>
                    <li>Più semplice da gestire</li>
                    <li>Prezzo preventivato più accurato</li>
                  </ul>
                </div>

                <div className="col-span-1">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <Lock className="h-4 w-4 mr-1 text-primary/70" />
                        Esempio Modulo Fisso
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                      <div className="font-medium">Pacchetto Base</div>
                      <ul className="space-y-1 pl-4 text-muted-foreground">
                        <li>Servizio fotografico (4 ore)</li>
                        <li>50 foto alta risoluzione</li>
                        <li>Album digitale</li>
                        <li>Consegna express</li>
                      </ul>
                      <div className="border-t pt-2 mt-2 font-medium">
                        Il cliente non può modificare questi elementi
                      </div>
                    </CardContent>
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

            <TabsContent value="variable" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-4">
                  <h3 className="text-base font-semibold">Cos'è un Modulo Variabile?</h3>
                  <p className="text-sm text-muted-foreground">
                    I moduli variabili offrono opzioni tra cui il cliente può scegliere.
                    Puoi creare diverse categorie di selezione e per ognuna definire
                    quali opzioni il cliente può selezionare.
                  </p>

                  <h4 className="text-sm font-medium mt-4">Ideale per:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                    <li>Scelta tra diversi formati o materiali per prodotti</li>
                    <li>Opzioni personalizzabili (es. durata servizio, numero foto, ecc.)</li>
                    <li>Extra che il cliente può aggiungere</li>
                    <li>Pacchetti flessibili con elementi opzionali</li>
                  </ul>

                  <h4 className="text-sm font-medium mt-4">Vantaggi:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                    <li>Maggiore personalizzazione per il cliente</li>
                    <li>Upselling facile perché il cliente vede tutte le opzioni</li>
                    <li>Evita di creare molti preventivi diversi per lo stesso cliente</li>
                  </ul>
                </div>

                <div className="col-span-1">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <BookOpen className="h-4 w-4 mr-1 text-primary/70" />
                        Esempio Modulo Variabile
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                      <div className="font-medium">Album di Nozze:</div>
                      <div>
                        <div className="text-muted-foreground mb-1">Dimensione:</div>
                        <ul className="space-y-1 pl-4">
                          <li>☐ 20×30 (base)</li>
                          <li>☑ 25×35 (+€50)</li>
                          <li>☐ 30×40 (+€100)</li>
                        </ul>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Copertina:</div>
                        <ul className="space-y-1 pl-4">
                          <li>☐ Tessuto</li>
                          <li>☑ Ecopelle</li>
                          <li>☐ Pelle (+€75)</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="bg-muted/40 p-3 rounded-md flex items-start space-x-2 text-sm">
                <div className="text-primary font-medium min-w-[130px]">Guida fotografo:</div>
                <div className="text-muted-foreground">
                  Usa i moduli variabili per dare al cliente la possibilità di personalizzare il proprio preventivo.
                  Puoi impostare un'opzione come predefinita in ogni categoria di scelta e stabilire limiti minimi e massimi di selezioni.
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
      </DialogContent>
    </Dialog>
  );
}