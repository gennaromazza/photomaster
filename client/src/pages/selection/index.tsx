import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function SelectionRedirector() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Estrai parametri dalla URL
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    const gallery = params.get('gallery');
    
    if (session && gallery) {
      // Reindirizza alla pagina di selezione corretta
      setLocation(`/selection/session/${session}/${gallery}`);
    } else {
      setError('Parametri mancanti. È necessario fornire sia il token di sessione che l\'ID della galleria.');
    }
  }, [setLocation]);
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Errore</CardTitle>
            <CardDescription>Si è verificato un errore durante l'accesso alla sessione di selezione</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.history.back()} className="w-full">Torna indietro</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Reindirizzamento...</span>
    </div>
  );
}