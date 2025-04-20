import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Share2, Mail, MessageCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatDateLong } from "@/lib/utils";

interface ShareInfoSignedProps {
  quoteId: number;
  shareToken: string;
  clientName?: string;
  clientEmail?: string;
  secondClientName?: string;
  secondClientEmail?: string;
  signatureDate?: Date;
  title?: string;
}

export function ShareInfoSigned({
  quoteId,
  shareToken,
  clientName = "",
  clientEmail = "",
  secondClientName = "",
  secondClientEmail = "",
  signatureDate,
  title = "",
}: ShareInfoSignedProps) {
  const baseUrl = window.location.origin;
  const publicUrl = `${baseUrl}/quotes/public/${shareToken}`;

  // Prepara l'URL per WhatsApp
  const whatsappMessage = encodeURIComponent(
    `Ecco il link al tuo contratto firmato: ${publicUrl}`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

  // Prepara l'URL per email
  const emailSubject = encodeURIComponent(`Contratto firmato: ${title}`);
  const emailBody = encodeURIComponent(
    `Gentile ${clientName},\n\nGrazie per aver firmato il contratto. Puoi accedere al documento in qualsiasi momento tramite questo link:\n\n${publicUrl}\n\nCordiali saluti,\nIl tuo fotografo`
  );
  const emailUrl = `mailto:${clientEmail}?subject=${emailSubject}&body=${emailBody}`;

  // Prepara l'URL per second client email se presente
  const secondEmailUrl = secondClientEmail
    ? `mailto:${secondClientEmail}?subject=${emailSubject}&body=${encodeURIComponent(
        `Gentile ${secondClientName},\n\nGrazie per aver firmato il contratto. Puoi accedere al documento in qualsiasi momento tramite questo link:\n\n${publicUrl}\n\nCordiali saluti,\nIl tuo fotografo`
      )}`
    : "";

  return (
    <Card className="bg-muted/40 border border-green-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center text-green-700">
          <FileText className="mr-2 h-5 w-5" /> 
          Contratto firmato
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col space-y-1">
            <p className="text-sm text-muted-foreground">
              Il contratto è stato firmato
              {signatureDate ? ` il ${formatDateLong(signatureDate)}` : ""}.
            </p>
            <p className="text-sm text-muted-foreground">
              Il cliente può accedere al documento in qualsiasi momento tramite il link condiviso.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center" 
              onClick={() => window.open(publicUrl, '_blank')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Visualizza contratto
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center" 
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                // Aggiungi un feedback visivo qui se desideri
              }}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Copia link
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Condividi via:</h4>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center text-green-600 hover:text-green-700 hover:bg-green-50" 
                onClick={() => window.open(whatsappUrl, '_blank')}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
              
              {clientEmail && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                  onClick={() => window.open(emailUrl, '_blank')}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email {clientName ? clientName.split(' ')[0] : "cliente"}
                </Button>
              )}
              
              {secondClientEmail && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                  onClick={() => window.open(secondEmailUrl, '_blank')}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email {secondClientName ? secondClientName.split(' ')[0] : "secondo cliente"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}