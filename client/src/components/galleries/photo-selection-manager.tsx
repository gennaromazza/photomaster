import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Photo } from "@/types/gallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HeartIcon, Bookmark, Star, ThumbsUp, Check, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";

interface PhotoSelectionManagerProps {
  galleryId: number;
  selectedPhotos: number[];
  onClearSelection: () => void;
  clientId?: number;
  clientEmail?: string;
  clientName?: string;
  visitorInfo?: { name: string; email: string } | null;
  onSaveSelections?: () => Promise<any>;
}

export function PhotoSelectionManager({
  galleryId,
  selectedPhotos,
  onClearSelection,
  clientId,
  clientEmail,
  clientName,
  visitorInfo,
  onSaveSelections,
}: PhotoSelectionManagerProps) {
  const { toast } = useToast();
  const [selectionType, setSelectionType] = useState<string>("favorite");
  const [notes, setNotes] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Ottieni le selezioni esistenti per questo cliente
  const { data: existingSelections } = useQuery({
    queryKey: [`/api/gallery/galleries/${galleryId}/selections`, { clientId }],
    queryFn: async () => {
      const response = await fetch(`/api/gallery/galleries/${galleryId}/selections${clientId ? `?clientId=${clientId}` : ""}`);
      if (!response.ok) throw new Error("Errore nel recupero delle selezioni");
      return response.json();
    },
    enabled: !!galleryId
  });

  // Invia le selezioni al server
  const handleSaveSelection = async () => {
    if (selectedPhotos.length === 0) {
      toast({
        title: "Nessuna foto selezionata",
        description: "Seleziona almeno una foto prima di salvare.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Se è stata passata una funzione personalizzata per il salvataggio (usata con il form visitatore)
      if (onSaveSelections) {
        await onSaveSelections();
        
        toast({
          title: "Selezione salvata",
          description: `${selectedPhotos.length} foto salvate con successo.`,
        });
        
        // Pulisci la selezione
        onClearSelection();
        setNotes("");
        return;
      }
      
      // Recupera i dati del cliente dal visitorInfo se disponibile
      const actualClientEmail = clientEmail || (visitorInfo?.email);
      const actualClientName = clientName || (visitorInfo?.name);
      
      // Invia tutte le selezioni con una singola richiesta batch
      await apiRequest("POST", `/api/gallery/galleries/selections/batch`, {
        galleryId,
        photoIds: selectedPhotos,
        selectionType,
        notes,
        clientId,
        clientEmail: actualClientEmail,
        clientName: actualClientName
      });
      
      // Invalida la cache per ricaricare le selezioni
      queryClient.invalidateQueries({ 
        queryKey: [`/api/gallery/galleries/${galleryId}/selections`] 
      });
      
      toast({
        title: "Selezione salvata",
        description: `${selectedPhotos.length} foto salvate con successo.`,
      });
      
      // Pulisci la selezione
      onClearSelection();
      setNotes("");
    } catch (error) {
      console.error("Errore durante il salvataggio della selezione:", error);
      
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio della selezione.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Le tue selezioni</CardTitle>
        <CardDescription>
          Hai selezionato {selectedPhotos.length} foto. Scegli come salvarle.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <RadioGroup
            value={selectionType}
            onValueChange={setSelectionType}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <div>
              <RadioGroupItem value="favorite" id="favorite" className="peer sr-only" />
              <Label
                htmlFor="favorite"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <HeartIcon className="mb-3 h-6 w-6 text-rose-500" />
                <span className="text-sm font-medium">Preferite</span>
              </Label>
            </div>
            
            <div>
              <RadioGroupItem value="must_have" id="must_have" className="peer sr-only" />
              <Label
                htmlFor="must_have"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <Star className="mb-3 h-6 w-6 text-amber-500" />
                <span className="text-sm font-medium">Imperdibili</span>
              </Label>
            </div>
            
            <div>
              <RadioGroupItem value="like" id="like" className="peer sr-only" />
              <Label
                htmlFor="like"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <ThumbsUp className="mb-3 h-6 w-6 text-blue-500" />
                <span className="text-sm font-medium">Mi piacciono</span>
              </Label>
            </div>
          </RadioGroup>
          
          <Textarea
            placeholder="Note (opzionale)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-4"
          />
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onClearSelection}
              disabled={isSaving}
            >
              <X className="mr-2 h-4 w-4" />
              Annulla
            </Button>
            <Button
              onClick={handleSaveSelection}
              disabled={isSaving || selectedPhotos.length === 0}
            >
              {isSaving ? (
                "Salvataggio..."
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Salva selezione
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}