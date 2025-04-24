import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CopyIcon, CheckIcon, ExternalLinkIcon } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface GeneraTokenDashboardProps {
  collaboratoreId: number;
}

export function GeneraTokenDashboard({ collaboratoreId }: GeneraTokenDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerateToken = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest("POST", `/api/collaboratori/${collaboratoreId}/generate-dashboard-token`);
      const data = await response.json();
      
      setToken(data.token);
      setDashboardUrl(data.dashboardUrl);
      
      toast({
        title: "Token generato con successo",
        description: "Il collaboratore può ora accedere alla dashboard pubblica",
      });
    } catch (error) {
      console.error("Errore nella generazione del token:", error);
      
      toast({
        title: "Errore",
        description: "Si è verificato un errore nella generazione del token",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (dashboardUrl) {
      navigator.clipboard.writeText(dashboardUrl);
      setCopied(true);
      
      toast({
        title: "Link copiato",
        description: "Link copiato negli appunti",
      });
      
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openDashboard = () => {
    if (dashboardUrl) {
      window.open(dashboardUrl, '_blank');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Dashboard Pubblica</CardTitle>
        <CardDescription>
          Genera un link sicuro per la dashboard pubblica del collaboratore
        </CardDescription>
      </CardHeader>
      <CardContent>
        {dashboardUrl ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input 
                value={dashboardUrl} 
                readOnly 
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={copyToClipboard}
                className="aspect-square"
              >
                {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={openDashboard}
                className="aspect-square"
              >
                <ExternalLinkIcon className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Questo link scade dopo 30 giorni. Per rinnovarlo, genera un nuovo token.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">
            Genera un token per consentire al collaboratore di accedere alla propria dashboard pubblica.
            Il token è valido per 30 giorni.
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleGenerateToken} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin">⏳</span>
              Generazione in corso...
            </>
          ) : (
            'Genera Link Pubblico'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};