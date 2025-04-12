import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface PublicFixedModuleProps {
  module: any;
}

export function PublicFixedModule({ module }: PublicFixedModuleProps) {
  // Calcola il totale del modulo
  const moduleTotal = module.items.reduce((acc: number, item: any) => acc + (item.total || 0), 0);

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
          {module.items.map((item: any, index: number) => (
            <div 
              key={index} 
              className="border rounded-md p-3 bg-muted/20 hover:bg-muted/30 transition-colors"
            >
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h4 className="font-medium">
                  {item.serviceName || item.productName || item.bundleName || "Servizio/Prodotto"}
                </h4>
                <Badge variant="outline">
                  {formatCurrency(item.total)}
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground mt-1">
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}