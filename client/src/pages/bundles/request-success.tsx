import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { CheckCircle2, MailIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Settings, BundleLead } from '@shared/schema';
import PdfGenerator from '@/components/bundles/pdf-generator';
import { Loader2 } from 'lucide-react';

export default function RequestSuccessPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Query per recuperare le impostazioni dello studio
  const settingsQuery = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Errore nel caricamento delle impostazioni');
        return await res.json();
      } catch (error) {
        console.error('Errore durante il recupero delle impostazioni:', error);
        throw new Error('Errore nel caricamento delle impostazioni');
      }
    }
  });

  // Recupera l'email dalla sessionStorage
  useEffect(() => {
    const storedEmail = sessionStorage.getItem('latestBundleRequestEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  // Query per recuperare i dettagli della richiesta
  const leadQuery = useQuery({
    queryKey: ['/api/bundle-leads/by-email', email],
    queryFn: async () => {
      if (!email) throw new Error('Email non disponibile');
      
      try {
        setIsLoading(true);
        const res = await fetch(`/api/bundle-leads/by-email/${encodeURIComponent(email)}`);
        if (!res.ok) throw new Error('Errore nel caricamento dei dettagli della richiesta');
        const data = await res.json();
        return data;
      } catch (error) {
        console.error('Errore durante il recupero dei dettagli della richiesta:', error);
        throw new Error('Errore nel caricamento dei dettagli della richiesta');
      } finally {
        setIsLoading(false);
      }
    },
    enabled: !!email, // Esegui la query solo se l'email è disponibile
  });

  const settings = settingsQuery.data as Settings;
  const lead = leadQuery.data as BundleLead & {
    bundle: any;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg border-gray-200 overflow-hidden">
        <div className="h-2 bg-green-500 w-full"></div>
        <CardHeader className="text-center pt-8">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Richiesta Inviata!</h1>
          <p className="text-gray-600">
            La tua richiesta di preventivo è stata inviata con successo. 
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-700">
              {settings?.companyName || 'Il nostro team'} esaminerà la tua richiesta e ti contatterà presto.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Controlla la tua email per la conferma di ricezione.
            </p>
          </div>
          
          {isLoading ? (
            <div className="py-4 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Caricamento riepilogo...</span>
            </div>
          ) : lead ? (
            <PdfGenerator lead={lead} settings={settings} />
          ) : email ? (
            <div className="text-center text-amber-600 py-2">
              <p>Impossibile caricare il riepilogo della richiesta.</p>
            </div>
          ) : null}
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = `mailto:${settings?.companyEmail || 'info@studioarte.it'}`}
          >
            <MailIcon className="mr-2 h-4 w-4" />
            Contattaci per Email
          </Button>
          
          <div className="text-center text-sm text-gray-500 pt-4">
            <p>
              Per qualsiasi informazione, contattaci a{' '}
              <a 
                href={`mailto:${settings?.companyEmail || 'info@studioarte.it'}`} 
                className="text-primary hover:underline"
              >
                {settings?.companyEmail || 'info@studioarte.it'}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}