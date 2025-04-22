import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

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

type CommentSystemProps = {
  photoId: number;
  sessionId: number;
  clientName?: string | null;
  isActive?: boolean;
};

export default function CommentSystem({ 
  photoId, 
  sessionId, 
  clientName = null,
  isActive = true 
}: CommentSystemProps) {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Carica i commenti
  useEffect(() => {
    const fetchComments = async () => {
      if (!photoId || !sessionId) return;
      
      setIsLoading(true);
      try {
        const response = await apiRequest('GET', 
          `/api/selection/photos/${photoId}/comments?sessionId=${sessionId}`
        );
        const data = await response.json();
        setComments(data);
      } catch (error) {
        console.error('Errore nel caricamento dei commenti:', error);
        toast({
          title: 'Errore',
          description: 'Impossibile caricare i commenti.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [photoId, sessionId, toast]);

  // Invia un nuovo commento
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !photoId || !sessionId) return;

    setIsSubmitting(true);
    try {
      const response = await apiRequest('POST', '/api/selection/comments', {
        photoId,
        sessionId,
        content: comment,
        clientName
      });
      
      if (response.status === 201) {
        const newComment = await response.json();
        setComments(prev => [newComment, ...prev]);
        setComment('');
        toast({
          title: 'Commento inviato',
          description: 'Il tuo commento è stato inviato con successo.',
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Errore sconosciuto');
      }
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: `Impossibile inviare il commento: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatta la data del commento
  const formatCommentDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: it
      });
    } catch (error) {
      return 'Data sconosciuta';
    }
  };

  // Genera le iniziali per l'avatar
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Determina se un commento è dello staff o del cliente
  const isStaffComment = (comment: Comment) => {
    return !!comment.userId;
  };

  return (
    <div className="flex flex-col space-y-4 h-full">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-lg flex items-center">
          <MessageCircle className="mr-2 h-5 w-5" />
          Commenti
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 pb-2 flex-grow overflow-y-auto max-h-[300px]">
        {isLoading ? (
          <div className="flex justify-center items-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-gray-500 p-4">
            Nessun commento. Sii il primo a commentare!
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map(comment => (
              <div
                key={comment.id}
                className={`flex ${
                  isStaffComment(comment) ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`flex max-w-[80%] ${
                    isStaffComment(comment) ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  <Avatar className={`h-8 w-8 ${isStaffComment(comment) ? 'mr-2' : 'ml-2'}`}>
                    <AvatarFallback className={isStaffComment(comment) ? 'bg-primary' : 'bg-secondary'}>
                      {isStaffComment(comment)
                        ? getInitials(comment.user?.fullName || 'Staff')
                        : getInitials(comment.clientName || 'Cliente')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div
                      className={`rounded-lg p-3 ${
                        isStaffComment(comment)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      <p className="text-sm font-medium mb-1">
                        {isStaffComment(comment)
                          ? comment.user?.fullName || 'Staff'
                          : comment.clientName || 'Cliente'}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatCommentDate(comment.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {isActive && (
        <form onSubmit={handleSubmit} className="p-4 pt-2 border-t">
          <div className="flex space-x-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Scrivi un commento..."
              className="resize-none min-h-[80px]"
              disabled={isSubmitting}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!comment.trim() || isSubmitting}
              className="self-end"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}