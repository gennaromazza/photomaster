import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Plus, Search, Mail, Phone, AlertTriangle, Filter, UserCog, RefreshCw, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollaboratoreDashboard } from "./collaboratore-dashboard";
import { NuovoCollaboratoreForm } from "./nuovo-collaboratore-form";
import { EventiDisponibiliList } from "./eventi-disponibili-list";
import { getRoleLabel } from "@shared/constants";
import { COLLABORATOR_ROLES } from "@shared/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CollaboratoriList() {
  const { toast } = useToast();
  // Stato per ricerca e filtri
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Stato per i dialoghi
  const [selectedCollaboratoreId, setSelectedCollaboratoreId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("collaboratori");
  
  // Query per recuperare i collaboratori
  const { data: collaboratori, isLoading, error } = useQuery({
    queryKey: ["/api/collaborators"],
    staleTime: 5 * 60 * 1000, // 5 minuti
  });

  // Mutation per sincronizzare le assegnazioni dei collaboratori
  const sincronizzaAssegnazioniMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/collaboratori/sincronizza-assegnazioni");
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sincronizzazione completata",
        description: "Le assegnazioni dei collaboratori sono state sincronizzate con successo",
        variant: "default"
      });
      // Invalidiamo le query pertinenti per ricaricare i dati
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collaborators"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/senza-collaboratori"] });
    },
    onError: (error) => {
      toast({
        title: "Errore di sincronizzazione",
        description: "Si è verificato un errore durante la sincronizzazione delle assegnazioni",
        variant: "destructive"
      });
      console.error("Errore sincronizzazione:", error);
    },
  });

  // Filtriamo i collaboratori in base ai criteri di ricerca e filtri
  const filteredCollaboratori = collaboratori?.filter(
    (collaboratore) => {
      const matchesSearch = 
        collaboratore.firstName.toLowerCase().includes(search.toLowerCase()) ||
        collaboratore.lastName.toLowerCase().includes(search.toLowerCase()) ||
        collaboratore.email.toLowerCase().includes(search.toLowerCase()) ||
        (collaboratore.phone && collaboratore.phone.includes(search));
        
      const matchesRole = roleFilter === "all" || collaboratore.role === roleFilter;
      // Nota: potremmo aggiungere qui altri filtri se necessario
      
      return matchesSearch && matchesRole;
    }
  );

  // Visualizzazione durante il caricamento
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Visualizzazione in caso di errore
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-lg text-muted-foreground">
          Si è verificato un errore durante il caricamento dei collaboratori
        </p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Riprova
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Header con statistiche e azioni globali */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
              <Users className="h-6 w-6 text-primary" />
              Gestione Collaboratori
            </h1>
            <p className="text-muted-foreground">
              Gestisci il tuo team di collaboratori, monitora gli eventi e i pagamenti
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => sincronizzaAssegnazioniMutation.mutate()}
              disabled={sincronizzaAssegnazioniMutation.isPending}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {sincronizzaAssegnazioniMutation.isPending ? "Sincronizzazione..." : "Sincronizza"}
            </Button>
          </div>
        </div>
        
        {/* Card statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Totale Collaboratori</p>
                  <p className="text-3xl font-bold mt-1">{collaboratori?.length || 0}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Eventi Assegnati</p>
                  <p className="text-3xl font-bold mt-1">
                    {/* Questo è un segnaposto - implementare la logica se necessario */}
                    {/* Mostra il numero di eventi assegnati ai collaboratori */}
                    —
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-amber-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pagamenti Registrati</p>
                  <p className="text-3xl font-bold mt-1">
                    {/* Segnaposto */}
                    —
                  </p>
                </div>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="h-8 w-8 text-green-500 opacity-80"
                >
                  <path d="M2 17h2.095c.717 0 1.357-.464 1.585-1.152L8.744 6h10.513c1.107 0 1.958.957 1.754 2.021l-1.013 5.25C19.798 14.85 18.581 16 17.079 16H10" />
                  <circle cx="8.5" cy="19.5" r="1.5" />
                  <circle cx="15.5" cy="19.5" r="1.5" />
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Sezione Tabs e Filtri */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-2 w-full sm:w-auto">
              <TabsTrigger 
                value="collaboratori" 
                aria-label="Collaboratori"
                className="flex items-center gap-1"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Collaboratori</span>
                <span className="sm:hidden">Team</span>
              </TabsTrigger>
              <TabsTrigger 
                value="eventi-disponibili" 
                aria-label="Eventi Disponibili"
                className="flex items-center gap-1"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Eventi Disponibili</span>
                <span className="sm:hidden">Eventi</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cerca collaboratori..."
                className="pl-8 w-full sm:w-[260px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]" aria-label="Filtra per ruolo">
                <SelectValue placeholder="Tutti i ruoli" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Filtra per ruolo</SelectLabel>
                  <SelectItem value="all">Tutti i ruoli</SelectItem>
                  {COLLABORATOR_ROLES.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="shrink-0">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nuovo</span>
            </Button>
          </div>
        </div>
      
        {/* Contenuto dei tab */}
        <TabsContent value="collaboratori" className="mt-0">
          {filteredCollaboratori?.length === 0 ? (
            <div className="bg-muted/20 border border-border rounded-lg p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Nessun collaboratore trovato. Prova a modificare i parametri di ricerca.
              </p>
              {search || roleFilter !== "all" ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("all");
                  }}
                >
                  Cancella filtri
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  Aggiungi il primo collaboratore
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCollaboratori?.map((collaboratore) => (
                <Card 
                  key={collaboratore.id} 
                  className="overflow-hidden hover:shadow-md transition-all border border-border hover:border-primary/20 cursor-pointer group"
                  onClick={() => setSelectedCollaboratoreId(collaboratore.id)}
                >
                  <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between">
                    <div>
                      <Badge variant="outline" className="mb-1 bg-primary/5 hover:bg-primary/10">
                        {getRoleLabel(collaboratore.role)}
                      </Badge>
                      <CardTitle className="text-lg">
                        {collaboratore.firstName} {collaboratore.lastName}
                      </CardTitle>
                    </div>
                    {collaboratore.status && (
                      <Badge 
                        variant={collaboratore.status === "active" ? "default" : "secondary"}
                        className="ml-auto"
                      >
                        {collaboratore.status === "active" ? "Attivo" : "Inattivo"}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 pt-3">
                    <div className="flex items-center gap-3">
                      {collaboratore.profileImage ? (
                        <img 
                          src={collaboratore.profileImage} 
                          alt={`${collaboratore.firstName} ${collaboratore.lastName}`}
                          className="w-12 h-12 rounded-full object-cover border-2 border-background"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold border-2 border-background">
                          {collaboratore.firstName.charAt(0)}{collaboratore.lastName.charAt(0)}
                        </div>
                      )}
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground truncate max-w-[180px]">
                            {collaboratore.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {collaboratore.phone || "Nessun telefono"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-0 border-t border-border">
                    <Button 
                      variant="ghost" 
                      className="w-full rounded-none h-10 text-xs text-muted-foreground group-hover:text-primary group-hover:bg-primary/5"
                    >
                      <UserCog className="h-4 w-4 mr-2" />
                      Gestisci Collaboratore
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="eventi-disponibili" className="mt-0">
          <EventiDisponibiliList />
        </TabsContent>
      </div>

      {/* Dialog per visualizzare dettagli collaboratore */}
      <Dialog 
        open={!!selectedCollaboratoreId} 
        onOpenChange={(open) => {
          if (!open) setSelectedCollaboratoreId(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Dettagli Collaboratore</DialogTitle>
            <DialogDescription>
              Gestisci gli eventi, i pagamenti e i montaggi del collaboratore
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(80vh-100px)]">
            <div className="px-6 py-4">
              {selectedCollaboratoreId && (
                <CollaboratoreDashboard collaboratoreId={selectedCollaboratoreId} />
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog per aggiungere nuovo collaboratore */}
      <Dialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo Collaboratore</DialogTitle>
            <DialogDescription>
              Inserisci i dati del nuovo collaboratore
            </DialogDescription>
          </DialogHeader>
          <NuovoCollaboratoreForm 
            onSuccess={() => setIsAddDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}