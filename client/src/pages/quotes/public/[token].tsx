import React, { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { 
  User, 
  Calendar, 
  MapPin, 
  Clock, 
  FileText, 
  Euro,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Layout specifico per la visualizzazione pubblica
const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary py-4">
        <div className="container">
          <h1 className="text-2xl font-playfair text-primary-foreground">ImageStudio Preventivo</h1>
        </div>
      </header>
      <main className="flex-1 container py-6">{children}</main>
      <footer className="bg-muted py-4 border-t">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Preventivo generato da ImageStudio. © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
};

export default function PublicQuotePage() {
  const { token } = useParams();
  const { toast } = useToast();
  const [isExpired, setIsExpired] = useState(false);

  // Carica i dati del preventivo tramite token di condivisione
  const { data: quote, isLoading, error } = useQuery({
    queryKey: ["/api/quotes/share", token],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/share/${token}`);
      if (!res.ok) {
        if (res.status === 404) {
          setIsExpired(true);
          throw new Error("Preventivo non trovato o link scaduto");
        }
        throw new Error("Errore nel caricamento del preventivo");
      }
      return res.json();
    },
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Errore",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Caricamento preventivo...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (isExpired || !quote) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Preventivo non disponibile</h2>
            <p className="text-muted-foreground mb-6">
              Il preventivo richiesto non esiste o il link di condivisione è scaduto.
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto">
        {/* Intestazione preventivo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-playfair font-bold mb-2">{quote.title}</h1>
          <Badge 
            variant={quote.status === "confermato" || quote.status === "approved" ? "success" : 
                     quote.status === "in attesa" || quote.status === "pending" ? "warning" : 
                     "default"}
            className="mb-2"
          >
            {quote.status === "draft" ? "Bozza" : 
             quote.status === "pending" || quote.status === "in attesa" ? "In attesa" : 
             quote.status === "approved" || quote.status === "confermato" ? "Confermato" : 
             quote.status === "rejected" || quote.status === "rifiutato" ? "Rifiutato" : 
             quote.status || "Preventivo"}
          </Badge>
          <p className="text-muted-foreground">
            Creato il {quote.createdAt ? format(new Date(quote.createdAt), "dd/MM/yyyy", { locale: it }) : ""}
          </p>
        </div>

        {/* Dettagli evento */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Dettagli Evento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Tipo Evento</h4>
                <p className="font-medium">{quote.eventType || "Non specificato"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Data</h4>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                  <p className="font-medium">
                    {quote.eventDate ? format(new Date(quote.eventDate), "dd/MM/yyyy", { locale: it }) : "Non specificata"}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Orario</h4>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                  <p className="font-medium">
                    {quote.isFullDay ? "Giornata intera" : 
                     (quote.eventTime ? quote.eventTime : "Non specificato") +
                     (quote.eventEndTime ? ` - ${quote.eventEndTime}` : "")}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Location</h4>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                  <p className="font-medium">{quote.location || "Non specificata"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Servizi/Moduli */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Servizi inclusi</CardTitle>
          </CardHeader>
          <CardContent>
            {quote.quoteItems && quote.quoteItems.length > 0 ? (
              <div className="space-y-4">
                {quote.quoteItems.map((item: any) => (
                  <div key={item.id} className="border rounded-md p-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{item.service?.name || "Servizio"}</h4>
                      <Badge variant="outline">€ {(item.total || 0).toLocaleString()}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.quantity || 1} x €{(item.unitPrice || 0).toLocaleString()}
                      {item.hasDiscount && (
                        <span> (-{item.discountType === 'percentage' ? `${item.discountValue}%` : `€${item.discountValue}`})</span>
                      )}
                    </p>
                    {item.description && (
                      <p className="text-sm mt-2 bg-muted p-2 rounded">{item.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border rounded-md">
                <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-muted-foreground">Nessun servizio incluso</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <div>
              <p className="text-sm text-muted-foreground">Totale Servizi</p>
              <p className="font-medium text-xl">€ {(quote.subtotal || 0).toLocaleString()}</p>
            </div>
            {quote.discount > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Sconto</p>
                <p className="font-medium text-xl text-green-600">- € {(quote.discount || 0).toLocaleString()}</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Totale Preventivo</p>
              <p className="font-medium text-xl">€ {(quote.total || 0).toLocaleString()}</p>
            </div>
          </CardFooter>
        </Card>

        {/* Note */}
        {quote.notes && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Note</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Informazioni di contatto */}
        <div className="text-center mt-8 p-6 border rounded-lg bg-muted/30">
          <h3 className="text-lg font-medium mb-2">Per qualsiasi informazione</h3>
          <p className="mb-4">Contattaci direttamente per confermare il tuo preventivo o per richieste personalizzate.</p>
          <div className="flex justify-center space-x-6">
            <div className="text-center">
              <p className="font-medium">Email</p>
              <p className="text-sm text-muted-foreground">info@imagestudio.it</p>
            </div>
            <div className="text-center">
              <p className="font-medium">Telefono</p>
              <p className="text-sm text-muted-foreground">+39 123 456 7890</p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}