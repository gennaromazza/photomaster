import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
} from "lucide-react";

export default function JobsPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Definisce l'interfaccia per i job
  interface Job {
    id: number;
    type: "quote" | "event";
    title: string;
    clientId: number;
    clientName: string;
    eventDate?: string;
    createdAt: string;
    updatedAt: string;
    isSigned?: boolean;
    status: string;
    quoteId?: number;
    eventId?: number;
  }
  
  // Carica tutti i lavori (preventivi ed eventi)
  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  // Filtra i lavori in base al termine di ricerca e al tab attivo
  const filteredJobs = jobs.filter((job: Job) => {
    // Filtra in base al termine di ricerca
    const matchesSearch = 
      !searchTerm || 
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtra in base al tab attivo
    const matchesTab = 
      activeTab === "all" ||
      (activeTab === "quotes" && job.type === "quote") ||
      (activeTab === "events" && job.type === "event");
    
    return matchesSearch && matchesTab;
  });

  // Formatta la data
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/D";
    return format(new Date(dateString), "d MMM yyyy", { locale: it });
  };

  // Ottieni il colore del badge in base allo stato del lavoro
  const getStatusColor = (job: Job) => {
    if (job.type === "quote") {
      return job.isSigned ? "green" : "amber";
    } else {
      switch (job.status?.toLowerCase()) {
        case "completed":
          return "green";
        case "in progress":
          return "blue";
        case "scheduled":
          return "amber";
        case "cancelled":
          return "destructive";
        default:
          return "secondary";
      }
    }
  };

  // Ottieni il testo dello stato in base al tipo e allo stato del lavoro
  const getStatusText = (job: Job) => {
    if (job.type === "quote") {
      return job.isSigned ? "Firmato" : "In Attesa";
    } else {
      switch (job.status?.toLowerCase()) {
        case "completed":
          return "Completato";
        case "in progress":
          return "In Corso";
        case "scheduled":
          return "Programmato";
        case "cancelled":
          return "Annullato";
        default:
          return "N/D";
      }
    }
  };

  // Ottieni l'icona in base al tipo di lavoro
  const getTypeIcon = (job: Job) => {
    if (job.type === "quote") {
      return <FileText className="h-4 w-4" />;
    } else {
      return <Calendar className="h-4 w-4" />;
    }
  };

  return (
    <div className="container py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Lavori</h1>
          <p className="text-muted-foreground">
            Gestisci preventivi, eventi e tutti i tuoi lavori in un unico posto
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => navigate("/quotes/new")}>
            <FileText className="h-4 w-4 mr-2" />
            Nuovo Preventivo
          </Button>
          <Button onClick={() => navigate("/events/new")}>
            <Calendar className="h-4 w-4 mr-2" />
            Nuovo Evento
          </Button>
        </div>
      </div>

      <div className="grid gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>I Tuoi Lavori</CardTitle>
            <CardDescription>
              Visualizza e gestisci tutti i tuoi lavori in corso e programmati
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Cerca per titolo, cliente..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                  <TabsList>
                    <TabsTrigger value="all">Tutti</TabsTrigger>
                    <TabsTrigger value="quotes">Preventivi</TabsTrigger>
                    <TabsTrigger value="events">Eventi</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Caricamento lavori in corso...
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <div className="flex justify-center">
                      <Filter className="h-12 w-12 text-muted-foreground opacity-50" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">Nessun lavoro trovato</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {searchTerm
                        ? "Nessun lavoro corrisponde ai criteri di ricerca. Prova a modificare i filtri."
                        : "Nessun lavoro presente. Crea un nuovo preventivo o evento per iniziare."}
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                      <Button onClick={() => navigate("/quotes/new")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuovo Preventivo
                      </Button>
                      <Button variant="outline" onClick={() => navigate("/events/new")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuovo Evento
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border">
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
                      {filteredJobs.map((job: Job) => (
                        <TableRow 
                          key={`${job.type}-${job.id}`}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/jobs/${job.id}`)}
                        >
                          <TableCell className="font-medium">{job.title}</TableCell>
                          <TableCell>{job.clientName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex w-fit items-center gap-1">
                              {getTypeIcon(job)}
                              {job.type === "quote" ? "Preventivo" : "Evento"}
                            </Badge>
                          </TableCell>
                          <TableCell>{job.eventDate ? formatDate(job.eventDate) : "N/D"}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(job)}>
                              {job.isSigned ? (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              ) : (
                                <Clock className="h-3 w-3 mr-1" />
                              )}
                              {getStatusText(job)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/jobs/${job.id}`);
                              }}
                            >
                              <ArrowRight className="h-4 w-4" />
                              <span className="sr-only">Visualizza dettagli</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}