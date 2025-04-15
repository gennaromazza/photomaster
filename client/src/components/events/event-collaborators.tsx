import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Trash, UserPlus, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface EventCollaboratorsProps {
  eventId: number;
}

export default function EventCollaborators({ eventId }: EventCollaboratorsProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<number | "">("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Carica i collaboratori dell'evento
  const { data: eventCollaborators = [], isLoading: isLoadingEventCollaborators } = useQuery({
    queryKey: ["/api/events", eventId, "collaborators"],
    enabled: !!eventId,
  });

  // Carica tutti i collaboratori disponibili
  const { data: allCollaborators = [], isLoading: isLoadingCollaborators } = useQuery({
    queryKey: ["/api/collaborators"],
  });

  // Mutation per aggiungere un collaboratore all'evento
  const addCollaboratorMutation = useMutation({
    mutationFn: async (data: { eventId: number; collaboratorId: number; role: string; notes: string }) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/collaborators`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Collaboratore aggiunto",
        description: "Il collaboratore è stato aggiunto all'evento",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "collaborators"] });
      setSelectedCollaboratorId("");
      setRole("");
      setNotes("");
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiunta del collaboratore",
        variant: "destructive",
      });
    },
  });

  // Mutation per rimuovere un collaboratore dall'evento
  const removeCollaboratorMutation = useMutation({
    mutationFn: async (collaboratorId: number) => {
      const res = await apiRequest("DELETE", `/api/events/${eventId}/collaborators/${collaboratorId}`, {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Collaboratore rimosso",
        description: "Il collaboratore è stato rimosso dall'evento",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "collaborators"] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la rimozione del collaboratore",
        variant: "destructive",
      });
    },
  });

  // Filtra i collaboratori disponibili rimuovendo quelli già assegnati all'evento
  const availableCollaborators = allCollaborators.filter(
    (collaborator) => !eventCollaborators.some((ec) => ec.collaboratorId === collaborator.id)
  );

  // Gestisce l'aggiunta di un collaboratore
  const handleAddCollaborator = () => {
    if (!selectedCollaboratorId) {
      toast({
        title: "Errore",
        description: "Seleziona un collaboratore",
        variant: "destructive",
      });
      return;
    }

    if (!role) {
      toast({
        title: "Errore",
        description: "Inserisci un ruolo",
        variant: "destructive",
      });
      return;
    }

    addCollaboratorMutation.mutate({
      eventId,
      collaboratorId: selectedCollaboratorId as number,
      role,
      notes,
    });
  };

  // Gestisce la rimozione di un collaboratore
  const handleRemoveCollaborator = (collaboratorId: number) => {
    removeCollaboratorMutation.mutate(collaboratorId);
  };

  // Recupera i dettagli di un collaboratore dato il suo ID
  const getCollaboratorDetails = (collaboratorId: number) => {
    return allCollaborators.find((c) => c.id === collaboratorId);
  };

  // Caricamento in corso
  if (isLoadingEventCollaborators || isLoadingCollaborators) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collaboratori</CardTitle>
          <CardDescription>Persone che collaborano a questo evento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 flex justify-center">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-500">Caricamento in corso...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Collaboratori</CardTitle>
          <CardDescription>Gestisci il team per questo evento</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Aggiungi Collaboratore
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Collaboratore</DialogTitle>
              <DialogDescription>
                Assegna un collaboratore a questo evento
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="collaborator">Collaboratore</Label>
                <Select
                  value={selectedCollaboratorId.toString()}
                  onValueChange={(value) => setSelectedCollaboratorId(parseInt(value))}
                >
                  <SelectTrigger id="collaborator">
                    <SelectValue placeholder="Seleziona collaboratore" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCollaborators.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nessun collaboratore disponibile
                      </SelectItem>
                    ) : (
                      availableCollaborators.map((collab) => (
                        <SelectItem key={collab.id} value={collab.id.toString()}>
                          {collab.firstName} {collab.lastName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Ruolo</Label>
                <Input
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Es. Fotografo, Assistente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Note (opzionale)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Istruzioni o dettagli specifici"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
              >
                Annulla
              </Button>
              <Button 
                onClick={handleAddCollaborator}
                disabled={addCollaboratorMutation.isPending}
              >
                {addCollaboratorMutation.isPending ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                    Aggiunta in corso...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {eventCollaborators.length === 0 ? (
          <div className="py-8 text-center border rounded-lg border-dashed">
            <Users className="h-10 w-10 mx-auto text-gray-400" />
            <h3 className="mt-2 text-sm font-medium">Nessun collaboratore</h3>
            <p className="mt-1 text-sm text-gray-500">
              Non ci sono collaboratori assegnati a questo evento
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Aggiungi Collaboratore
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {eventCollaborators.map((ec) => {
              const collaborator = getCollaboratorDetails(ec.collaboratorId);
              if (!collaborator) return null;
              
              return (
                <div key={ec.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{collaborator.firstName} {collaborator.lastName}</h4>
                        <Badge variant="outline">{ec.role}</Badge>
                      </div>
                      {ec.notes && (
                        <p className="text-sm text-gray-500">{ec.notes}</p>
                      )}
                      {collaborator.phone && (
                        <p className="text-sm text-gray-500 mt-1">
                          Tel: {collaborator.phone}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 md:mt-0">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/collaborators/${collaborator.id}`)}
                      >
                        Visualizza
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleRemoveCollaborator(collaborator.id)}
                        disabled={removeCollaboratorMutation.isPending}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}