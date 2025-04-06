import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout } from "@/components/layout/layout";
import { Client, Event } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

export default function ClientDetailPage() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const params = useParams();
  const clientId = parseInt(params.id);
  const { toast } = useToast();

  const { data: client, isLoading: isLoadingClient } = useQuery<Client>({
    queryKey: ["/api/clients", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) {
        throw new Error("Errore nel caricamento del cliente");
      }
      return res.json();
    },
    enabled: !isNaN(clientId),
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events/client", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/events/client/${clientId}`);
      if (!res.ok) {
        throw new Error("Errore nel caricamento degli eventi");
      }
      return res.json();
    },
    enabled: !isNaN(clientId),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Cliente eliminato",
        description: "Il cliente è stato eliminato con successo",
      });
      setLocation("/clients");
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione del cliente",
        variant: "destructive",
      });
    },
  });

  if (isLoadingClient) {
    return (
      <Layout>
        <div className="container mx-auto py-6 lg:py-10">
          <div className="animate-pulse flex flex-col space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <div className="container mx-auto py-6 lg:py-10">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="text-4xl text-gray-300 mb-2">
              <i className="ri-error-warning-line"></i>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-1">Cliente non trovato</h3>
            <p className="text-gray-500 mb-4">Il cliente richiesto non esiste o è stato rimosso</p>
            <Link href="/clients">
              <Button variant="outline">
                <i className="ri-arrow-left-line mr-2"></i>
                Torna all'elenco clienti
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  function handleDelete() {
    deleteMutation.mutate();
    setIsDeleteDialogOpen(false);
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 lg:py-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <div className="flex items-center mb-2">
              <Link href="/clients">
                <a className="text-gray-500 hover:text-gray-900">
                  <i className="ri-arrow-left-line mr-2"></i>
                  Clienti
                </a>
              </Link>
            </div>
            <h1 className="text-2xl lg:text-3xl font-display font-semibold text-gray-900">
              {client.firstName} {client.lastName}
            </h1>
            <p className="mt-1 text-gray-500">{client.email}</p>
          </div>
          
          <div className="mt-4 lg:mt-0 flex space-x-3">
            <Link href={`/clients/${clientId}/edit`}>
              <Button variant="outline" className="flex items-center">
                <i className="ri-pencil-line mr-2"></i>
                Modifica
              </Button>
            </Link>
            
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="flex items-center">
                  <i className="ri-delete-bin-line mr-2"></i>
                  Elimina
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Conferma eliminazione</DialogTitle>
                  <DialogDescription>
                    Sei sicuro di voler eliminare questo cliente? Questa azione non può essere annullata.
                    Verranno eliminati anche tutti gli eventi, i contratti e i preventivi associati a questo cliente.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <i className="ri-loader-4-line mr-2 animate-spin"></i>
                        Eliminazione in corso...
                      </>
                    ) : (
                      "Elimina"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="info" className="mb-8">
          <TabsList>
            <TabsTrigger value="info">Informazioni</TabsTrigger>
            <TabsTrigger value="events">
              Eventi
              {events.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {events.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Dettagli Cliente</CardTitle>
                <CardDescription>Informazioni di contatto e note</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Informazioni di base</h3>
                    <Separator className="my-2" />
                    <div className="space-y-3 mt-3">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Nome completo</div>
                        <div>{client.firstName} {client.lastName}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Email</div>
                        <div>
                          <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                            {client.email}
                          </a>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Telefono</div>
                        <div>
                          {client.phone ? (
                            <div className="flex space-x-2 items-center">
                              <a href={`tel:${client.phone}`} className="text-primary hover:underline">
                                {client.phone}
                              </a>
                              <a 
                                href={`https://wa.me/${client.phone.replace(/\s+/g, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-700"
                                title="Contatta su WhatsApp"
                              >
                                <i className="ri-whatsapp-line"></i>
                              </a>
                            </div>
                          ) : (
                            "-"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Indirizzo</h3>
                    <Separator className="my-2" />
                    <div className="mt-3">
                      {client.address ? (
                        <div className="flex flex-col">
                          <p className="whitespace-pre-line">{client.address}</p>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline mt-2 inline-flex items-center"
                          >
                            <i className="ri-map-pin-line mr-1"></i>
                            Visualizza su Google Maps
                          </a>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">Nessun indirizzo specificato</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Note</h3>
                  <Separator className="my-2" />
                  <div className="mt-3">
                    {client.notes ? (
                      <p className="whitespace-pre-line">{client.notes}</p>
                    ) : (
                      <p className="text-gray-500 italic">Nessuna nota</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="events" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Eventi</CardTitle>
                  <Link href={`/events/new?clientId=${clientId}`}>
                    <Button variant="outline" size="sm" className="flex items-center">
                      <i className="ri-add-line mr-1"></i>
                      Nuovo Evento
                    </Button>
                  </Link>
                </div>
                <CardDescription>
                  Eventi programmati per questo cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="text-4xl text-gray-300 mb-2">
                      <i className="ri-calendar-line"></i>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Nessun evento</h3>
                    <p className="text-gray-500 mb-4">Non ci sono eventi programmati per questo cliente</p>
                    <Link href={`/events/new?clientId=${clientId}`}>
                      <Button variant="outline">
                        <i className="ri-add-line mr-2"></i>
                        Crea nuovo evento
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {events.map((event) => (
                      <Link key={event.id} href={`/events/${event.id}`}>
                        <a className="block border rounded-lg p-4 hover:border-primary hover:shadow-sm transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{event.title}</h3>
                              <p className="text-sm text-gray-500 capitalize mt-1">{event.eventType}</p>
                            </div>
                            <Badge variant={event.status === "completed" ? "success" : event.status === "pending" ? "secondary" : "default"}>
                              {event.status === "completed" 
                                ? "Completato" 
                                : event.status === "pending" 
                                  ? "In attesa" 
                                  : "Confermato"}
                            </Badge>
                          </div>
                          <div className="flex items-center mt-3 text-sm">
                            <i className="ri-calendar-line text-gray-400 mr-2"></i>
                            <span>{formatDate(event.date)}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-start mt-2 text-sm">
                              <i className="ri-map-pin-line text-gray-400 mr-2 mt-1"></i>
                              <span>{event.location}</span>
                            </div>
                          )}
                        </a>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}