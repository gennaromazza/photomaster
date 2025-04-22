import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

interface Photo {
  id: number;
  url: string;
  thumbnailUrl: string;
  title?: string;
  description?: string;
  isSelected?: boolean;
}

interface PhotoSelectorProps {
  photo: Photo;
  sessionId: number;
  maxSelections?: number;
  currentSelections?: number;
  onSelectionChange?: (isSelected: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const PhotoSelector: React.FC<PhotoSelectorProps> = ({
  photo,
  sessionId,
  maxSelections = 0,
  currentSelections = 0,
  onSelectionChange,
  disabled = false,
  className
}) => {
  const { toast } = useToast();
  const [isHovered, setIsHovered] = useState(false);
  
  const reachedMaxSelections = maxSelections > 0 && currentSelections >= maxSelections;
  const canToggle = !disabled && (photo.isSelected || !reachedMaxSelections);
  
  const toggleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/selection/photo/${photo.id}/toggle`, {
        sessionId
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Aggiorna lo stato della foto nel cache
      queryClient.setQueryData(['/api/selection/sessions', sessionId, 'selections'], (oldData: any) => {
        if (!oldData) return oldData;
        
        return oldData.map((p: Photo) => 
          p.id === photo.id ? { ...p, isSelected: data.isSelected } : p
        );
      });
      
      // Invalida la query delle sessioni per aggiornare il conteggio
      queryClient.invalidateQueries({ queryKey: ['/api/selection/sessions/key'] });
      
      if (onSelectionChange) {
        onSelectionChange(data.isSelected);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: `Impossibile aggiornare la selezione: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const handleToggle = () => {
    if (!canToggle) return;
    toggleMutation.mutate();
  };

  return (
    <div 
      className={cn(
        "relative group overflow-hidden rounded-md cursor-pointer",
        disabled && "opacity-70 cursor-not-allowed",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleToggle}
    >
      <div className="relative aspect-square">
        <img 
          src={photo.thumbnailUrl || photo.url} 
          alt={photo.title || "Foto"} 
          className={cn(
            "w-full h-full object-cover transition-transform duration-300",
            (isHovered && !disabled) && "scale-105"
          )}
        />
        
        {/* Overlay di selezione */}
        <div 
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
            photo.isSelected ? "bg-primary/40" : "bg-black/10",
            (isHovered && !disabled) ? "opacity-100" : photo.isSelected ? "opacity-100" : "opacity-0"
          )}
        >
          {toggleMutation.isPending ? (
            <Spinner className="h-8 w-8 text-white" />
          ) : photo.isSelected ? (
            <div className="rounded-full bg-primary p-2">
              <Check className="h-6 w-6 text-primary-foreground" />
            </div>
          ) : !reachedMaxSelections ? (
            <div className="rounded-full bg-white/90 p-2">
              <Check className="h-6 w-6 text-primary" />
            </div>
          ) : (
            <div className="rounded-full bg-destructive/90 p-2">
              <X className="h-6 w-6 text-destructive-foreground" />
            </div>
          )}
        </div>
        
        {/* Badge con titolo foto */}
        {photo.title && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
            <span className="text-white text-sm line-clamp-1">{photo.title}</span>
          </div>
        )}
        
        {/* Badge con limite raggiunto */}
        {reachedMaxSelections && !photo.isSelected && (
          <Badge 
            variant="destructive" 
            className="absolute top-2 right-2"
          >
            Limite raggiunto
          </Badge>
        )}
      </div>
    </div>
  );
};

export default PhotoSelector;