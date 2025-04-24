import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistance } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, CheckIcon, ClockIcon, LinkIcon, SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EventoCollaboratore {
  id: number;
  eventoId: number;
  collaboratoreId: number;
  ruolo: string;
  dataAssegnazione: string;
  note?: string;
  evento?: {
    id: number;
    title: string;
    description?: string;
    date: string;
    location?: string;
    type?: string;
    status: string;
  };
}

interface PagamentoCollaboratore {
  id: number;
  collaboratoreId: number;
  eventoId: number;
  tipo: string;
  importo: number;
  dataPagamento: string;
  metodoPagamento?: string;
  note?: string;
  riferimentoEsterno?: string;
  evento?: {
    title: string;
  };
}

interface MontaggioCollaboratore {
  id: number;
  collaboratoreId: number;
  eventoId: number;
  acconto: number;
  saldo?: number;
  dataPrimoContatto?: string;
  priorita: number;
  dataConsegnaPrevista: string;
  stato: string;
  note?: string;
  evento?: {
    title: string;
  };
}

interface DashboardData {
  collaboratore: {
    id: number;
    nome: string;
    ruolo: string;
    profileImage?: string;
  };
  eventi: EventoCollaboratore[];
  pagamenti: PagamentoCollaboratore[];
  montaggi: MontaggioCollaboratore[];
}

export default function DashboardCollaboratorePublic() {
  const [searchParams] = useState<URLSearchParams>(new URLSearchParams(window.location.search));
  const [token, setToken] = useState<string | null>(null);
  const [collaboratoreId, setCollaboratoreId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("eventi");
  const [, navigate] = useLocation();

  // Estrai i parametri dall'URL
  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    const idFromUrl = searchParams.get("id");
    
    console.log("Token from URL:", tokenFromUrl);
    console.log("ID from URL:", idFromUrl);
    
    if (tokenFromUrl && idFromUrl) {
      setToken(tokenFromUrl);
      setCollaboratoreId(parseInt(idFromUrl, 10));
    } else {
      console.error("Parametri mancanti:", { token: tokenFromUrl, id: idFromUrl });
      // Reindirizza a una pagina di errore o alla homepage se mancano parametri necessari
      navigate("/error?message=Parametri+mancanti");
    }
  }, [searchParams, navigate]);

  // Fetch dei dati della dashboard
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useQuery<DashboardData>({
    queryKey: [`/api/collaboratori/${collaboratoreId}/dashboard-public`],
    queryFn: async () => {
      if (!collaboratoreId || !token) return null;
      
      const res = await fetch(
        `/api/collaboratori/${collaboratoreId}/dashboard-public?token=${token}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );
      
      if (!res.ok) {
        throw new Error(`Errore di autenticazione: ${res.status}`);
      }
      
      return await res.json();
    },
    enabled: !!collaboratoreId && !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-medium text-gray-700">Caricamento dashboard...</h2>
          <p className="text-gray-500 mt-2">Recupero delle informazioni in corso</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">
            <i className="ri-error-warning-line"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Accesso non autorizzato</h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error ? error.message : "Token non valido o scaduto. Contatta lo studio fotografico per ricevere un nuovo link di accesso."}
          </p>
          <Button onClick={() => window.location.href = "/"} className="w-full">
            Torna alla Homepage
          </Button>
        </div>
      </div>
    );
  }

  // Funzione per formattare data e ora
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "d MMMM yyyy, HH:mm", { locale: it });
    } catch (e) {
      return "Data non valida";
    }
  };

  // Funzione per formattare la priorità
  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return { label: "Bassa", color: "green" };
      case 2: return { label: "Media", color: "yellow" };
      case 3: return { label: "Alta", color: "orange" };
      case 4: return { label: "Urgente", color: "red" };
      default: return { label: "Non specificata", color: "gray" };
    }
  };

  // Funzione per formattare lo stato del montaggio
  const getMontaggioStatusLabel = (status: string) => {
    switch (status) {
      case "da_fare": return { label: "Da fare", color: "gray" };
      case "in_corso": return { label: "In lavorazione", color: "yellow" };
      case "completato": return { label: "Completato", color: "green" };
      case "in_revisione": return { label: "In revisione", color: "blue" };
      case "approvato": return { label: "Approvato", color: "green" };
      default: return { label: status, color: "gray" };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-primary text-white py-6 px-4 md:px-8 shadow-md">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Dashboard Collaboratore</h1>
              <p className="mt-1 opacity-80">
                Benvenuto, {dashboardData.collaboratore.nome}
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Badge variant="outline" className="text-white border-white/30 px-3 py-1">
                {dashboardData.collaboratore.ruolo}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Contenuto principale */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 pt-8">
        {/* Statistiche generali */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="mr-4 p-2 bg-blue-100 rounded-full">
                  <CalendarIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Eventi Assegnati</p>
                  <h3 className="text-2xl font-bold">{dashboardData.eventi.length}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="mr-4 p-2 bg-green-100 rounded-full">
                  <CheckIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Pagamenti Ricevuti</p>
                  <h3 className="text-2xl font-bold">
                    {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
                      .format(dashboardData.pagamenti.reduce((acc, p) => acc + Number(p.importo), 0))}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="mr-4 p-2 bg-amber-100 rounded-full">
                  <ClockIcon className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Montaggi Assegnati</p>
                  <h3 className="text-2xl font-bold">{dashboardData.montaggi.length}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs per visualizzare i diversi tipi di dati */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-8">
            <TabsTrigger value="eventi" className="flex-1" aria-label="Eventi">
              Eventi
            </TabsTrigger>
            <TabsTrigger value="pagamenti" className="flex-1" aria-label="Pagamenti">
              Pagamenti
            </TabsTrigger>
            <TabsTrigger value="montaggi" className="flex-1" aria-label="Montaggi">
              Montaggi
            </TabsTrigger>
          </TabsList>

          {/* Tab Eventi */}
          <TabsContent value="eventi" className="space-y-6">
            {dashboardData.eventi.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-500">Non hai eventi assegnati.</p>
                </CardContent>
              </Card>
            ) : (
              dashboardData.eventi.map((evento) => (
                <Card key={evento.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{evento.evento?.title || "Evento senza titolo"}</CardTitle>
                        <CardDescription>
                          {evento.evento?.date ? formatDateTime(evento.evento.date) : "Data non specificata"}
                          {evento.evento?.location && ` • ${evento.evento.location}`}
                        </CardDescription>
                      </div>
                      <Badge variant={evento.evento?.status === "confirmed" ? "green" : "outline"}>
                        {evento.evento?.status === "confirmed" ? "Confermato" : "In attesa"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <span className="text-gray-500 inline-block w-24">Ruolo:</span>
                        <span className="font-medium">{evento.ruolo}</span>
                      </div>
                      {evento.evento?.type && (
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 inline-block w-24">Tipo evento:</span>
                          <span>{evento.evento.type}</span>
                        </div>
                      )}
                      {evento.evento?.description && (
                        <div className="flex items-start text-sm mt-2">
                          <span className="text-gray-500 inline-block w-24">Descrizione:</span>
                          <span className="flex-1">{evento.evento.description}</span>
                        </div>
                      )}
                      {evento.note && (
                        <div className="flex items-start text-sm mt-2">
                          <span className="text-gray-500 inline-block w-24">Note:</span>
                          <span className="flex-1">{evento.note}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm">
                        <span className="text-gray-500 inline-block w-24">Assegnato il:</span>
                        <span>{formatDateTime(evento.dataAssegnazione)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Tab Pagamenti */}
          <TabsContent value="pagamenti" className="space-y-6">
            {dashboardData.pagamenti.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-500">Non hai ancora ricevuto pagamenti.</p>
                </CardContent>
              </Card>
            ) : (
              dashboardData.pagamenti.map((pagamento) => (
                <Card key={pagamento.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>
                          {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
                            .format(Number(pagamento.importo))}
                        </CardTitle>
                        <CardDescription>
                          {pagamento.evento?.title || `Evento ID: ${pagamento.eventoId}`}
                        </CardDescription>
                      </div>
                      <Badge>
                        {pagamento.tipo === "acconto" ? "Acconto" : 
                         pagamento.tipo === "saldo" ? "Saldo" : 
                         pagamento.tipo === "montaggio_acconto" ? "Acconto Montaggio" : 
                         pagamento.tipo === "montaggio_saldo" ? "Saldo Montaggio" : 
                         pagamento.tipo}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <span className="text-gray-500 inline-block w-28">Data pagamento:</span>
                        <span>{formatDateTime(pagamento.dataPagamento)}</span>
                      </div>
                      {pagamento.metodoPagamento && (
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 inline-block w-28">Metodo:</span>
                          <span>{pagamento.metodoPagamento}</span>
                        </div>
                      )}
                      {pagamento.riferimentoEsterno && (
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 inline-block w-28">Riferimento:</span>
                          <span>{pagamento.riferimentoEsterno}</span>
                        </div>
                      )}
                      {pagamento.note && (
                        <div className="flex items-start text-sm mt-2">
                          <span className="text-gray-500 inline-block w-28">Note:</span>
                          <span className="flex-1">{pagamento.note}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Tab Montaggi */}
          <TabsContent value="montaggi" className="space-y-6">
            {dashboardData.montaggi.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-500">Non hai montaggi assegnati.</p>
                </CardContent>
              </Card>
            ) : (
              dashboardData.montaggi.map((montaggio) => {
                const priority = getPriorityLabel(montaggio.priorita);
                const status = getMontaggioStatusLabel(montaggio.stato);
                
                return (
                  <Card key={montaggio.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>
                            {montaggio.evento?.title || `Evento ID: ${montaggio.eventoId}`}
                          </CardTitle>
                          <CardDescription>
                            Consegna prevista: {formatDateTime(montaggio.dataConsegnaPrevista)}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className={`bg-${priority.color}-50 text-${priority.color}-700 border-${priority.color}-200`}>
                            Priorità: {priority.label}
                          </Badge>
                          <Badge variant={status.color === "green" ? "green" : "outline"} className={status.color !== "green" ? `bg-${status.color}-50 text-${status.color}-700 border-${status.color}-200` : ""}>
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 inline-block w-28">Acconto:</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
                              .format(Number(montaggio.acconto))}
                          </span>
                        </div>
                        
                        {montaggio.saldo !== null && montaggio.saldo !== undefined && (
                          <div className="flex items-center text-sm">
                            <span className="text-gray-500 inline-block w-28">Saldo:</span>
                            <span className="font-medium">
                              {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
                                .format(Number(montaggio.saldo))}
                            </span>
                          </div>
                        )}
                        
                        {montaggio.dataPrimoContatto && (
                          <div className="flex items-center text-sm">
                            <span className="text-gray-500 inline-block w-28">Primo contatto:</span>
                            <span>{formatDateTime(montaggio.dataPrimoContatto)}</span>
                          </div>
                        )}
                        
                        {montaggio.note && (
                          <div className="flex items-start text-sm mt-2">
                            <span className="text-gray-500 inline-block w-28">Note:</span>
                            <span className="flex-1">{montaggio.note}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>Dashboard Collaboratore - Image Studios {new Date().getFullYear()}</p>
          <p className="mt-2">Accesso riservato ai collaboratori</p>
        </div>
      </footer>
    </div>
  );
}