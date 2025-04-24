import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, 
  AlertTriangle, 
  FileText, 
  Calendar, 
  LucideEuro, 
  Plus, 
  Send, 
  Search,
  ChevronRight,
  FileCheck,
  User,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconBrandWhatsapp } from "@/components/ui/icons/whatsapp";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PagamentoCollaboratoreListProps {
  collaboratoreId: number;
}

// Schema di validazione per il form nuovo pagamento
const nuovoPagamentoSchema = z.object({
  eventoId: z.string().min(1, 'Seleziona un evento'),
  tipo: z.enum(['acconto', 'saldo', 'montaggio_acconto', 'montaggio_saldo'], {
    required_error: 'Seleziona un tipo di pagamento',
  }),
  importo: z.coerce.number().positive('L\'importo deve essere maggiore di zero'),
  dataPagamento: z.date().max(new Date(), 'La data non può essere futura'),
  metodoPagamento: z.enum(['bonifico', 'contanti', 'altro'], {
    required_error: 'Seleziona un metodo di pagamento',
  }),
  note: z.string().optional(),
  riferimentoEsterno: z.string().optional(),
});

type NuovoPagamentoFormValues = z.infer<typeof nuovoPagamentoSchema>;

export function PagamentoCollaboratoreList({ collaboratoreId }: PagamentoCollaboratoreListProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [periodoSelezionato, setPeriodoSelezionato] = useState<"tutti" | "mese" | "trimestre" | "anno">("tutti");
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Query per ottenere i pagamenti del collaboratore
  const { data: pagamenti = [], isLoading, error } = useQuery({
    queryKey: [`/api/collaboratori/${collaboratoreId}/pagamenti`],
    staleTime: 5 * 60 * 1000, // 5 minuti
  });

  // Query per ottenere i dettagli del collaboratore
  const { data: collaboratore } = useQuery({
    queryKey: [`/api/collaborators/${collaboratoreId}`],
    staleTime: 5 * 60 * 1000, // 5 minuti
  });

  // Query per ottenere gli eventi del collaboratore
  const { data: eventi = [] } = useQuery({
    queryKey: [`/api/collaboratori/${collaboratoreId}/eventi`],
    staleTime: 5 * 60 * 1000, // 5 minuti
  });

  // Mutation per il nuovo pagamento
  const nuovoPagamentoMutation = useMutation({
    mutationFn: async (values: NuovoPagamentoFormValues) => {
      // Aggiungi il collaboratoreId ai dati inviati
      const payload = {
        ...values,
        collaboratoreId: Number(collaboratoreId),
        eventoId: Number(values.eventoId)
      };
      
      console.log("Dati pagamento inviati:", payload);
      
      const res = await apiRequest("POST", `/api/collaboratori/${collaboratoreId}/pagamenti`, payload);
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Errore validazione:", errorData);
        throw new Error(errorData.error?.map?.((e: any) => e.message).join(", ") || "Errore durante la registrazione del pagamento");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Pagamento registrato",
        description: "Il pagamento è stato registrato con successo",
      });
      setModalOpen(false);
      // Invalida la cache per aggiornare i dati
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/pagamenti`] });
      queryClient.invalidateQueries({ queryKey: [`/api/collaboratori/${collaboratoreId}/dashboard`] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la registrazione del pagamento",
        variant: "destructive",
      });
    },
  });

  // Inizializza il form con React Hook Form
  const form = useForm<NuovoPagamentoFormValues>({
    resolver: zodResolver(nuovoPagamentoSchema),
    defaultValues: {
      eventoId: "",
      tipo: "acconto",
      importo: undefined,
      dataPagamento: new Date(),
      metodoPagamento: "bonifico",
      note: "",
    },
  });

  // Reset form quando si apre/chiude il modal
  useEffect(() => {
    if (!modalOpen) {
      form.reset();
    }
  }, [modalOpen, form]);

  // Filtra i pagamenti in base alla ricerca e al periodo selezionato
  const filteredPagamenti = pagamenti ? pagamenti.filter((pagamento) => {
    const matchesSearch = 
      (pagamento.note && pagamento.note.toLowerCase().includes(search.toLowerCase())) ||
      (pagamento.tipo && pagamento.tipo.toLowerCase().includes(search.toLowerCase())) ||
      (pagamento.metodoPagamento && pagamento.metodoPagamento.toLowerCase().includes(search.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    // Filtra per periodo
    if (periodoSelezionato !== "tutti") {
      const dataPagamento = new Date(pagamento.dataPagamento);
      const oggi = new Date();
      
      switch (periodoSelezionato) {
        case "mese":
          return dataPagamento.getMonth() === oggi.getMonth() && 
                 dataPagamento.getFullYear() === oggi.getFullYear();
        case "trimestre":
          const startOfQuarter = new Date(oggi.getFullYear(), Math.floor(oggi.getMonth() / 3) * 3, 1);
          const endOfQuarter = new Date(startOfQuarter.getFullYear(), startOfQuarter.getMonth() + 3, 0);
          return dataPagamento >= startOfQuarter && dataPagamento <= endOfQuarter;
        case "anno":
          return dataPagamento.getFullYear() === oggi.getFullYear();
      }
    }
    
    return true;
  }) : [];

  // Calcola il totale dei pagamenti filtrati
  const totalePagamenti = filteredPagamenti.reduce((acc, pagamento) => acc + Number(pagamento.importo), 0);

  // Calcola totali per tipo di pagamento
  const totaleAcconti = filteredPagamenti
    .filter(p => p.tipo.endsWith('_acconto') || p.tipo === 'acconto')
    .reduce((acc, p) => acc + Number(p.importo), 0);
  
  const totaleSaldi = filteredPagamenti
    .filter(p => p.tipo.endsWith('_saldo') || p.tipo === 'saldo')
    .reduce((acc, p) => acc + Number(p.importo), 0);

  // Handler per il submit del form
  const onSubmit = (values: NuovoPagamentoFormValues) => {
    nuovoPagamentoMutation.mutate(values);
  };

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
          Si è verificato un errore durante il caricamento dei pagamenti
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
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1">
          <Input
            type="search"
            placeholder="Cerca pagamenti..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            <Button 
              variant={periodoSelezionato === "tutti" ? "default" : "outline"} 
              size="sm"
              onClick={() => setPeriodoSelezionato("tutti")}
            >
              Tutti
            </Button>
            <Button 
              variant={periodoSelezionato === "mese" ? "default" : "outline"} 
              size="sm"
              onClick={() => setPeriodoSelezionato("mese")}
            >
              Mese
            </Button>
            <Button 
              variant={periodoSelezionato === "trimestre" ? "default" : "outline"} 
              size="sm"
              onClick={() => setPeriodoSelezionato("trimestre")}
            >
              Trimestre
            </Button>
            <Button 
              variant={periodoSelezionato === "anno" ? "default" : "outline"} 
              size="sm"
              onClick={() => setPeriodoSelezionato("anno")}
            >
              Anno
            </Button>
          </div>
          
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Pagamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Registra nuovo pagamento</DialogTitle>
                <DialogDescription>
                  Inserisci i dettagli del pagamento per {collaboratore?.firstName} {collaboratore?.lastName}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="eventoId"
                    render={({ field }) => {
                      const [selectionModalOpen, setSelectionModalOpen] = useState(false);
                      const [eventoFilter, setEventoFilter] = useState("");
                      const [activeTab, setActiveTab] = useState<"eventi" | "preventivi">("eventi");
                      
                      // Query per ottenere tutti gli eventi disponibili
                      const { data: tuttiEventi = [] } = useQuery({
                        queryKey: [`/api/events`],
                        staleTime: 5 * 60 * 1000,
                      });
                      
                      // Query per ottenere tutti i preventivi disponibili
                      const { data: tuttiPreventivi = [] } = useQuery({
                        queryKey: [`/api/quotes`],
                        staleTime: 5 * 60 * 1000,
                      });
                      
                      // Filtra eventi/preventivi
                      const filteredEventi = tuttiEventi.filter((ev: any) => 
                        ev.title?.toLowerCase().includes(eventoFilter.toLowerCase()) ||
                        ev.id?.toString().includes(eventoFilter)
                      );
                      
                      const filteredPreventivi = tuttiPreventivi.filter((prev: any) => 
                        prev.title?.toLowerCase().includes(eventoFilter.toLowerCase()) ||
                        prev.id?.toString().includes(eventoFilter)
                      );
                      
                      // Evento selezionato da mostrare
                      const selectedEvento = field.value 
                        ? tuttiEventi.find((ev: any) => ev.id.toString() === field.value) 
                        : null;
                        
                      return (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Evento/Preventivo</FormLabel>
                          <Dialog open={selectionModalOpen} onOpenChange={setSelectionModalOpen}>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full text-left justify-start font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                onClick={() => setSelectionModalOpen(true)}
                                type="button"
                              >
                                {selectedEvento ? (
                                  <div className="flex items-center gap-2 text-left overflow-hidden">
                                    <FileText className="h-4 w-4 shrink-0 opacity-50" />
                                    <span className="truncate">
                                      {selectedEvento.title || `ID: ${selectedEvento.id}`}
                                    </span>
                                  </div>
                                ) : (
                                  <span>Seleziona evento o preventivo</span>
                                )}
                              </Button>
                            </FormControl>
                            
                            <DialogContent className="sm:max-w-[700px]">
                              <DialogHeader>
                                <DialogTitle>Seleziona Evento o Preventivo</DialogTitle>
                                <DialogDescription>
                                  Cerca e seleziona l'evento o il preventivo a cui associare questo pagamento
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4 mt-2">
                                <div className="relative">
                                  <Input
                                    placeholder="Cerca per titolo o ID..."
                                    value={eventoFilter}
                                    onChange={(e) => setEventoFilter(e.target.value)}
                                    className="w-full pl-10"
                                  />
                                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    <Search className="h-4 w-4" />
                                  </div>
                                </div>
                                
                                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "eventi" | "preventivi")}>
                                  <TabsList className="grid grid-cols-2 w-full mb-4">
                                    <TabsTrigger value="eventi" className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4" />
                                      Eventi
                                    </TabsTrigger>
                                    <TabsTrigger value="preventivi" className="flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      Preventivi
                                    </TabsTrigger>
                                  </TabsList>
                                  
                                  <TabsContent value="eventi" className="p-0">
                                    <div className="border rounded-md">
                                      <ScrollArea className="h-[300px]">
                                        {filteredEventi.length === 0 ? (
                                          <div className="p-6 text-center text-muted-foreground">
                                            Nessun evento trovato
                                          </div>
                                        ) : (
                                          <div className="divide-y">
                                            {filteredEventi.map((evento: any) => (
                                              <div 
                                                key={evento.id}
                                                className={cn(
                                                  "flex items-center justify-between p-4 hover:bg-muted/40 cursor-pointer transition-colors",
                                                  field.value === evento.id.toString() && "bg-muted"
                                                )}
                                                onClick={() => {
                                                  field.onChange(evento.id.toString());
                                                  setSelectionModalOpen(false);
                                                }}
                                              >
                                                <div className="flex flex-col gap-1">
                                                  <div className="font-medium flex items-center gap-2">
                                                    {evento.title || `Evento #${evento.id}`}
                                                    <Badge variant="outline" className="ml-2 text-xs">
                                                      ID: {evento.id}
                                                    </Badge>
                                                  </div>
                                                  <div className="text-sm text-muted-foreground flex items-center gap-4">
                                                    <div className="flex items-center gap-1">
                                                      <User className="h-3 w-3" />
                                                      {evento.clientName || "Cliente non specificato"}
                                                    </div>
                                                    {evento.date && (
                                                      <div className="flex items-center gap-1">
                                                        <CalendarIcon className="h-3 w-3" />
                                                        {format(new Date(evento.date), "dd/MM/yyyy", { locale: it })}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </ScrollArea>
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="preventivi" className="p-0">
                                    <div className="border rounded-md">
                                      <ScrollArea className="h-[300px]">
                                        {filteredPreventivi.length === 0 ? (
                                          <div className="p-6 text-center text-muted-foreground">
                                            Nessun preventivo trovato
                                          </div>
                                        ) : (
                                          <div className="divide-y">
                                            {filteredPreventivi.map((preventivo: any) => (
                                              <div 
                                                key={preventivo.id}
                                                className={cn(
                                                  "flex items-center justify-between p-4 hover:bg-muted/40 cursor-pointer transition-colors",
                                                  field.value === preventivo.id.toString() && "bg-muted"
                                                )}
                                                onClick={() => {
                                                  field.onChange(preventivo.id.toString());
                                                  setSelectionModalOpen(false);
                                                }}
                                              >
                                                <div className="flex flex-col gap-1">
                                                  <div className="font-medium flex items-center gap-2">
                                                    {preventivo.title || `Preventivo #${preventivo.id}`}
                                                    <Badge variant="outline" className="ml-2 text-xs">
                                                      ID: {preventivo.id}
                                                    </Badge>
                                                  </div>
                                                  <div className="text-sm text-muted-foreground flex items-center gap-4">
                                                    <div className="flex items-center gap-1">
                                                      <User className="h-3 w-3" />
                                                      {preventivo.clientName || "Cliente non specificato"}
                                                    </div>
                                                    {preventivo.status && (
                                                      <div className="flex items-center gap-1">
                                                        <FileCheck className="h-3 w-3" />
                                                        {preventivo.status === 'pending' ? 'In attesa' : 
                                                         preventivo.status === 'approved' ? 'Approvato' : 
                                                         preventivo.status === 'rejected' ? 'Rifiutato' : 
                                                         preventivo.status}
                                                      </div>
                                                    )}
                                                    {preventivo.total && (
                                                      <div className="flex items-center gap-1">
                                                        <Tag className="h-3 w-3" />
                                                        {formatCurrency(Number(preventivo.total))}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </ScrollArea>
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              </div>
                              
                              <DialogFooter>
                                <Button 
                                  variant="outline" 
                                  onClick={() => setSelectionModalOpen(false)}
                                  type="button"
                                >
                                  Annulla
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo pagamento</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger aria-label="Seleziona tipo pagamento">
                              <SelectValue placeholder="Seleziona tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="acconto">Acconto</SelectItem>
                            <SelectItem value="saldo">Saldo</SelectItem>
                            <SelectItem value="montaggio_acconto">Acconto montaggio</SelectItem>
                            <SelectItem value="montaggio_saldo">Saldo montaggio</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="importo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Importo (€)</FormLabel>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dataPagamento"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data pagamento</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: it })
                                ) : (
                                  <span>Seleziona data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date > new Date()}
                              initialFocus
                              locale={it}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="metodoPagamento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Metodo pagamento</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger aria-label="Seleziona metodo pagamento">
                              <SelectValue placeholder="Seleziona metodo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bonifico">Bonifico</SelectItem>
                            <SelectItem value="contanti">Contanti</SelectItem>
                            <SelectItem value="altro">Altro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note (opzionale)</FormLabel>
                        <FormControl>
                          <Input placeholder="Note sul pagamento..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setModalOpen(false)}
                      disabled={nuovoPagamentoMutation.isPending}
                    >
                      Annulla
                    </Button>
                    <Button 
                      type="submit"
                      disabled={nuovoPagamentoMutation.isPending}
                    >
                      {nuovoPagamentoMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Registra pagamento
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Totale pagamenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalePagamenti)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {periodoSelezionato !== "tutti" ? `Periodo: ${periodoSelezionato}` : "Tutti i periodi"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Acconti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totaleAcconti)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Include acconti eventi e montaggi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Saldi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totaleSaldi)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Include saldi eventi e montaggi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Media pagamenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredPagamenti.length 
                ? formatCurrency(totalePagamenti / filteredPagamenti.length) 
                : "€0,00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredPagamenti.length} pagamenti totali
            </p>
          </CardContent>
        </Card>
      </div>
      
      {filteredPagamenti.length === 0 ? (
        <div className="bg-muted/40 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            Nessun pagamento trovato. Prova a modificare i parametri di ricerca o registra un nuovo pagamento.
          </p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Metodo</th>
                <th className="text-left p-3 font-medium">Note</th>
                <th className="text-right p-3 font-medium">Importo</th>
                <th className="text-center p-3 font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredPagamenti.map((pagamento) => {
                const eventoCorrelato = eventi.find(e => e.id === Number(pagamento.eventoId));
                const nomeEvento = eventoCorrelato ? eventoCorrelato.titolo || `Evento #${eventoCorrelato.id}` : '';

                return (
                  <tr key={pagamento.id} className="border-t">
                    <td className="p-3 text-sm whitespace-nowrap">
                      {format(new Date(pagamento.dataPagamento), "dd/MM/yyyy", { locale: it })}
                    </td>
                    <td className="p-3 text-sm">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                        {pagamento.tipo === 'acconto' ? 'Acconto' : 
                         pagamento.tipo === 'saldo' ? 'Saldo' :
                         pagamento.tipo === 'montaggio_acconto' ? 'Acconto montaggio' :
                         pagamento.tipo === 'montaggio_saldo' ? 'Saldo montaggio' : pagamento.tipo}
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      {pagamento.metodoPagamento?.charAt(0).toUpperCase() + pagamento.metodoPagamento?.slice(1) || '-'}
                    </td>
                    <td className="p-3 text-sm">
                      <div className="max-w-xs truncate">
                        {pagamento.note || nomeEvento || '-'}
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium">
                      {formatCurrency(Number(pagamento.importo))}
                    </td>
                    <td className="p-3 text-center">
                      {collaboratore?.phone && (
                        <a
                          href={`https://wa.me/${collaboratore.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Ho registrato un ${pagamento.tipo === 'acconto' ? 'acconto' : 
                             pagamento.tipo === 'saldo' ? 'saldo' :
                             pagamento.tipo === 'montaggio_acconto' ? 'acconto montaggio' :
                             pagamento.tipo === 'montaggio_saldo' ? 'saldo montaggio' : pagamento.tipo} di ${formatCurrency(Number(pagamento.importo))} per ${nomeEvento || 'l\'evento'} in data ${format(new Date(pagamento.dataPagamento), "dd/MM/yyyy")}`
                          )}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          aria-label="Invia conferma pagamento via WhatsApp"
                          className="inline-flex items-center justify-center p-1.5 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                        >
                          <IconBrandWhatsapp className="w-5 h-5" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}