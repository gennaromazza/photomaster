import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Event, Client } from "@shared/schema";
import { formatDate, getStatusBadge, getStatusText } from "@/lib/utils";

const EventsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });
  
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "Cliente sconosciuto";
  };
  
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         getClientName(event.clientId).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    const matchesType = typeFilter === "all" || event.eventType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });
  
  const eventTypes = [
    { value: "all", label: "Tutti i tipi" },
    { value: "wedding", label: "Matrimonio" },
    { value: "portrait", label: "Ritratto" },
    { value: "fashion", label: "Moda" },
    { value: "event", label: "Evento" },
    { value: "other", label: "Altro" },
  ];
  
  const statusTypes = [
    { value: "all", label: "Tutti gli stati" },
    { value: "pending", label: "In Attesa" },
    { value: "upcoming", label: "Prossimo" },
    { value: "in-progress", label: "In Corso" },
    { value: "completed", label: "Completato" },
    { value: "cancelled", label: "Annullato" },
  ];
  
  return (
    <div className="lg:px-8 px-4 mt-6 lg:mt-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-gray-900">Eventi</h1>
          <p className="mt-1 text-gray-500">Gestisci i tuoi servizi fotografici</p>
        </div>
        <div className="mt-4 lg:mt-0 flex space-x-3">
          <Link href="/events/new">
            <Button className="inline-flex items-center">
              <i className="ri-add-line mr-2"></i>
              Nuovo Evento
            </Button>
          </Link>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Tutti gli Eventi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Cerca eventi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            
            <div className="flex gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32 sm:w-40">
                  <SelectValue placeholder="Tipo evento" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 sm:w-40">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  {statusTypes.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-pulse text-gray-500">Caricamento eventi...</div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-4xl text-gray-300 mb-2">
                <i className="ri-calendar-line"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nessun evento trovato</h3>
              {searchQuery || statusFilter !== "all" || typeFilter !== "all" ? (
                <p className="text-gray-500">Prova a modificare i filtri di ricerca</p>
              ) : (
                <div className="mt-3">
                  <Link href="/events/new">
                    <Button variant="outline">
                      <i className="ri-add-line mr-2"></i>
                      Aggiungi il primo evento
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Evento</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Cliente</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Data</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Stato</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr 
                      key={event.id} 
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-lg mr-3 bg-primary/10 flex items-center justify-center text-primary">
                            <i className={event.eventType === "wedding" ? "ri-heart-line" : "ri-camera-line"}></i>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{event.title}</div>
                            <div className="text-sm text-gray-500 capitalize">{event.eventType}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {getClientName(event.clientId)}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {formatDate(event.date)}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {event.location || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getStatusBadge(event.status)}>
                          {getStatusText(event.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/events/${event.id}`}>
                          <Button variant="ghost" size="sm">Visualizza</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventsPage;
