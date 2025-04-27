import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Loader2, Search, RefreshCw, Eye, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate } from '@/lib/utils';

// Helper per formattare lo stato della richiesta
const formatStatus = (status: string) => {
  switch (status) {
    case 'new':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Nuovo</Badge>;
    case 'contacted':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Contattato</Badge>;
    case 'converted':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Convertito</Badge>;
    case 'archived':
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Archiviato</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const BundleLeadsContent: React.FC = () => {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<number | null>(null);
  const { toast } = useToast();
  const pageSize = 10;
  
  // Query per ottenere l'elenco dei bundle lead
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/bundle-leads'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/bundle-leads');
        if (!res.ok) throw new Error('Errore nel caricamento delle richieste');
        return await res.json();
      } catch (error) {
        console.error('Errore durante il recupero delle richieste:', error);
        throw error;
      }
    }
  });

  // Mutation per eliminare un bundle lead
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // Fetch CSRF token
      const csrfResponse = await fetch('/api/csrf-token');
      const { csrfToken } = await csrfResponse.json();
      
      return apiRequest('DELETE', `/api/bundle-leads/${id}`, undefined, {
        'X-CSRF-Token': csrfToken
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bundle-leads'] });
      toast({
        title: "Richiesta eliminata",
        description: "La richiesta è stata eliminata con successo",
      });
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
    },
    onError: (error) => {
      console.error("Errore durante l'eliminazione:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione della richiesta",
        variant: "destructive",
      });
    }
  });
  
  // Funzione per avviare l'eliminazione
  const handleDeleteClick = (id: number) => {
    setLeadToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  // Funzione per confermare l'eliminazione
  const confirmDelete = () => {
    if (leadToDelete) {
      deleteMutation.mutate(leadToDelete);
    }
  };
  
  // Funzione per filtrare i lead in base al termine di ricerca
  const filteredLeads = data ? data.filter((lead: any) => {
    const searchTermLower = searchTerm.toLowerCase();
    const nameMatch = `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchTermLower);
    const emailMatch = lead.email.toLowerCase().includes(searchTermLower);
    const bundleNameMatch = lead.bundle?.name?.toLowerCase().includes(searchTermLower) || false;
    
    return nameMatch || emailMatch || bundleNameMatch;
  }) : [];
  
  // Calcolo della paginazione
  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);
  
  // Renderizza le pagine per la paginazione
  const renderPaginationItems = () => {
    const items = [];
    // Pagine da visualizzare (1, 2, ..., totalPages)
    const displayPages = [1];
    
    if (currentPage > 2) {
      displayPages.push(currentPage - 1);
    }
    
    if (currentPage > 1 && currentPage < totalPages) {
      displayPages.push(currentPage);
    }
    
    if (currentPage < totalPages - 1) {
      displayPages.push(currentPage + 1);
    }
    
    if (totalPages > 1) {
      displayPages.push(totalPages);
    }
    
    // Filtra e ordina le pagine uniche
    const uniquePages = Array.from(new Set(displayPages)).sort((a, b) => a - b);
    
    // Renderizza le pagine
    for (let i = 0; i < uniquePages.length; i++) {
      const page = uniquePages[i];
      
      // Aggiungi ellipsis se necessario
      if (i > 0 && page - uniquePages[i - 1] > 1) {
        items.push(
          <PaginationItem key={`ellipsis-${i}`}>
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      
      // Aggiungi l'elemento di paginazione
      items.push(
        <PaginationItem key={page}>
          <PaginationLink
            isActive={page === currentPage}
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return items;
  };
  
  // Se i dati sono in caricamento, mostra un indicatore di caricamento
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per nome, email o pacchetto..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          Si è verificato un errore nel caricamento delle richieste.
          <div className="mt-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="text-red-700"
            >
              Riprova
            </Button>
          </div>
        </div>
      ) : paginatedLeads.length === 0 ? (
        <div className="bg-muted/50 p-8 text-center rounded-md">
          {searchTerm ? (
            <p className="text-muted-foreground">
              Nessuna richiesta trovata con questi criteri di ricerca.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Non ci sono ancora richieste di preventivo.
            </p>
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Pacchetto</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.map((lead: any) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {lead.firstName} {lead.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">{lead.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.bundle?.name || "Pacchetto non disponibile"}
                  </TableCell>
                  <TableCell>
                    {formatDate(lead.createdAt)}
                  </TableCell>
                  <TableCell>
                    {formatStatus(lead.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/bundles/leads/${lead.id}`)}
                        title="Visualizza dettagli"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(lead.id)}
                        title="Elimina richiesta"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(Math.max(1, currentPage - 1));
                    }}
                    aria-disabled={currentPage === 1}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {renderPaginationItems()}
                
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(Math.min(totalPages, currentPage + 1));
                    }}
                    aria-disabled={currentPage === totalPages}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa richiesta? L'operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BundleLeadsContent;