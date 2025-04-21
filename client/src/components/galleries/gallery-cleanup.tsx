import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function GalleryCleanup() {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation per eliminare tutte le gallerie
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/gallery/cleanup", { deleteFiles });
      return await response.json();
    },
    onMutate: () => {
      setIsLoading(true);
    },
    onSuccess: (data) => {
      setIsLoading(false);
      setIsConfirmDialogOpen(false);
      toast({
        title: "Pulizia completata",
        description: `${data.galleries} gallerie e ${data.photos} foto eliminate con successo.`,
      });
      
      // Aggiorna le liste di gallerie e foto
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/galleries"] });
    },
    onError: (error) => {
      setIsLoading(false);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la pulizia. Riprova più tardi.",
        variant: "destructive",
      });
      console.error("Errore durante la pulizia:", error);
    },
  });

  const handleCleanup = () => {
    cleanupMutation.mutate();
  };

  return (
    <>
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <Trash2 className="mr-2 h-5 w-5" />
            Pulizia completa gallerie
          </CardTitle>
          <CardDescription>
            Elimina tutte le gallerie e le foto dal sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Attenzione!</AlertTitle>
            <AlertDescription>
              Questa operazione eliminerà permanentemente tutte le gallerie e le foto dal sistema.
              Non sarà possibile recuperare i dati dopo l'eliminazione.
            </AlertDescription>
          </Alert>
          
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox 
              id="delete-files" 
              checked={deleteFiles}
              onCheckedChange={(checked) => setDeleteFiles(!!checked)}
            />
            <label
              htmlFor="delete-files"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Elimina anche i file fisici dallo storage
            </label>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="destructive" 
            onClick={() => setIsConfirmDialogOpen(true)}
            className="w-full"
          >
            Elimina tutte le gallerie
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare tutte le gallerie e le foto dal sistema?
              Questa operazione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCleanup}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminazione in corso...
                </>
              ) : (
                "Elimina tutto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}