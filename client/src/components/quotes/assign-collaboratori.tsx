
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AssignCollaboratoriProps {
  quoteId: number;
}

export function AssignCollaboratori({ quoteId }: AssignCollaboratoriProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const { data: collaboratori, isLoading } = useQuery({
    queryKey: ["/api/collaboratori"],
    staleTime: 5 * 60 * 1000, // 5 minuti
  });

  const mutation = useMutation({
    mutationFn: async (collaboratorIds: number[]) => {
      const response = await fetch(`/api/eventi/preventivo/${quoteId}/collaboratori`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ collaboratorIds }),
      });

      if (!response.ok) {
        throw new Error("Errore durante l'assegnazione dei collaboratori");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/eventi/preventivo/${quoteId}/collaboratori`],
      });
      setSelected([]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.length > 0) {
      mutation.mutate(selected);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assegna Collaboratori</CardTitle>
          <CardDescription>Seleziona i collaboratori da assegnare al preventivo</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assegna Collaboratori</CardTitle>
        <CardDescription>Seleziona i collaboratori da assegnare al preventivo</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {collaboratori?.map((collaboratore: any) => (
              <div key={collaboratore.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`collaboratore-${collaboratore.id}`}
                  checked={selected.includes(collaboratore.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelected([...selected, collaboratore.id]);
                    } else {
                      setSelected(selected.filter((id) => id !== collaboratore.id));
                    }
                  }}
                />
                <label
                  htmlFor={`collaboratore-${collaboratore.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {collaboratore.firstName} {collaboratore.lastName}
                </label>
              </div>
            ))}
          </div>

          <Button
            type="submit"
            disabled={mutation.isLoading || selected.length === 0}
            className="w-full"
          >
            {mutation.isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sto assegnando...
              </>
            ) : (
              "Assegna collaboratori"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
