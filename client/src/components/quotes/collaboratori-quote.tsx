
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, UserCheck, Phone } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { getRoleLabel } from "@/lib/constants";

interface CollaboratoriQuoteProps {
  quoteId: number;
  title: string;
  date: Date;
  location: string;
  ceremonyLocation?: string;
  ceremonyTime?: string;
  client: {
    firstName: string;
    lastName: string;
    phone: string;
  };
}

export function CollaboratoriQuote({ 
  quoteId, 
  title, 
  date, 
  location, 
  ceremonyLocation, 
  ceremonyTime,
  client 
}: CollaboratoriQuoteProps) {
  const { data: collaboratori, isLoading, error } = useQuery({
    queryKey: [`/api/eventi/preventivo/${quoteId}/collaboratori`],
    enabled: !!quoteId
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-primary/80" />
            Collaboratori Assegnati
          </CardTitle>
          <CardDescription>
            Visualizza i collaboratori assegnati al servizio
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-primary/80" />
            Collaboratori Assegnati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-destructive/10 rounded-md text-center text-destructive">
            Si è verificato un errore nel caricamento dei collaboratori.
          </div>
        </CardContent>
      </Card>
    );
  }

  const formattedDate = date ? format(new Date(date), "dd/MM/yyyy", { locale: it }) : 'Data non disponibile';

  const createWhatsAppMessage = (collaboratore: any) => {
    const message = encodeURIComponent(
      `Ciao ${collaboratore.collaboratore.firstName},\n\n` +
      `Ti confermo l'evento "${title}"\n\n` +
      `📅 Data: ${formattedDate}\n` +
      `📍 Location: ${location}\n` +
      (ceremonyLocation ? `🏛️ Cerimonia: ${ceremonyLocation}\n` : '') +
      (ceremonyTime ? `⏰ Orario Cerimonia: ${ceremonyTime}\n` : '') +
      `👥 Cliente: ${client.firstName} ${client.lastName}\n` +
      `📱 Telefono Cliente: ${client.phone}\n` +
      `🎯 Il tuo ruolo: ${collaboratore.ruolo}\n\n` +
      `Per qualsiasi informazione, contattami.`
    );
    return `https://wa.me/${collaboratore.collaboratore.phone?.replace(/\D/g, '')}?text=${message}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <UserCheck className="w-5 h-5 mr-2 text-primary/80" />
          Collaboratori Assegnati
        </CardTitle>
        <CardDescription>
          {collaboratori?.length ? `${collaboratori.length} collaboratori assegnati all'evento` : 'Nessun collaboratore assegnato'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {collaboratori?.length === 0 ? (
          <div className="text-center p-4 bg-muted/40 rounded-md">
            <p className="text-muted-foreground">
              Nessun collaboratore assegnato a questo preventivo.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {collaboratori?.map((collaboratore: any) => (
              <div 
                key={collaboratore.id} 
                className="border rounded-md p-3 flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {collaboratore.collaboratore.firstName.charAt(0)}
                      {collaboratore.collaboratore.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {collaboratore.collaboratore.firstName} {collaboratore.collaboratore.lastName}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline" className="capitalize">
                        {getRoleLabel(collaboratore.ruolo)}
                      </Badge>
                      {collaboratore.dataAssegnazione && (
                        <span className="text-xs text-muted-foreground">
                          Assegnato il {format(new Date(collaboratore.dataAssegnazione), "dd/MM/yyyy", { locale: it })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {collaboratore.collaboratore.phone && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-9 w-9 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => window.open(createWhatsAppMessage(collaboratore), '_blank')}
                        >
                          <Phone className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Invia dettagli evento via WhatsApp</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
