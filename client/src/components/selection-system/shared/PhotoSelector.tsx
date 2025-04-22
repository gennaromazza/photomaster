import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Heart, 
  MessageSquare, 
  X, 
  Check, 
  Loader2,
  Pencil
} from 'lucide-react';

type Photo = {
  id: number;
  filename: string;
  thumbnailUrl: string;
  title: string | null;
};

type PhotoSelectorProps = {
  photo: Photo;
  sessionId: number;
  isSelected: boolean;
  maxSelections?: number;
  isDisabled?: boolean;
  hasComments?: boolean;
  onToggleSelect: (photoId: number, isSelected: boolean) => void;
  onShowComments?: (photoId: number) => void;
  className?: string;
};

export default function PhotoSelector({
  photo,
  sessionId,
  isSelected,
  maxSelections = 0,
  isDisabled = false,
  hasComments = false,
  onToggleSelect,
  onShowComments,
  className
}: PhotoSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Mutation per aggiungere/rimuovere una selezione
  const toggleSelectionMutation = useMutation({
    mutationFn: async ({ photoId, note = '' }: { photoId: number; note?: string }) => {
      // Se è già selezionata, la rimuoviamo
      if (isSelected) {
        const response = await apiRequest('DELETE', `/api/selection/photos/${photoId}`);
        if (!response.ok) {
          throw new Error('Errore durante la rimozione della selezione');
        }
        return { action: 'removed' };
      }
      
      // Altrimenti, la aggiungiamo
      const response = await apiRequest('POST', `/api/selection/photos/${photoId}`, {
        sessionId,
        notes: note
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'aggiunta della selezione');
      }
      
      return await response.json();
    },
    onSuccess: (result) => {
      const action = result.action;
      
      if (action === 'removed') {
        toast({
          title: 'Foto rimossa',
          description: 'La foto è stata rimossa dalle tue selezioni',
        });
      } else {
        toast({
          title: 'Foto selezionata',
          description: 'La foto è stata aggiunta alle tue selezioni',
        });
      }
      
      // Aggiorniamo le query per riflettere il cambiamento
      queryClient.invalidateQueries({ queryKey: [`/api/selection/sessions/${sessionId}/selections`] });
      
      // Chiamiamo la callback per aggiornare lo stato
      onToggleSelect(photo.id, !isSelected);
      
      // Chiudiamo il dialog delle note
      setShowNotesDialog(false);
      setNotes('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Funzione per gestire la selezione/deselezione con note opzionali
  const handleToggleSelection = (withNotes = false) => {
    if (isDisabled) return;
    
    // Se stiamo deselezionando, lo facciamo direttamente
    if (isSelected) {
      toggleSelectionMutation.mutate({ photoId: photo.id });
      return;
    }
    
    // Se vogliono aggiungere una nota, mostriamo il dialog
    if (withNotes) {
      setShowNotesDialog(true);
      return;
    }
    
    // Altrimenti, selezioniamo direttamente
    toggleSelectionMutation.mutate({ photoId: photo.id });
  };
  
  // Funzione per confermare la selezione con note
  const confirmSelectionWithNotes = () => {
    toggleSelectionMutation.mutate({ 
      photoId: photo.id,
      note: notes
    });
  };

  return (
    <>
      <div 
        className={cn(
          "relative group overflow-hidden rounded-md border transition-all",
          isSelected && "ring-2 ring-primary ring-offset-1",
          isDisabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Immagine */}
        <div className="aspect-square bg-muted overflow-hidden">
          <img 
            src={photo.thumbnailUrl} 
            alt={photo.title || `Foto ${photo.id}`}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        </div>
        
        {/* Overlay per azioni */}
        <div 
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity",
            isHovered ? "opacity-100" : "opacity-0",
            isSelected && "!opacity-100"
          )}
        >
          {/* Badge selezione sempre visibile quando selezionato */}
          {isSelected && (
            <div className="absolute top-2 right-2">
              <Badge variant="default" className="bg-primary text-white">
                <Check className="mr-1 h-3 w-3" />
                Selezionata
              </Badge>
            </div>
          )}
          
          {/* Controlli in fondo */}
          <div className="absolute bottom-0 left-0 right-0 p-2 flex justify-between items-center">
            {/* Pulsante selezione */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full bg-white/10 text-white hover:bg-white/20",
                isSelected && "bg-primary hover:bg-primary text-white"
              )}
              disabled={isDisabled || toggleSelectionMutation.isPending}
              onClick={() => handleToggleSelection(false)}
            >
              {toggleSelectionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className={cn("h-4 w-4", isSelected && "fill-current")} />
              )}
            </Button>
            
            <div className="flex gap-1">
              {/* Pulsante commenti */}
              {onShowComments && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-white/10 text-white hover:bg-white/20"
                  onClick={() => onShowComments(photo.id)}
                >
                  <MessageSquare className={cn("h-4 w-4", hasComments && "fill-blue-200 text-blue-200")} />
                </Button>
              )}
              
              {/* Pulsante aggiungi note */}
              {!isSelected && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-white/10 text-white hover:bg-white/20"
                  disabled={isDisabled || toggleSelectionMutation.isPending}
                  onClick={() => handleToggleSelection(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Dialog per aggiungere note alla selezione */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aggiungi note alla selezione</DialogTitle>
            <DialogDescription>
              Aggiungi note o istruzioni specifiche per questa foto
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex justify-center mb-2">
              <div className="w-40 h-40 rounded-md overflow-hidden bg-muted">
                <img 
                  src={photo.thumbnailUrl} 
                  alt={photo.title || `Foto ${photo.id}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            <Textarea 
              placeholder="Esempio: 'Vorrei questa foto in bianco e nero' o 'Questa è per il calendario'"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNotesDialog(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Annulla
            </Button>
            <Button 
              onClick={confirmSelectionWithNotes}
              disabled={toggleSelectionMutation.isPending}
            >
              {toggleSelectionMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Heart className="mr-2 h-4 w-4" />
              )}
              Seleziona Foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}