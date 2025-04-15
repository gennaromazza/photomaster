import React, { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
// Rimuovo import Layout per evitare la duplicazione del layout
import ModuleManager from "@/components/quotes/modules/module-manager";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Info,
  MoreVertical,
  Download,
  Share,
  Pencil,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Mail,
  Phone,
  ClipboardCopy,
  Loader2,
  User,
  ArrowRight,
  Church,
  Package as PackageIcon,
  Users,
  FileText,
  FileSignature,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

/**
 * Pagina di dettaglio di un preventivo
 * Responsabilità: 
 * - Visualizzare i dettagli del preventivo
 * - Gestire i moduli attraverso il ModuleManager
 * - Fornire azioni sul preventivo (modifica, condivisione, eliminazione)
 */
export default function QuoteDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [expiryDays, setExpiryDays] = useState(30);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [activeTab, setActiveTab] = useState("details");

  // Query per ottenere i dati del preventivo
  const { 
    data: quote, 
    isLoading, 
    isError, 
    refetch
  } = useQuery<any>({
    queryKey: ["/api/quotes", id],
    enabled: !!id,
  });

  // Query per ottenere i dati del cliente in modo esplicito quando il preventivo è caricato
  const { data: client, isLoading: isClientLoading } = useQuery<any>({
    queryKey: [`/api/clients/${quote?.clientId}`],
    enabled: !!quote && !!quote.clientId,
  });

  // Query per ottenere i dati del secondo cliente in modo esplicito quando il preventivo è caricato
  const { data: secondClient, isLoading: isSecondClientLoading } = useQuery<any>({
    queryKey: [`/api/clients/${quote?.secondClientId}`],
    enabled: !!quote && !!quote.secondClientId,
  });

  // Mutation per eliminare il preventivo  
  const deleteQuoteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/quotes/${id}`);
      if (!res.ok) {
        throw new Error("Errore nell'eliminazione del preventivo");
      }
      return res.ok;
    },
    onSuccess: () => {
      toast({
        title: "Preventivo eliminato",
        description: "Il preventivo è stato eliminato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      // Redirect alla lista preventivi
      setLocation("/quotes");
    },
    onError: (error) => {
      console.error("Errore eliminazione preventivo:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione del preventivo",
        variant: "destructive",
      });
    },
  });

  // Mutation per generare il link di condivisione
  const generateShareLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/quotes/${id}/share`, {
        expiryDays
      });
      return res.json();
    },
    onSuccess: (data) => {
      // Verifica che data.token esista prima di costruire il link
      if (data.token) {
        // Costruisci l'URL completo per la condivisione
        const shareUrl = `${window.location.origin}/quotes/public/${data.token}`;
        setShareLink(shareUrl);
        toast({
          title: "Link generato",
          description: "Il link di condivisione è stato generato con successo",
        });
      } else {
        toast({
          title: "Errore",
          description: "Impossibile generare il link di condivisione",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error("Errore generazione link:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la generazione del link di condivisione",
        variant: "destructive",
      });
    },
  });

  // Funzione per copiare il link negli appunti
  const copyLinkToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopyStatus("copied");

      // Reset status after 2 seconds
      setTimeout(() => {
        setCopyStatus("idle");
      }, 2000);

      toast({
        title: "Link copiato",
        description: "Link copiato negli appunti",
      });
    } catch (err) {
      console.error("Errore copia link:", err);
      setCopyStatus("error");

      toast({
        title: "Errore",
        description: "Impossibile copiare il link negli appunti",
        variant: "destructive",
      });
    }
  };

  // Callback per aggiornare il preventivo dopo modifiche ai moduli
  const refreshQuote = useCallback(() => {
    refetch();
  }, [refetch]);

  // Gestione errori di caricamento
  if (isError) {
    return (

        <div className="container py-10 text-center">
          <h1 className="text-2xl font-bold mb-4">Errore</h1>
          <p className="mb-6">Impossibile caricare i dettagli del preventivo.</p>
          <Button onClick={() => setLocation("/quotes")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla lista preventivi
          </Button>
        </div>

    );
  }

  // Caricamento dati
  if (isLoading || !quote) {
    return (

        <div className="container py-10 flex justify-center items-center min-h-[50vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary/70" />
        </div>

    );
  }

  // Formattazione data
  const eventDate = quote.eventDate ? new Date(quote.eventDate) : null;
  const formattedEventDate = eventDate
    ? format(eventDate, "d MMMM yyyy", { locale: it })
    : "Data non specificata";

  return (

      <div className="container py-6">
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
              <h1 className="text-3xl font-playfair font-bold">{quote.title}</h1>
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
                  <span className="text-sm">
                    Creato: {quote.createdAt ? formatDate(new Date(quote.createdAt)) : "Data non disponibile"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">
                  <Share className="mr-2 h-4 w-4" />
                  Condividi
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Condividi preventivo</DialogTitle>
                  <DialogDescription>
                    Crea un link per condividere questo preventivo con il cliente.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-1 block">
                      Validità link (giorni)
                    </label>
                    <div className="flex items-center">
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={expiryDays}
                        onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                      >
                        <option value={7}>7 giorni</option>
                        <option value={15}>15 giorni</option>
                        <option value={30}>30 giorni</option>
                        <option value={60}>60 giorni</option>
                        <option value={90}>90 giorni</option>
                      </select>
                      <Button
                        className="ml-2"
                        onClick={() => generateShareLinkMutation.mutate()}
                        disabled={generateShareLinkMutation.isPending}
                      >
                        {generateShareLinkMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generazione...
                          </>
                        ) : (
                          "Genera link"
                        )}
                      </Button>
                    </div>
                  </div>

                  {shareLink && (
                    <div className="mt-4">
                      <label className="text-sm font-medium mb-1 block">
                        Link di condivisione
                      </label>
                      <div className="flex items-center mt-1">
                        <input
                          type="text"
                          value={shareLink}
                          readOnly
                          className="flex h-10 w-full rounded-md rounded-r-none border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <Button
                          variant="outline"
                          className="rounded-l-none border-l-0"
                          onClick={copyLinkToClipboard}
                        >
                          {copyStatus === "copied" ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <ClipboardCopy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="flex gap-x-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            copyLinkToClipboard();
                            setIsShareDialogOpen(false);
                          }}
                        >
                          <ClipboardCopy className="mr-1 h-3 w-3" />
                          Copia e chiudi
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                          onClick={() => window.open(shareLink, '_blank')}
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Apri in nuova scheda
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsShareDialogOpen(false)}
                  >
                    Chiudi
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Azioni preventivo</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setLocation(`/quotes/new-quote?edit=${id}`)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifica
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const newId = crypto.randomUUID();
                  setLocation(`/quotes/${newId}`);
                }}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplica
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  // PDF export
                  toast({
                    title: "Funzionalità non implementata",
                    description: "L'esportazione in PDF sarà disponibile a breve",
                  });
                }}>
                  <Download className="mr-2 h-4 w-4" />
                  Esporta PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Elimina
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Elimina preventivo</AlertDialogTitle>
                      <AlertDialogDescription>
                        Sei sicuro di voler eliminare questo preventivo? Questa azione non può essere annullata.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteQuoteMutation.mutate()}
                      >
                        {deleteQuoteMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Eliminazione...
                          </>
                        ) : (
                          "Elimina"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Colonna principale - 8/12 */}
          <div className="lg:col-span-8 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Dettagli</TabsTrigger>
                <TabsTrigger value="modules">Moduli</TabsTrigger>
                <TabsTrigger value="attachments">Allegati</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-6 space-y-6">
                {/* Informazioni cliente */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl flex items-center">
                      <Users className="h-5 w-5 mr-2 text-primary/80" />
                      Informazioni Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Cliente principale */}
                      <div className="space-y-3">
                        <h3 className="font-medium text-sm">Cliente Principale</h3>
                        {isClientLoading ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary/70" />
                            <span className="text-muted-foreground">Caricamento...</span>
                          </div>
                        ) : client ? (
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src="/avatar.jpg" />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {client.firstName?.charAt(0)}{client.lastName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {client.firstName} {client.lastName}
                              </div>
                              <div className="flex flex-col mt-1">
                                {client.email && (
                                  <div className="flex items-center text-sm text-muted-foreground">
                                    <Mail className="h-3.5 w-3.5 mr-1 opacity-70" />
                                    <span>{client.email}</span>
                                  </div>
                                )}
                                {client.phone && (
                                  <div className="flex items-center text-sm text-muted-foreground">
                                    <Phone className="h-3.5 w-3.5 mr-1 opacity-70" />
                                    <span>{client.phone}</span>
                                  </div>
                                )}
                                {client.address && (
                                  <div className="flex items-center text-sm text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5 mr-1 opacity-70" />
                                    <span>{client.address}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>Cliente non trovato</span>
                          </div>
                        )}
                      </div>

                      {/* Secondo cliente */}
                      <div className="space-y-3">
                        <h3 className="font-medium text-sm">Secondo Cliente</h3>
                        {quote.secondClientId ? (
                          isSecondClientLoading ? (
                            <div className="flex items-center space-x-2">
                              <Loader2 className="h-4 w-4 animate-spin text-primary/70" />
                              <span className="text-muted-foreground">Caricamento...</span>
                            </div>
                          ) : secondClient ? (
                            <div className="flex items-start space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src="/avatar.jpg" />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {secondClient.firstName?.charAt(0)}{secondClient.lastName?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {secondClient.firstName} {secondClient.lastName}
                                </div>
                                <div className="flex flex-col mt-1">
                                  {secondClient.email && (
                                    <div className="flex items-center text-sm text-muted-foreground">
                                      <Mail className="h-3.5 w-3.5 mr-1 opacity-70" />
                                      <span>{secondClient.email}</span>
                                    </div>
                                  )}
                                  {secondClient.phone && (
                                    <div className="flex items-center text-sm text-muted-foreground">
                                      <Phone className="h-3.5 w-3.5 mr-1 opacity-70" />
                                      <span>{secondClient.phone}</span>
                                    </div>
                                  )}
                                  {secondClient.address && (
                                    <div className="flex items-center text-sm text-muted-foreground">
                                      <MapPin className="h-3.5 w-3.5 mr-1 opacity-70" />
                                      <span>{secondClient.address}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span>Cliente non trovato</span>
                            </div>
                          )
                        ) : (
                          <div className="text-muted-foreground text-sm italic">
                            Nessun secondo cliente associato
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Informazioni evento */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-primary/80" />
                      Dettagli Evento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <dl className="space-y-3">
                          <div>
                            <dt className="text-sm font-medium">Data Evento</dt>
                            <dd className="text-base">
                              {eventDate ? (
                                formattedEventDate
                              ) : (
                                <span className="text-muted-foreground text-sm italic">Non specificata</span>
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium">Tipo Evento</dt>
                            <dd className="text-base">
                              {quote.eventType || (
                                <span className="text-muted-foreground text-sm italic">Non specificato</span>
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium">Location</dt>
                            <dd className="text-base">
                              {quote.location ? (
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1 text-primary/70" />
                                  {quote.location}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm italic">Non specificata</span>
                              )}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div>
                        <dl className="space-y-3">
                          <div>
                            <dt className="text-sm font-medium">Orario</dt>
                            <dd className="text-base">
                              {quote.isFullDay ? (
                                <span>Tutto il giorno</span>
                              ) : quote.eventTime ? (
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1 text-primary/70" />
                                  {quote.eventTime}
                                  {quote.eventEndTime && (
                                    <span> - {quote.eventEndTime}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm italic">Non specificato</span>
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium">Cerimonia</dt>
                            <dd className="text-base">
                              {quote.ceremonyLocation ? (
                                <div className="space-y-1">
                                  <div className="flex items-center">
                                    <Church className="h-4 w-4 mr-1 text-primary/70" />
                                    {quote.ceremonyLocation}
                                  </div>
                                  {quote.ceremonyTime && (
                                    <div className="flex items-center text-sm text-muted-foreground">
                                      <Clock className="h-3.5 w-3.5 mr-1 opacity-70" />
                                      Ore {quote.ceremonyTime}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm italic">Non specificata</span>
                              )}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Note */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-primary/80" />
                      Note e Documentazione
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {quote.notes ? (
                      <div className="whitespace-pre-wrap">{quote.notes}</div>
                    ) : (
                      <div className="text-muted-foreground text-sm italic">
                        Nessuna nota aggiunta
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="modules" className="mt-6 space-y-6">
                {/* Moduli preventivo */}
                <ModuleManager quoteId={parseInt(id)} refreshQuote={refreshQuote} />
              </TabsContent>

              <TabsContent value="attachments" className="mt-6 space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl">Allegati</CardTitle>
                    <CardDescription>
                      Documenti, contratti e altri allegati relativi a questo preventivo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
                      <p className="text-lg font-medium mb-1">Nessun allegato</p>
                      <p className="text-muted-foreground mb-4">
                        Non ci sono ancora allegati per questo preventivo
                      </p>
                      <Button variant="outline">
                        Carica un allegato
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Colonna laterale - 4/12 */}
          <div className="lg:col-span-4 space-y-6">
            {/* Riepilogo finanziario */}
            <Card>
              <CardHeader>
                <CardTitle>Riepilogo Finanziario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotale</span>
                    <span>{formatCurrency(quote.subtotal || 0)}</span>
                  </div>

                  {/* Mostro lo sconto solo se presente */}
                  {quote.discount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        Sconto
                        {quote.discountType === "percentage" && 
                         ` (${quote.discountValue}%)`}
                      </span>
                      <span>
                        - {formatCurrency(
                          quote.discountType === "percentage"
                            ? ((quote.subtotal || 0) * quote.discountValue) / 100
                            : quote.discountValue || 0
                        )}
                      </span>
                    </div>
                  )}

                  {/* Eventuali altre voci */}

                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Totale</span>
                    <span>{formatCurrency(quote.total || 0)}</span>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground mt-2">
                  Preventivo {quote.status === "draft" ? "in bozza" : quote.status}
                </div>
              </CardContent>
              <CardFooter>
                <div className="w-full flex flex-col gap-2">
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      setIsShareDialogOpen(true);
                      generateShareLinkMutation.mutate();
                    }}
                  >
                    <Share className="mr-2 h-4 w-4" />
                    Condividi con Cliente
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setLocation(`/quotes/contract/${id}`)}
                  >
                    <FileSignature className="mr-2 h-4 w-4" />
                    Genera Contratto
                  </Button>
                </div>
              </CardFooter>
            </Card>

            {/* Timeline/stato */}
            <Card>
              <CardHeader>
                <CardTitle>Stato Preventivo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Creazione Preventivo</p>
                      <p className="text-sm text-muted-foreground">
                        {quote.createdAt ? formatDate(new Date(quote.createdAt), "d MMM yyyy, HH:mm") : "Data non disponibile"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      quote.status !== "draft" 
                        ? "bg-primary text-white" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {quote.status !== "draft" ? <Check className="h-4 w-4" /> : "2"}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Configurazione Moduli</p>
                      <p className="text-sm text-muted-foreground">
                        {quote.status !== "draft" && quote.updatedAt
                          ? formatDate(new Date(quote.updatedAt), "d MMM yyyy, HH:mm")
                          : "In corso..."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      (quote.status === "pending" || quote.status === "in attesa" ||
                       quote.status === "approved" || quote.status === "confermato" ||
                       quote.status === "rejected" || quote.status === "rifiutato") 
                        ? "bg-primary text-white" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {(quote.status === "pending" || quote.status === "in attesa" ||
                        quote.status === "approved" || quote.status === "confermato" ||
                        quote.status === "rejected" || quote.status === "rifiutato") 
                        ? <Check className="h-4 w-4" /> 
                        : "3"}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Condivisione con Cliente</p>
                      <p className="text-sm text-muted-foreground">
                        {(quote.status === "pending" || quote.status === "in attesa" ||
                          quote.status === "approved" || quote.status === "confermato" ||
                          quote.status === "rejected" || quote.status === "rifiutato") 
                          ? "Completato"
                          : "In attesa"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      (quote.status === "approved" || quote.status === "confermato" ||                       quote.status === "rejected" || quote.status === "rifiutato") 
                        ? "bg-primary text-white" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {(quote.status === "approved" || quote.status === "confermato" ||
                        quote.status === "rejected" || quote.status === "rifiutato") 
                        ? <Check className="h-4 w-4" /> 
                        : "4"}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Risposta Cliente</p>
                      <p className="text-sm text-muted-foreground">
                        {(quote.status === "approved" || quote.status === "confermato")
                          ? "Accettato"
                          : (quote.status === "rejected" || quote.status === "rifiutato")
                            ? "Rifiutato"
                            : "In attesa"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

  );
}

function formatDate(date: Date, formatStr = "d MMM yyyy") {
  return format(date, formatStr, { locale: it });
}