import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, Calendar, MapPin, Info, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { COLLABORATOR_ROLES, getRoleLabel } from "@shared/constants";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EventiDisponibiliListProps {
  collaboratoreId?: number;
}

export function EventiDisponibiliList({ collaboratoreId }: EventiDisponibiliListProps = {}) {
  const { toast } = useToast();
  
  // Recupera la lista degli eventi senza collaboratori
  const { data: eventiSenzaCollaboratori, isLoading: eventiLoading, error: eventiError } = useQuery({
    queryKey: ["/api/events/senza-collaboratori"],
    staleTime: 5 * 60 * 1000, // 5 minuti
  });
  
  // Recupera la lista dei collaboratori (solo se non è specificato un ID collaboratore)
  const { data: collaboratori, isLoading: collaboratoriLoading, error: collaboratoriError } = useQuery({
    queryKey: ["/api/collaborators"],
    staleTime: 5 * 60 * 1000, // 5 minuti
    enabled: !collaboratoreId, // Esegui la query solo se non è specificato un ID collaboratore
  });
  
  const isLoading = eventiLoading || (collaboratoriLoading && !collaboratoreId);
  const error = eventiError || (collaboratoriError && !collaboratoreId);

  // Mutation per l'assegnazione rapida di un evento dalla lista eventi senza collaboratori
  const assegnaRapidoMutation = useMutation({
    mutationFn: async ({ collaboratoreId, eventoId, ruolo }: { collaboratoreId: number, eventoId: number, ruolo: string }) => {
      const response = await apiRequest(
        "POST", 
        `/api/collaboratori/${collaboratoreId}/eventi`,
        {
          eventoId,
          ruolo,
          dataAssegnazione: new Date(),
          note: "Assegnazione rapida dalla lista eventi disponibili"
        }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Evento assegnato",
        description: "L'evento è stato assegnato con successo al collaboratore.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events/senza-collaboratori"] });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'assegnazione dell'evento.",
        variant: "destructive",
      });
      console.error("Errore durante l'assegnazione rapida dell'evento:", error);
    },
  });

  // Mostro il loader durante il caricamento
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mostro un messaggio di errore se qualcosa è andato storto
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-lg text-muted-foreground">
          Si è verificato un errore durante il caricamento degli eventi disponibili
        </p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/events/senza-collaboratori"] })}
        >
          Riprova
        </Button>
      </div>
    );
  }

  if (!eventiSenzaCollaboratori || eventiSenzaCollaboratori.length === 0) {
    return (
      <div className="bg-muted/40 rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          Tutti gli eventi hanno già collaboratori assegnati.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Eventi disponibili per l'assegnazione</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {eventiSenzaCollaboratori.map((evento) => (
          <Card key={evento.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-semibold">{evento.title}</CardTitle>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-1" />
                    {format(new Date(evento.date), "PPP", { locale: it })}
                  </div>
                </div>
                <Badge variant="outline" className="bg-primary/10">
                  {evento.eventType}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{evento.location || 'Luogo non specificato'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm">
                      {evento.description && evento.description.length > 100
                        ? `${evento.description.substring(0, 100)}...`
                        : evento.description || 'Nessuna descrizione disponibile'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assegna collaboratore
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <div className="space-y-4">
                        <h4 className="font-medium">Seleziona collaboratore e ruolo</h4>
                        <div className={`grid ${collaboratoreId ? "grid-cols-1" : "grid-cols-2"} gap-2`}>
                          {!collaboratoreId && (
                            <div>
                              <label className="text-sm font-medium">Collaboratore</label>
                              <select 
                                className="w-full p-2 border rounded mt-1"
                                id="collaboratore-select"
                              >
                                <option value="">Seleziona...</option>
                                {collaboratori && collaboratori.map((collab) => (
                                  <option key={collab.id} value={collab.id}>
                                    {collab.firstName} {collab.lastName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div>
                            <label className="text-sm font-medium">Ruolo</label>
                            <select 
                              className="w-full p-2 border rounded mt-1"
                              id="ruolo-select"
                            >
                              <option value="">Seleziona...</option>
                              <option value="fotografo">Fotografo</option>
                              <option value="videomaker">Videomaker</option>
                              <option value="assistente">Assistente</option>
                              <option value="grafico">Grafico</option>
                            </select>
                          </div>
                        </div>
                        <Button 
                          className="w-full"
                          onClick={() => {
                            // Se abbiamo un ID collaboratore specificato lo usiamo, altrimenti prendiamo quello selezionato
                            const selectedCollaboratoreId = collaboratoreId || (document.getElementById('collaboratore-select') as HTMLSelectElement)?.value;
                            const ruolo = (document.getElementById('ruolo-select') as HTMLSelectElement).value;
                            
                            if (!selectedCollaboratoreId || !ruolo) {
                              toast({
                                title: "Selezione incompleta",
                                description: collaboratoreId 
                                  ? "Seleziona un ruolo" 
                                  : "Seleziona sia il collaboratore che il ruolo",
                                variant: "destructive",
                              });
                              return;
                            }
                            
                            assegnaRapidoMutation.mutate({
                              collaboratoreId: typeof selectedCollaboratoreId === 'string' ? parseInt(selectedCollaboratoreId) : selectedCollaboratoreId,
                              eventoId: evento.id,
                              ruolo
                            });
                          }}
                          disabled={assegnaRapidoMutation.isPending}
                        >
                          {assegnaRapidoMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : "Assegna"}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}