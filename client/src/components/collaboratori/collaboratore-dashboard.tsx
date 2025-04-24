import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarClock, FileText, LucideEuro, CheckSquare, FileCheck, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EventoCollaboratoreList } from "./eventi-collaboratore";
import { PagamentoCollaboratoreList } from "./pagamenti-collaboratore";
import { MontaggioCollaboratoreList } from "./montaggi-collaboratore";

interface CollaboratoreDashboardProps {
  collaboratoreId: number;
}

export function CollaboratoreDashboard({ collaboratoreId }: CollaboratoreDashboardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/collaboratori/${collaboratoreId}/dashboard`],
    staleTime: 5 * 60 * 1000, // 5 minuti
  });

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
          Si è verificato un errore durante il caricamento della dashboard
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

  const { collaboratore, statistiche, montaggiRecenti, pagamentiRecenti } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {collaboratore.profileImage ? (
          <img 
            src={collaboratore.profileImage} 
            alt={`${collaboratore.firstName} ${collaboratore.lastName}`}
            className="w-24 h-24 rounded-full object-cover"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold">
            {collaboratore.firstName.charAt(0)}{collaboratore.lastName.charAt(0)}
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold">{collaboratore.firstName} {collaboratore.lastName}</h2>
          <p className="text-muted-foreground">{collaboratore.role}</p>
          <div className="flex items-center mt-1">
            <Badge variant={collaboratore.status === "available" ? "outline" : "secondary"}>
              {collaboratore.status === "available" ? "Disponibile" : "Non disponibile"}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="eventi">Eventi</TabsTrigger>
          <TabsTrigger value="pagamenti">Pagamenti</TabsTrigger>
          <TabsTrigger value="montaggi">Montaggi</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Montaggi</CardTitle>
                <CardDescription>Stato dei montaggi assegnati</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{statistiche.montaggiTotali}</div>
                  <FileCheck className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Pendenti</span>
                    <span className="font-semibold">{statistiche.montaggiPendenti}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Completati</span>
                    <span className="font-semibold">{statistiche.montaggiCompletati}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Pagamenti</CardTitle>
                <CardDescription>Riepilogo pagamenti</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{statistiche.pagamentiTotali}</div>
                  <LucideEuro className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="mt-4 flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Importo totale</span>
                  <span className="font-semibold text-lg">
                    {formatCurrency(statistiche.importoTotalePagamenti)}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Contatti</CardTitle>
                <CardDescription>Informazioni di contatto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="font-medium">{collaboratore.email}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Telefono</span>
                  <span className="font-medium">{collaboratore.phone}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Montaggi recenti</CardTitle>
              </CardHeader>
              <CardContent>
                {montaggiRecenti.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4">Nessun montaggio recente</p>
                ) : (
                  <ul className="space-y-4">
                    {montaggiRecenti.map((montaggio) => (
                      <li key={montaggio.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                        <div>
                          <p className="font-medium">{montaggio.titolo}</p>
                          <div className="flex items-center mt-1">
                            <CalendarClock className="w-4 h-4 mr-1 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {new Date(montaggio.scadenza).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                        </div>
                        <Badge 
                          variant={
                            montaggio.stato === "completato" 
                              ? "outline" 
                              : montaggio.stato === "in_corso" 
                                ? "secondary" 
                                : "default"
                          }
                        >
                          {montaggio.stato === "completato" 
                            ? "Completato" 
                            : montaggio.stato === "in_corso" 
                              ? "In corso" 
                              : "Da fare"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
                <Button 
                  variant="link" 
                  className="px-0 mt-2"
                  onClick={() => setActiveTab("montaggi")}
                >
                  Visualizza tutti i montaggi
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Pagamenti recenti</CardTitle>
              </CardHeader>
              <CardContent>
                {pagamentiRecenti.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4">Nessun pagamento recente</p>
                ) : (
                  <ul className="space-y-4">
                    {pagamentiRecenti.map((pagamento) => (
                      <li key={pagamento.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                        <div>
                          <p className="font-medium">{pagamento.descrizione}</p>
                          <div className="flex items-center mt-1">
                            <FileText className="w-4 h-4 mr-1 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {pagamento.tipoPagamento.charAt(0).toUpperCase() + pagamento.tipoPagamento.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(pagamento.importo)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(pagamento.dataPagamento).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Button 
                  variant="link" 
                  className="px-0 mt-2"
                  onClick={() => setActiveTab("pagamenti")}
                >
                  Visualizza tutti i pagamenti
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="eventi">
          <EventoCollaboratoreList collaboratoreId={collaboratoreId} />
        </TabsContent>
        
        <TabsContent value="pagamenti">
          <PagamentoCollaboratoreList collaboratoreId={collaboratoreId} />
        </TabsContent>
        
        <TabsContent value="montaggi">
          <MontaggioCollaboratoreList collaboratoreId={collaboratoreId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}