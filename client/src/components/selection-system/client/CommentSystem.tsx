import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Send, Info } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

const CommentSystem: React.FC<CommentSystemProps> = ({
  photoId,
  sessionId,
  clientName,
  readonly = false,
  onCommentAdded
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);
  const { toast } = useToast();

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const response = await apiRequest('GET', `/api/selection/photos/${photoId}/comments?sessionId=${sessionId}`);
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Errore nel recupero dei commenti:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i commenti',
        variant: 'destructive',
      });
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [photoId, sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setLoading(true);
      const response = await apiRequest('POST', '/api/selection/comments', {
        photoId,
        sessionId,
        content: newComment,
        clientName
      });

      if (response.ok) {
        setNewComment('');
        toast({
          title: 'Commento aggiunto',
          description: 'Il tuo commento è stato salvato con successo',
        });
        fetchComments();
        if (onCommentAdded) onCommentAdded();
      } else {
        throw new Error('Errore nell\'aggiunta del commento');
      }
    } catch (error) {
      console.error('Errore nell\'invio del commento:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile salvare il commento',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center text-lg">
          Commenti
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Puoi aggiungere note o richieste su questa foto</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-0">
        <ScrollArea className="h-48 pr-4">
          {loadingComments ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              Nessun commento presente
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div 
                  key={comment.id} 
                  className={`flex gap-2 ${comment.userId ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Avatar className="h-8 w-8">
                    {comment.userId ? (
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {comment.user?.username?.charAt(0) || 'S'}
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {comment.clientName?.charAt(0) || 'C'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div 
                    className={`max-w-[85%] rounded-lg p-3 text-sm ${
                      comment.userId 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold">
                        {comment.userId ? comment.user?.username || 'Staff' : comment.clientName || 'Cliente'}
                      </span>
                      <span className="text-xs opacity-80">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      {!readonly && (
        <CardFooter className="pt-4">
          <form onSubmit={handleSubmit} className="w-full flex gap-2">
            <Textarea
              placeholder="Scrivi un commento..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-10 h-10 resize-none"
              disabled={loading}
            />
            <Button 
              type="submit" 
              disabled={loading || !newComment.trim()} 
              className="h-10 w-10 p-0"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="sr-only">Invia commento</span>
            </Button>
          </form>
        </CardFooter>
      )}
    </Card>
  );
};

export default CommentSystem;