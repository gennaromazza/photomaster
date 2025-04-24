import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, FileText, Calendar, LucideEuro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

interface PagamentoCollaboratoreListProps {
  collaboratoreId: number;
}

export function PagamentoCollaboratoreList({ collaboratoreId }: PagamentoCollaboratoreListProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [periodoSelezionato, setPeriodoSelezionato] = useState<"tutti" | "mese" | "trimestre" | "anno">("tutti");

  const { data: pagamenti, isLoading, error } = useQuery({
    queryKey: [`/api/collaboratori/${collaboratoreId}/pagamenti`],
    staleTime: 5 * 60 * 1000, // 5 minuti
  });

  // Filtra i pagamenti in base alla ricerca e al periodo selezionato
  const filteredPagamenti = pagamenti ? pagamenti.filter((pagamento) => {
    const matchesSearch = pagamento.descrizione.toLowerCase().includes(search.toLowerCase()) ||
                         (pagamento.evento && pagamento.evento.toLowerCase().includes(search.toLowerCase()));
    
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
  const totalePagamenti = filteredPagamenti.reduce((acc, pagamento) => acc + pagamento.importo, 0);

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
            placeholder="Cerca per descrizione o evento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
        
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
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Riepilogo Pagamenti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Totale pagamenti {periodoSelezionato !== "tutti" ? `(${periodoSelezionato})` : ""}
            </div>
            <div className="text-xl font-bold">
              {formatCurrency(totalePagamenti)}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {filteredPagamenti.length === 0 ? (
        <div className="bg-muted/40 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            Nessun pagamento trovato. Prova a modificare i parametri di ricerca.
          </p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-medium">Descrizione</th>
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Evento</th>
                <th className="text-right p-3 font-medium">Importo</th>
              </tr>
            </thead>
            <tbody>
              {filteredPagamenti.map((pagamento) => (
                <tr key={pagamento.id} className="border-t">
                  <td className="p-3 align-top">
                    <div className="font-medium">{pagamento.descrizione}</div>
                    {pagamento.note && (
                      <div className="text-xs text-muted-foreground mt-1">{pagamento.note}</div>
                    )}
                  </td>
                  <td className="p-3 text-sm whitespace-nowrap">
                    {format(new Date(pagamento.dataPagamento), "PPP", { locale: it })}
                  </td>
                  <td className="p-3 text-sm">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                      {pagamento.tipoPagamento.charAt(0).toUpperCase() + pagamento.tipoPagamento.slice(1)}
                    </div>
                  </td>
                  <td className="p-3 text-sm">
                    {pagamento.evento || "-"}
                  </td>
                  <td className="p-3 text-right font-medium">
                    {formatCurrency(pagamento.importo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}