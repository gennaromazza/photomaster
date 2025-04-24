import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Collaborator } from "@shared/schema";
import { getInitials } from "@/lib/utils";
import { EventiDisponibiliList } from "@/components/collaboratori/eventi-disponibili-list";
import { COLLABORATOR_ROLES, COLLABORATOR_STATUSES, getRoleLabel, getStatusLabel } from "@shared/constants";

const CollaboratorsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("collaboratori");
  
  const { data: collaborators = [], isLoading } = useQuery<Collaborator[]>({
    queryKey: ["/api/collaborators"],
  });
  
  const filteredCollaborators = collaborators.filter(collaborator => {
    const matchesSearch = `${collaborator.firstName} ${collaborator.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (collaborator.email && collaborator.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || collaborator.status === statusFilter;
    const matchesRole = roleFilter === "all" || collaborator.role.toLowerCase().includes(roleFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesRole;
  });
  
  // Usa i ruoli dalle costanti centralizzate
  const roleOptions = [
    { value: "all", label: "Tutti i ruoli" },
    ...COLLABORATOR_ROLES.map(role => ({ value: role.id, label: role.label }))
  ];
  
  const statusOptions = [
    { value: "all", label: "Tutti gli stati" },
    { value: "available", label: "Disponibile" },
    { value: "busy", label: "Occupato" },
  ];
  
  return (
    <div className="lg:px-8 px-4 mt-6 lg:mt-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-gray-900">Collaboratori</h1>
          <p className="mt-1 text-gray-500">Gestisci il tuo team di collaboratori</p>
        </div>
        <div className="mt-4 lg:mt-0 flex space-x-3">
          <Link href="/collaborators/new">
            <Button className="inline-flex items-center">
              <i className="ri-user-add-line mr-2"></i>
              Nuovo Collaboratore
            </Button>
          </Link>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md mb-6">
          <TabsTrigger value="collaboratori" aria-label="Collaboratori">Collaboratori</TabsTrigger>
          <TabsTrigger value="eventi-disponibili" aria-label="Eventi Disponibili">Eventi Disponibili</TabsTrigger>
        </TabsList>
        
        <TabsContent value="collaboratori">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Tutti i Collaboratori</CardTitle>
              <CardDescription>Lista dei collaboratori del tuo team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Input
                  placeholder="Cerca collaboratori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
                
                <div className="flex gap-4">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-32 sm:w-40">
                      <SelectValue placeholder="Ruolo" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
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
              </div>
              
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-pulse text-gray-500">Caricamento collaboratori...</div>
                </div>
              ) : filteredCollaborators.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="text-4xl text-gray-300 mb-2">
                    <i className="ri-team-line"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Nessun collaboratore trovato</h3>
                  {searchQuery || statusFilter !== "all" || roleFilter !== "all" ? (
                    <p className="text-gray-500">Prova a modificare i filtri di ricerca</p>
                  ) : (
                    <div className="mt-3">
                      <Link href="/collaborators/new">
                        <Button variant="outline">
                          <i className="ri-user-add-line mr-2"></i>
                          Aggiungi il primo collaboratore
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCollaborators.map((collaborator) => (
                    <Link key={collaborator.id} href={`/collaborators/${collaborator.id}`}>
                      <div className="block p-4 border rounded-lg hover:border-primary hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex items-center">
                          {collaborator.profileImage ? (
                            <img 
                              src={collaborator.profileImage} 
                              alt={`${collaborator.firstName} ${collaborator.lastName}`} 
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                              <span className="text-lg font-medium">
                                {getInitials(collaborator.firstName, collaborator.lastName)}
                              </span>
                            </div>
                          )}
                          <div className="ml-3">
                            <h3 className="font-medium text-gray-900">
                              {collaborator.firstName} {collaborator.lastName}
                            </h3>
                            <div className="flex items-center mt-1 text-sm text-gray-500">
                              <i className="ri-camera-line mr-1"></i> {getRoleLabel(collaborator.role)}
                            </div>
                            {collaborator.email && (
                              <div className="flex items-center mt-0.5 text-sm text-gray-500">
                                <i className="ri-mail-line mr-1"></i> {collaborator.email}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Badge variant={collaborator.status === "available" ? "green" : "red"}>
                            {getStatusLabel(collaborator.status)}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="eventi-disponibili">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Eventi Senza Collaboratori</CardTitle>
              <CardDescription>Eventi che non hanno ancora collaboratori assegnati</CardDescription>
            </CardHeader>
            <CardContent>
              <EventiDisponibiliList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CollaboratorsPage;
