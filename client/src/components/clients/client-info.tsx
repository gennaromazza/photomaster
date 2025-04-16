import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatClientName } from "@/lib/utils";
import { Mail, PhoneCall, User, MapPin, Building } from "lucide-react";

interface ClientInfoProps {
  clientId: number;
  mode?: "compact" | "full";
  className?: string;
}

export default function ClientInfo({ clientId, mode = "compact", className }: ClientInfoProps) {
  const [, navigate] = useLocation();

  // Carica le informazioni del cliente
  const { data: client, isLoading } = useQuery({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Caricamento...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!client) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Cliente non trovato</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // Modalità compatta (per sidebar o schede)
  if (mode === "compact") {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Cliente</CardTitle>
          <CardDescription>Dettagli cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="font-medium text-lg mb-2">
            {formatClientName(client)}
          </div>
          <div className="space-y-1 text-sm">
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{client.email}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{client.address}</span>
              </div>
            )}
          </div>
          <Separator className="my-3" />
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <User className="h-4 w-4 mr-2" />
              Scheda Cliente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Modalità completa (per pagina dedicata)
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Informazioni Cliente</CardTitle>
        <CardDescription>Dettagli completi del cliente</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold mb-1">
              {formatClientName(client)}
            </h3>
            <div className="flex flex-col gap-2">
              {client.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                    {client.email}
                  </a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                    {client.phone}
                  </a>
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{client.address}</span>
                </div>
              )}
            </div>
          </div>
          
          {client.notes && (
            <div>
              <h4 className="font-medium text-muted-foreground mb-1">Note</h4>
              <p className="whitespace-pre-line">{client.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}