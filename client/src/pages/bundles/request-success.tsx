import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Home, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Settings } from '@shared/schema';

export default function RequestSuccessPage() {
  const [, navigate] = useLocation();

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

  const settings = settingsQuery.data as Settings;

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
          
          <div className="space-y-3">
            <Button 
              className="w-full" 
              onClick={() => navigate('/bundles')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna ai Pacchetti
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate('/')}
            >
              <Home className="mr-2 h-4 w-4" />
              Vai alla Home
            </Button>
          </div>
          
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