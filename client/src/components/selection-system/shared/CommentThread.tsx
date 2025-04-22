import React, { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { CheckIcon, Loader2, SendIcon } from 'lucide-react';

type Comment = {
  id: number;
  photoId: number;
  sessionId: number;
  userId: number | null;
  clientName: string | null;
  content: string;
  isRead: boolean;
  createdAt: string;
  user?: {
    id: number;
    username: string;
    fullName: string;
  } | null;
};

type CommentThreadProps = {
  comments: Comment[];
  photoId: number;
  sessionId: number;
  clientName?: string | null;
  isAdmin?: boolean;
  onCommentAdded?: () => void;
};

export default function CommentThread({
  comments,
  photoId,
  sessionId,
  clientName,
  isAdmin = false,
  onCommentAdded
}: CommentThreadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  
  // Ordina i commenti per data di creazione
  const sortedComments = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Mutation per aggiungere un commento
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const endpoint = `/api/comments`;
      const payload = {
        photoId,
        sessionId,
        content,
        clientName: !isAdmin ? clientName : undefined
      };
      
      const response = await apiRequest('POST', endpoint, payload);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante l\'aggiunta del commento');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setNewComment('');
      toast({
        title: 'Commento aggiunto',
        description: 'Il tuo commento è stato aggiunto con successo',
      });
      
      // Invalidare la query per aggiornare i commenti
      if (isAdmin) {
        queryClient.invalidateQueries({ queryKey: [`/api/selection/sessions/${sessionId}/comments`] });
      } else {
        queryClient.invalidateQueries({ queryKey: [`/api/selection/photos/${photoId}/comments`] });
      }
      
      if (onCommentAdded) {
        onCommentAdded();
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Errore durante l'aggiunta del commento: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation per segnare un commento come letto (solo per admin)
  const markAsReadMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const response = await apiRequest('PUT', `/api/comments/${commentId}/read`);
      
      if (!response.ok) {
        throw new Error('Errore durante l\'aggiornamento dello stato del commento');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      if (isAdmin) {
        queryClient.invalidateQueries({ queryKey: [`/api/selection/sessions/${sessionId}/comments`] });
      } else {
        queryClient.invalidateQueries({ queryKey: [`/api/selection/photos/${photoId}/comments`] });
      }
    }
  });

  // Funzione per aggiungere un commento
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  // Funzione per segnare un commento come letto (solo per admin)
  const handleMarkAsRead = (commentId: number) => {
    if (!isAdmin) return;
    markAsReadMutation.mutate(commentId);
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Lista commenti */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {sortedComments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Nessun commento per questa foto. Sii il primo a commentare!
          </div>
        ) : (
          sortedComments.map(comment => {
            const isClientComment = comment.userId === null;
            const isUnread = isAdmin && !comment.isRead && isClientComment;
            
            return (
              <div
                key={comment.id}
                className={cn(
                  "flex gap-3",
                  isClientComment ? "justify-start" : "justify-end"
                )}
                onClick={() => isUnread && handleMarkAsRead(comment.id)}
              >
                {isClientComment && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-white text-xs">
                      {comment.clientName ? getInitials(comment.clientName) : 'CL'}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={cn(
                  "max-w-[80%] rounded-lg p-3",
                  isClientComment
                    ? "bg-muted"
                    : "bg-primary text-primary-foreground",
                  isUnread && "ring-2 ring-primary ring-offset-1"
                )}>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-medium">
                      {isClientComment
                        ? comment.clientName || 'Cliente'
                        : comment.user?.fullName || 'Staff'}
                    </span>
                    {isUnread && (
                      <span className="inline-flex items-center rounded-full bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary">
                        Nuovo
                      </span>
                    )}
                  </div>
                  
                  <p className="mt-1 text-sm whitespace-pre-wrap">{comment.content}</p>
                  
                  <div className="mt-1 flex justify-between items-center">
                    <span className="text-xs opacity-70">
                      {format(new Date(comment.createdAt), "d MMM, HH:mm", { locale: it })}
                    </span>
                    
                    {isUnread && isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(comment.id);
                        }}
                      >
                        <CheckIcon className="h-3 w-3 mr-1" />
                        Segna come letto
                      </Button>
                    )}
                  </div>
                </div>
                
                {!isClientComment && (
                  <Avatar className="h-8 w-8">
                    {comment.user?.fullName ? (
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        {getInitials(comment.user.fullName)}
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        ST
                      </AvatarFallback>
                    )}
                  </Avatar>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Form per aggiungere commento */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Textarea
            placeholder="Scrivi un commento..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            className="min-h-[60px] resize-none"
          />
        </div>
        <Button
          size="icon"
          className="h-9 w-9"
          disabled={!newComment.trim() || addCommentMutation.isPending}
          onClick={handleAddComment}
        >
          {addCommentMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}