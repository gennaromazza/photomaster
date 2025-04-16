import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Client } from "@shared/schema";
import { getInitials } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  UserCircle, 
  MoreVertical, 
  PenSquare, 
  Trash2, 
  Eye, 
  Search, 
  FilterX,
  Plus,
  Mail,
  Phone,
  UserPlus,
  MapPin
} from "lucide-react";

const ClientsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);
  const { toast } = useToast();
  
  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  // Filtro i clienti in base alla query di ricerca (nome, cognome o email)
  const filteredClients = clients.filter(client => {
    if (searchQuery.length < 2) return true; // Mostra tutti i clienti se la query è troppo corta
    
    return `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.phone && client.phone.toLowerCase().includes(searchQuery.toLowerCase()));
  });
  
  // Mutation per eliminare un cliente
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      await apiRequest("DELETE", `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      toast({
        title: "Cliente eliminato",
        description: "Il cliente è stato eliminato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error("Errore eliminazione cliente:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione del cliente",
        variant: "destructive",
      });
    },
  });
  
  // Funzione per gestire l'eliminazione del cliente
  const handleDeleteClient = () => {
    if (clientToDelete) {
      deleteClientMutation.mutate(clientToDelete);
    }
  };
  
  // Funzione per pulire la ricerca
  const clearFilters = () => {
    setSearchQuery("");
  };
  
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
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Cerca clienti per nome, email o telefono..."
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
          
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-pulse text-gray-500">Caricamento clienti...</div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <UserCircle className="h-16 w-16 text-gray-300 mb-2" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nessun cliente trovato</h3>
              {searchQuery ? (
                <p className="text-gray-500">Prova con un altro termine di ricerca</p>
              ) : (
                <div className="mt-3">
                  <Link href="/clients/new">
                    <Button variant="outline" className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Aggiungi il primo cliente
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
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Cliente</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Contatti</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Indirizzo</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr 
                      key={client.id} 
                      className="group border-b border-gray-100 hover:bg-gray-50/70 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
                            <span className="font-medium text-sm">
                              {getInitials(client.firstName, client.lastName)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {client.firstName} {client.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center text-gray-700">
                            <a 
                              href={`mailto:${client.email}`} 
                              title="Invia email"
                              className="text-primary hover:text-primary/80 transition-colors rounded-full p-1 mr-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                            <span>{client.email}</span>
                          </div>
                          {client.phone && (
                            <div className="flex items-center text-gray-700 mt-1">
                              <div className="flex items-center space-x-1 mr-1.5">
                                <a 
                                  href={`tel:${client.phone.replace(/\s+/g, '')}`} 
                                  title="Chiama"
                                  className="text-primary hover:text-primary/80 transition-colors rounded-full p-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                </a>
                                <a 
                                  href={`https://wa.me/${client.phone.replace(/\s+/g, '')}`} 
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Apri WhatsApp"
                                  className="text-green-600 hover:text-green-700 transition-colors rounded-full p-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <i className="ri-whatsapp-line text-base"></i>
                                </a>
                              </div>
                              <span>{client.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center text-gray-700">
                          {client.address ? (
                            <>
                              <a 
                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(client.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Apri in Google Maps" 
                                className="text-primary hover:text-primary/80 transition-colors rounded-full p-1 mr-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MapPin className="h-3.5 w-3.5" />
                              </a>
                              <span>{client.address}</span>
                            </>
                          ) : (
                            '-'
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizza
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/clients/edit/${client.id}`)}>
                              <PenSquare className="mr-2 h-4 w-4" />
                              Modifica
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setClientToDelete(client.id);
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
            Sei sicuro di voler eliminare questo cliente? Questa azione è irreversibile e rimuoverà anche tutti i dati associati.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteClient}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientsPage;
