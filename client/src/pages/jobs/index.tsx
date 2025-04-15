import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  Calendar,
  FileText,
  MoreHorizontal,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CalendarPlus,
} from "lucide-react";

/**
 * Pagina Jobs (Lavori)
 * Mostra un elenco unificato di preventivi ed eventi, organizzati come "lavori"
 */
export default function JobsPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  // Carica preventivi
  const { data: quotes = [], isLoading: isLoadingQuotes } = useQuery({
    queryKey: ["/api/quotes"],
  });

  // Carica eventi
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["/api/events"],
  });

  // Carica clienti per mostrare informazioni cliente
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/clients"],
  });

  // Funzione per ottenere il nome del cliente
  const getClientName = (clientId: number) => {
    const client = clients.find((c: any) => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "Cliente non trovato";
  };

  // Combiniamo preventivi ed eventi in un unico array di lavori
  const jobs = [
    ...quotes.map((quote: any) => ({
      id: quote.id,
      type: "quote",
      title: quote.title,
      date: quote.eventDate || quote.createdAt,
      clientId: quote.clientId,
      status: quote.isSigned ? "signed" : "pending",
      eventId: quote.eventId,
      fromSignedQuote: false,
      quoteBadge: quote.isSigned ? "Firmato" : "In attesa",
      quoteBadgeColor: quote.isSigned ? "green" : "amber",
    })),
    ...events
      .filter((event: any) => {
        // Escludiamo gli eventi già associati a preventivi che abbiamo già elencato
        const quoteHasEvent = quotes.some((q: any) => q.eventId === event.id);
        return !quoteHasEvent;
      })
      .map((event: any) => ({
        id: event.id,
        type: "event",
        title: event.title,
        date: event.date,
        clientId: event.clientId,
        status: event.status,
        fromSignedQuote: event.fromSignedQuote,
        quoteId: event.quoteId,
      })),
  ];

  // Filtra in base alla ricerca
  const filteredJobs = jobs.filter((job) => {
    if (!search) return true;
    
    // Cerca nel titolo
    if (job.title.toLowerCase().includes(search.toLowerCase())) return true;
    
    // Cerca nel nome cliente
    const clientName = job.clientId ? getClientName(job.clientId).toLowerCase() : "";
    if (clientName.includes(search.toLowerCase())) return true;
    
    return false;
  });

  // Filtra in base al tab attivo
  const displayedJobs = filteredJobs.filter((job) => {
    if (activeTab === "all") return true;
    if (activeTab === "quotes") return job.type === "quote";
    if (activeTab === "events") return job.type === "event";
    if (activeTab === "signed") return job.status === "signed" || job.fromSignedQuote;
    if (activeTab === "pending") return job.type === "quote" && job.status === "pending";
    return true;
  });

  // Ordina per data (più recenti prima)
  const sortedJobs = [...displayedJobs].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-semibold mb-2">Lavori</h1>
          <p className="text-gray-500">
            Gestione unificata di preventivi ed eventi
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigate("/quotes/new-quote")}>
            <FileText className="h-4 w-4 mr-2" />
            Nuovo Preventivo
          </Button>
          <Button variant="outline" onClick={() => navigate("/events/new")}>
            <Calendar className="h-4 w-4 mr-2" />
            Nuovo Evento
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Tutti i Lavori</CardTitle>
              <CardDescription>
                Visualizza e gestisci preventivi ed eventi in un'unica vista
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Cerca..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6">
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="all" className="flex-1 md:flex-initial">Tutti</TabsTrigger>
              <TabsTrigger value="quotes" className="flex-1 md:flex-initial">Preventivi</TabsTrigger>
              <TabsTrigger value="events" className="flex-1 md:flex-initial">Eventi</TabsTrigger>
              <TabsTrigger value="signed" className="flex-1 md:flex-initial">Firmati</TabsTrigger>
              <TabsTrigger value="pending" className="flex-1 md:flex-initial">In Attesa</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="m-0">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingQuotes || isLoadingEvents || isLoadingClients ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex justify-center">
                            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">Caricamento in corso...</p>
                        </TableCell>
                      </TableRow>
                    ) : sortedJobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex justify-center mb-2">
                            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                              <FileText className="h-6 w-6 text-gray-400" />
                            </div>
                          </div>
                          <p className="text-gray-500">Nessun lavoro trovato</p>
                          {search && (
                            <Button 
                              variant="link" 
                              className="mt-1"
                              onClick={() => setSearch("")}
                            >
                              Cancella la ricerca
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedJobs.map((job) => (
                        <TableRow key={`${job.type}-${job.id}`}>
                          <TableCell>
                            <div className="font-medium">{job.title}</div>
                          </TableCell>
                          <TableCell>
                            {job.clientId ? getClientName(job.clientId) : "N/D"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {job.type === "quote" ? (
                                <>
                                  <FileText className="h-4 w-4 mr-1.5 text-primary" />
                                  <span>Preventivo</span>
                                </>
                              ) : (
                                <>
                                  <Calendar className="h-4 w-4 mr-1.5 text-blue-500" />
                                  <span>Evento</span>
                                </>
                              )}
                              {job.fromSignedQuote && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Da preventivo
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {job.date ? format(new Date(job.date), "d MMM yyyy", { locale: it }) : "N/D"}
                          </TableCell>
                          <TableCell>
                            {job.type === "quote" ? (
                              <Badge className={
                                job.quoteBadgeColor === "green" 
                                  ? "bg-green-100 text-green-800 hover:bg-green-200" 
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              }>
                                {job.quoteBadge}
                              </Badge>
                            ) : (
                              <Badge className={
                                job.status === "upcoming"
                                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  : job.status === "in-progress"
                                  ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                  : job.status === "completed"
                                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                                  : "bg-red-100 text-red-800 hover:bg-red-200"
                              }>
                                {job.status === "upcoming"
                                  ? "Prossimo"
                                  : job.status === "in-progress"
                                  ? "In Corso"
                                  : job.status === "completed"
                                  ? "Completato"
                                  : "Annullato"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/jobs/${job.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/jobs/${job.id}`)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Visualizza
                                  </DropdownMenuItem>
                                  
                                  {job.type === "quote" && !job.status !== "signed" && (
                                    <DropdownMenuItem onClick={() => navigate(`/quotes/new-quote?edit=${job.id}`)}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Modifica
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {job.type === "quote" && !job.eventId && (
                                    <DropdownMenuItem onClick={() => navigate(`/events/new?quoteId=${job.id}`)}>
                                      <CalendarPlus className="h-4 w-4 mr-2" />
                                      Crea Evento
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {job.type === "quote" && job.eventId && (
                                    <DropdownMenuItem onClick={() => navigate(`/jobs/${job.eventId}`)}>
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Vai all'Evento
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {job.type === "event" && job.quoteId && (
                                    <DropdownMenuItem onClick={() => navigate(`/jobs/${job.quoteId}`)}>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Vai al Preventivo
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </TabsContent>

          {/* I contenuti sono gli stessi per tutti i tab, si filtrano in base al valore del tab */}
          <TabsContent value="quotes" className="m-0">
            <CardContent className="p-0">
              {/* stesso contenuto di "all" */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingQuotes || isLoadingEvents || isLoadingClients ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex justify-center">
                            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">Caricamento in corso...</p>
                        </TableCell>
                      </TableRow>
                    ) : sortedJobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex justify-center mb-2">
                            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                              <FileText className="h-6 w-6 text-gray-400" />
                            </div>
                          </div>
                          <p className="text-gray-500">Nessun preventivo trovato</p>
                          {search && (
                            <Button 
                              variant="link" 
                              className="mt-1"
                              onClick={() => setSearch("")}
                            >
                              Cancella la ricerca
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedJobs.map((job) => (
                        <TableRow key={`${job.type}-${job.id}`}>
                          <TableCell>
                            <div className="font-medium">{job.title}</div>
                          </TableCell>
                          <TableCell>
                            {job.clientId ? getClientName(job.clientId) : "N/D"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {job.type === "quote" ? (
                                <>
                                  <FileText className="h-4 w-4 mr-1.5 text-primary" />
                                  <span>Preventivo</span>
                                </>
                              ) : (
                                <>
                                  <Calendar className="h-4 w-4 mr-1.5 text-blue-500" />
                                  <span>Evento</span>
                                </>
                              )}
                              {job.fromSignedQuote && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Da preventivo
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {job.date ? format(new Date(job.date), "d MMM yyyy", { locale: it }) : "N/D"}
                          </TableCell>
                          <TableCell>
                            {job.type === "quote" ? (
                              <Badge className={
                                job.quoteBadgeColor === "green" 
                                  ? "bg-green-100 text-green-800 hover:bg-green-200" 
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              }>
                                {job.quoteBadge}
                              </Badge>
                            ) : (
                              <Badge className={
                                job.status === "upcoming"
                                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  : job.status === "in-progress"
                                  ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                  : job.status === "completed"
                                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                                  : "bg-red-100 text-red-800 hover:bg-red-200"
                              }>
                                {job.status === "upcoming"
                                  ? "Prossimo"
                                  : job.status === "in-progress"
                                  ? "In Corso"
                                  : job.status === "completed"
                                  ? "Completato"
                                  : "Annullato"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/jobs/${job.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/jobs/${job.id}`)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Visualizza
                                  </DropdownMenuItem>
                                  
                                  {job.type === "quote" && !job.status !== "signed" && (
                                    <DropdownMenuItem onClick={() => navigate(`/quotes/new-quote?edit=${job.id}`)}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Modifica
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {job.type === "quote" && !job.eventId && (
                                    <DropdownMenuItem onClick={() => navigate(`/events/new?quoteId=${job.id}`)}>
                                      <CalendarPlus className="h-4 w-4 mr-2" />
                                      Crea Evento
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {job.type === "quote" && job.eventId && (
                                    <DropdownMenuItem onClick={() => navigate(`/jobs/${job.eventId}`)}>
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Vai all'Evento
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {job.type === "event" && job.quoteId && (
                                    <DropdownMenuItem onClick={() => navigate(`/jobs/${job.quoteId}`)}>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Vai al Preventivo
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </TabsContent>

          <TabsContent value="events" className="m-0">
            <CardContent className="p-0">
              {/* stesso contenuto di "all" */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingQuotes || isLoadingEvents || isLoadingClients ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex justify-center">
                            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">Caricamento in corso...</p>
                        </TableCell>
                      </TableRow>
                    ) : sortedJobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex justify-center mb-2">
                            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                              <Calendar className="h-6 w-6 text-gray-400" />
                            </div>
                          </div>
                          <p className="text-gray-500">Nessun evento trovato</p>
                          {search && (
                            <Button 
                              variant="link" 
                              className="mt-1"
                              onClick={() => setSearch("")}
                            >
                              Cancella la ricerca
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedJobs.map((job) => (
                        <TableRow key={`${job.type}-${job.id}`}>
                          <TableCell>
                            <div className="font-medium">{job.title}</div>
                          </TableCell>
                          <TableCell>
                            {job.clientId ? getClientName(job.clientId) : "N/D"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {job.type === "quote" ? (
                                <>
                                  <FileText className="h-4 w-4 mr-1.5 text-primary" />
                                  <span>Preventivo</span>
                                </>
                              ) : (
                                <>
                                  <Calendar className="h-4 w-4 mr-1.5 text-blue-500" />
                                  <span>Evento</span>
                                </>
                              )}
                              {job.fromSignedQuote && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Da preventivo
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {job.date ? format(new Date(job.date), "d MMM yyyy", { locale: it }) : "N/D"}
                          </TableCell>
                          <TableCell>
                            {job.type === "quote" ? (
                              <Badge className={
                                job.quoteBadgeColor === "green" 
                                  ? "bg-green-100 text-green-800 hover:bg-green-200" 
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              }>
                                {job.quoteBadge}
                              </Badge>
                            ) : (
                              <Badge className={
                                job.status === "upcoming"
                                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  : job.status === "in-progress"
                                  ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                  : job.status === "completed"
                                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                                  : "bg-red-100 text-red-800 hover:bg-red-200"
                              }>
                                {job.status === "upcoming"
                                  ? "Prossimo"
                                  : job.status === "in-progress"
                                  ? "In Corso"
                                  : job.status === "completed"
                                  ? "Completato"
                                  : "Annullato"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/jobs/${job.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/jobs/${job.id}`)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Visualizza
                                  </DropdownMenuItem>
                                  
                                  {job.type === "quote" && !job.status !== "signed" && (
                                    <DropdownMenuItem onClick={() => navigate(`/quotes/new-quote?edit=${job.id}`)}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Modifica
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {job.type === "quote" && !job.eventId && (
                                    <DropdownMenuItem onClick={() => navigate(`/events/new?quoteId=${job.id}`)}>
                                      <CalendarPlus className="h-4 w-4 mr-2" />
                                      Crea Evento
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {job.type === "quote" && job.eventId && (
                                    <DropdownMenuItem onClick={() => navigate(`/jobs/${job.eventId}`)}>
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Vai all'Evento
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {job.type === "event" && job.quoteId && (
                                    <DropdownMenuItem onClick={() => navigate(`/jobs/${job.quoteId}`)}>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Vai al Preventivo
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </TabsContent>

          <TabsContent value="signed" className="m-0">
            <CardContent className="p-0">
              {/* stesso contenuto di "all" */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingQuotes || isLoadingEvents || isLoadingClients ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex justify-center">
                            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">Caricamento in corso...</p>
                        </TableCell>
                      </TableRow>
                    ) : sortedJobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex justify-center mb-2">
                            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                              <FileText className="h-6 w-6 text-gray-400" />
                            </div>
                          </div>
                          <p className="text-gray-500">Nessun lavoro firmato trovato</p>
                          {search && (
                            <Button 
                              variant="link" 
                              className="mt-1"
                              onClick={() => setSearch("")}
                            >
                              Cancella la ricerca
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedJobs.map((job) => (
                        <TableRow key={`${job.type}-${job.id}`}>
                          <TableCell>
                            <div className="font-medium">{job.title}</div>
                          </TableCell>
                          <TableCell>
                            {job.clientId ? getClientName(job.clientId) : "N/D"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {job.type === "quote" ? (
                                <>
                                  <FileText className="h-4 w-4 mr-1.5 text-primary" />
                                  <span>Preventivo</span>
                                </>
                              ) : (
                                <>
                                  <Calendar className="h-4 w-4 mr-1.5 text-blue-500" />
                                  <span>Evento</span>
                                </>
                              )}
                              {job.fromSignedQuote && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Da preventivo
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {job.date ? format(new Date(job.date), "d MMM yyyy", { locale: it }) : "N/D"}
                          </TableCell>
                          <TableCell>
                            {job.type === "quote" ? (
                              <Badge className={
                                job.quoteBadgeColor === "green" 
                                  ? "bg-green-100 text-green-800 hover:bg-green-200" 
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              }>
                                {job.quoteBadge}
                              </Badge>
                            ) : (
                              <Badge className={
                                job.status === "upcoming"
                                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  : job.status === "in-progress"
                                  ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                  : job.status === "completed"
                                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                                  : "bg-red-100 text-red-800 hover:bg-red-200"
                              }>
                                {job.status === "upcoming"
                                  ? "Prossimo"
                                  : job.status === "in-progress"
                                  ? "In Corso"
                                  : job.status === "completed"
                                  ? "Completato"
                                  : "Annullato"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/jobs/${job.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/jobs/${job.id}`)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Visualizza
                                  </DropdownMenuItem>
                                  
                                  {job.type === "quote" && !job.status !== "signed" && (
                                    <DropdownMenuItem onClick={() => navigate(`/quotes/new-quote?edit=${job.id}`)}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Modifica
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {job.type === "quote" && !job.eventId && (
                                    <DropdownMenuItem onClick={() => navigate(`/events/new?quoteId=${job.id}`)}>
                                      <CalendarPlus className="h-4 w-4 mr-2" />
                                      Crea Evento
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {job.type === "quote" && job.eventId && (
                                    <DropdownMenuItem onClick={() => navigate(`/jobs/${job.eventId}`)}>
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Vai all'Evento
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {job.type === "event" && job.quoteId && (
                                    <DropdownMenuItem onClick={() => navigate(`/jobs/${job.quoteId}`)}>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Vai al Preventivo
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </TabsContent>

          <TabsContent value="pending" className="m-0">
            <CardContent className="p-0">
              {/* stesso contenuto di "all" */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingQuotes || isLoadingEvents || isLoadingClients ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex justify-center">
                            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">Caricamento in corso...</p>
                        </TableCell>
                      </TableRow>
                    ) : sortedJobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex justify-center mb-2">
                            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                              <FileText className="h-6 w-6 text-gray-400" />
                            </div>
                          </div>
                          <p className="text-gray-500">Nessun preventivo in attesa di firma</p>
                          {search && (
                            <Button 
                              variant="link" 
                              className="mt-1"
                              onClick={() => setSearch("")}
                            >
                              Cancella la ricerca
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedJobs.map((job) => (
                        <TableRow key={`${job.type}-${job.id}`}>
                          <TableCell>
                            <div className="font-medium">{job.title}</div>
                          </TableCell>
                          <TableCell>
                            {job.clientId ? getClientName(job.clientId) : "N/D"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {job.type === "quote" ? (
                                <>
                                  <FileText className="h-4 w-4 mr-1.5 text-primary" />
                                  <span>Preventivo</span>
                                </>
                              ) : (
                                <>
                                  <Calendar className="h-4 w-4 mr-1.5 text-blue-500" />
                                  <span>Evento</span>
                                </>
                              )}
                              {job.fromSignedQuote && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Da preventivo
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {job.date ? format(new Date(job.date), "d MMM yyyy", { locale: it }) : "N/D"}
                          </TableCell>
                          <TableCell>
                            {job.type === "quote" ? (
                              <Badge className={
                                job.quoteBadgeColor === "green" 
                                  ? "bg-green-100 text-green-800 hover:bg-green-200" 
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              }>
                                {job.quoteBadge}
                              </Badge>
                            ) : (
                              <Badge className={
                                job.status === "upcoming"
                                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  : job.status === "in-progress"
                                  ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                  : job.status === "completed"
                                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                                  : "bg-red-100 text-red-800 hover:bg-red-200"
                              }>
                                {job.status === "upcoming"
                                  ? "Prossimo"
                                  : job.status === "in-progress"
                                  ? "In Corso"
                                  : job.status === "completed"
                                  ? "Completato"
                                  : "Annullato"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/jobs/${job.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/jobs/${job.id}`)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Visualizza
                                  </DropdownMenuItem>
                                  
                                  {job.type === "quote" && !job.status !== "signed" && (
                                    <DropdownMenuItem onClick={() => navigate(`/quotes/new-quote?edit=${job.id}`)}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Modifica
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {job.type === "quote" && !job.eventId && (
                                    <DropdownMenuItem onClick={() => navigate(`/events/new?quoteId=${job.id}`)}>
                                      <CalendarPlus className="h-4 w-4 mr-2" />
                                      Crea Evento
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {job.type === "quote" && job.eventId && (
                                    <DropdownMenuItem onClick={() => navigate(`/jobs/${job.eventId}`)}>
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Vai all'Evento
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {job.type === "event" && job.quoteId && (
                                    <DropdownMenuItem onClick={() => navigate(`/jobs/${job.quoteId}`)}>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Vai al Preventivo
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}