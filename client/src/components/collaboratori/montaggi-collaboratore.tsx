import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, 
  AlertTriangle, 
  Calendar, 
  FileCheck, 
  MoreHorizontal, 
  PlayCircle, 
  CheckCircle, 
  Clock, 
  Star, 
  Plus, 
  ArrowRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, isAfter, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { IconBrandWhatsapp } from "@/components/ui/icons/whatsapp";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface MontaggioCollaboratoreListProps {
  collaboratoreId: number;
}

// Schema di validazione per il form completamento montaggio
const completaMontaggioSchema = z.object({
  saldo: z.coerce.number().positive('Il saldo deve essere maggiore di zero'),
  note: z.string().optional(),
});

type CompletaMontaggioFormValues = z.infer<typeof completaMontaggioSchema>;

export function MontaggioCollaboratoreList({ collaboratoreId }: MontaggioCollaboratoreListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filtroStato, setFiltroStato] = useState<"tutti" | "da_fare" | "in_corso" | "completati">("tutti");
  const [montaggioSelezionato, setMontaggioSelezionato] = useState<any | null>(null);
  const [isCompletaDialogOpen, setIsCompletaDialogOpen] = useState(false);
  const [isAvviaDialogOpen, setIsAvviaDialogOpen] = useState(false);

  // Form per completamento
  const completaForm = useForm<CompletaMontaggioFormValues>({
    resolver: zodResolver(completaMontaggioSchema),
    defaultValues: {
      saldo: undefined,
      note: "",
    },
  });

  // Query per recuperare il collaboratore
  const { data: collaboratore } = useQuery({
    queryKey: [`/api/collaborators/${collaboratoreId}`],
    staleTime: 5 * 60 * 1000,
  });

  // Query per recuperare gli eventi del collaboratore
  const { data: eventi = [] } = useQuery({
    queryKey: [`/api/collaboratori/${collaboratoreId}/eventi`],
    staleTime: 5 * 60 * 1000,
  });

  // Query per recuperare i montaggi
  const { data: montaggi = [], isLoading, error } = useQuery({
    queryKey: [`/api/collaboratori/${collaboratoreId}/montaggi`],
    staleTime: 5 * 60 * 1000,
  });

  // Mutation per avviare un montaggio
  const avviaMutation = useMutation({
    mutationFn: async (montaggioId: number) => {
      const response = await apiRequest(
        "PATCH", 
        `/api/collaboratori/${collaboratoreId}/montaggi/${montaggioId}`,
        { 
          stato: "in_corso",
          dataPrimoContatto: new Date().toISOString(),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Montaggio avviato",
        description: "Il montaggio è stato avviato con successo.",
      });
      // Invalida la cache per aggiornare i dati
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/montaggi`] });
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/dashboard`] });
      setIsAvviaDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'avvio del montaggio.",
        variant: "destructive",
      });
    },
  });

  // Mutation per completare un montaggio
  const completaMutation = useMutation({
    mutationFn: async ({ montaggioId, saldo, note }: { montaggioId: number; saldo: number; note?: string }) => {
      // Prima aggiorniamo lo stato del montaggio
      const montaggioResponse = await apiRequest(
        "PATCH", 
        `/api/collaboratori/${collaboratoreId}/montaggi/${montaggioId}`,
        { 
          stato: "completato",
          saldo,
          note,
        }
      );

      if (!montaggioResponse.ok) {
        throw new Error("Errore nell'aggiornamento del montaggio");
      }

      // Poi registriamo il pagamento
      const eventoId = montaggi.find(m => m.id === montaggioId)?.eventoId;
      if (!eventoId) throw new Error("ID evento non trovato");

      const pagamentoResponse = await apiRequest(
        "POST",
        `/api/collaboratori/${collaboratoreId}/pagamenti`,
        {
          eventoId,
          tipo: "montaggio_saldo",
          importo: saldo,
          dataPagamento: new Date().toISOString(),
          metodoPagamento: "bonifico",
          note: `Saldo montaggio completato - ${note || ""}`,
        }
      );

      if (!pagamentoResponse.ok) {
        throw new Error("Errore nella registrazione del pagamento");
      }

      return montaggioResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Montaggio completato",
        description: "Il montaggio è stato completato e il saldo registrato.",
      });
      // Invalida la cache per aggiornare i dati
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/montaggi`] });
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/pagamenti`] });
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/dashboard`] });
      setIsCompletaDialogOpen(false);
      completaForm.reset();
      setMontaggioSelezionato(null);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il completamento del montaggio.",
        variant: "destructive",
      });
    },
  });

  // Handler per avviare un montaggio
  const handleAvviaMontaggio = (montaggio: any) => {
    setMontaggioSelezionato(montaggio);
    setIsAvviaDialogOpen(true);
  };

  // Handler per confermare l'avvio di un montaggio
  const confirmAvviaMontaggio = () => {
    if (!montaggioSelezionato) return;
    avviaMutation.mutate(montaggioSelezionato.id);
  };

  // Handler per completare un montaggio
  const handleCompletaMontaggio = (montaggio: any) => {
    setMontaggioSelezionato(montaggio);
    setIsCompletaDialogOpen(true);
    // Pre-compila il saldo se disponibile nel montaggio
    if (montaggio.acconto) {
      completaForm.setValue('saldo', Number(montaggio.acconto));
    }
  };

  // Handler per inviare il form di completamento
  const onSubmitCompletaMontaggio = (values: CompletaMontaggioFormValues) => {
    if (!montaggioSelezionato) return;
    
    completaMutation.mutate({
      montaggioId: montaggioSelezionato.id,
      saldo: values.saldo,
      note: values.note,
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

  // Calcola i totali per i badge
  const totalMontaggi = montaggi.length;
  const pendingMontaggi = montaggi.filter(m => m.stato !== "completato").length;
  const priorityMontaggi = montaggi.filter(m => m.priorita >= 8 && m.stato !== "completato").length;

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
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-medium">Coda Montaggi</CardTitle>
              <Badge variant="secondary">{totalMontaggi}</Badge>
            </div>
            <div className="flex gap-2 text-sm">
              <div className="flex items-center">
                <Badge variant="outline" className="mr-2">{pendingMontaggi}</Badge>
                <span className="text-muted-foreground">In attesa</span>
              </div>
              {priorityMontaggi > 0 && (
                <div className="flex items-center">
                  <Badge variant="destructive" className="mr-2">{priorityMontaggi}</Badge>
                  <span className="text-muted-foreground">Priorità alta</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMontaggi.map((montaggio) => {
            // Calcola la data di consegna
            const dataConsegna = parseISO(montaggio.dataConsegnaPrevista);
            const isScaduto = isAfter(new Date(), dataConsegna) && montaggio.stato !== "completato";
            
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

            // Trova l'evento associato
            const eventoAssociato = eventi.find(e => e.id === montaggio.eventoId);
            
            return (
              <Card 
                key={montaggio.id} 
                className={`overflow-hidden ${isScaduto && montaggio.stato !== "completato" ? 'border-destructive/50' : ''}`}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col mb-4 gap-2">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold truncate">
                        {eventoAssociato?.titolo || montaggio.titolo || `Montaggio #${montaggio.id}`}
                      </h3>
                      <Badge variant={statusBadgeVariant} className="ml-2">
                        {montaggio.stato === "completato" 
                          ? "Completato" 
                          : montaggio.stato === "in_corso" 
                            ? "In corso" 
                            : "Da fare"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-1" />
                      Consegna: {format(dataConsegna, "dd/MM/yyyy", { locale: it })}
                      {isScaduto && montaggio.stato !== "completato" && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Scaduto
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Star className="w-4 h-4 mr-1" />
                      Priorità: <span className={`ml-1 font-medium ${montaggio.priorita >= 8 ? 'text-destructive' : ''}`}>
                        {montaggio.priorita}/10
                      </span>
                    </div>

                    {montaggio.dataPrimoContatto && (
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Clock className="w-4 h-4 mr-1" />
                        Avviato: {format(parseISO(montaggio.dataPrimoContatto), "dd/MM/yyyy", { locale: it })}
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Avanzamento</span>
                      <span>{progressValue}%</span>
                    </div>
                    <Progress value={progressValue} className="h-2" />
                  </div>
                  
                  {montaggio.acconto && (
                    <div className="mb-3 mt-4 p-2 bg-muted/30 rounded border border-border/50">
                      <div className="flex justify-between text-sm">
                        <span>Acconto:</span>
                        <span className="font-medium">{formatCurrency(Number(montaggio.acconto))}</span>
                      </div>
                      {montaggio.saldo && (
                        <div className="flex justify-between text-sm mt-1">
                          <span>Saldo:</span>
                          <span className="font-medium">{formatCurrency(Number(montaggio.saldo))}</span>
                        </div>
                      )}
                      {montaggio.acconto && montaggio.saldo && (
                        <div className="flex justify-between text-sm mt-1 border-t pt-1">
                          <span>Totale:</span>
                          <span className="font-medium">{formatCurrency(Number(montaggio.acconto) + Number(montaggio.saldo))}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {montaggio.note && (
                    <div className="mt-3 p-2 bg-muted/30 rounded-md text-sm border border-border/50">
                      <p className="font-medium mb-1">Note:</p>
                      <p className="text-muted-foreground text-xs">{montaggio.note}</p>
                    </div>
                  )}

                  <div className="mt-4 flex justify-between items-center border-t pt-3">
                    <div className="flex gap-2">
                      {collaboratore?.phone && (
                        <a
                          href={`https://wa.me/${collaboratore.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Stato montaggio per ${eventoAssociato?.titolo || montaggio.titolo || `Montaggio #${montaggio.id}`}: ${
                              montaggio.stato === "completato" 
                                ? "Completato" 
                                : montaggio.stato === "in_corso" 
                                  ? "In corso" 
                                  : "Da fare"
                            }.`
                          )}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          aria-label="Invia stato montaggio via WhatsApp"
                          className="inline-flex items-center justify-center p-1.5 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                        >
                          <IconBrandWhatsapp size={20} />
                        </a>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {montaggio.stato === "da_fare" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAvviaMontaggio(montaggio)}
                          className="gap-1"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Avvia
                        </Button>
                      )}
                      
                      {montaggio.stato === "in_corso" && (
                        <Button 
                          size="sm" 
                          onClick={() => handleCompletaMontaggio(montaggio)}
                          className="gap-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Completa
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Dialog per avviare montaggio */}
      <Dialog open={isAvviaDialogOpen} onOpenChange={setIsAvviaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avvia montaggio</DialogTitle>
            <DialogDescription>
              Conferma di voler avviare il lavoro su questo montaggio.
            </DialogDescription>
          </DialogHeader>
          
          {montaggioSelezionato && (
            <div className="py-4">
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="font-medium">
                  {eventi.find(e => e.id === montaggioSelezionato.eventoId)?.titolo || 
                   montaggioSelezionato.titolo || 
                   `Montaggio #${montaggioSelezionato.id}`}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Priorità: {montaggioSelezionato.priorita}/10
                </p>
                <p className="text-sm text-muted-foreground">
                  Consegna: {format(parseISO(montaggioSelezionato.dataConsegnaPrevista), "PPP", { locale: it })}
                </p>
                {montaggioSelezionato.acconto && (
                  <p className="text-sm text-muted-foreground">
                    Acconto: {formatCurrency(Number(montaggioSelezionato.acconto))}
                  </p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAvviaDialogOpen(false)}
              disabled={avviaMutation.isPending}
            >
              Annulla
            </Button>
            <Button 
              onClick={confirmAvviaMontaggio} 
              disabled={avviaMutation.isPending}
            >
              {avviaMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Conferma avvio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per completare montaggio */}
      <Dialog open={isCompletaDialogOpen} onOpenChange={setIsCompletaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completa montaggio</DialogTitle>
            <DialogDescription>
              Registra il saldo finale per questo montaggio.
            </DialogDescription>
          </DialogHeader>
          
          {montaggioSelezionato && (
            <Form {...completaForm}>
              <form onSubmit={completaForm.handleSubmit(onSubmitCompletaMontaggio)} className="space-y-6">
                <div className="p-3 bg-muted/30 rounded-md mb-4">
                  <p className="font-medium">
                    {eventi.find(e => e.id === montaggioSelezionato.eventoId)?.titolo || 
                     montaggioSelezionato.titolo || 
                     `Montaggio #${montaggioSelezionato.id}`}
                  </p>
                  {montaggioSelezionato.acconto && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Acconto: {formatCurrency(Number(montaggioSelezionato.acconto))}
                    </p>
                  )}
                </div>

                <FormField
                  control={completaForm.control}
                  name="saldo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Importo saldo (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormDescription>
                        Inserisci l'importo del saldo da pagare
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={completaForm.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note (opzionale)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Aggiungi note sul lavoro completato"
                          {...field}
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        Aggiungi eventuali dettagli o commenti sul montaggio completato
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCompletaDialogOpen(false)}
                    disabled={completaMutation.isPending}
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={completaMutation.isPending}
                  >
                    {completaMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Completa e registra saldo
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}