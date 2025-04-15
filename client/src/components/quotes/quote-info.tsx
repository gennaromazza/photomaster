import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CeremonyDetails } from "@/components/quotes/ceremony-details";
import { FileText, Share2, Users } from "lucide-react";

interface QuoteInfoProps {
  quote: any; // Utilizziamo 'any' per ora, ma idealmente dovremmo definire un'interfaccia più precisa
}

export default function QuoteInfo({ quote }: QuoteInfoProps) {
  const [, navigate] = useLocation();

  // Carica i moduli associati al preventivo
  const { data: modules = [] } = useQuery({
    queryKey: ["/api/quotes", quote.id, "modules"],
    enabled: !!quote.id,
  });

  // Carica le informazioni del cliente
  const { data: client } = useQuery({
    queryKey: ["/api/clients", quote.clientId],
    enabled: !!quote.clientId,
  });

  // Carica i dettagli del cliente secondario se presente
  const { data: secondClient } = useQuery({
    queryKey: ["/api/clients", quote.secondClientId],
    enabled: !!quote.secondClientId,
  });

  // Formatta la data
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/D";
    return format(new Date(dateString), "d MMMM yyyy", { locale: it });
  };

  // Formatta il prezzo in Euro
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  // Verifica se il preventivo ha dettagli del rito
  const hasCeremonyDetails = quote.ceremonyLocation || quote.ceremonyTime || quote.ceremonyNotes;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Dettagli Preventivo</CardTitle>
            <CardDescription>Informazioni generali</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Titolo:</dt>
                <dd>{quote.title}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Stato:</dt>
                <dd>
                  {quote.isSigned ? (
                    <Badge className="bg-green-100 text-green-800">Firmato</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800">In attesa</Badge>
                  )}
                </dd>
              </div>
              {quote.eventDate && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">Data evento:</dt>
                  <dd>{formatDate(quote.eventDate)}</dd>
                </div>
              )}
              {quote.createdAt && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">Creato il:</dt>
                  <dd>{formatDate(quote.createdAt)}</dd>
                </div>
              )}
              {quote.signedAt && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">Firmato il:</dt>
                  <dd>{formatDate(quote.signedAt)}</dd>
                </div>
              )}
              {quote.total && (
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">Totale:</dt>
                  <dd className="font-semibold">{formatPrice(quote.total)}</dd>
                </div>
              )}
            </dl>
            <Separator className="my-4" />
            <div className="flex flex-wrap justify-end gap-2">
              {!quote.isSigned && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/quotes/share/${quote.id}`)}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Condividi
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/quotes/detail/${quote.id}`)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Vista Dettagliata
              </Button>
            </div>
          </CardContent>
        </Card>

        {client && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Cliente Principale</CardTitle>
              <CardDescription>Dettagli cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">Nome:</dt>
                  <dd>{client.firstName} {client.lastName}</dd>
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

        {secondClient && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Cliente Secondario</CardTitle>
              <CardDescription>Dettagli cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">Nome:</dt>
                  <dd>{secondClient.firstName} {secondClient.lastName}</dd>
                </div>
                {secondClient.email && (
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Email:</dt>
                    <dd className="truncate">{secondClient.email}</dd>
                  </div>
                )}
                {secondClient.phone && (
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Telefono:</dt>
                    <dd>{secondClient.phone}</dd>
                  </div>
                )}
                {secondClient.address && (
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Indirizzo:</dt>
                    <dd className="truncate">{secondClient.address}</dd>
                  </div>
                )}
              </dl>
              <Separator className="my-4" />
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/clients/${secondClient.id}`)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Profilo Cliente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {quote.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Note</CardTitle>
              <CardDescription>Note aggiuntive sul preventivo</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {hasCeremonyDetails && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Dettagli Rito</CardTitle>
              <CardDescription>Informazioni sul rito</CardDescription>
            </CardHeader>
            <CardContent>
              <CeremonyDetails 
                readOnly 
                ceremonyLocation={quote.ceremonyLocation} 
                ceremonyTime={quote.ceremonyTime}
                ceremonyNotes={quote.ceremonyNotes}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {modules && modules.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Moduli</CardTitle>
            <CardDescription>Prodotti e servizi inclusi nel preventivo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500">
              Questo preventivo contiene {modules.length} {modules.length === 1 ? 'modulo' : 'moduli'}.
              Per visualizzare i dettagli completi, usa "Vista Dettagliata".
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}