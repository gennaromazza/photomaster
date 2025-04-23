import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, Globe } from "lucide-react";
import { useCompanyProfile } from "@/config/companyProfile";

type StudioInfoProps = {
  className?: string;
  compact?: boolean;
};

/**
 * Componente che mostra le informazioni di contatto dello studio fotografico
 * Utilizza il hook centralizzato useCompanyProfile per recuperare i dati
 */
export function StudioInfo({ className = "", compact = false }: StudioInfoProps) {
  // Carica i dati del profilo aziendale dal hook centralizzato
  const { 
    isLoading, 
    companyName, 
    companyEmail, 
    companyPhone, 
    companyAddress 
  } = useCompanyProfile();

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
        <h3 className="text-lg font-medium">Contatta {companyName}</h3>
        <div className="flex flex-wrap gap-4">
          {companyEmail && (
            <div className="flex items-center">
              <Mail className="h-4 w-4 mr-1 text-muted-foreground" />
              <span>{companyEmail}</span>
            </div>
          )}
          {companyPhone && (
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-1 text-muted-foreground" />
              <span>{companyPhone}</span>
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
        <div className="text-xl font-medium">{companyName}</div>
        
        {companyAddress && (
          <div className="flex items-start">
            <MapPin className="h-5 w-5 mr-2 text-muted-foreground shrink-0 mt-0.5" />
            <p className="whitespace-pre-line">{companyAddress}</p>
          </div>
        )}
        
        {companyEmail && (
          <div className="flex items-center">
            <Mail className="h-5 w-5 mr-2 text-muted-foreground" />
            <p>{companyEmail}</p>
          </div>
        )}
        
        {companyPhone && (
          <div className="flex items-center">
            <Phone className="h-5 w-5 mr-2 text-muted-foreground" />
            <p>{companyPhone}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StudioInfo;