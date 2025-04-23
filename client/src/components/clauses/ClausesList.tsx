import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  MoreHorizontal, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';
import { useClauses } from '@/hooks/use-clauses';
import { ContractClause, formatClauseType } from './types';
import { ScrollArea } from '@/components/ui/scroll-area';
import EmptyState from '@/components/empty-state';

interface ClausesListProps {
  onAdd: () => void;
  onEdit: (clause: ContractClause) => void;
  clauses?: ContractClause[]; // Lista specifica di clausole da visualizzare
}

export function ClausesList({ onAdd, onEdit, clauses: propClauses }: ClausesListProps) {
  const { clausesQuery, deleteClauseMutation } = useClauses();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; clause: ContractClause | null }>({
    open: false,
    clause: null,
  });

  // Usa le clausole fornite via props se disponibili, altrimenti usa quelle dalla query
  const clauses = propClauses || clausesQuery.data || [];
  
  // Filtra le clausole in base alla ricerca
  const filteredClauses = searchTerm 
    ? clauses.filter(clause => 
        clause.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clause.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : clauses;

  const handleDelete = (clause: ContractClause) => {
    setDeleteDialog({ open: true, clause });
  };

  const confirmDelete = async () => {
    if (deleteDialog.clause) {
      await deleteClauseMutation.mutateAsync(deleteDialog.clause.id);
      setDeleteDialog({ open: false, clause: null });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca clausole..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi clausola
        </Button>
      </div>

      {clausesQuery.isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : filteredClauses.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="h-10 w-10" />}
          title="Nessuna clausola trovata"
          description={
            searchTerm 
              ? "Prova a modificare i criteri di ricerca" 
              : "Aggiungi la tua prima clausola contrattuale"
          }
          action={
            !searchTerm && (
              <Button onClick={onAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi clausola
              </Button>
            )
          }
        />
      ) : (
        <ScrollArea className="border rounded-md h-[calc(100vh-230px)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Titolo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Obbligatoria</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Ordine</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClauses.map((clause) => (
                <TableRow key={clause.id}>
                  <TableCell className="font-medium">{clause.title}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatClauseType(clause)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {clause.isRequired ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sì
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <XCircle className="h-3 w-3 mr-1" />
                        No
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {clause.isActive ? (
                      <Badge>Attiva</Badge>
                    ) : (
                      <Badge variant="outline">Disattivata</Badge>
                    )}
                  </TableCell>
                  <TableCell>{clause.order}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Apri menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(clause)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(clause)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}

      {/* Dialog di conferma eliminazione */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open, clause: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina clausola</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare la clausola "{deleteDialog.clause?.title}"?
              <br />
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, clause: null })}
            >
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteClauseMutation.isPending}
            >
              {deleteClauseMutation.isPending ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}