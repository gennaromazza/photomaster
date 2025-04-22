import React from 'react';
import { useQuery } from '@tanstack/react-query';
import CommentThread from '../shared/CommentThread';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, MessageSquare } from 'lucide-react';

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
  // Carica i commenti per questa foto
  const { data: comments, isLoading, refetch } = useQuery<Comment[]>({
    queryKey: [`/api/selection/photos/${photoId}/comments`],
    enabled: !!photoId && !!sessionId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!comments) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <MessageSquare className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Impossibile caricare i commenti, riprova più tardi
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <CommentThread
        comments={comments}
        photoId={photoId}
        sessionId={sessionId}
        clientName={clientName}
        isAdmin={false}
        onCommentAdded={() => refetch()}
      />
      
      {!isActive && comments.length === 0 && (
        <div className="text-center p-4 text-sm text-muted-foreground">
          La sessione non è più attiva. Non è più possibile aggiungere commenti.
        </div>
      )}
    </div>
  );
}