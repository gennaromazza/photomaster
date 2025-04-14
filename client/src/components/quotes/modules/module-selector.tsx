import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Package, ListChecks, ArrowLeft } from "lucide-react";

interface ModuleSelectorProps {
  onSelectModuleType: (type: "fixed" | "variable") => void;
}

/**
 * Componente per selezionare il tipo di modulo da creare
 * Responsabilità:
 * - Mostrare le opzioni di modulo disponibili (fisso o variabile)
 * - Permettere all'utente di selezionare un tipo di modulo
 */
export default function ModuleSelector({ onSelectModuleType }: ModuleSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-medium">Seleziona Tipo di Modulo</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card 
          className="cursor-pointer border-primary/20 hover:border-primary transition-colors"
          onClick={() => onSelectModuleType("fixed")}
        >
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5 text-primary" />
              Modulo Fisso
            </CardTitle>
            <CardDescription>
              Insieme predefinito di servizi o prodotti scelti da te
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="rounded-full h-5 w-5 bg-primary/10 text-primary flex items-center justify-center text-xs mr-2 mt-0.5">
                  ✓
                </span>
                <span>Tu selezioni esattamente cosa includere nel modulo</span>
              </li>
              <li className="flex items-start">
                <span className="rounded-full h-5 w-5 bg-primary/10 text-primary flex items-center justify-center text-xs mr-2 mt-0.5">
                  ✓
                </span>
                <span>Il cliente non può modificare le selezioni</span>
              </li>
              <li className="flex items-start">
                <span className="rounded-full h-5 w-5 bg-primary/10 text-primary flex items-center justify-center text-xs mr-2 mt-0.5">
                  ✓
                </span>
                <span>Ideale per offerte predefinite e pacchetti standard</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="pt-2 pb-4">
            <Button className="w-full" onClick={() => onSelectModuleType("fixed")}>
              Crea Modulo Fisso
            </Button>
          </CardFooter>
        </Card>
        
        <Card 
          className="cursor-pointer border-primary/20 hover:border-primary transition-colors"
          onClick={() => onSelectModuleType("variable")}
        >
          <CardHeader>
            <CardTitle className="flex items-center">
              <ListChecks className="mr-2 h-5 w-5 text-primary" />
              Modulo Variabile
            </CardTitle>
            <CardDescription>
              Opzioni tra cui il cliente può scegliere
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="rounded-full h-5 w-5 bg-primary/10 text-primary flex items-center justify-center text-xs mr-2 mt-0.5">
                  ✓
                </span>
                <span>Crei gruppi di opzioni tra cui il cliente può scegliere</span>
              </li>
              <li className="flex items-start">
                <span className="rounded-full h-5 w-5 bg-primary/10 text-primary flex items-center justify-center text-xs mr-2 mt-0.5">
                  ✓
                </span>
                <span>Puoi definire limiti minimi e massimi di selezioni</span>
              </li>
              <li className="flex items-start">
                <span className="rounded-full h-5 w-5 bg-primary/10 text-primary flex items-center justify-center text-xs mr-2 mt-0.5">
                  ✓
                </span>
                <span>Ideale per personalizzazioni e opzioni aggiuntive</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="pt-2 pb-4">
            <Button className="w-full" onClick={() => onSelectModuleType("variable")}>
              Crea Modulo Variabile
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="pt-4">
        <Button 
          variant="ghost" 
          className="px-0"
          onClick={() => onSelectModuleType("fixed")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Indietro alla lista moduli
        </Button>
      </div>
    </div>
  );
}