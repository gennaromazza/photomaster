import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/layout/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { 
  User, 
  Calendar, 
  MapPin, 
  Clock, 
  Mail, 
  Phone, 
  FileText, 
  CheckCircle2, 
  Circle, 
  Edit, 
  Trash, 
  Download, 
  Send, 
  Share2,
  Copy,
  ArrowLeft,
  Euro,
  Camera,
  ClipboardCheck,
  Info,
  Plus,
  Check,
  Loader2
} from "lucide-react";

export default function QuoteDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Carica i dati del preventivo
  const { data: quote, isLoading: isLoadingQuote } = useQuery({
    queryKey: ["/api/quotes", parseInt(id)],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/${id}`);
      if (!res.ok) throw new Error("Errore nel caricamento del preventivo");
      return res.json();
    },
  });

  // Stato per gestire le fasi del workflow
  const [workflowSteps, setWorkflowSteps] = useState([
    { id: 1, name: "Data di creazione", date: "", completed: true, current: false },
    { id: 2, name: "Primo appuntamento", date: "", completed: false, current: true },
    { id: 3, name: "Modulo di prenotazione", date: "", completed: false, current: false },
    { id: 4, name: "Lavoro confermato", date: "", completed: false, current: false },
    { id: 5, name: "Data del lavoro", date: "", completed: false, current: false },
    { id: 6, name: "Inizio lavorazione", date: "", completed: false, current: false },
    { id: 7, name: "Appuntamento visione file", date: "", completed: false, current: false },
    { id: 8, name: "Lavoro Completo", date: "", completed: false, current: false },
    { id: 9, name: "App. Consegna/Archivio", date: "", completed: false, current: false },
  ]);

  // Imposta le date del workflow quando il preventivo è caricato
  useEffect(() => {
    if (quote) {
      try {
        // Aggiorna la data di creazione nel workflow
        const updatedSteps = [...workflowSteps];
        
        // Data di creazione
        if (quote.createdAt) {
          updatedSteps[0].date = format(new Date(quote.createdAt), "dd/MM/yyyy HH:mm", { locale: it });
        }
        
        // Data evento
        if (quote.eventDate) {
          updatedSteps[4].date = format(new Date(quote.eventDate), "dd/MM/yyyy", { locale: it });
          if (quote.eventTime) {
            updatedSteps[4].date += ` ${quote.eventTime}`;
          }
        }
        
        // Se lo stato è confermato, aggiorna anche la fase 4
        if (quote.status === "approved" || quote.status === "confermato") {
          updatedSteps[3].completed = true;
          updatedSteps[3].current = false;
          updatedSteps[4].current = true;
        }
        
        setWorkflowSteps(updatedSteps);
      } catch (error) {
        console.error("Errore nell'aggiornamento del workflow:", error);
      }
    }
  }, [quote]);

  // Mutation per eliminare il preventivo
  const deleteQuoteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/quotes/${id}`);
      if (!res.ok) throw new Error("Errore nell'eliminazione del preventivo");
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Preventivo eliminato",
        description: "Il preventivo è stato eliminato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setLocation("/quotes");
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare uno step del workflow
  const updateWorkflowStepMutation = useMutation({
    mutationFn: async ({ stepId, completed }: { stepId: number, completed: boolean }) => {
      // Esempio: in un'implementazione reale, salverebbe lo stato dello step nel DB
      return { stepId, completed };
    },
    onSuccess: (data) => {
      const { stepId, completed } = data;
      const updatedSteps = [...workflowSteps];
      
      // Aggiorna lo step corrente
      updatedSteps[stepId - 1].completed = completed;
      updatedSteps[stepId - 1].current = false;
      
      // Se completato, aggiorna il prossimo step come corrente
      if (completed && stepId < updatedSteps.length) {
        updatedSteps[stepId].current = true;
      }
      
      setWorkflowSteps(updatedSteps);
      
      toast({
        title: "Workflow aggiornato",
        description: `Fase "${updatedSteps[stepId - 1].name}" completata.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il workflow",
        variant: "destructive",
      });
    },
  });

  if (isLoadingQuote) {
    return (
      <Layout>
        <div className="container py-6">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-pulse text-center">
              <div className="h-8 w-64 bg-gray-200 rounded mb-4 mx-auto"></div>
              <div className="h-4 w-40 bg-gray-200 rounded mb-8 mx-auto"></div>
              <div className="h-32 w-full max-w-3xl bg-gray-200 rounded mx-auto"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!quote) {
    return (
      <Layout>
        <div className="container py-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Preventivo non trovato</h2>
            <p className="text-muted-foreground mb-4">
              Il preventivo richiesto non esiste o è stato eliminato.
            </p>
            <Button onClick={() => setLocation("/quotes")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna ai preventivi
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    deleteQuoteMutation.mutate();
    setIsDeleteDialogOpen(false);
  };

  const completeWorkflowStep = (stepId: number) => {
    updateWorkflowStepMutation.mutate({ stepId, completed: true });
  };

  return (
    <Layout>
      <div className="container py-6">
        {/* Header con informazioni preventivo e pulsanti azione */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/quotes")} 
              className="mr-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Indietro
            </Button>
            <div>
              <h1 className="text-3xl font-playfair font-bold">{quote.title || "Preventivo"}</h1>
              <div className="flex items-center mt-1">
                <Badge 
                  variant={quote.status === "confermato" || quote.status === "approved" ? "success" : 
                           quote.status === "in attesa" || quote.status === "pending" ? "warning" : 
                           "default"}
                  className="mr-2"
                >
                  {quote.status === "draft" ? "Bozza" : 
                   quote.status === "pending" || quote.status === "in attesa" ? "In attesa" : 
                   quote.status === "approved" || quote.status === "confermato" ? "Confermato" : 
                   quote.status === "rejected" || quote.status === "rifiutato" ? "Rifiutato" : 
                   quote.status || "Preventivo"}
                </Badge>
                <div className="flex items-center text-muted-foreground">
                  <Info className="h-4 w-4 mr-1" />
                  <p>Creato il {quote.createdAt ? format(new Date(quote.createdAt), "dd/MM/yyyy", { locale: it }) : ""}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setLocation(`/quotes/new-redesign?edit=${id}`)}>
              <Edit className="mr-2 h-4 w-4" />
              Modifica
            </Button>
            <Button variant="outline" onClick={() => {/* TODO: implement share */}}>
              <Share2 className="mr-2 h-4 w-4" />
              Condividi
            </Button>
            <Button variant="destructive" onClick={handleDeleteClick}>
              <Trash className="mr-2 h-4 w-4" />
              Elimina
            </Button>
          </div>
        </div>

        {/* Notifica stato */}
        <div className="bg-muted/50 border rounded-md px-4 py-3 mb-6 text-center">
          <p>Cambiando lo stato da "Preventivo" a "Confermato" automaticamente il modulo sarà trasferito in Eventi al momento nel calendario.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonna principale con informazioni preventivo */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sezione Clienti */}
            <Tabs defaultValue="client1" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="client1" className="flex-1">Cliente Principale</TabsTrigger>
                <TabsTrigger value="client2" className="flex-1">Secondo Cliente</TabsTrigger>
              </TabsList>
              <TabsContent value="client1" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start">
                      <div className="bg-gray-200 rounded-full h-20 w-20 flex items-center justify-center">
                        <User className="h-10 w-10 text-gray-500" />
                      </div>
                      <div className="ml-6">
                        <h3 className="text-xl font-semibold">
                          {quote.client?.firstName} {quote.client?.lastName}
                        </h3>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="mr-2 h-4 w-4" />
                            {quote.client?.phone || "Nessun telefono"}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="mr-2 h-4 w-4" />
                            {quote.client?.email || "Nessuna email"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4 space-x-2">
                      <Button size="sm" variant="ghost" className="text-xs">
                        <Copy className="mr-1 h-3 w-3" />
                        Copia Cliente
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs">
                        Modifica Cliente
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs">
                        <Send className="mr-1 h-3 w-3" />
                        Invia Email
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="client2" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {quote.secondClient ? (
                      <div className="flex items-start">
                        <div className="bg-gray-200 rounded-full h-20 w-20 flex items-center justify-center">
                          <User className="h-10 w-10 text-gray-500" />
                        </div>
                        <div className="ml-6">
                          <h3 className="text-xl font-semibold">
                            {quote.secondClient.firstName} {quote.secondClient.lastName}
                          </h3>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Phone className="mr-2 h-4 w-4" />
                              {quote.secondClient.phone || "Nessun telefono"}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Mail className="mr-2 h-4 w-4" />
                              {quote.secondClient.email || "Nessuna email"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <User className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <h3 className="text-muted-foreground">Nessun secondo cliente associato</h3>
                        <Button variant="outline" size="sm" className="mt-2">
                          <User className="mr-2 h-4 w-4" />
                          Aggiungi secondo cliente
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Dettagli servizio */}
            <Card>
              <CardHeader>
                <CardTitle>Servizio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Tipo Lavoro</h4>
                    <p className="font-medium">{quote.eventType || "Non specificato"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Workflow</h4>
                    <p className="font-medium">{quote.workflow || "Default"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Data Evento</h4>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                      <p className="font-medium">
                        {quote.eventDate ? format(new Date(quote.eventDate), "dd/MM/yyyy", { locale: it }) : "Non specificata"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Orario</h4>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                      <p className="font-medium">
                        {quote.isFullDay ? "Giornata intera" : 
                         (quote.eventTime ? quote.eventTime : "Non specificato") +
                         (quote.eventEndTime ? ` - ${quote.eventEndTime}` : "")}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Location</h4>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                      <p className="font-medium">{quote.location || "Non specificata"}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Provenienza</h4>
                    <p className="font-medium">{quote.leadSource?.name || "Non specificata"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Settore</h4>
                    <p className="font-medium">{quote.category?.name || "Non specificato"}</p>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Operatori</h4>
                    <p className="font-medium">{quote.assignedCollaborators?.length ? "Assegnati" : "Nessun operatore assegnato"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Moduli e prodotti */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Moduli</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi Modulo
                </Button>
              </CardHeader>
              <CardContent>
                {quote.quoteItems && quote.quoteItems.length > 0 ? (
                  <div className="space-y-4">
                    {quote.quoteItems.map((item: any) => (
                      <div key={item.id} className="border rounded-md p-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">{item.service?.name || "Servizio"}</h4>
                          <Badge variant="outline">€ {(item.total || 0).toLocaleString()}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.quantity || 1} x €{(item.unitPrice || 0).toLocaleString()}
                          {item.hasDiscount && (
                            <span> (-{item.discountType === 'percentage' ? `${item.discountValue}%` : `€${item.discountValue}`})</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-md">
                    <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-muted-foreground">Nessun modulo aggiunto</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Aggiungi primo modulo
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Totale Moduli</p>
                  <p className="font-medium text-xl">€ {(quote.subtotal || 0).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Totale Preventivo</p>
                  <p className="font-medium text-xl">€ {(quote.total || 0).toLocaleString()}</p>
                </div>
              </CardFooter>
            </Card>

            {/* Acconti */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Acconti</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Registra Acconto
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 border rounded-md">
                  <Euro className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-muted-foreground">Nessun acconto registrato</p>
                </div>
              </CardContent>
            </Card>

            {/* Note */}
            <Card>
              <CardHeader>
                <CardTitle>Note</CardTitle>
              </CardHeader>
              <CardContent>
                {quote.notes ? (
                  <p className="text-sm">{quote.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nessuna nota</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonna laterale con timeline del workflow */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader className="bg-primary text-primary-foreground">
                <CardTitle>Workflow</CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  Stato del preventivo
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="relative">
                  {/* Linea verticale */}
                  <div className="absolute left-3 top-0 h-full w-0.5 bg-gray-200"></div>
                  
                  {/* Steps */}
                  <div className="space-y-6">
                    {workflowSteps.map((step) => (
                      <div key={step.id} className="relative flex items-start pl-10">
                        <div className="absolute left-0 flex items-center justify-center w-7 h-7">
                          <div className={`absolute w-7 h-7 rounded-full flex items-center justify-center
                            ${step.completed ? 'bg-primary text-primary-foreground' : 
                              step.current ? 'border-2 border-primary bg-white' : 
                              'bg-gray-200'}`}>
                            {step.completed ? <Check className="w-4 h-4" /> : null}
                          </div>
                        </div>
                        <div className={`flex-1 pb-2 ${step.current ? 'text-primary font-medium' : ''}`}>
                          <h4 className={`text-sm font-medium ${step.current ? 'text-primary' : ''}`}>
                            {step.name}
                          </h4>
                          {step.date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {step.date}
                            </p>
                          )}
                          
                          {step.current && (
                            <div className="mt-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-xs"
                                onClick={() => completeWorkflowStep(step.id)}
                              >
                                Completa fase
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Dialog di conferma per l'eliminazione */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare il preventivo "{quote?.title}"? 
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteQuoteMutation.isPending}
            >
              {deleteQuoteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash className="mr-2 h-4 w-4" />
                  Elimina Preventivo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}