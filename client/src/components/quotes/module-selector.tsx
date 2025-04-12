import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

// Interfaccia per le proprietà del componente
interface ModuleSelectorProps {
  quoteId: number;
  onAddModule: (type: 'fixed' | 'variable') => void;
}

export function ModuleSelector({ quoteId, onAddModule }: ModuleSelectorProps) {
  const [activeTab, setActiveTab] = useState<'fixed' | 'variable'>('fixed');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-playfair">Moduli Preventivo</CardTitle>
        <CardDescription>
          Aggiungi moduli fissi o variabili al preventivo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="fixed" onValueChange={(value) => setActiveTab(value as 'fixed' | 'variable')}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="fixed" className="w-1/2">Modulo Fisso</TabsTrigger>
            <TabsTrigger value="variable" className="w-1/2">Modulo Variabile</TabsTrigger>
          </TabsList>
          
          <TabsContent value="fixed">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>I <strong>Moduli Fissi</strong> contengono prodotti e servizi selezionati da te che il cliente non può modificare.</p>
                <p className="mt-2">Utilizza questi moduli per creare proposte personalizzate che devono essere accettate nella loro interezza.</p>
              </div>
              
              <div className="rounded-lg border p-4 bg-muted/20">
                <h4 className="font-medium mb-2">Caratteristiche:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Prodotti e servizi selezionati dallo studio</li>
                  <li>Non modificabili dal cliente</li>
                  <li>Possibilità di applicare sconti specifici</li>
                  <li>Visibili nel preventivo condiviso</li>
                </ul>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="variable">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>I <strong>Moduli Variabili</strong> permettono al cliente di scegliere tra più opzioni attraverso un link dedicato.</p>
                <p className="mt-2">Ideali per offrire upgrade o opzioni aggiuntive ai pacchetti base.</p>
              </div>
              
              <div className="rounded-lg border p-4 bg-muted/20">
                <h4 className="font-medium mb-2">Caratteristiche:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Opzioni multiple tra cui il cliente può scegliere</li>
                  <li>Link di configurazione dedicato</li>
                  <li>Scadenza personalizzabile</li>
                  <li>Prodotti obbligatori o opzionali</li>
                  <li>Notifiche automatiche delle selezioni</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => onAddModule(activeTab)} 
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Modulo {activeTab === 'fixed' ? 'Fisso' : 'Variabile'}
        </Button>
      </CardFooter>
    </Card>
  );
}

// Interfaccia per i moduli
export interface QuoteModuleData {
  id?: number;
  quoteId: number;
  name: string;
  description?: string;
  type: 'fixed' | 'variable';
  status: 'active' | 'inactive' | 'pending_selection';
  shareToken?: string;
  expiryDate?: Date;
  minSelectCount?: number;
  maxSelectCount?: number;
  items: QuoteModuleItemData[];
}

// Interfaccia per gli elementi dei moduli
export interface QuoteModuleItemData {
  id?: number;
  moduleId?: number;
  serviceId?: number;
  bundleId?: number;
  productId?: number;
  quantity: number;
  unitPrice: number;
  hasDiscount: boolean;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountedPrice?: number;
  total: number;
  isSelected?: boolean;
  selectionRequired?: boolean;
  isDefault?: boolean;
  selectionOrder?: number;
  minSelectCount?: number;
  notes?: string;
  // Campi virtuali per UI
  serviceName?: string;
  serviceDescription?: string;
  bundleName?: string;
  bundleDescription?: string;
  productName?: string; 
  productDescription?: string;
}