import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertTriangle, Clock, Calendar, CheckCircle2, XCircle, MoreHorizontal, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, isAfter } from "date-fns";
import { it } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface MontaggioCollaboratoreListProps {
  collaboratoreId: number;
}

export function MontaggioCollaboratoreList({ collaboratoreId }: MontaggioCollaboratoreListProps) {
  const { toast } = useToast();
  const [filtroStato, setFiltroStato] = useState<"tutti" | "da_fare" | "in_corso" | "completati">("tutti");
  const [notaCompletamento, setNotaCompletamento] = useState("");
  const [montaggioSelezionato, setMontaggioSelezionato] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: montaggi, isLoading, error } = useQuery({
    queryKey: [`/api/collaboratori/${collaboratoreId}/montaggi`],
    staleTime: 5 * 60 * 1000, // 5 minuti
  });

  const updateMutation = useMutation({
    mutationFn: async ({ montaggioId, stato, nota }: { montaggioId: number; stato: string; nota?: string }) => {
      const response = await apiRequest(
        "PATCH", 
        `/api/collaboratori/${collaboratoreId}/montaggi/${montaggioId}`,
        { stato, nota }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Stato montaggio aggiornato",
        description: "Lo stato del montaggio è stato aggiornato con successo.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/montaggi`] });
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/dashboard`] });
      setMontaggioSelezionato(null);
      setNotaCompletamento("");
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento dello stato del montaggio.",
        variant: "destructive",
      });
    },
  });

  // Funzione per aggiornare lo stato del montaggio
  const updateStatoMontaggio = (montaggioId: number, nuovoStato: string) => {
    if (nuovoStato === "completato") {
      setMontaggioSelezionato(montaggi.find(m => m.id === montaggioId));
      setIsDialogOpen(true);
    } else {
      updateMutation.mutate({ montaggioId, stato: nuovoStato });
    }
  };

  // Funzione per completare un montaggio con nota
  const completaMontaggio = () => {
    if (!montaggioSelezionato) return;
    
    updateMutation.mutate({
      montaggioId: montaggioSelezionato.id,
      stato: "completato",
      nota: notaCompletamento
    });
  };

  // Filtra i montaggi in base allo stato selezionato
  const filteredMontaggi = montaggi ? montaggi.filter((montaggio) => {
    if (filtroStato === "tutti") return true;
    
    switch (filtroStato) {
      case "da_fare": return montaggio.stato === "da_fare";
      case "in_corso": return montaggio.stato === "in_corso";
      case "completati": return montaggio.stato === "completato";
      default: return true;
    }
  }) : [];

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
          Si è verificato un errore durante il caricamento dei montaggi
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
      <div className="flex gap-2 mb-6">
        <Button 
          variant={filtroStato === "tutti" ? "default" : "outline"} 
          size="sm"
          onClick={() => setFiltroStato("tutti")}
        >
          Tutti
        </Button>
        <Button 
          variant={filtroStato === "da_fare" ? "default" : "outline"} 
          size="sm"
          onClick={() => setFiltroStato("da_fare")}
        >
          Da fare
        </Button>
        <Button 
          variant={filtroStato === "in_corso" ? "default" : "outline"} 
          size="sm"
          onClick={() => setFiltroStato("in_corso")}
        >
          In corso
        </Button>
        <Button 
          variant={filtroStato === "completati" ? "default" : "outline"} 
          size="sm"
          onClick={() => setFiltroStato("completati")}
        >
          Completati
        </Button>
      </div>
      
      {filteredMontaggi.length === 0 ? (
        <div className="bg-muted/40 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            Nessun montaggio {filtroStato !== "tutti" ? filtroStato.replace('_', ' ') : ""} trovato.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredMontaggi.map((montaggio) => {
            // Calcola la data di scadenza
            const dataScadenza = new Date(montaggio.scadenza);
            const isScaduto = isAfter(new Date(), dataScadenza) && montaggio.stato !== "completato";
            
            // Determina i colori e lo stile in base allo stato
            let progressValue = 0;
            let statusBadgeVariant: "default" | "secondary" | "outline" | "destructive" = "outline";
            
            switch (montaggio.stato) {
              case "completato":
                progressValue = 100;
                statusBadgeVariant = "default";
                break;
              case "in_corso":
                progressValue = 50;
                statusBadgeVariant = "secondary";
                break;
              case "da_fare":
                progressValue = 0;
                statusBadgeVariant = isScaduto ? "destructive" : "outline";
                break;
            }
            
            return (
              <Card key={montaggio.id} className={`overflow-hidden ${isScaduto && montaggio.stato !== "completato" ? 'border-destructive/50' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{montaggio.titolo}</h3>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Calendar className="w-4 h-4 mr-1" />
                        Scadenza: {format(dataScadenza, "PPP", { locale: it })}
                        {isScaduto && montaggio.stato !== "completato" && (
                          <Badge variant="destructive" className="ml-2">
                            Scaduto
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={statusBadgeVariant}>
                        {montaggio.stato === "completato" 
                          ? "Completato" 
                          : montaggio.stato === "in_corso" 
                            ? "In corso" 
                            : "Da fare"}
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {montaggio.stato !== "in_corso" && (
                            <DropdownMenuItem 
                              onClick={() => updateStatoMontaggio(montaggio.id, "in_corso")}
                              disabled={updateMutation.isPending}
                            >
                              Segna come "In corso"
                            </DropdownMenuItem>
                          )}
                          {montaggio.stato !== "completato" && (
                            <DropdownMenuItem 
                              onClick={() => updateStatoMontaggio(montaggio.id, "completato")}
                              disabled={updateMutation.isPending}
                            >
                              Segna come "Completato"
                            </DropdownMenuItem>
                          )}
                          {montaggio.stato !== "da_fare" && (
                            <DropdownMenuItem 
                              onClick={() => updateStatoMontaggio(montaggio.id, "da_fare")}
                              disabled={updateMutation.isPending}
                            >
                              Segna come "Da fare"
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Avanzamento</span>
                      <span>{progressValue}%</span>
                    </div>
                    <Progress value={progressValue} className="h-2" />
                  </div>
                  
                  {montaggio.descrizione && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">{montaggio.descrizione}</p>
                    </div>
                  )}
                  
                  {montaggio.eventTitle && (
                    <div className="flex items-center gap-2 text-sm mt-4">
                      <FileCheck className="w-4 h-4 text-muted-foreground" />
                      <span>Evento: {montaggio.eventTitle}</span>
                    </div>
                  )}
                  
                  {montaggio.nota && (
                    <div className="mt-4 p-3 bg-muted/30 rounded-md text-sm">
                      <p className="font-medium mb-1">Note:</p>
                      <p className="text-muted-foreground">{montaggio.nota}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Dialog per completare montaggio con nota */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completa montaggio</DialogTitle>
            <DialogDescription>
              Inserisci una nota opzionale per il completamento del montaggio.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="Inserisci dettagli sul lavoro completato (opzionale)"
              value={notaCompletamento}
              onChange={(e) => setNotaCompletamento(e.target.value)}
              rows={5}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={completaMontaggio} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Completa montaggio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}