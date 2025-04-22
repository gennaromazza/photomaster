import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Send, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

// Interfacce
interface Comment {
  id: number;
  photoId: number;
  sessionId: number;
  content: string;
  userId: number | null;
  clientName: string | null;
  isRead: boolean;
  createdAt: string;
  user?: {
    username: string;
  };
}

interface CommentSystemProps {
  photoId: number;
  sessionId: number;
  clientName: string;
  readonly?: boolean;
  onCommentAdded?: () => void;
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const CommentSystem: React.FC<CommentSystemProps> = ({ 
  photoId, 
  sessionId, 
  clientName,
  readonly = false,
  onCommentAdded
}) => {
  const { toast } = useToast();
  const [comment, setComment] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Recupera i commenti per questa foto nella sessione corrente
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['/api/selection/photo', photoId, 'comments', sessionId],
    queryFn: () => fetch(`/api/selection/photo/${photoId}/comments/${sessionId}`).then(res => res.json()),
    refetchInterval: 10000, // Ricarica ogni 10 secondi per verificare nuovi commenti
  });

  // Mutazione per aggiungere un commento
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', '/api/selection/comments', {
        photoId,
        sessionId,
        content,
        clientName
      });
      return response.json();
    },
    onSuccess: () => {
      setComment('');
      // Invalida la query per ricaricare i commenti
      queryClient.invalidateQueries({ queryKey: ['/api/selection/photo', photoId, 'comments', sessionId] });
      if (onCommentAdded) {
        onCommentAdded();
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: `Impossibile aggiungere il commento: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Mutazione per segnare un commento come letto
  const markAsReadMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const response = await apiRequest('PUT', `/api/selection/comments/${commentId}/mark-read`, {});
      return response.json();
    },
    onSuccess: () => {
      // Invalida la query per ricaricare i commenti
      queryClient.invalidateQueries({ queryKey: ['/api/selection/photo', photoId, 'comments', sessionId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: `Impossibile segnare il commento come letto: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Effetto per scorrere automaticamente alla fine quando arrivano nuovi commenti
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [comments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim()) {
      addCommentMutation.mutate(comment);
    }
  };

  const handleMarkAsRead = (commentId: number) => {
    markAsReadMutation.mutate(commentId);
  };

  return (
    <div className="flex flex-col h-full border rounded-md overflow-hidden bg-background">
      <div className="p-3 border-b bg-muted/30">
        <h3 className="text-lg font-medium">Commenti</h3>
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-3">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-12 w-[300px]" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Nessun commento. Sii il primo a commentare questa foto.
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: Comment) => (
              <div key={comment.id} className={cn(
                "flex items-start gap-2 p-3 rounded-lg",
                comment.userId ? "bg-primary/10 ml-4" : "bg-muted/30 mr-4"
              )}>
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {comment.userId 
                      ? comment.user?.username?.slice(0, 2).toUpperCase() || 'ST' 
                      : comment.clientName?.slice(0, 2).toUpperCase() || 'CL'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {comment.userId 
                        ? comment.user?.username || 'Studio'
                        : comment.clientName || 'Cliente'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(comment.createdAt)}
                    </span>
                    {!comment.isRead && comment.userId && (
                      <Badge variant="default" className="text-xs ml-auto">
                        Nuovo
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1">{comment.content}</p>
                </div>
                {!readonly && !comment.isRead && comment.userId && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleMarkAsRead(comment.id)}
                    className="h-8 w-8"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      {!readonly && (
        <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
          <Textarea
            placeholder="Scrivi un commento..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="flex-1 min-h-[60px] max-h-[120px]"
          />
          <Button 
            type="submit" 
            disabled={!comment.trim() || addCommentMutation.isPending}
            className="self-end"
          >
            <Send className="h-4 w-4 mr-2" />
            Invia
          </Button>
        </form>
      )}
    </div>
  );
};

export default CommentSystem;