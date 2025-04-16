import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Link } from "@/components/ui/custom-link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, CardContent, CardFooter, 
  CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Client, Event, Quote } from "@shared/schema";
import { getInitials, formatCurrency, formatDate, formatClientName, formatAddress } from "@/lib/utils";

const ClientDetailPage = () => {
  const { id } = useParams();
  const clientId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: client, isLoading: isLoadingClient } = useQuery<Client>({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !isNaN(clientId),
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    select: (events) => events.filter(event => 
      event.clientId === clientId || event.secondClientId === clientId
    ),
    enabled: !isNaN(clientId),
  });

  const { data: quotes = [], isLoading: isLoadingQuotes } = useQuery<Quote[]>({
    queryKey: [`/api/quotes/client/${clientId}`],
    enabled: !isNaN(clientId),
  });

  const deleteClientMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Cliente eliminato",
        description: "Il cliente è stato eliminato con successo.",
      });
      navigate("/clients");
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione del cliente.",
        variant: "destructive",
      });
    }
  });

  const handleDeleteClient = () => {
    deleteClientMutation.mutate();
    setDeleteDialogOpen(false);
  };

  // Rendi cliccabili i numeri di telefono per WhatsApp
  const formatPhoneLink = (phone: string) => {
    if (!phone) return null;
    // Rimuovi spazi e caratteri speciali e assicurati che inizi con +39 per l'Italia se non presente
    let formattedPhone = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    
    // Se non inizia con un +, aggiungi il prefisso italiano
    if (!formattedPhone.startsWith('+')) {
      // Se inizia con uno 0, rimuovilo prima di aggiungere il prefisso
      if (formattedPhone.startsWith('0')) {
        formattedPhone = formattedPhone.substring(1);
      }
      formattedPhone = `+39${formattedPhone}`;
    }
    
    return (
      <a 
        href={`https://wa.me/${formattedPhone}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-primary hover:underline inline-flex items-center"
      >
        <i className="ri-whatsapp-line mr-1"></i>
        {phone}
      </a>
    );
  };

  // Rendi cliccabili le email
  const formatEmailLink = (email: string) => {
    if (!email) return null;
    return (
      <a 
        href={`mailto:${email}`}
        className="text-primary hover:underline inline-flex items-center"
      >
        <i className="ri-mail-line mr-1"></i>
        {email}
      </a>
    );
  };

  if (isLoadingClient) {
    return (
      <div className="lg:px-8 px-4 mt-6 lg:mt-8">
        <div className="animate-pulse text-center py-10">
          <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="lg:px-8 px-4 mt-6 lg:mt-8">
        <div className="text-center py-10">
          <h2 className="text-xl font-semibold mb-2">Cliente non trovato</h2>
          <p className="text-gray-500 mb-4">Il cliente richiesto non esiste o è stato rimosso.</p>
          <Link href="/clients">
            <Button>Torna all'elenco clienti</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:px-8 px-4 mt-6 lg:mt-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-gray-900">
            {formatClientName(client)}
          </h1>
          <p className="mt-1 text-gray-500">Dettagli cliente</p>
        </div>
        <div className="mt-4 lg:mt-0 flex flex-wrap gap-2">
          <Link href={`/clients/edit/${client.id}`}>
            <Button variant="outline" className="inline-flex items-center">
              <i className="ri-edit-line mr-2"></i>
              Modifica
            </Button>
          </Link>
          <Link href={`/quotes/new?clientId=${client.id}`}>
            <Button variant="outline" className="inline-flex items-center">
              <i className="ri-file-list-3-line mr-2"></i>
              Nuovo Preventivo
            </Button>
          </Link>
          <Link href={`/events/new?clientId=${client.id}`}>
            <Button variant="outline" className="inline-flex items-center">
              <i className="ri-calendar-event-line mr-2"></i>
              Nuovo Evento
            </Button>
          </Link>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <i className="ri-delete-bin-line"></i>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Conferma eliminazione</DialogTitle>
                <DialogDescription>
                  Sei sicuro di voler eliminare questo cliente? Questa azione non può essere annullata.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Annulla
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteClient}
                  disabled={deleteClientMutation.isPending}
                >
                  {deleteClientMutation.isPending ? (
                    <span className="flex items-center">
                      <i className="ri-loader-4-line animate-spin mr-2"></i>
                      Eliminazione...
                    </span>
                  ) : "Elimina"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mr-3">
                  <span className="font-medium">
                    {getInitials(client.firstName, client.lastName)}
                  </span>
                </div>
                <span>Informazioni Cliente</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Nome completo</h3>
                <p className="mt-1">{formatClientName(client)}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                <p className="mt-1">{formatEmailLink(client.email)}</p>
              </div>

              {client.phone && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Telefono</h3>
                  <p className="mt-1">{formatPhoneLink(client.phone)}</p>
                </div>
              )}

              {(client.address || client.city || client.zipCode || client.province || client.state) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Indirizzo</h3>
                  <p className="mt-1">
                    {formatAddress(
                      client.address,
                      client.city,
                      client.zipCode,
                      client.province,
                      client.state
                    )}
                  </p>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      formatAddress(client.address, client.city, client.zipCode, client.province, client.state)
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-primary hover:underline text-sm inline-flex items-center"
                  >
                    <i className="ri-map-pin-line mr-1"></i>
                    Visualizza su Google Maps
                  </a>
                </div>
              )}

              {client.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Note</h3>
                  <p className="mt-1 whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="quotes" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quotes" className="flex items-center justify-center">
                <i className="ri-file-list-3-line mr-2"></i>
                Preventivi ({quotes.length})
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center justify-center">
                <i className="ri-calendar-event-line mr-2"></i>
                Eventi ({events.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="quotes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Preventivi</CardTitle>
                  <CardDescription>
                    Tutti i preventivi associati a questo cliente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingQuotes ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-14 bg-gray-200 rounded"></div>
                      <div className="h-14 bg-gray-200 rounded"></div>
                    </div>
                  ) : quotes.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="text-4xl text-gray-300 mb-2">
                        <i className="ri-file-list-3-line"></i>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Nessun preventivo</h3>
                      <p className="text-gray-500 mb-4">Questo cliente non ha ancora preventivi.</p>
                      <Link href={`/quotes/new?clientId=${client.id}`}>
                        <Button variant="outline">
                          <i className="ri-add-line mr-2"></i>
                          Crea preventivo
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {quotes.map((quote) => (
                        <div 
                          key={quote.id} 
                          className="block border rounded-lg p-4 hover:border-primary hover:shadow-sm transition-all cursor-pointer"
                          onClick={() => navigate(`/quotes/${quote.id}`)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{quote.title}</h3>
                              <div className="mt-1 text-sm text-gray-500 space-y-1">
                                <div className="flex items-center">
                                  <i className="ri-calendar-line mr-1"></i>
                                  <span>
                                    {formatDate(new Date(quote.createdAt))}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <i className="ri-price-tag-3-line mr-1"></i>
                                  <span>{formatCurrency(quote.total)}</span>
                                </div>
                              </div>
                            </div>
                            <Badge className="capitalize">
                              {quote.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                {quotes.length > 0 && (
                  <CardFooter>
                    <Link href={`/quotes/new?clientId=${client.id}`}>
                      <Button variant="outline" size="sm">
                        <i className="ri-add-line mr-2"></i>
                        Nuovo Preventivo
                      </Button>
                    </Link>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="events" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Eventi</CardTitle>
                  <CardDescription>
                    Tutti gli eventi associati a questo cliente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingEvents ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-20 bg-gray-200 rounded"></div>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  ) : events.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="text-4xl text-gray-300 mb-2">
                        <i className="ri-calendar-event-line"></i>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Nessun evento</h3>
                      <p className="text-gray-500 mb-4">Questo cliente non ha ancora eventi pianificati.</p>
                      <Link href={`/events/new?clientId=${client.id}`}>
                        <Button variant="outline">
                          <i className="ri-add-line mr-2"></i>
                          Crea evento
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {events.map((event) => (
                        <div 
                          key={event.id}
                          className="block border rounded-lg p-4 hover:border-primary hover:shadow-sm transition-all cursor-pointer"
                          onClick={() => navigate(`/events/${event.id}`)}
                        >
                          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start">
                            <div>
                              <h3 className="font-medium">{event.title}</h3>
                              <div className="mt-1 text-sm text-gray-500 space-y-1">
                                <div className="flex items-center">
                                  <i className="ri-calendar-line mr-1"></i>
                                  <span>
                                    {formatDate(new Date(event.date))}
                                    {event.endDate && ` - ${formatDate(new Date(event.endDate))}`}
                                  </span>
                                </div>
                                {event.location && (
                                  <div className="flex items-center">
                                    <i className="ri-map-pin-line mr-1"></i>
                                    <span>{event.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge className={`capitalize mt-2 lg:mt-0 ${
                              event.status === 'confirmed' ? 'bg-green-500' : 
                              event.status === 'cancelled' ? 'bg-red-500' : ''
                            }`}>
                              {event.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                {events.length > 0 && (
                  <CardFooter>
                    <Link href={`/events/new?clientId=${client.id}`}>
                      <Button variant="outline" size="sm">
                        <i className="ri-add-line mr-2"></i>
                        Nuovo Evento
                      </Button>
                    </Link>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailPage;