import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

const QuotesStatusDetail = () => {
  const [_, navigate] = useNavigate();

  // Query per tutti i preventivi
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['/api/quotes'],
  });

  // Filtro per stato
  const draftQuotes = quotes.filter(quote => quote.status === 'draft');
  const pendingQuotes = quotes.filter(quote => quote.status === 'pending');
  const approvedQuotes = quotes.filter(quote => quote.status === 'approved');
  const signedQuotes = quotes.filter(quote => quote.status === 'signed');
  const rejectedQuotes = quotes.filter(quote => quote.status === 'rejected');
  
  // Calcolo preventivi da firmare
  const quotesToSign = [...draftQuotes, ...pendingQuotes];

  if (isLoading) {
    return (
      <div className="flex justify-center p-6">
        <div className="animate-pulse text-gray-500">Caricamento preventivi...</div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Bozza</Badge>;
      case 'pending':
        return <Badge variant="secondary">In Attesa</Badge>;
      case 'approved':
        return <Badge variant="default">Approvato</Badge>;
      case 'signed':
        return <Badge variant="success">Firmato</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rifiutato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Preventivi da Firmare ({quotesToSign.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {quotesToSign.length === 0 ? (
              <p className="text-sm text-gray-500">Nessun preventivo da firmare</p>
            ) : (
              <div className="space-y-2">
                {quotesToSign.map(quote => (
                  <div
                    key={quote.id}
                    className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/quotes/detail/${quote.id}`)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{quote.title}</p>
                        <p className="text-xs text-gray-500">
                          {quote.createdAt ? formatDate(quote.createdAt, 'dd/MM/yyyy') : ''}
                        </p>
                      </div>
                      {getStatusBadge(quote.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Preventivi Firmati ({signedQuotes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {signedQuotes.length === 0 ? (
              <p className="text-sm text-gray-500">Nessun preventivo firmato</p>
            ) : (
              <div className="space-y-2">
                {signedQuotes.slice(0, 5).map(quote => (
                  <div
                    key={quote.id}
                    className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/quotes/detail/${quote.id}`)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{quote.title}</p>
                        <p className="text-xs text-gray-500">
                          {quote.signedAt ? formatDate(quote.signedAt, 'dd/MM/yyyy') : ''}
                        </p>
                      </div>
                      {getStatusBadge(quote.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => navigate('/quotes')}>
          Visualizza Tutti i Preventivi
        </Button>
      </div>
    </div>
  );
};

export default QuotesStatusDetail;