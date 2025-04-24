import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, Calendar, MapPin, Info, UserPlus, Search, X } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  
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
  
  // Filtra gli eventi in base al termine di ricerca
  const eventiFiltered = useMemo(() => {
    if (!eventiSenzaCollaboratori) return [];
    if (!searchTerm.trim()) return eventiSenzaCollaboratori;
    
    const searchLower = searchTerm.toLowerCase();
    return eventiSenzaCollaboratori.filter(evento => 
      (evento.title && evento.title.toLowerCase().includes(searchLower)) || 
      (evento.description && evento.description.toLowerCase().includes(searchLower)) ||
      (evento.location && evento.location.toLowerCase().includes(searchLower)) ||
      (evento.eventType && evento.eventType.toLowerCase().includes(searchLower))
    );
  }, [eventiSenzaCollaboratori, searchTerm]);
  
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
          note: "Assegnazione rapida dalla lista eventi disponibili"
          // Rimuoviamo dataAssegnazione perché la gestiremo lato server con il valore di default
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Eventi Senza Collaboratori</h2>
        <h3 className="text-gray-500 text-base">Eventi che non hanno ancora collaboratori assegnati</h3>
      </div>
      
      {/* Titolo sezione principale e campo di ricerca */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Eventi disponibili per l'assegnazione</h3>
        <div className="relative w-1/3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Cerca eventi..." 
            className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-transparent text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <X 
              className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
              onClick={() => setSearchTerm("")}
            />
          )}
        </div>
      </div>

      {/* Visualizzazione tabellare (stile Preventivi) */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Titolo</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Data</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Luogo</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Tipo</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {eventiFiltered.map((evento) => (
              <tr key={evento.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <span className="font-medium">{evento.title}</span>
                </td>
                <td className="py-3 px-4 text-gray-600">
                  {format(new Date(evento.date), "dd/MM/yyyy", { locale: it })}
                  <div className="text-xs text-gray-400">
                    {format(new Date(evento.date), "EEEE", { locale: it })}
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600">
                  {evento.location || <span className="text-gray-400">Non specificato</span>}
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className="bg-primary/10">
                    {evento.eventType}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="ml-auto">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assegna
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
                                id={`collaboratore-select-${evento.id}`}
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
                              id={`ruolo-select-${evento.id}`}
                            >
                              <option value="">Seleziona...</option>
                              {COLLABORATOR_ROLES.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <Button 
                          className="w-full"
                          onClick={() => {
                            // Se abbiamo un ID collaboratore specificato lo usiamo, altrimenti prendiamo quello selezionato
                            const selectedCollaboratoreId = collaboratoreId || 
                              (document.getElementById(`collaboratore-select-${evento.id}`) as HTMLSelectElement)?.value;
                            const ruolo = (document.getElementById(`ruolo-select-${evento.id}`) as HTMLSelectElement).value;
                            
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
                </td>
              </tr>
            ))}
            
            {eventiFiltered.length === 0 && eventiSenzaCollaboratori.length > 0 && searchTerm && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <Search className="h-8 w-8 text-gray-300 mb-2" />
                    <p>Nessun evento corrisponde alla ricerca "{searchTerm}"</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2" 
                      onClick={() => setSearchTerm("")}
                    >
                      Cancella ricerca
                    </Button>
                  </div>
                </td>
              </tr>
            )}
            
            {eventiFiltered.length === 0 && eventiSenzaCollaboratori.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <Calendar className="h-8 w-8 text-gray-300 mb-2" />
                    <p>Tutti gli eventi hanno già collaboratori assegnati.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}