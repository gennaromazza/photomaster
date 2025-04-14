import React from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BoxSelect, ArrowRightIcon } from "lucide-react";

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
  onSelectModuleType
}: ModuleSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">Scegli il tipo di modulo</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          I moduli ti permettono di organizzare i prodotti e servizi in gruppi logici 
          nel preventivo, e possono essere fissi (scelti da te) o variabili (con opzioni tra cui il cliente può scegliere).
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onSelectModuleType("fixed")}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary/70" />
              <CardTitle>Modulo Fisso</CardTitle>
            </div>
            <CardDescription>
              Includi servizi e prodotti fissi che hai selezionato per il cliente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
                <div className="font-medium">Ideale per:</div>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Servizi obbligatori che vuoi includere in ogni preventivo</li>
                  <li>Pacchetti predefiniti con sconti</li>
                  <li>Prodotti o servizi che devono essere inclusi insieme</li>
                </ul>
              </div>
              
              <Button className="w-full" onClick={() => onSelectModuleType("fixed")}>
                <FileText className="mr-2 h-4 w-4" />
                Crea Modulo Fisso
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onSelectModuleType("variable")}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BoxSelect className="h-6 w-6 text-primary/70" />
              <CardTitle>Modulo Variabile</CardTitle>
            </div>
            <CardDescription>
              Offri al cliente diverse opzioni tra cui scegliere in ciascuna categoria.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
                <div className="font-medium">Ideale per:</div>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Dare al cliente la libertà di personalizzare il servizio</li>
                  <li>Offrire opzioni di diversa qualità o prezzo</li>
                  <li>Organizzare le selezioni in categorie logiche</li>
                </ul>
              </div>
              
              <Button className="w-full" onClick={() => onSelectModuleType("variable")}>
                <BoxSelect className="mr-2 h-4 w-4" />
                Crea Modulo Variabile
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}