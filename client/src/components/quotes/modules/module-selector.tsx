import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { X, LayoutGrid, Layers } from 'lucide-react';

interface ModuleSelectorProps {
  onSelect: (type: 'fixed' | 'variable') => void;
  onCancel: () => void;
}

/**
 * Componente per selezionare il tipo di modulo da creare
 * Responsabilità: Permettere all'utente di scegliere tra modulo fisso o variabile
 */
export default function ModuleSelector({ onSelect, onCancel }: ModuleSelectorProps) {
  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute right-0 top-0 z-10" 
        onClick={onCancel}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium">Seleziona tipo di modulo</h3>
        <p className="text-sm text-muted-foreground">
          Scegli il tipo di modulo che desideri aggiungere al preventivo
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className="p-6 border-2 hover:border-primary/60 cursor-pointer transition-all"
          onClick={() => onSelect('fixed')}
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <LayoutGrid className="h-6 w-6 text-primary" />
            </div>
            <h4 className="text-base font-semibold mb-2">Modulo Fisso</h4>
            <p className="text-sm text-muted-foreground">
              Crea un pacchetto predefinito con servizi e prodotti selezionati da te.
              Il cliente non può modificare queste selezioni.
            </p>
            <Separator className="my-4" />
            <ul className="text-sm space-y-2 text-left w-full">
              <li className="flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-primary mr-2"></span>
                Ideale per pacchetti standard
              </li>
              <li className="flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-primary mr-2"></span>
                Prodotti e servizi predeterminati
              </li>
              <li className="flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-primary mr-2"></span>
                Prezzi fissi e sconti predefiniti
              </li>
            </ul>
          </div>
        </Card>
        
        <Card 
          className="p-6 border-2 hover:border-primary/60 cursor-pointer transition-all"
          onClick={() => onSelect('variable')}
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <h4 className="text-base font-semibold mb-2">Modulo Variabile</h4>
            <p className="text-sm text-muted-foreground">
              Offri al cliente diverse opzioni tra cui scegliere.
              Il cliente selezionerà le opzioni preferite dalla pagina di preventivo condivisa.
            </p>
            <Separator className="my-4" />
            <ul className="text-sm space-y-2 text-left w-full">
              <li className="flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-primary mr-2"></span>
                Permette al cliente di personalizzare
              </li>
              <li className="flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-primary mr-2"></span>
                Opzioni multiple con limiti di selezione
              </li>
              <li className="flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-primary mr-2"></span>
                Ideale per configurare pacchetti flessibili
              </li>
            </ul>
          </div>
        </Card>
      </div>
      
      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={onCancel}>
          Annulla
        </Button>
      </div>
    </div>
  );
}