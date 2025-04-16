import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Event, Client } from "@shared/schema";
import { formatDate, getStatusBadge, getStatusText } from "@/lib/utils";
import {
  Calendar,
  MapPin,
  Users,
  Search,
  FilterX,
  Plus,
  Trash2,
  MoreVertical,
  Eye,
  Clock,
} from "lucide-react";

const EventsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  // Mutation per eliminare un evento
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await apiRequest("DELETE", `/api/events/${eventId}`);
      if (!res.ok) {
        throw new Error("Errore nell'eliminazione dell'evento");
      }
      return res.ok;
    },
    onSuccess: () => {
      toast({
        title: "Evento eliminato",
        description: "L'evento è stato eliminato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsDeleteDialogOpen(false);
      setEventToDelete(null);
    },
    onError: (error) => {
      console.error("Errore eliminazione evento:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione dell'evento",
        variant: "destructive",
      });
    },
  });
  
  // Funzione per gestire l'eliminazione dell'evento
  const handleDeleteEvent = () => {
    if (eventToDelete) {
      deleteEventMutation.mutate(eventToDelete);
    }
  };

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "Cliente sconosciuto";
  };

  const filterByDate = (event: Event) => {
    if (dateFilter === "all") return true;
    const today = new Date();
    const eventDate = new Date(event.date);

    switch (dateFilter) {
      case "today":
        return eventDate.toDateString() === today.toDateString();
      case "week":
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        return eventDate >= today && eventDate <= nextWeek;
      case "month":
        return eventDate.getMonth() === today.getMonth() && 
               eventDate.getFullYear() === today.getFullYear();
      default:
        return true;
    }
  };

  // Group events by date and title to identify duplicates
  const groupedEvents = events.reduce((acc, event) => {
    const key = `${event.date}_${event.title}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  // For each group, prefer the signed event if available
  const deduplicatedEvents = Object.values(groupedEvents).map(group => {
    const signedEvent = group.find(e => e.fromSignedQuote);
    return signedEvent || group[0];
  });

  const filteredEvents = deduplicatedEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         getClientName(event.clientId).toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    const matchesType = typeFilter === "all" || event.eventType === typeFilter;
    const matchesDate = filterByDate(event);

    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setDateFilter("all");
  };

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

  const dateFilters = [
    { value: "all", label: "Tutte le date" },
    { value: "today", label: "Oggi" },
    { value: "week", label: "Questa settimana" },
    { value: "month", label: "Questo mese" },
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
            <Button className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuovo Evento
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Eventi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Cerca per titolo o cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={clearFilters}
                className="shrink-0"
                title="Azzera filtri"
              >
                <FilterX className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
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
                <SelectTrigger className="w-[160px]">
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

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  {dateFilters.map((filter) => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
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
              <Calendar className="h-12 w-12 text-gray-300 mb-2" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nessun evento trovato</h3>
              {searchQuery || statusFilter !== "all" || typeFilter !== "all" || dateFilter !== "all" ? (
                <p className="text-gray-500">Prova a modificare i filtri di ricerca</p>
              ) : (
                <div className="mt-3">
                  <Link href="/events/new">
                    <Button variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
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
                      className="group border-b border-gray-100 hover:bg-gray-50/70 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-lg mr-3 ${event.fromSignedQuote ? "bg-green-100" : "bg-primary/10"} flex items-center justify-center ${event.fromSignedQuote ? "text-green-600" : "text-primary"}`}>
                            {event.eventType === "wedding" ? (
                              <Users className="h-4 w-4" />
                            ) : (
                              <Calendar className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {event.title}
                              {event.fromSignedQuote && (
                                <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                                  Preventivo Firmato
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 capitalize">{event.eventType}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-700">{getClientName(event.clientId)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-700">{formatDate(event.date)}</div>
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {event.status === "completed" || event.fromSignedQuote ? (
                            <span>Firmato: {formatDate(event.date)}</span>
                          ) : (
                            <span>Creato: {formatDate(event.date)}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {event.location || "-"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getStatusBadge(event.status)}>
                          {getStatusText(event.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {event.quoteId ? (
                              <DropdownMenuItem onClick={() => navigate(`/quotes/detail/${event.quoteId}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizza preventivo
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => navigate(`/events/${event.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizza evento
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setEventToDelete(event.id);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogo di conferma eliminazione */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Sei sicuro di voler eliminare questo evento? Questa azione è irreversibile.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteEvent}
              disabled={deleteEventMutation.isPending}
            >
              {deleteEventMutation.isPending ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventsPage;