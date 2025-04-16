import { useEffect, useState } from "react";
import { useLocation, Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function AuthCallback() {
  const { handleGoogleCallback } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Ottieni il token dalla URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");

        if (!token) {
          setError("Token mancante nella risposta.");
          setLoading(false);
          return;
        }

        // Gestisci il callback
        await handleGoogleCallback(token);
        
        // Reindirizza alla home
        setLocation("/");
      } catch (err) {
        setError("Si è verificato un errore durante l'autenticazione.");
        setLoading(false);
      }
    };

    processCallback();
  }, [handleGoogleCallback, setLocation]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold mb-2">Errore di autenticazione</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => setLocation("/auth")}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Torna al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-2xl font-bold mb-2">Completamento autenticazione</h2>
        <p className="text-muted-foreground">
          Autenticazione in corso, sarai reindirizzato automaticamente...
        </p>
      </div>
    </div>
  );
}