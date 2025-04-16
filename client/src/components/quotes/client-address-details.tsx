import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, MapPin, Home } from "lucide-react";
import { formatFullName, formatClientName, formatAddress } from "@/lib/utils";

type ClientAddressDetailsProps = {
  client?: any;
  secondClient?: any;
  className?: string;
  showAddresses?: boolean;
  isLoading?: boolean;
};

/**
 * Componente per visualizzare i dettagli completi dei clienti, inclusi gli indirizzi
 */
export function ClientAddressDetails({
  client,
  secondClient,
  className = "",
  showAddresses = true,
}: ClientAddressDetailsProps) {
  // Se non ci sono clienti, mostra un messaggio
  if (!client && !secondClient) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Dettagli Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2 opacity-25" />
            <p>Nessun cliente associato</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Dettagli Cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cliente principale */}
          {client && (
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-primary/10 rounded-full h-12 w-12 flex items-center justify-center text-primary mr-3 shrink-0">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">
                    {formatClientName(client)}
                  </h3>
                  <p className="text-sm text-muted-foreground">Cliente Principale</p>
                </div>
              </div>

              <div className="space-y-2 ml-1">
                {client.email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {showAddresses && (client.address || client.city || client.zipCode || client.province || client.state) && (
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground mt-1" />
                    <span className="whitespace-pre-line">
                      {formatAddress(
                        client.address,
                        client.city,
                        client.zipCode || client.postalCode,
                        client.province,
                        client.state
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Secondo cliente */}
          {secondClient && (
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-primary/10 rounded-full h-12 w-12 flex items-center justify-center text-primary mr-3 shrink-0">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">
                    {formatClientName(secondClient)}
                  </h3>
                  <p className="text-sm text-muted-foreground">Secondo Cliente</p>
                </div>
              </div>

              <div className="space-y-2 ml-1">
                {secondClient.email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{secondClient.email}</span>
                  </div>
                )}
                {secondClient.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{secondClient.phone}</span>
                  </div>
                )}
                {showAddresses && (secondClient.address || secondClient.city || secondClient.zipCode || secondClient.province || secondClient.state) && (
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground mt-1" />
                    <span className="whitespace-pre-line">
                      {formatAddress(
                        secondClient.address,
                        secondClient.city,
                        secondClient.zipCode || secondClient.postalCode,
                        secondClient.province,
                        secondClient.state
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ClientAddressDetails;