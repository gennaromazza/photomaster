import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EventCollaboratorsProps {
  eventId: number;
}

export default function EventCollaborators({ eventId }: EventCollaboratorsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch event collaborators
  const { data: eventCollaborators = [], isLoading: isLoadingEventCollaborators } = useQuery({
    queryKey: [`/api/events/${eventId}/collaborators`],
    enabled: !!eventId,
  });

  // Fetch available collaborators
  const { data: availableCollaborators = [], isLoading: isLoadingCollaborators } = useQuery({
    queryKey: ["/api/collaborators"],
  });

  // Add collaborator mutation
  const addCollaboratorMutation = useMutation({
    mutationFn: async (data: { collaboratorId: number; role: string; notes?: string }) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/collaborators`, data);
      if (!res.ok) {
        throw new Error("Failed to add collaborator");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Collaboratore aggiunto",
        description: "Il collaboratore è stato aggiunto con successo all'evento",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/collaborators`] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiunta del collaboratore",
        variant: "destructive",
      });
    },
  });

  // Remove collaborator mutation
  const removeCollaboratorMutation = useMutation({
    mutationFn: async (collaboratorId: number) => {
      const res = await apiRequest("DELETE", `/api/events/${eventId}/collaborators/${collaboratorId}`, {});
      if (!res.ok) {
        throw new Error("Failed to remove collaborator");
      }
    },
    onSuccess: () => {
      toast({
        title: "Collaboratore rimosso",
        description: "Il collaboratore è stato rimosso dall'evento",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/collaborators`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la rimozione del collaboratore",
        variant: "destructive",
      });
    },
  });

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
      collaboratorId: parseInt(selectedCollaboratorId),
      role,
      notes,
    });
  };

  const resetForm = () => {
    setSelectedCollaboratorId("");
    setRole("");
    setNotes("");
  };

  // Filter out collaborators already assigned to the event
  const availableCollaboratorsFiltered = availableCollaborators.filter(
    (collaborator) => !eventCollaborators.some((ec) => ec.collaboratorId === collaborator.id)
  );

  if (isLoadingEventCollaborators || isLoadingCollaborators) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collaboratori</CardTitle>
          <CardDescription>Caricamento collaboratori in corso...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Collaboratori Evento</CardTitle>
          <CardDescription>Gestisci i collaboratori assegnati a questo evento</CardDescription>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <i className="ri-user-add-line mr-2" />
          Aggiungi Collaboratore
        </Button>
      </CardHeader>

      <CardContent>
        {eventCollaborators.length === 0 ? (
          <div className="text-center py-8 border rounded-lg border-dashed">
            <i className="ri-team-line text-4xl text-gray-400" />
            <h3 className="mt-2 text-sm font-medium">Nessun collaboratore</h3>
            <p className="mt-1 text-sm text-gray-500">
              Non ci sono collaboratori assegnati a questo evento
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setDialogOpen(true)}
            >
              <i className="ri-user-add-line mr-2" />
              Aggiungi Collaboratore
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {eventCollaborators.map((ec) => {
              const collaborator = availableCollaborators.find(c => c.id === ec.collaboratorId);
              if (!collaborator) return null;

              return (
                <div
                  key={ec.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    {collaborator.profileImage ? (
                      <img
                        src={collaborator.profileImage}
                        alt={`${collaborator.firstName} ${collaborator.lastName}`}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {collaborator.firstName[0]}
                        {collaborator.lastName[0]}
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium">
                        {collaborator.firstName} {collaborator.lastName}
                      </h4>
                      <p className="text-sm text-gray-500">{ec.role}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    onClick={() => removeCollaboratorMutation.mutate(ec.collaboratorId)}
                    disabled={removeCollaboratorMutation.isPending}
                  >
                    {removeCollaboratorMutation.isPending ? (
                      <i className="ri-loader-4-line animate-spin" />
                    ) : (
                      <i className="ri-delete-bin-line" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Collaboratore</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Collaboratore</Label>
              <Select
                value={selectedCollaboratorId}
                onValueChange={setSelectedCollaboratorId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona collaboratore" />
                </SelectTrigger>
                <SelectContent>
                  {availableCollaboratorsFiltered.map((collaborator) => (
                    <SelectItem key={collaborator.id} value={collaborator.id.toString()}>
                      {collaborator.firstName} {collaborator.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ruolo</Label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Es: Fotografo, Videografo, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Note (opzionale)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Aggiungi eventuali note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleAddCollaborator} disabled={addCollaboratorMutation.isPending}>
              {addCollaboratorMutation.isPending ? (
                <>
                  <i className="ri-loader-4-line animate-spin mr-2" />
                  Aggiunta in corso...
                </>
              ) : (
                <>
                  <i className="ri-user-add-line mr-2" />
                  Aggiungi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}