import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Image } from "lucide-react";

interface PublicFixedModuleProps {
  module: any;
}

export function PublicFixedModule({ module }: PublicFixedModuleProps) {
  // Controllo preventivo
  if (!module || !module.items) {
    console.error("Module o module.items non definito:", module);
    return (
      <Card className="mb-4 border border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">
            Modulo non disponibile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            I dettagli di questo modulo non sono attualmente disponibili.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calcola il totale del modulo in modo sicuro
  const moduleTotal = (module.items || []).reduce((acc: number, item: any) => 
    acc + (Number(item?.total) || 0), 0);

  return (
    <Card className="mb-4 border border-primary/20 overflow-hidden">
      <CardHeader className="bg-primary/5 border-b pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{module.name}</span>
          <Badge variant="outline" className="ml-2 font-normal bg-primary/10">
            {formatCurrency(moduleTotal)}
          </Badge>
        </CardTitle>
        {module.description && (
          <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
        )}
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {module.items.map((item: any, index: number) => {
            // Determina l'origine delle proprietà (servizio, prodotto o pacchetto)
            const itemName = item.serviceName || item.productName || item.bundleName || "Servizio/Prodotto";
            const itemDescription = item.serviceDescription || item.productDescription || item.bundleDescription;
            const imagePath = item.serviceImagePath || item.productImagePath || item.bundleImagePath;
            
            return (
              <div 
                key={index} 
                className="border rounded-md overflow-hidden bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Immagine del prodotto/servizio se disponibile */}
                  {imagePath ? (
                    <div className="w-full md:w-32 h-24 md:h-auto relative bg-muted">
                      <img 
                        src={imagePath} 
                        alt={itemName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = ''; // Rimuovi immagine in caso di errore
                          target.alt = 'Immagine non disponibile';
                          target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                          const icon = document.createElement('div');
                          icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>';
                          target.parentElement?.appendChild(icon);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="hidden md:flex w-24 h-full items-center justify-center bg-muted text-muted-foreground">
                      <Image className="h-6 w-6" />
                    </div>
                  )}
                  
                  {/* Dettagli del prodotto/servizio */}
                  <div className="p-3 flex-1">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <h4 className="font-medium">{itemName}</h4>
                      <Badge variant="outline">
                        {formatCurrency(item?.total || 0)}
                      </Badge>
                    </div>
                    
                    {itemDescription && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{itemDescription}</p>
                    )}
                    
                    <div className="text-sm text-muted-foreground mt-2">
                      Quantità: {item.quantity} x {formatCurrency(item.unitPrice)}
                      {item.hasDiscount && item.discountedPrice !== undefined && (
                        <span className="text-green-600 ml-2">
                          (-{item.discountType === 'percentage' 
                            ? `${item.discountValue}%` 
                            : formatCurrency(item.discountValue)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}