import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, Calendar, Check, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function GoogleCalendarIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);

  // Query per verificare lo stato della connessione a Google Calendar
  const { data: googleStatus, isLoading } = useQuery({
    queryKey: ['/api/google/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/google/status');
      return response.json();
    }
  });

  // Mutation per la sincronizzazione di tutti gli eventi
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/google/sync-all');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sincronizzazione completata",
        description: `Eventi sincronizzati: ${data.success}, eventi falliti: ${data.failed}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
    onError: () => {
      toast({
        title: "Errore di sincronizzazione",
        description: "Si è verificato un errore durante la sincronizzazione degli eventi.",
        variant: "destructive"
      });
    }
  });

  // Mutation per l'importazione degli eventi da Google Calendar
  const importEventsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/google/import');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Importazione completata",
        description: `Importati ${data.count} eventi da Google Calendar.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
    onError: () => {
      toast({
        title: "Errore di importazione",
        description: "Si è verificato un errore durante l'importazione degli eventi.",
        variant: "destructive"
      });
    }
  });

  // Funzione per connettersi a Google Calendar
  const connectToGoogle = async () => {
    try {
      const response = await apiRequest('GET', '/api/google/auth');
      const data = await response.json();
      
      // Reindirizza l'utente all'URL di autorizzazione di Google
      window.location.href = data.authUrl;
    } catch (error) {
      toast({
        title: "Errore di connessione",
        description: "Impossibile connettersi a Google Calendar. Riprova più tardi.",
        variant: "destructive"
      });
    }
  };

  // Funzione per revocare l'accesso a Google Calendar
  // Nota: Per semplicità, questa funzionalità non è stata implementata lato server
  // e richiederebbe un endpoint aggiuntivo

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" /> 
          Integrazione Google Calendar
        </CardTitle>
        <CardDescription>
          Sincronizza gli eventi del tuo studio con Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : googleStatus?.isConnected ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Connesso a Google Calendar</AlertTitle>
              <AlertDescription className="text-green-700">
                La tua agenda è sincronizzata con Google Calendar.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between border p-4 rounded-lg">
                <div>
                  <h4 className="font-medium">Sincronizzazione automatica</h4>
                  <p className="text-sm text-muted-foreground">
                    Gli eventi creati nell'app saranno sincronizzati automaticamente con Google Calendar
                  </p>
                </div>
                <Switch id="auto-sync" defaultChecked={true} />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => syncAllMutation.mutate()}
                  disabled={syncAllMutation.isPending}
                  className="flex gap-2 items-center"
                >
                  {syncAllMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sincronizza tutti gli eventi
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => importEventsMutation.mutate()}
                  disabled={importEventsMutation.isPending}
                  className="flex gap-2 items-center"
                >
                  {importEventsMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4" />
                  )}
                  Importa eventi da Google
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Non connesso</AlertTitle>
              <AlertDescription className="text-amber-700">
                Connetti il tuo account Google per sincronizzare gli eventi con Google Calendar.
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-center mt-4">
              <Button 
                onClick={connectToGoogle}
                className="bg-blue-500 hover:bg-blue-600 text-white"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div className="flex items-center gap-2">
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                    className={`transition-transform ${isHovered ? 'scale-110' : 'scale-100'}`}
                  >
                    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                    </g>
                  </svg>
                  Connetti con Google
                </div>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}