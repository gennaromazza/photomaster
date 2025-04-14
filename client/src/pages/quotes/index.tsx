import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { formatDate, formatCurrency, getStatusBadge, getStatusText } from "@/lib/utils";
import { Quote, Client, Event } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Eye, Edit, Trash2, MoreVertical } from "react-icons/ri";
import { useState as useState2 } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogDescription, AlertDialogAction } from "@/components/ui/alert-dialog";



const QuotesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, setLocation] = useLocation();
  const [quoteToDelete, setQuoteToDelete] = useState2<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState2(false);

  const { data: quotes = [], isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "Cliente sconosciuto";
  };

  const getEventTitle = (eventId: number | null) => {
    if (!eventId) return "-";
    const event = events.find(e => e.id === eventId);
    return event ? event.title : "Evento sconosciuto";
  };

  const filteredQuotes = quotes.filter(quote => {
    const clientName = getClientName(quote.clientId);
    const eventTitle = quote.eventId ? getEventTitle(quote.eventId) : "";

    const matchesSearch = quote.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (eventTitle && eventTitle.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: "all", label: "Tutti gli stati" },
    { value: "draft", label: "Bozza" },
    { value: "sent", label: "Inviato" },
    { value: "approved", label: "Approvato" },
    { value: "rejected", label: "Rifiutato" },
  ];

  const handleDeleteQuote = async () => {
    if (!quoteToDelete) return;
    try {
      // Replace with your actual delete API call
      const response = await fetch(`/api/quotes/${quoteToDelete}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Refresh data after successful delete
      // ... (your data refresh logic here)
      setQuoteToDelete(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error deleting quote:", error);
      // Handle error appropriately, e.g., show an error message to the user.
    }
  };

  return (
    <div className="lg:px-8 px-4 mt-6 lg:mt-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-gray-900">Preventivi</h1>
          <p className="mt-1 text-gray-500">Gestisci i preventivi per i clienti</p>
        </div>
        <div className="mt-4 lg:mt-0 flex space-x-3">
          <Link href="/quotes/new">
            <Button className="inline-flex items-center">
              <i className="ri-add-line mr-2"></i>
              Nuovo Preventivo
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Tutti i Preventivi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Cerca preventivi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 sm:w-40">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-pulse text-gray-500">Caricamento preventivi...</div>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-4xl text-gray-300 mb-2">
                <i className="ri-file-list-3-line"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nessun preventivo trovato</h3>
              {searchQuery || statusFilter !== "all" ? (
                <p className="text-gray-500">Prova a modificare i filtri di ricerca</p>
              ) : (
                <div className="mt-3">
                  <Link href="/quotes/new">
                    <Button variant="outline">
                      <i className="ri-add-line mr-2"></i>
                      Crea il primo preventivo
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
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Titolo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Cliente</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Evento</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Data</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Importo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Stato</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-lg mr-3 bg-primary/10 flex items-center justify-center text-primary">
                            <i className="ri-file-text-line"></i>
                          </div>
                          <div className="font-medium text-gray-900">{quote.title}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {getClientName(quote.clientId)}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {quote.eventId ? getEventTitle(quote.eventId) : "-"}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {formatDate(quote.createdAt, "dd/MM/yyyy")}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-right">
                        {quote.total ? formatCurrency(quote.total) : "€ 0,00"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getStatusBadge(quote.status)}>
                          {getStatusText(quote.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLocation(`/quotes/${quote.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizza
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLocation(`/quotes/edit/${quote.id}`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Modifica
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {setIsModalOpen(true); setQuoteToDelete(quote.id)}}>
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
      <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Sei sicuro di voler eliminare questo preventivo? Questa azione è irreversibile.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsModalOpen(false)}>Annulla</AlertDialogAction>
            <AlertDialogAction color="red" onClick={handleDeleteQuote}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QuotesPage;