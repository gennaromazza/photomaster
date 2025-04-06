import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { formatDate, getStatusBadge, getStatusText } from "@/lib/utils";
import { Contract, Client, Event } from "@shared/schema";

const ContractsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
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
  
  const getEventTitle = (eventId: number) => {
    const event = events.find(e => e.id === eventId);
    return event ? event.title : "Evento sconosciuto";
  };
  
  const filteredContracts = contracts.filter(contract => {
    const clientName = getClientName(contract.clientId);
    const eventTitle = getEventTitle(contract.eventId);
    
    const matchesSearch = contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         eventTitle.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  const statusOptions = [
    { value: "all", label: "Tutti gli stati" },
    { value: "pending", label: "In Attesa" },
    { value: "signed", label: "Firmato" },
    { value: "expired", label: "Scaduto" },
  ];
  
  return (
    <div className="lg:px-8 px-4 mt-6 lg:mt-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-gray-900">Contratti</h1>
          <p className="mt-1 text-gray-500">Gestisci i contratti per i clienti</p>
        </div>
        <div className="mt-4 lg:mt-0 flex space-x-3">
          <Link href="/contracts/new">
            <Button className="inline-flex items-center">
              <i className="ri-file-add-line mr-2"></i>
              Nuovo Contratto
            </Button>
          </Link>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Tutti i Contratti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Cerca contratti..."
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
              <div className="animate-pulse text-gray-500">Caricamento contratti...</div>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-4xl text-gray-300 mb-2">
                <i className="ri-file-list-3-line"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nessun contratto trovato</h3>
              {searchQuery || statusFilter !== "all" ? (
                <p className="text-gray-500">Prova a modificare i filtri di ricerca</p>
              ) : (
                <div className="mt-3">
                  <Link href="/contracts/new">
                    <Button variant="outline">
                      <i className="ri-file-add-line mr-2"></i>
                      Crea il primo contratto
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
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Stato</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((contract) => (
                    <tr 
                      key={contract.id} 
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-lg mr-3 bg-primary/10 flex items-center justify-center text-primary">
                            <i className="ri-file-text-line"></i>
                          </div>
                          <div className="font-medium text-gray-900">{contract.title}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {getClientName(contract.clientId)}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {getEventTitle(contract.eventId)}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {formatDate(contract.createdAt, "dd/MM/yyyy")}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getStatusBadge(contract.status)}>
                          {getStatusText(contract.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/contracts/${contract.id}`}>
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

export default ContractsPage;
