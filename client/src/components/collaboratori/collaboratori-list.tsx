import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Search, Mail, Phone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CollaboratoreDashboard } from "./collaboratore-dashboard";
import { NuovoCollaboratoreForm } from "./nuovo-collaboratore-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CollaboratoriList() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedCollaboratoreId, setSelectedCollaboratoreId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: collaboratori, isLoading, error } = useQuery({
    queryKey: ["/api/collaborators"],
    staleTime: 5 * 60 * 1000, // 5 minuti
  });

  const filteredCollaboratori = collaboratori?.filter(
    (collaboratore) =>
      collaboratore.firstName.toLowerCase().includes(search.toLowerCase()) ||
      collaboratore.lastName.toLowerCase().includes(search.toLowerCase()) ||
      collaboratore.role.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Collaboratori</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci i collaboratori, assegna eventi e monitora i pagamenti
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cerca collaboratori..."
              className="pl-8 w-full md:w-[260px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo
          </Button>
        </div>
      </div>

      {filteredCollaboratori?.length === 0 ? (
        <div className="bg-muted/40 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            Nessun collaboratore trovato. Prova a modificare i parametri di ricerca.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCollaboratori?.map((collaboratore) => (
            <Card 
              key={collaboratore.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedCollaboratoreId(collaboratore.id)}
            >
              <CardContent className="p-6">
                <div className="flex gap-4">
                  {collaboratore.profileImage ? (
                    <img 
                      src={collaboratore.profileImage} 
                      alt={`${collaboratore.firstName} ${collaboratore.lastName}`}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl font-semibold">
                      {collaboratore.firstName.charAt(0)}{collaboratore.lastName.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      {collaboratore.firstName} {collaboratore.lastName}
                    </h3>
                    <Badge variant="outline" className="mb-2">
                      {collaboratore.role}
                    </Badge>
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {collaboratore.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {collaboratore.phone}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog per visualizzare dettagli collaboratore */}
      <Dialog 
        open={!!selectedCollaboratoreId} 
        onOpenChange={(open) => {
          if (!open) setSelectedCollaboratoreId(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dettagli Collaboratore</DialogTitle>
            <DialogDescription>
              Gestisci gli eventi, i pagamenti e i montaggi del collaboratore
            </DialogDescription>
          </DialogHeader>
          {selectedCollaboratoreId && (
            <CollaboratoreDashboard collaboratoreId={selectedCollaboratoreId} />
          )}
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