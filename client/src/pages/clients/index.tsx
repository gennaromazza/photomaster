import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Client } from "@shared/schema";
import { getInitials } from "@/lib/utils";

const ClientsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  
  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  const filteredClients = clients.filter(client => 
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="lg:px-8 px-4 mt-6 lg:mt-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-gray-900">Clienti</h1>
          <p className="mt-1 text-gray-500">Gestisci i tuoi clienti</p>
        </div>
        <div className="mt-4 lg:mt-0 flex space-x-3">
          <Link href="/clients/new">
            <Button className="inline-flex items-center">
              <i className="ri-user-add-line mr-2"></i>
              Nuovo Cliente
            </Button>
          </Link>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Tutti i Clienti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Cerca clienti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
          
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-pulse text-gray-500">Caricamento clienti...</div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-4xl text-gray-300 mb-2">
                <i className="ri-user-search-line"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nessun cliente trovato</h3>
              {searchQuery ? (
                <p className="text-gray-500">Prova con un altro termine di ricerca</p>
              ) : (
                <div className="mt-3">
                  <Link href="/clients/new">
                    <Button variant="outline">
                      <i className="ri-user-add-line mr-2"></i>
                      Aggiungi il primo cliente
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredClients.map((client) => (
                <div key={client.id} className="block p-4 border rounded-lg hover:border-primary hover:shadow-sm transition-all cursor-pointer" onClick={() => navigate(`/clients/${client.id}`)}>
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <span className="font-medium">
                          {getInitials(client.firstName, client.lastName)}
                        </span>
                      </div>
                      <div className="ml-3">
                        <h3 className="font-medium text-gray-900">
                          {client.firstName} {client.lastName}
                        </h3>
                        <div className="flex flex-col mt-1 text-sm text-gray-500">
                          <span className="flex items-center">
                            <i className="ri-mail-line mr-1"></i> {client.email}
                          </span>
                          {client.phone && (
                            <span className="flex items-center mt-0.5">
                              <i className="ri-phone-line mr-1"></i> {client.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientsPage;
