import React, { useState } from 'react';
import { ClausesList } from './ClausesList';
import { ClauseForm } from './ClauseForm';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { ContractClause, CreateClauseData } from './types';
import { useClauses } from '@/hooks/use-clauses';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ClausesManagement() {
  const { 
    createClauseMutation, 
    updateClauseMutation,
    clausesQuery
  } = useClauses();
  
  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    clause?: ContractClause;
  }>({
    open: false,
    mode: 'create',
  });

  const handleAddClause = () => {
    setFormDialog({
      open: true,
      mode: 'create',
    });
  };

  const handleEditClause = (clause: ContractClause) => {
    setFormDialog({
      open: true,
      mode: 'edit',
      clause,
    });
  };

  const handleCloseDialog = () => {
    setFormDialog({
      ...formDialog,
      open: false,
    });
  };

  const handleSubmit = async (data: CreateClauseData) => {
    try {
      if (formDialog.mode === 'create') {
        await createClauseMutation.mutateAsync(data);
      } else if (formDialog.clause) {
        await updateClauseMutation.mutateAsync({
          id: formDialog.clause.id,
          ...data,
        });
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Errore durante il salvataggio della clausola:', error);
    }
  };

  // Filtro le clausole per la visualizzazione organizzata nelle tab
  const clauses = clausesQuery.data || [];
  const activeClauses = clauses.filter(clause => clause.isActive);
  const inactiveClauses = clauses.filter(clause => !clause.isActive);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Gestione Clausole Contrattuali</h1>
        <p className="text-muted-foreground">
          Crea e gestisci le clausole contrattuali da includere nei preventivi.
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Informazione</AlertTitle>
        <AlertDescription>
          Le clausole possono essere generiche o associate a specifiche categorie di servizi e tipi di eventi.
          Questo permette di applicare automaticamente le clausole appropriate a ciascun preventivo.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            Tutte ({clauses.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            <CheckCircle className="h-4 w-4 mr-2" />
            Attive ({activeClauses.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            <XCircle className="h-4 w-4 mr-2" />
            Disattivate ({inactiveClauses.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          <ClausesList onAdd={handleAddClause} onEdit={handleEditClause} />
        </TabsContent>
        
        <TabsContent value="active" className="mt-6">
          <ClausesList 
            onAdd={handleAddClause} 
            onEdit={handleEditClause} 
            clauses={activeClauses}
          />
        </TabsContent>
        
        <TabsContent value="inactive" className="mt-6">
          <ClausesList 
            onAdd={handleAddClause} 
            onEdit={handleEditClause} 
            clauses={inactiveClauses}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={formDialog.open} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formDialog.mode === 'create' ? 'Crea nuova clausola' : 'Modifica clausola'}
            </DialogTitle>
          </DialogHeader>
          <ClauseForm
            clause={formDialog.clause}
            onSubmit={handleSubmit}
            onCancel={handleCloseDialog}
            isSubmitting={
              createClauseMutation.isPending || updateClauseMutation.isPending
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}