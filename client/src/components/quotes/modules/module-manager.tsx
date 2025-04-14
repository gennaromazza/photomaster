import React, { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ModuleSelector from "./module-selector";
import ModuleList from "./module-list";
import FixedModuleEditor from "./fixed-module-editor";
import VariableModuleEditor from "./variable-module-editor";
import RefreshQuoteTotals from "../utils/refresh-quote-totals";
import { QuoteModuleData } from "@/types/module-types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Package as PackageIcon, 
  Loader2, 
  PlusCircle 
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ModuleManagerProps {
  quoteId: number;
  refreshQuote: () => void;
}

/**
 * Componente principale per la gestione dei moduli di un preventivo
 * Responsabilità:
 * - Visualizzazione moduli esistenti
 * - Aggiunta nuovi moduli
 * - Modifica/eliminazione moduli
 * - Calcolo totali
 */
export default function ModuleManager({ quoteId, refreshQuote }: ModuleManagerProps) {
  const { toast } = useToast();
  const [showAddSelector, setShowAddSelector] = useState(false);
  const [activeEditor, setActiveEditor] = useState<'fixed' | 'variable' | null>(null);
  const [editingModule, setEditingModule] = useState<QuoteModuleData | null>(null);
  const [isUpdatingTotals, setIsUpdatingTotals] = useState(false);

  // Query per ottenere i moduli del preventivo
  const { 
    data: modules = [], 
    isLoading: isLoadingModules,
    isError: isModulesError,
    refetch: refetchModules
  } = useQuery<QuoteModuleData[]>({
    queryKey: ["/api/quotes", quoteId, "modules"],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/${quoteId}/modules`);
      if (!res.ok) throw new Error("Errore nel caricamento dei moduli");
      return res.json();
    },
    enabled: !!quoteId,
  });

  // Mutation per salvare un modulo
  const saveModuleMutation = useMutation({
    mutationFn: async (module: QuoteModuleData) => {
      const url = module.id && module.id > 0 
        ? `/api/quotes/${quoteId}/modules/${module.id}`
        : `/api/quotes/${quoteId}/modules`;
      
      const method = module.id && module.id > 0 ? "PATCH" : "POST";
      console.log(`[LOG] Salvando modulo ${module.id ? 'esistente' : 'nuovo'} di tipo ${module.type}`);
      
      const res = await apiRequest(method, url, module);
      const data = await res.json();
      console.log("[LOG] Modulo salvato con successo:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId, "modules"] });
      refreshModuleTotals();
      setActiveEditor(null);
      setEditingModule(null);
      
      toast({
        title: editingModule ? "Modulo aggiornato" : "Modulo aggiunto",
        description: editingModule 
          ? "Il modulo è stato aggiornato con successo" 
          : "Il modulo è stato aggiunto al preventivo",
      });
    },
    onError: (error) => {
      console.error("Errore salvataggio modulo:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio del modulo",
        variant: "destructive",
      });
    },
  });
  
  // Mutation per eliminare un modulo
  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: number) => {
      const res = await apiRequest("DELETE", `/api/quotes/${quoteId}/modules/${moduleId}`);
      return res.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId, "modules"] });
      refreshModuleTotals();
      
      toast({
        title: "Modulo eliminato",
        description: "Il modulo è stato rimosso dal preventivo",
      });
    },
    onError: (error) => {
      console.error("Errore eliminazione modulo:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione del modulo",
        variant: "destructive",
      });
    },
  });

  // Funzione per ricalcolare i totali del preventivo
  const refreshModuleTotals = useCallback(async () => {
    try {
      setIsUpdatingTotals(true);
      const refreshTotals = new RefreshQuoteTotals();
      await refreshTotals.execute(quoteId);
      refreshQuote(); // Aggiorna il preventivo dopo il ricalcolo
    } catch (error) {
      console.error("Errore durante il ricalcolo dei totali:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare i totali del preventivo",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingTotals(false);
    }
  }, [quoteId, refreshQuote, toast]);

  // Gestori degli eventi
  const handleAddModuleClick = useCallback(() => {
    setShowAddSelector(true);
    setActiveEditor(null);
    setEditingModule(null);
  }, []);

  const handleModuleTypeSelect = useCallback((type: 'fixed' | 'variable') => {
    setActiveEditor(type);
    setShowAddSelector(false);
  }, []);

  const handleSaveModule = useCallback((module: QuoteModuleData) => {
    // Assicuriamoci che il modulo abbia l'ID del preventivo
    const moduleToSave = {
      ...module,
      quoteId
    };
    saveModuleMutation.mutate(moduleToSave);
  }, [quoteId, saveModuleMutation]);

  const handleCancelEdit = useCallback(() => {
    setActiveEditor(null);
    setEditingModule(null);
    setShowAddSelector(false);
  }, []);

  const handleEditModule = useCallback((module: QuoteModuleData) => {
    setEditingModule(module);
    setActiveEditor(module.type as 'fixed' | 'variable');
    setShowAddSelector(false);
  }, []);

  const handleDeleteModule = useCallback((moduleId: number) => {
    if (confirm("Sei sicuro di voler eliminare questo modulo? Questa azione non può essere annullata.")) {
      deleteModuleMutation.mutate(moduleId);
    }
  }, [deleteModuleMutation]);

  // Ricalcola i totali quando i moduli cambiano
  useEffect(() => {
    if (modules.length > 0) {
      refreshModuleTotals();
    }
  }, [modules, refreshModuleTotals]);

  if (isModulesError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Errore</AlertTitle>
        <AlertDescription>
          Si è verificato un errore durante il caricamento dei moduli. 
          Ricarica la pagina o contatta l'assistenza.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-playfair">Moduli Preventivo</CardTitle>
          <CardDescription>
            Gestisci i moduli fissi e variabili di questo preventivo
          </CardDescription>
        </div>
        {!activeEditor && !showAddSelector && (
          <Button onClick={handleAddModuleClick} className="flex items-center gap-1">
            <PlusCircle className="h-4 w-4 mr-1" />
            Aggiungi Modulo
          </Button>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Indicatore di caricamento */}
        {isLoadingModules && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
          </div>
        )}
        
        {/* Visualizzazione moduli esistenti */}
        {!isLoadingModules && modules.length === 0 && !activeEditor && !showAddSelector && (
          <div className="text-center py-8 border border-dashed rounded-lg bg-muted/30">
            <PackageIcon className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              Questo preventivo non ha ancora moduli. 
              Aggiungi moduli per definire prodotti e servizi da offrire al cliente.
            </p>
            <Button onClick={handleAddModuleClick} variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" />
              Aggiungi il tuo primo modulo
            </Button>
          </div>
        )}
        
        {/* Lista moduli esistenti */}
        {!isLoadingModules && modules.length > 0 && !activeEditor && !showAddSelector && (
          <ModuleList 
            modules={modules} 
            onEdit={handleEditModule} 
            onDelete={handleDeleteModule}
          />
        )}
        
        {/* Selettore per scegliere il tipo di modulo */}
        {showAddSelector && (
          <>
            <ModuleSelector onSelect={handleModuleTypeSelect} onCancel={() => setShowAddSelector(false)} />
          </>
        )}
        
        {/* Editor moduli */}
        {activeEditor === 'fixed' && (
          <FixedModuleEditor
            quoteId={quoteId}
            module={editingModule}
            onSave={handleSaveModule}
            onCancel={handleCancelEdit}
          />
        )}
        
        {activeEditor === 'variable' && (
          <VariableModuleEditor
            quoteId={quoteId}
            module={editingModule}
            onSave={handleSaveModule}
            onCancel={handleCancelEdit}
          />
        )}
        
        {/* Azioni moduli */}
        {!activeEditor && !showAddSelector && modules.length > 0 && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-muted-foreground">
              {modules.length} {modules.length === 1 ? "modulo" : "moduli"} in questo preventivo
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshModuleTotals} 
              disabled={isUpdatingTotals}
            >
              {isUpdatingTotals ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Aggiornamento...
                </>
              ) : (
                "Ricalcola Totali"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}