import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, FileInput, ListChecks, Lightbulb, Users, Pointer } from "lucide-react";

interface ModuleSelectorProps {
  onSelectModuleType: (type: "fixed" | "variable") => void;
}

/**
 * Componente per la selezione del tipo di modulo da creare
 * Responsabilità: Permettere all'utente di scegliere se creare un modulo fisso o variabile
 */
export default function ModuleSelector({ onSelectModuleType }: ModuleSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-xl font-medium mb-2">Seleziona Tipo di Modulo</h3>
        <p className="text-muted-foreground max-w-lg mx-auto">
          I moduli ti permettono di organizzare servizi e prodotti in gruppi logici, 
          rendendoli più facili da gestire e da presentare al cliente.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Modulo Fisso */}
        <Card className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => onSelectModuleType("fixed")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Package className="mr-2 h-5 w-5 text-primary/80" />
              Modulo Fisso
            </CardTitle>
            <CardDescription>
              Servizi e prodotti selezionati da te
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm">
                <p>
                  Un modulo fisso include servizi e prodotti specifici, selezionati
                  dal fotografo, che saranno sempre inclusi nel preventivo.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="flex items-start">
                  <div className="bg-primary/10 p-1.5 rounded-full mr-2 mt-0.5">
                    <FileInput className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-xs">
                    <p className="font-medium">Predefinito</p>
                    <p className="text-muted-foreground">Selezione fissa di servizi</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-primary/10 p-1.5 rounded-full mr-2 mt-0.5">
                    <ListChecks className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-xs">
                    <p className="font-medium">Non modificabile</p>
                    <p className="text-muted-foreground">Dal cliente</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center mt-4 pt-2">
                <Button onClick={() => onSelectModuleType("fixed")}>
                  Crea Modulo Fisso
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Modulo Variabile */}
        <Card className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => onSelectModuleType("variable")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary/80" />
              Modulo Variabile
            </CardTitle>
            <CardDescription>
              Opzioni selezionabili dal cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm">
                <p>
                  Un modulo variabile offre al cliente opzioni tra cui scegliere,
                  permettendogli di personalizzare il preventivo in base alle sue esigenze.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="flex items-start">
                  <div className="bg-primary/10 p-1.5 rounded-full mr-2 mt-0.5">
                    <Pointer className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-xs">
                    <p className="font-medium">Scelta Cliente</p>
                    <p className="text-muted-foreground">Opzioni personalizzabili</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-primary/10 p-1.5 rounded-full mr-2 mt-0.5">
                    <Lightbulb className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-xs">
                    <p className="font-medium">Interattivo</p>
                    <p className="text-muted-foreground">Configurabile online</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center mt-4 pt-2">
                <Button onClick={() => onSelectModuleType("variable")} variant="secondary">
                  Crea Modulo Variabile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="py-4 text-sm text-center text-muted-foreground">
        <p>
          <span className="font-medium">Suggerimento:</span> Per un preventivo 
          standard, inizia con un modulo fisso per i servizi principali, e aggiungi 
          moduli variabili per le opzioni extra.
        </p>
      </div>
    </div>
  );
}