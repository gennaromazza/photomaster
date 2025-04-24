import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, Calendar, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface EventoCollaboratoreListProps {
  collaboratoreId: number;
}

export function EventoCollaboratoreList({ collaboratoreId }: EventoCollaboratoreListProps) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"tutti" | "passati" | "futuri">("tutti");

  const { data: eventi, isLoading, error } = useQuery({
    queryKey: [`/api/collaboratori/${collaboratoreId}/eventi`],
    staleTime: 5 * 60 * 1000, // 5 minuti
  });

  const filteredEventi = eventi ? eventi.filter((evento) => {
    const dataEvento = new Date(evento.eventDate);
    const oggi = new Date();
    
    if (filter === "passati") {
      return dataEvento < oggi;
    } else if (filter === "futuri") {
      return dataEvento >= oggi;
    }
    
    return true;
  }) : [];

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
          Si è verificato un errore durante il caricamento degli eventi
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

  if (filteredEventi.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 mb-6">
          <Button 
            variant={filter === "tutti" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("tutti")}
          >
            Tutti
          </Button>
          <Button 
            variant={filter === "futuri" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("futuri")}
          >
            Futuri
          </Button>
          <Button 
            variant={filter === "passati" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("passati")}
          >
            Passati
          </Button>
        </div>
        
        <div className="bg-muted/40 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            Nessun evento {filter !== "tutti" ? filter : ""} trovato per questo collaboratore.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-6">
        <Button 
          variant={filter === "tutti" ? "default" : "outline"} 
          size="sm"
          onClick={() => setFilter("tutti")}
        >
          Tutti
        </Button>
        <Button 
          variant={filter === "futuri" ? "default" : "outline"} 
          size="sm"
          onClick={() => setFilter("futuri")}
        >
          Futuri
        </Button>
        <Button 
          variant={filter === "passati" ? "default" : "outline"} 
          size="sm"
          onClick={() => setFilter("passati")}
        >
          Passati
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEventi.map((evento) => (
          <Card key={evento.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">{evento.title}</CardTitle>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 mr-1" />
                {format(new Date(evento.eventDate), "PPP", { locale: it })}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{evento.location}</p>
                    {evento.address && (
                      <p className="text-xs text-muted-foreground">{evento.address}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div className="text-sm">
                    {evento.startTime ? `${evento.startTime} - ${evento.endTime || '?'}` : 'Orario da definire'}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge variant="outline">
                    {evento.eventType || 'Non specificato'}
                  </Badge>
                  <Badge variant={
                    evento.status === 'confirmed' ? 'default' : 
                    evento.status === 'pending' ? 'secondary' : 
                    'outline'
                  }>
                    {evento.status === 'confirmed' ? 'Confermato' : 
                     evento.status === 'pending' ? 'In attesa' : 
                     'Annullato'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}