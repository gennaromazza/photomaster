import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { it } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  ArrowUpRight,
  ArrowDownRight,
  Euro,
  Plus,
  Calendar,
  AlertCircle,
  Check,
  Clock,
  Trash2,
  Edit,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Funzione di formattazione degli importi specifica per i valori già in euro (non in centesimi)
const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

interface FinancialSummaryProps {
  quoteId: number;
  quoteTotal?: number;
  totalAmount?: number; // Supporta anche totalAmount per retrocompatibilità
  readOnly?: boolean;
  clientName?: string;
  quoteStatus?: string; // Lo stato del preventivo per verificare se è firmato
}

export function FinancialSummary({
  quoteId,
  quoteTotal = 0,
  totalAmount,
  readOnly = false,
  clientName = "",
  quoteStatus = "",
}: FinancialSummaryProps) {
  // Usa totalAmount se fornito, altrimenti usa quoteTotal
  const totalPreventivo = totalAmount !== undefined ? totalAmount : quoteTotal;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddScheduledOpen, setIsAddScheduledOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(
    null,
  );
  const [isEditingPayment, setIsEditingPayment] = useState(false);

  // Riferimenti ai form
  const transactionFormRef = useRef<HTMLFormElement>(null);
  const scheduledFormRef = useRef<HTMLFormElement>(null);

  // Stati per i form
  const [transactionData, setTransactionData] = useState({
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    method: "",
    reference: "",
    description: "",
    notes: "",
  });

  const [scheduledData, setScheduledData] = useState({
    amount: "",
    dueDate: format(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd",
    ),
    description: "",
    paymentMethod: "",
    notes: "",
  });

  // Ottieni le transazioni per questo preventivo
  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ['quoteTransactions', quoteId],
    queryFn: () => apiRequest(
      'GET',
      `/api/finance/quotes/${quoteId}/transactions`
    ).then(res => res.json()),
    enabled: !!quoteId, 
    refetchOnWindowFocus: true, 
    staleTime: 5000,
    refetchInterval: 60 * 1000 
  });

  // Ottieni i pagamenti programmati per questo preventivo
  const {
    data: scheduledPayments = [],
    isLoading: scheduledLoading,
    refetch: refetchScheduled,
  } = useQuery({
    queryKey: ['quoteScheduledPayments', quoteId],
    queryFn: () => apiRequest(
      'GET',
      `/api/finance/quotes/${quoteId}/scheduled`
    ).then(res => res.json()),
    enabled: !!quoteId, 
    refetchOnWindowFocus: true, 
    staleTime: 5000,
    refetchInterval: 60 * 1000 
  });

  // Mutation per creare una nuova transazione
  const createTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(
        "POST",
        "/api/finance/transactions",
        data,
      );
      return response.json();
    },
    onSuccess: () => {
      setIsAddTransactionOpen(false);
      setTransactionData({
        amount: "",
        date: format(new Date(), "yyyy-MM-dd"),
        method: "",
        reference: "",
        description: "",
        notes: "",
      });

      // Invalida le query e forza un aggiornamento immediato
      queryClient.invalidateQueries({
        queryKey: ['quoteTransactions', quoteId],
      });

      // Forza il refetch per aggiornare immediatamente i dati visualizzati
      refetchTransactions();

      // Invalida anche altre queries che potrebbero dipendere da questi dati
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId] });

      toast({
        title: "Pagamento registrato",
        description: "Il pagamento è stato registrato con successo.",
      });
    },
    onError: (error: any) => {
      console.error("Errore nella registrazione del pagamento:", error);
      toast({
        title: "Errore",
        description: "Impossibile registrare il pagamento. Riprova più tardi.",
        variant: "destructive",
      });
    },
  });

  // Mutation per creare un nuovo pagamento programmato
  const createScheduledPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(
        "POST",
        "/api/finance/scheduled-payments",
        data,
      );
      return response.json();
    },
    onSuccess: () => {
      setIsAddScheduledOpen(false);
      setScheduledData({
        amount: "",
        dueDate: format(
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          "yyyy-MM-dd",
        ),
        description: "",
        paymentMethod: "",
        notes: "",
      });

      // Invalida le query per aggiornare i dati
      queryClient.invalidateQueries({
        queryKey: ['quoteScheduledPayments', quoteId],
      });

      // Forza il refetch immediato dei dati
      refetchScheduled();

      // Invalida anche altre queries che potrebbero dipendere da questi dati
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId] });

      toast({
        title: "Rata programmata",
        description: "La rata di pagamento è stata programmata con successo.",
      });
    },
    onError: (error: any) => {
      console.error("Errore nella programmazione della rata:", error);
      toast({
        title: "Errore",
        description: "Impossibile programmare la rata. Riprova più tardi.",
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare un pagamento programmato
  const deleteScheduledPaymentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/finance/scheduled-payments/${id}`,
      );
      return response.json();
    },
    onSuccess: () => {
      // Invalida le query per aggiornare i dati
      queryClient.invalidateQueries({
        queryKey: ['quoteScheduledPayments', quoteId],
      });

      // Forza il refetch immediato
      refetchScheduled();

      // Invalida anche altre queries che potrebbero dipendere da questi dati
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId] });

      toast({
        title: "Rata eliminata",
        description: "La rata di pagamento è stata eliminata con successo.",
      });
    },
    onError: (error: any) => {
      console.error("Errore nell'eliminazione della rata:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la rata. Riprova più tardi.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation per aggiornare una transazione esistente
  const updateTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(
        "PUT",
        `/api/finance/transactions/${data.id}`,
        data,
      );
      return response.json();
    },
    onSuccess: () => {
      setIsEditingPayment(false);
      setTransactionData({
        amount: "",
        date: format(new Date(), "yyyy-MM-dd"),
        method: "",
        reference: "",
        description: "",
        notes: "",
      });
      setSelectedPaymentId(null);

      // Invalida le query per aggiornare i dati
      queryClient.invalidateQueries({
        queryKey: ['quoteTransactions', quoteId],
      });

      // Forza il refetch immediato
      refetchTransactions();

      // Invalida anche altre queries che potrebbero dipendere da questi dati
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId] });

      toast({
        title: "Pagamento aggiornato",
        description: "Il pagamento è stato aggiornato con successo.",
      });
    },
    onError: (error: any) => {
      console.error("Errore nell'aggiornamento del pagamento:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il pagamento. Riprova più tardi.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation per eliminare una transazione
  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/finance/transactions/${id}`,
      );
      return response.json();
    },
    onSuccess: () => {
      // Invalida le query per aggiornare i dati
      queryClient.invalidateQueries({
        queryKey: ['quoteTransactions', quoteId],
      });

      // Forza il refetch immediato
      refetchTransactions();

      // Invalida anche altre queries che potrebbero dipendere da questi dati
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId] });

      toast({
        title: "Pagamento eliminato",
        description: "Il pagamento è stato eliminato con successo.",
      });
    },
    onError: (error: any) => {
      console.error("Errore nell'eliminazione del pagamento:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare il pagamento. Riprova più tardi.",
        variant: "destructive",
      });
    },
  });

  // Mutation per registrare un pagamento programmato
  const markAsPaidMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(
        "POST",
        "/api/finance/transactions",
        data,
      );
      return response.json();
    },
    onSuccess: () => {
      // Invalida le query per aggiornare i dati
      queryClient.invalidateQueries({
        queryKey: ['quoteTransactions', quoteId],
      });
      queryClient.invalidateQueries({
        queryKey: ['quoteScheduledPayments', quoteId],
      });

      // Forza il refetch immediato dei dati
      refetchTransactions();
      refetchScheduled();

      // Invalida anche altre queries che potrebbero dipendere da questi dati
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId] });

      toast({
        title: "Pagamento registrato",
        description: "La rata di pagamento è stata registrata come pagata.",
      });
    },
    onError: (error: any) => {
      console.error("Errore nella registrazione del pagamento:", error);
      toast({
        title: "Errore",
        description: "Impossibile registrare il pagamento. Riprova più tardi.",
        variant: "destructive",
      });
    },
  });

  // Funzione per gestire la sottomissione del form di transazione
  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verifica che il preventivo sia firmato prima di permettere l'aggiunta di pagamenti
    if (!isQuoteSigned()) {
      toast({
        title: "Operazione non consentita",
        description:
          "Puoi registrare pagamenti solo dopo che il preventivo è stato firmato dal cliente.",
        variant: "destructive",
      });
      return;
    }

    // Validazione dei campi richiesti
    if (!transactionData.amount || !transactionData.date) {
      toast({
        title: "Errore di validazione",
        description: "Importo e data sono campi obbligatori.",
        variant: "destructive",
      });
      return;
    }

    // Log della transazione prima dell'invio
    console.log("Creating transaction:", transactionData);

    // Prepara l'oggetto transazione
    const newTransaction = {
      type: "income",
      amount: parseFloat(transactionData.amount),
      date: transactionData.date, // Inviamo la data come stringa, sarà formattata lato server
      description:
        transactionData.description || `Pagamento per preventivo #${quoteId}`,
      quoteId: quoteId, // Utilizziamo il nome del campo corretto
      status: "completed",
      paymentMethod: transactionData.method || null,
      reference: transactionData.reference || null,
      notes: transactionData.notes || null,
    };

    // Invia la richiesta per creare la transazione
    createTransactionMutation.mutate(newTransaction);
  };

  // Funzione per gestire la sottomissione del form di pagamento programmato
  const handleScheduledSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verifica che il preventivo sia firmato prima di permettere l'aggiunta di pagamenti programmati
    if (!isQuoteSigned()) {
      toast({
        title: "Operazione non consentita",
        description:
          "Puoi programmare pagamenti solo dopo che il preventivo è stato firmato dal cliente.",
        variant: "destructive",
      });
      return;
    }

    // Validazione dei campi richiesti
    if (!scheduledData.amount || !scheduledData.dueDate) {
      toast({
        title: "Errore di validazione",
        description: "Importo e data di scadenza sono campi obbligatori.",
        variant: "destructive",
      });
      return;
    }

    // Prepara l'oggetto pagamento programmato
    const newScheduledPayment = {
      quoteId,
      amount: parseFloat(scheduledData.amount),
      dueDate: scheduledData.dueDate, // Inviamo la data come stringa, verrà formattata dal server
      description:
        scheduledData.description || `Rata per preventivo #${quoteId}`,
      status: "pending",
      paymentMethod: scheduledData.paymentMethod || null,
      notes: scheduledData.notes || null,
    };

    // Invia la richiesta per creare il pagamento programmato
    createScheduledPaymentMutation.mutate(newScheduledPayment);
  };

  // Funzione per eliminare un pagamento programmato
  const handleDeleteScheduledPayment = () => {
    if (selectedPaymentId) {
      deleteScheduledPaymentMutation.mutate(selectedPaymentId);
      setIsDeleteDialogOpen(false);
      setSelectedPaymentId(null);
    }
  };
  
  // Funzione per gestire l'eliminazione di una transazione
  const handleDeleteTransaction = (id: number) => {
    if (id) {
      deleteTransactionMutation.mutate(id);
    }
  };

  // Funzione per gestire la modifica di una transazione
  const handleEditTransaction = (transaction: any) => {
    setSelectedPaymentId(transaction.id);
    setTransactionData({
      amount: transaction.amount.toString(),
      date: format(new Date(transaction.date), "yyyy-MM-dd"),
      method: transaction.paymentMethod || "",
      reference: transaction.reference || "",
      description: transaction.description || "",
      notes: transaction.notes || "",
    });
    setIsEditingPayment(true);
    setIsAddTransactionOpen(true);
  };

  // Funzione per registrare un pagamento per una rata programmata
  const handleMarkAsPaid = (payment: any) => {
    // Verifica che il preventivo sia firmato prima di permettere la registrazione del pagamento
    if (!isQuoteSigned()) {
      toast({
        title: "Operazione non consentita",
        description:
          "Puoi registrare pagamenti solo dopo che il preventivo è stato firmato dal cliente.",
        variant: "destructive",
      });
      return;
    }

    const transactionData = {
      type: "income",
      amount: parseFloat(payment.amount),
      date: format(new Date(), "yyyy-MM-dd"), // Inviamo la data come stringa formattata
      description:
        payment.description || `Pagamento per preventivo #${quoteId}`,
      quoteId: quoteId, // Utilizziamo il nome del campo corretto
      status: "completed",
      paymentMethod: payment.paymentMethod || null,
      notes: payment.notes || null,
      scheduledPaymentId: payment.id, // Collegamento alla rata programmata
    };

    markAsPaidMutation.mutate(transactionData);
  };

  // Utilizziamo la funzione formatCurrency importata da utils.ts
  // La funzione importata gestisce la conversione da centesimi a euro
  // Nota: poiché nell'applicazione ora passiamo già i valori in centesimi,
  // non è più necessario moltiplicare per 100 nella nostra funzione formatAmount
  const formatAmount = (amount: number) => {
    return formatCurrency(amount);
  };

  // Calcola il totale pagato
  const totalPaid = transactions
    .filter((t: any) => t.type === "income" || t.type === "entrata")
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

  // Calcola il saldo da pagare
  const remainingBalance = totalPreventivo - totalPaid;

  // Calcola il totale dei pagamenti programmati
  const totalScheduled = scheduledPayments
    .filter((p: any) => p.status === "pending" || p.status === "overdue")
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

  // Verifica se il preventivo è firmato (status=confermato o approved)
  const isQuoteSigned = (): boolean => {
    // Se siamo in modalità sola lettura (link pubblico), consideriamo il preventivo firmato
    if (readOnly) return true;

    // Altrimenti controlliamo lo status del preventivo
    return quoteStatus === "confermato" || quoteStatus === "approved";
  };

  // Badge di stato per i pagamenti programmati
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="success">Pagato</Badge>;
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800">
            In attesa
          </Badge>
        );
      case "overdue":
        return <Badge variant="destructive">Scaduto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Nota: L'avviso di preventivo non firmato è stato spostato nel componente FinancialSummaryWrapper

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Totale Preventivo
            </CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(totalPreventivo)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Pagato</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {transactionsLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                formatAmount(totalPaid)
              )}
            </div>
            {!transactionsLoading && (
              <p className="text-xs text-muted-foreground mt-1">
                {transactions.filter(
                  (t: any) => t.type === "income" || t.type === "entrata"
                ).length > 0
                  ? `${
                      transactions.filter(
                        (t: any) => t.type === "income" || t.type === "entrata"
                      ).length
                    } pagament${
                      transactions.filter(
                        (t: any) => t.type === "income" || t.type === "entrata"
                      ).length === 1
                        ? "o"
                        : "i"
                    } registrat${
                      transactions.filter(
                        (t: any) => t.type === "income" || t.type === "entrata"
                      ).length === 1
                        ? "o"
                        : "i"
                    }`
                  : "Nessun pagamento registrato"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo da Pagare
            </CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {transactionsLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                formatAmount(remainingBalance)
              )}
            </div>
            {!scheduledLoading && (
              <p className="text-xs text-muted-foreground mt-1">
                {scheduledPayments.filter(
                  (p: any) => p.status === "pending" || p.status === "overdue"
                ).length > 0
                  ? `${formatAmount(
                      totalScheduled
                    )} programmati in ${
                      scheduledPayments.filter(
                        (p: any) =>
                          p.status === "pending" || p.status === "overdue"
                      ).length
                    } rat${
                      scheduledPayments.filter(
                        (p: any) =>
                          p.status === "pending" || p.status === "overdue"
                      ).length === 1
                        ? "a"
                        : "e"
                    }`
                  : "Nessuna rata programmata"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col h-full">
          <CardHeader>
            <div>
              <CardTitle>Pagamenti</CardTitle>
              <CardDescription>
                Pagamenti registrati per questo preventivo
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            {transactionsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Data</TableHead>
                    <TableHead>Dettagli</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    {!readOnly && <TableHead className="w-[100px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions
                    .filter(
                      (t: any) => t.type === "income" || t.type === "entrata",
                    )
                    .map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {format(new Date(transaction.date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {transaction.description}
                          </div>
                          {transaction.paymentMethod && (
                            <div className="text-xs text-muted-foreground">
                              Pagamento con {transaction.paymentMethod}
                              {transaction.reference &&
                                ` (${transaction.reference})`}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatAmount(parseFloat(transaction.amount))}
                        </TableCell>
                        {!readOnly && (
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditTransaction(transaction)}
                                className="h-8 w-8"
                                title="Modifica"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600"
                                    title="Elimina"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Eliminare questo pagamento?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Questa operazione non può essere annullata. Il pagamento verrà
                                      rimosso permanentemente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteTransaction(transaction.id)}>
                                      Elimina
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Euro className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">
                  Nessun pagamento registrato
                </h3>
                <p className="text-sm">
                  {isQuoteSigned()
                    ? "Non sono ancora stati registrati pagamenti per questo preventivo."
                    : "I pagamenti potranno essere registrati solo dopo che il preventivo sarà stato firmato dal cliente."}
                </p>
              </div>
            )}
          </CardContent>
          
          {!readOnly && (
            <CardFooter>
              <Dialog
                open={isAddTransactionOpen}
                onOpenChange={setIsAddTransactionOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    className="w-full"
                    disabled={!isQuoteSigned()}
                    title={
                      !isQuoteSigned()
                        ? "Puoi aggiungere pagamenti solo dopo che il preventivo è stato firmato"
                        : ""
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Pagamento
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {isEditingPayment
                        ? "Modifica pagamento"
                        : "Registra un nuovo pagamento"}
                    </DialogTitle>
                    <DialogDescription>
                      {isEditingPayment
                        ? "Modifica i dettagli del pagamento selezionato."
                        : `Inserisci i dettagli del pagamento ricevuto ${
                            clientName ? `da ${clientName}` : "dal cliente"
                          }.`}
                    </DialogDescription>
                  </DialogHeader>

                  <form
                    ref={transactionFormRef}
                    onSubmit={isEditingPayment ? handleUpdateTransactionSubmit : handleTransactionSubmit}
                    className="space-y-4 py-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="amount">Importo *</Label>
                      <div className="relative">
                        <Euro className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="amount"
                          placeholder="0,00"
                          className="pl-8"
                          type="number"
                          step="0.01"
                          value={transactionData.amount}
                          onChange={(e) =>
                            setTransactionData({
                              ...transactionData,
                              amount: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date">Data pagamento *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={transactionData.date}
                        onChange={(e) =>
                          setTransactionData({
                            ...transactionData,
                            date: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrizione</Label>
                      <Input
                        id="description"
                        placeholder="Acconto, Saldo, ecc."
                        value={transactionData.description}
                        onChange={(e) =>
                          setTransactionData({
                            ...transactionData,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="method">Metodo di pagamento</Label>
                      <Select
                        value={transactionData.method}
                        onValueChange={(value) =>
                          setTransactionData({
                            ...transactionData,
                            method: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona metodo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contanti">Contanti</SelectItem>
                          <SelectItem value="bonifico">Bonifico</SelectItem>
                          <SelectItem value="carta">
                            Carta di Credito/Debito
                          </SelectItem>
                          <SelectItem value="assegno">Assegno</SelectItem>
                          <SelectItem value="altro">Altro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reference">Riferimento</Label>
                      <Input
                        id="reference"
                        placeholder="Numero transazione, ricevuta, ecc."
                        value={transactionData.reference}
                        onChange={(e) =>
                          setTransactionData({
                            ...transactionData,
                            reference: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Note</Label>
                      <Textarea
                        id="notes"
                        placeholder="Eventuali note sul pagamento..."
                        rows={3}
                        value={transactionData.notes}
                        onChange={(e) =>
                          setTransactionData({
                            ...transactionData,
                            notes: e.target.value,
                          })
                        }
                      />
                    </div>

                    <DialogFooter className="mt-6">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setIsAddTransactionOpen(false)}
                      >
                        Annulla
                      </Button>
                      <Button
                        type="submit"
                        disabled={createTransactionMutation.isPending}
                      >
                        {createTransactionMutation.isPending ? (
                          <>
                            <svg
                              className="mr-2 h-4 w-4 animate-spin"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Registrazione...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Registra Pagamento
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardFooter>
          )}
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader>
            <div>
              <CardTitle>Rate di Pagamento</CardTitle>
              <CardDescription>
                Pagamenti programmati per questo preventivo
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            {scheduledLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : scheduledPayments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Scadenza</TableHead>
                    <TableHead>Dettagli</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    {!readOnly && <TableHead className="w-[100px]">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledPayments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{format(new Date(payment.dueDate), "dd/MM/yyyy")}</span>
                          <span className="text-xs mt-1">
                            {getStatusBadge(payment.status)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {payment.description}
                        </div>
                        {payment.paymentMethod && (
                          <div className="text-xs text-muted-foreground">
                            Metodo: {payment.paymentMethod}
                          </div>
                        )}
                        {payment.notes && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {payment.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatAmount(parseFloat(payment.amount))}
                      </TableCell>
                      {!readOnly && (
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            {payment.status !== "paid" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMarkAsPaid(payment)}
                                className="h-8 w-8 text-green-600"
                                title="Segna come pagato"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <AlertDialog open={isDeleteDialogOpen && selectedPaymentId === payment.id} onOpenChange={setIsDeleteDialogOpen}>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSelectedPaymentId(payment.id)}
                                  className="h-8 w-8 text-red-600"
                                  title="Elimina"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminare questa rata?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Questa operazione non può essere annullata. La rata di pagamento verrà
                                    rimossa permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setSelectedPaymentId(null)}>
                                    Annulla
                                  </AlertDialogCancel>
                                  <AlertDialogAction onClick={handleDeleteScheduledPayment}>
                                    Elimina
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">
                  Nessuna rata programmata
                </h3>
                <p className="text-sm">
                  {isQuoteSigned()
                    ? "Non sono ancora state programmate rate di pagamento per questo preventivo."
                    : "Le rate di pagamento potranno essere programmate solo dopo che il preventivo sarà stato firmato dal cliente."}
                </p>
              </div>
            )}
          </CardContent>

          {!readOnly && (
            <CardFooter>
              <Dialog
                open={isAddScheduledOpen}
                onOpenChange={setIsAddScheduledOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    className="w-full"
                    disabled={!isQuoteSigned()}
                    title={
                      !isQuoteSigned()
                        ? "Puoi programmare pagamenti solo dopo che il preventivo è stato firmato"
                        : ""
                    }
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Aggiungi Rata
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Programma un pagamento</DialogTitle>
                    <DialogDescription>
                      Inserisci i dettagli della rata da programmare per{" "}
                      {clientName ? clientName : "il cliente"}.
                    </DialogDescription>
                  </DialogHeader>

                  <form
                    ref={scheduledFormRef}
                    onSubmit={handleScheduledSubmit}
                    className="space-y-4 py-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="scheduled-amount">Importo *</Label>
                      <div className="relative">
                        <Euro className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="scheduled-amount"
                          placeholder="0,00"
                          className="pl-8"
                          type="number"
                          step="0.01"
                          value={scheduledData.amount}
                          onChange={(e) =>
                            setScheduledData({
                              ...scheduledData,
                              amount: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="due-date">Data di scadenza *</Label>
                      <Input
                        id="due-date"
                        type="date"
                        value={scheduledData.dueDate}
                        onChange={(e) =>
                          setScheduledData({
                            ...scheduledData,
                            dueDate: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scheduled-description">Descrizione</Label>
                      <Input
                        id="scheduled-description"
                        placeholder="Acconto, Saldo, ecc."
                        value={scheduledData.description}
                        onChange={(e) =>
                          setScheduledData({
                            ...scheduledData,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scheduled-method">
                        Metodo di pagamento
                      </Label>
                      <Select
                        value={scheduledData.paymentMethod}
                        onValueChange={(value) =>
                          setScheduledData({
                            ...scheduledData,
                            paymentMethod: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona metodo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contanti">Contanti</SelectItem>
                          <SelectItem value="bonifico">Bonifico</SelectItem>
                          <SelectItem value="carta">
                            Carta di Credito/Debito
                          </SelectItem>
                          <SelectItem value="assegno">Assegno</SelectItem>
                          <SelectItem value="altro">Altro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scheduled-notes">Note</Label>
                      <Textarea
                        id="scheduled-notes"
                        placeholder="Eventuali note sul pagamento..."
                        rows={3}
                        value={scheduledData.notes}
                        onChange={(e) =>
                          setScheduledData({
                            ...scheduledData,
                            notes: e.target.value,
                          })
                        }
                      />
                    </div>

                    <DialogFooter className="mt-6">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setIsAddScheduledOpen(false)}
                      >
                        Annulla
                      </Button>
                      <Button
                        type="submit"
                        disabled={createScheduledPaymentMutation.isPending}
                      >
                        {createScheduledPaymentMutation.isPending ? (
                          <>
                            <svg
                              className="mr-2 h-4 w-4 animate-spin"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Registrazione...
                          </>
                        ) : (
                          <>
                            <Calendar className="h-4 w-4 mr-2" />
                            Programma Pagamento
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}