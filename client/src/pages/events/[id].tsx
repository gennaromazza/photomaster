
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Event, Client } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import CollaboratorsCard from "@/components/events/collaborators-card";
import EventTasks from "@/components/events/event-tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EventDetailPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const eventId = parseInt(id);

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !isNaN(eventId),
  });

  if (isLoading) {
    return (
      <div className="lg:px-8 px-4 mt-6 lg:mt-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="lg:px-8 px-4 mt-6 lg:mt-8">
        <div className="text-center py-10">
          <h2 className="text-xl font-semibold mb-2">Evento non trovato</h2>
          <p className="text-gray-500 mb-4">L'evento richiesto non esiste o è stato rimosso.</p>
          <Link href="/events">
            <Button>Torna all'elenco eventi</Button>
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
            {event.title}
          </h1>
          <p className="mt-1 text-gray-500">Dettagli evento</p>
        </div>
        <div className="flex mt-4 lg:mt-0 space-x-3">
          {event.quoteId ? (
            <Link href={`/quotes/detail/${event.quoteId}`}>
              <Button>
                Visualizza Preventivo
              </Button>
            </Link>
          ) : (
            <Link href={`/quotes/new?fromEventId=${event.id}`} onClick={() => {
              console.log('Creazione preventivo da evento:', event.id)
            }}>
              <Button>
                Crea Preventivo
              </Button>
            </Link>
          )}
          <Link href={`/events/edit/${event.id}`}>
            <Button variant="outline">
              Modifica
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Dettagli</TabsTrigger>
              <TabsTrigger value="tasks">Attività</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Informazioni Evento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Stato</h3>
                    <Badge className="mt-1">{event.status}</Badge>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Data</h3>
                    <p className="mt-1">{new Date(event.date).toLocaleDateString()}</p>
                  </div>

                  {event.location && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Luogo</h3>
                      <p className="mt-1">{event.location}</p>
                    </div>
                  )}

                  {event.notes && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Note</h3>
                      <p className="mt-1 whitespace-pre-wrap">{event.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="tasks">
              <EventTasks eventId={eventId} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-1">
          <CollaboratorsCard eventId={eventId} />
        </div>
      </div>
    </div>
  );
}
