import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Collaborator, EventCollaborator } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import { Link } from "wouter";

interface CollaboratorsCardProps {
  eventId: number;
}

export default function CollaboratorsCard({ eventId }: CollaboratorsCardProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>("");
  const [assignmentRole, setAssignmentRole] = useState<string>("");

  // Recupera i collaboratori assegnati all'evento
  const {
    data: assignedCollaborators = [],
    isLoading: isLoadingAssigned,
    refetch: refetchAssigned
  } = useQuery<Collaborator[]>({
    queryKey: [`/api/events/${eventId}/collaborators`],
    enabled: !!eventId,
  });

  // Recupera tutti i collaboratori disponibili
  const {
    data: availableCollaborators = [],
    isLoading: isLoadingAvailable,
  } = useQuery<Collaborator[]>({
    queryKey: ["/api/collaborators/available"],
  });

  // Filtra i collaboratori disponibili che non sono già assegnati all'evento
  const filteredAvailableCollaborators = availableCollaborators.filter(
    (collaborator) => !assignedCollaborators.some((ac) => ac.id === collaborator.id)
  );

  // Mutation per assegnare un collaboratore all'evento
  const assignCollaboratorMutation = useMutation({
    mutationFn: async (data: { collaboratorId: number; role: string }) => {
      const res = await apiRequest(
        "POST",
        `/api/events/${eventId}/collaborators`,
        data
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.message || "Errore durante l'assegnazione del collaboratore"
        );
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/collaborators`] });
      refetchAssigned();
      setOpen(false);
      setSelectedCollaboratorId("");
      setAssignmentRole("");
      toast({
        title: "Collaboratore assegnato",
        description: "Il collaboratore è stato assegnato con successo all'evento",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation per rimuovere un collaboratore dall'evento
  const removeCollaboratorMutation = useMutation({
    mutationFn: async (collaboratorId: number) => {
      const res = await apiRequest(
        "DELETE",
        `/api/events/${eventId}/collaborators/${collaboratorId}`
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.message || "Errore durante la rimozione del collaboratore"
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/collaborators`] });
      toast({
        title: "Collaboratore rimosso",
        description: "Il collaboratore è stato rimosso con successo dall'evento",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssignCollaborator = () => {
    if (!selectedCollaboratorId || !assignmentRole) {
      toast({
        title: "Campi mancanti",
        description: "Seleziona un collaboratore e assegna un ruolo",
        variant: "destructive",
      });
      return;
    }

    assignCollaboratorMutation.mutate({
      collaboratorId: parseInt(selectedCollaboratorId),
      role: assignmentRole,
    });
  };

  const handleRemoveCollaborator = (collaboratorId: number) => {
    if (
      window.confirm(
        "Sei sicuro di voler rimuovere questo collaboratore dall'evento?"
      )
    ) {
      removeCollaboratorMutation.mutate(collaboratorId);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div>
          <CardTitle className="text-lg font-medium">Collaboratori</CardTitle>
          <CardDescription>
            Membri del team assegnati a questo evento
          </CardDescription>
        </div>
        {filteredAvailableCollaborators.length > 0 && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="mt-0">
                <i className="ri-user-add-line mr-2"></i>
                Assegna Collaboratore
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Assegna Collaboratore</DialogTitle>
                <DialogDescription>
                  Seleziona un collaboratore disponibile e assegnagli un ruolo per questo evento
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="collaborator" className="text-sm font-medium">
                    Collaboratore
                  </label>
                  <Select
                    value={selectedCollaboratorId}
                    onValueChange={setSelectedCollaboratorId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona un collaboratore" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAvailableCollaborators.map((collaborator) => (
                        <SelectItem
                          key={collaborator.id}
                          value={collaborator.id.toString()}
                        >
                          {collaborator.firstName} {collaborator.lastName} ({collaborator.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="role" className="text-sm font-medium">
                    Ruolo nell'evento
                  </label>
                  <Input
                    id="role"
                    placeholder="Es: Fotografo principale, Assistente, Videografo"
                    value={assignmentRole}
                    onChange={(e) => setAssignmentRole(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Annulla
                </Button>
                <Button 
                  onClick={handleAssignCollaborator}
                  disabled={assignCollaboratorMutation.isPending}
                >
                  {assignCollaboratorMutation.isPending && (
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                  )}
                  Assegna
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoadingAssigned ? (
          <div className="flex justify-center py-6">
            <div className="animate-pulse text-gray-500">
              Caricamento collaboratori...
            </div>
          </div>
        ) : assignedCollaborators.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="text-4xl text-gray-300 mb-2">
              <i className="ri-team-line"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Nessun collaboratore assegnato
            </h3>
            <p className="text-gray-500 mb-4">
              {filteredAvailableCollaborators.length > 0
                ? "Assegna i membri del team a questo evento"
                : "Non ci sono collaboratori disponibili da assegnare"}
            </p>
            {filteredAvailableCollaborators.length === 0 && (
              <Link href="/collaborators/new">
                <Button variant="outline">
                  <i className="ri-user-add-line mr-2"></i>
                  Aggiungi un collaboratore
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {assignedCollaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center">
                  {collaborator.profileImage ? (
                    <img
                      src={collaborator.profileImage}
                      alt={`${collaborator.firstName} ${collaborator.lastName}`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="text-sm font-medium">
                        {getInitials(
                          collaborator.firstName,
                          collaborator.lastName
                        )}
                      </span>
                    </div>
                  )}
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">
                      {collaborator.firstName} {collaborator.lastName}
                    </p>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="text-xs">
                        ({collaborator.role})
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Link href={`/collaborators/${collaborator.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 px-2 mr-1">
                      <i className="ri-eye-line"></i>
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                    onClick={() => handleRemoveCollaborator(collaborator.id)}
                    disabled={removeCollaboratorMutation.isPending}
                  >
                    {removeCollaboratorMutation.isPending && (
                      <i className="ri-loader-4-line animate-spin mr-1"></i>
                    )}
                    <i className="ri-delete-bin-line"></i>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}