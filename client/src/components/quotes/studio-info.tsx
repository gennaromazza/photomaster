import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, MapPin, Globe } from "lucide-react";

type StudioInfoProps = {
  className?: string;
  compact?: boolean;
};

/**
 * Componente che mostra le informazioni di contatto dello studio fotografico
 * Recupera i dati dalle impostazioni dell'applicazione
 */
export function StudioInfo({ className = "", compact = false }: StudioInfoProps) {
  // Carica i dati delle impostazioni dello studio
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Errore nel caricamento delle impostazioni");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className={`${className} animate-pulse p-4 space-y-4`}>
        <div className="h-5 bg-gray-200 rounded-md"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded-md w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded-md w-1/2"></div>
        </div>
      </div>
    );
  }

  // Versione compatta, per essere incorporata in altri componenti
  if (compact) {
    return (
      <div className={`${className} space-y-2`}>
        <h3 className="text-lg font-medium">Contatta {settings?.companyName || "Studio Fotografico"}</h3>
        <div className="flex flex-wrap gap-4">
          {settings?.companyEmail && (
            <div className="flex items-center">
              <Mail className="h-4 w-4 mr-1 text-muted-foreground" />
              <span>{settings.companyEmail}</span>
            </div>
          )}
          {settings?.companyPhone && (
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-1 text-muted-foreground" />
              <span>{settings.companyPhone}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Versione completa con card
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Contatti Studio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xl font-medium">{settings?.companyName || "Studio Fotografico"}</div>
        
        {settings?.companyAddress && (
          <div className="flex items-start">
            <MapPin className="h-5 w-5 mr-2 text-muted-foreground shrink-0 mt-0.5" />
            <p className="whitespace-pre-line">{settings.companyAddress}</p>
          </div>
        )}
        
        {settings?.companyEmail && (
          <div className="flex items-center">
            <Mail className="h-5 w-5 mr-2 text-muted-foreground" />
            <p>{settings.companyEmail}</p>
          </div>
        )}
        
        {settings?.companyPhone && (
          <div className="flex items-center">
            <Phone className="h-5 w-5 mr-2 text-muted-foreground" />
            <p>{settings.companyPhone}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StudioInfo;