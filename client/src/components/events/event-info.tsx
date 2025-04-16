import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Calendar, FileText, Map, Pencil, Users } from "lucide-react";
import { formatClientName } from "@/lib/utils";

interface EventInfoProps {
  event: any; // Utilizziamo 'any' per ora, ma idealmente dovremmo definire un'interfaccia più precisa
}

export default function EventInfo({ event }: EventInfoProps) {
  const [, navigate] = useLocation();

  // Carica le informazioni del cliente
  const { data: client } = useQuery({
    queryKey: ["/api/clients", event.clientId],
    enabled: !!event.clientId,
  });

  // Formatta la data
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/D";
    return format(new Date(dateString), "d MMMM yyyy", { locale: it });
  };

  // Formatta l'orario
  const formatTime = (dateString: string) => {
    if (!dateString) return "N/D";
    return format(new Date(dateString), "HH:mm", { locale: it });
  };

  // Ottiene lo stato dell'evento
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge className="bg-amber-100 text-amber-800">Prossimo</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-100 text-blue-800">In Corso</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completato</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Annullato</Badge>;
      default:
        return <Badge variant="outline">Non definito</Badge>;
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Dettagli Evento</CardTitle>
            <CardDescription>Informazioni generali</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Titolo:</dt>
                <dd>{event.title}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Stato:</dt>
                <dd>{getStatusBadge(event.status)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Data:</dt>
                <dd>{formatDate(event.date)}</dd>
              </div>
              {event.startTime && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">Inizio:</dt>
                  <dd>{formatTime(event.startTime)}</dd>
                </div>
              )}
              {event.endTime && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">Fine:</dt>
                  <dd>{formatTime(event.endTime)}</dd>
                </div>
              )}
              {event.duration && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">Durata:</dt>
                  <dd>{event.duration} ore</dd>
                </div>
              )}
              {event.eventType && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">Tipo:</dt>
                  <dd>{event.eventType}</dd>
                </div>
              )}
              {event.fromSignedQuote && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">Origine:</dt>
                  <dd>
                    <Badge variant="outline">Da preventivo firmato</Badge>
                  </dd>
                </div>
              )}
            </dl>
            <Separator className="my-4" />
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/events/${event.id}`)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Vista Calendario
              </Button>
              {event.quoteId && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/quotes/detail/${event.quoteId}`)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Preventivo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {client && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Cliente</CardTitle>
              <CardDescription>Dettagli cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">Nome:</dt>
                  <dd>{formatClientName(client)}</dd>
                </div>
                {client.email && (
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Email:</dt>
                    <dd className="truncate">{client.email}</dd>
                  </div>
                )}
                {client.phone && (
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Telefono:</dt>
                    <dd>{client.phone}</dd>
                  </div>
                )}
                {client.address && (
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Indirizzo:</dt>
                    <dd className="truncate">{client.address}</dd>
                  </div>
                )}
              </dl>
              <Separator className="my-4" />
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Profilo Cliente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {(event.location || event.address) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Luogo</CardTitle>
              <CardDescription>Ubicazione dell'evento</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                {event.location && (
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Nome:</dt>
                    <dd>{event.location}</dd>
                  </div>
                )}
                {event.address && (
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Indirizzo:</dt>
                    <dd className="text-right">{event.address}</dd>
                  </div>
                )}
              </dl>
              {event.address && (
                <>
                  <Separator className="my-4" />
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(event.address)}`, "_blank")}
                    >
                      <Map className="h-4 w-4 mr-2" />
                      Apri in Maps
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {event.description && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Descrizione</CardTitle>
              <CardDescription>Dettagli aggiuntivi</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line">{event.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}