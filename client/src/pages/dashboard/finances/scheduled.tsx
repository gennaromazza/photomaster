import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  CalendarClock, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Search, 
  FileText, 
  Banknote,
  AlertCircle,
  ExternalLink,
  Loader2,
  Euro,
  Plus,
  Mail
} from "lucide-react";
import { format, parseISO, isBefore } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";

// Tipo per i pagamenti programmati
type ScheduledPayment = {
  id: number;
  quoteId: number;
  description: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  transactionId: number | null;
  reminderSent: boolean;
  note: string | null;
  quote?: {
    id: number;
    title: string;
    client?: {
      id: number;
      firstName: string;
      lastName: string;
    };
  };
};

/**
 * Pagina per la gestione dei pagamenti programmati
 * Mostra tutti i pagamenti pianificati associati ai preventivi
 */
export default function ScheduledPaymentsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<ScheduledPayment | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  
  // Carica i pagamenti programmati
  const { data: scheduledPayments, isLoading } = useQuery<ScheduledPayment[]>({
    queryKey: ["/api/finance/scheduled-payments"],
    queryFn: async () => {
      const res = await fetch("/api/finance/scheduled-payments");
      if (!res.ok) {
        throw new Error("Errore nel caricamento dei pagamenti programmati");
      }
      return res.json();
    },
  });

  // Mutation per registrare un pagamento
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPayment) return null;
      
      const res = await apiRequest("POST", "/api/finance/transactions", {
        type: "income",
        amount: parseFloat(paymentAmount),
        description: `Pagamento per: ${selectedPayment.description}`,
        source: "quote",
        sourceId: selectedPayment.quoteId,
        date: new Date().toISOString(),
        scheduledPaymentId: selectedPayment.id,
      });
      
      if (!res.ok) {
        throw new Error("Errore nella registrazione del pagamento");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Pagamento registrato",
        description: "Il pagamento è stato registrato con successo",
      });
      
      // Chiudi il dialog e invalida la query
      setIsPaymentDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/finance/scheduled-payments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation per inviare un promemoria
  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPayment) return null;
      
      const res = await apiRequest("POST", `/api/finance/scheduled-payments/${selectedPayment.id}/reminder`, {});
      
      if (!res.ok) {
        throw new Error("Errore nell'invio del promemoria");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Promemoria inviato",
        description: "Il promemoria è stato inviato con successo",
      });
      
      // Chiudi il dialog e invalida la query
      setIsReminderDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/finance/scheduled-payments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filtra i pagamenti in base al filtro selezionato e alla ricerca
  const filteredPayments = scheduledPayments?.filter(payment => {
    // Filtro per stato
    if (filter !== "all" && payment.status !== filter) {
      return false;
    }
    
    // Filtro per ricerca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        payment.description.toLowerCase().includes(query) ||
        payment.quote?.title.toLowerCase().includes(query) ||
        payment.quote?.client?.firstName.toLowerCase().includes(query) ||
        payment.quote?.client?.lastName.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Raggruppa i pagamenti per mese
  const groupedPayments: Record<string, ScheduledPayment[]> = {};
  
  filteredPayments?.forEach(payment => {
    const date = new Date(payment.dueDate);
    const month = format(date, "MMMM yyyy", { locale: it });
    
    if (!groupedPayments[month]) {
      groupedPayments[month] = [];
    }
    
    groupedPayments[month].push(payment);
  });

  // Ordina i mesi cronologicamente
  const sortedMonths = Object.keys(groupedPayments).sort((a, b) => {
    // Creiamo una funzione helper per ottenere l'indice del mese dall'italiano
    const getMonthIndex = (monthName: string): number => {
      const lowerMonth = monthName.toLowerCase();
      const italianMonths = [
        "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", 
        "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"
      ];
      return italianMonths.findIndex(m => lowerMonth === m);
    };
    
    const monthA = a.split(" ")[0];
    const yearA = parseInt(a.split(" ")[1]);
    const monthB = b.split(" ")[0];
    const yearB = parseInt(b.split(" ")[1]);
    
    const dateA = new Date(yearA, getMonthIndex(monthA));
    const dateB = new Date(yearB, getMonthIndex(monthB));
    
    return dateA.getTime() - dateB.getTime();
  });

  // Helper per ottenere il colore di stato
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case 'pending':
        return "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20";
      case 'overdue':
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
  };

  // Helper per visualizzare lo stato in italiano
  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return "Pagato";
      case 'pending':
        return "In attesa";
      case 'overdue':
        return "Scaduto";
      default:
        return "Sconosciuto";
    }
  };

  // Funzione per aprire il dialog di pagamento
  const handleOpenPaymentDialog = (payment: ScheduledPayment) => {
    setSelectedPayment(payment);
    setPaymentAmount(payment.amount.toString());
    setIsPaymentDialogOpen(true);
  };

  // Funzione per aprire il dialog di promemoria
  const handleOpenReminderDialog = (payment: ScheduledPayment) => {
    setSelectedPayment(payment);
    setIsReminderDialogOpen(true);
  };

  return (
    <PageWrapper>
      <div className="flex flex-col">
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            className="mr-4" 
            onClick={() => setLocation("/dashboard/finances")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <h1 className="text-3xl font-playfair font-bold">Pagamenti Programmati</h1>
        </div>
        
        {/* Filtri e ricerca */}
        <div className="flex justify-between items-center mb-6">
          <Tabs defaultValue="all" value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">Tutti</TabsTrigger>
              <TabsTrigger value="pending">In attesa</TabsTrigger>
              <TabsTrigger value="overdue">Scaduti</TabsTrigger>
              <TabsTrigger value="paid">Pagati</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="relative w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca pagamenti..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Lista pagamenti */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
          </div>
        ) : filteredPayments?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <CalendarClock className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <h3 className="text-xl font-medium mb-1">Nessun pagamento programmato</h3>
              <p className="text-muted-foreground mb-6">
                Non ci sono pagamenti programmati che corrispondono ai criteri selezionati
              </p>
              <Button onClick={() => { setFilter("all"); setSearchQuery(""); }}>
                Mostra tutti i pagamenti
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {sortedMonths.map(month => (
              <div key={month}>
                <h2 className="text-xl font-medium mb-4 capitalize">{month}</h2>
                <div className="space-y-3">
                  {groupedPayments[month]
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .map(payment => (
                    <Card key={payment.id} className={`transition-colors ${
                      payment.status === 'overdue' ? 'border-red-200' : ''
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-full flex items-center justify-center ${
                              payment.status === 'paid' ? 'bg-green-100' : 
                              payment.status === 'overdue' ? 'bg-red-100' : 'bg-amber-100'
                            }`}>
                              {payment.status === 'paid' ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : payment.status === 'overdue' ? (
                                <AlertCircle className="h-5 w-5 text-red-600" />
                              ) : (
                                <Clock className="h-5 w-5 text-amber-600" />
                              )}
                            </div>
                            
                            <div className="space-y-1 pt-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{payment.description}</h3>
                                <Badge variant="outline" className={`text-xs ${getStatusColor(payment.status)}`}>
                                  {getStatusText(payment.status)}
                                </Badge>
                              </div>
                              
                              <div className="text-sm text-muted-foreground">
                                Preventivo: {payment.quote?.title || "N/A"} • 
                                Cliente: {payment.quote?.client ? 
                                  `${payment.quote.client.firstName} ${payment.quote.client.lastName}` : 
                                  "N/A"
                                }
                              </div>
                              
                              <div className="flex items-center gap-3 mt-1 text-sm">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>Scadenza: {format(new Date(payment.dueDate), "d MMMM yyyy", { locale: it })}</span>
                                </div>
                                
                                {payment.reminderSent && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Mail className="h-3.5 w-3.5" />
                                    <span>Promemoria inviato</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end">
                            <div className="text-xl font-medium">€ {payment.amount.toFixed(2)}</div>
                            <div className="flex gap-2 mt-2">
                              {payment.status !== 'paid' && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleOpenPaymentDialog(payment)}
                                  >
                                    <Banknote className="h-4 w-4 mr-1" />
                                    Registra
                                  </Button>
                                  
                                  {!payment.reminderSent && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleOpenReminderDialog(payment)}
                                    >
                                      <Mail className="h-4 w-4 mr-1" />
                                      Promemoria
                                    </Button>
                                  )}
                                </>
                              )}
                              
                              <Button 
                                variant="outline" 
                                size="sm" 
                                asChild
                              >
                                <Link href={`/quotes/detail/${payment.quoteId}`}>
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Preventivo
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Dialog per registrare un pagamento */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registra Pagamento</DialogTitle>
            <DialogDescription>
              Registra un pagamento per {selectedPayment?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label className="text-right">Importo</Label>
              <div className="col-span-3">
                <div className="relative">
                  <Euro className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-8"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label className="text-right">Data Scadenza</Label>
              <div className="col-span-3">
                <p className="text-sm py-1">
                  {selectedPayment?.dueDate ? 
                    format(new Date(selectedPayment.dueDate), "d MMMM yyyy", { locale: it }) : 
                    "N/A"
                  }
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 items-center">
              <Label className="text-right">Stato</Label>
              <div className="col-span-3">
                <Badge variant="outline" className={`text-xs ${selectedPayment ? getStatusColor(selectedPayment.status) : ""}`}>
                  {selectedPayment ? getStatusText(selectedPayment.status) : ""}
                </Badge>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsPaymentDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button 
              onClick={() => recordPaymentMutation.mutate()}
              disabled={recordPaymentMutation.isPending}
            >
              {recordPaymentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrazione...
                </>
              ) : (
                <>
                  <Banknote className="mr-2 h-4 w-4" />
                  Registra Pagamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog per inviare un promemoria */}
      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invia Promemoria Pagamento</DialogTitle>
            <DialogDescription>
              Vuoi inviare un promemoria per il pagamento "{selectedPayment?.description}"?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <p>
              Verrà inviata un'email di promemoria con i dettagli del pagamento.
              L'email sarà inviata al cliente associato a questo preventivo.
            </p>
            
            <div className="rounded-md bg-amber-50 p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-amber-800">Promemoria automatico</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Il sistema registrerà che è stato inviato un promemoria e non sarà possibile
                    inviarne un altro per questo pagamento.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsReminderDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button 
              onClick={() => sendReminderMutation.mutate()}
              disabled={sendReminderMutation.isPending}
            >
              {sendReminderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Invio...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Invia Promemoria
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}