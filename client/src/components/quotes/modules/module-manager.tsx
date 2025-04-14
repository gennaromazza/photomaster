import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, PlusCircle, Package, Loader2, ArrowRight } from "lucide-react";
import ModuleList from "./module-list";
import FixedModuleEditor from "./fixed-module-editor";
import VariableModuleEditor from "./variable-module-editor";
import { formatCurrency } from "@/lib/utils";
import ModuleSelector from "./module-selector";

// Tipi base per i moduli
interface ModuleItem {
  id?: number;
  moduleId?: number;
  itemId: number;
  itemType: 'service' | 'product';
  name: string;
  description?: string;
  price: number;
  quantity: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  total?: number;
  note?: string;
}

interface SelectionOption {
  id?: string;
  selectionId?: string;
  itemId: number;
  itemType: 'service' | 'product';
  name: string;
  description?: string;
  price: number;
  isSelected?: boolean;
  isDefault?: boolean;
}

interface ModuleSelection {
  id?: string;
  moduleId?: number;
  name: string;
  description?: string;
  options: Array<SelectionOption>;
  minOptions?: number;
  maxOptions?: number;
  isRequired?: boolean;
}

interface QuoteModuleData {
  id?: number;
  quoteId: number;
  name: string;
  description?: string;
  type: 'fixed' | 'variable';
  position?: number;
  subtotal?: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  total?: number;
  items?: Array<ModuleItem>;
  selections?: Array<ModuleSelection>;
  minSelections?: number;
  maxSelections?: number;
  isRequired?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Enum per gli stati del ModuleManager
enum ModuleManagerState {
  LIST = "list",
  SELECT = "select",
  EDIT_FIXED = "edit_fixed",
  EDIT_VARIABLE = "edit_variable",
}

interface ModuleManagerProps {
  quoteId: number;
  refreshQuote?: () => void;
}

/**
 * Componente principale per la gestione dei moduli di un preventivo
 * Responsabilità: 
 * - Coordinare la visualizzazione, creazione, modifica ed eliminazione dei moduli
 * - Gestire la comunicazione con le API per il salvataggio dei moduli
 */
export default function ModuleManager({ quoteId, refreshQuote }: ModuleManagerProps) {
  // Stati per la gestione del ModuleManager
  const [moduleManagerState, setModuleManagerState] = useState<ModuleManagerState>(ModuleManagerState.LIST);
  const [editingModule, setEditingModule] = useState<QuoteModuleData | null>(null);
  const { toast } = useToast();

  // Query per ottenere i moduli del preventivo
  const {
    data: modules = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<QuoteModuleData[]>({
    queryKey: [`/api/quotes/${quoteId}/modules`],
    enabled: !!quoteId,
  });

  // Mutation per salvare un modulo
  const saveModuleMutation = useMutation({
    mutationFn: async (moduleData: QuoteModuleData) => {
      const url = moduleData.id
        ? `/api/quotes/${quoteId}/modules/${moduleData.id}`
        : `/api/quotes/${quoteId}/modules`;
      const method = moduleData.id ? "PUT" : "POST";
      const res = await apiRequest(method, url, moduleData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Modulo salvato",
        description: "Il modulo è stato salvato con successo",
      });
      refetch();

      // Resetta lo stato dell'editor
      setModuleManagerState(ModuleManagerState.LIST);
      setEditingModule(null);

      // Aggiorna il preventivo principale
      if (refreshQuote) {
        refreshQuote();
      }
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
      toast({
        title: "Modulo eliminato",
        description: "Il modulo è stato eliminato con successo",
      });
      refetch();

      // Aggiorna il preventivo principale
      if (refreshQuote) {
        refreshQuote();
      }
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

  // Gestisce il click sul pulsante per aggiungere un nuovo modulo
  const handleAddModule = () => {
    setEditingModule(null);
    setModuleManagerState(ModuleManagerState.SELECT);
  };

  // Gestisce la selezione del tipo di modulo
  const handleSelectModuleType = (type: "fixed" | "variable") => {
    if (type === "fixed") {
      setModuleManagerState(ModuleManagerState.EDIT_FIXED);
    } else {
      setModuleManagerState(ModuleManagerState.EDIT_VARIABLE);
    }
  };

  // Gestisce la modifica di un modulo esistente
  const handleEditModule = (module: QuoteModuleData) => {
    setEditingModule(module);

    if (module.type === "fixed") {
      setModuleManagerState(ModuleManagerState.EDIT_FIXED);
    } else {
      setModuleManagerState(ModuleManagerState.EDIT_VARIABLE);
    }
  };

  // Gestisce l'eliminazione di un modulo
  const handleDeleteModule = (moduleId: number) => {
    if (window.confirm("Sei sicuro di voler eliminare questo modulo?")) {
      deleteModuleMutation.mutate(moduleId);
    }
  };

  // Gestisce il salvataggio di un modulo
  const handleSaveModule = (moduleData: QuoteModuleData) => {
    console.log("Salvando modulo " + (moduleData.id ? "esistente" : "nuovo") + " di tipo " + moduleData.type);
    const sanitizedData = {
      ...moduleData,
      id: moduleData.id || undefined // Rimuovi id se nuovo modulo
    };
    saveModuleMutation.mutate(sanitizedData, {
      onSuccess: (data) => {
        console.log("Modulo salvato con successo:", data);
      }
    });
  };

  // Gestisce la cancellazione dell'operazione corrente
  const handleCancel = () => {
    setModuleManagerState(ModuleManagerState.LIST);
    setEditingModule(null);
  };

  // Calcola il totale di tutti i moduli
  const calculateTotal = () => {
    return modules.reduce((total, module) => total + (module.total || 0), 0);
  };

  // Gestione errori
  if (isError) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Moduli Preventivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-destructive">
            Errore nel caricamento dei moduli. Riprova più tardi.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Durante il caricamento
  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Moduli Preventivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Rendering condizionale in base allo stato
  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5 text-primary/70" />
            Moduli Preventivo
          </CardTitle>

          {moduleManagerState === ModuleManagerState.LIST && (
            <Button size="sm" onClick={handleAddModule}>
              <Plus className="mr-1 h-4 w-4" />
              Aggiungi Modulo
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {moduleManagerState === ModuleManagerState.LIST && (
          <>
            <ModuleList
              modules={modules}
              onEditModule={handleEditModule}
              onDeleteModule={handleDeleteModule}
            />

            {modules.length > 0 && (
              <>
                <Separator className="my-4" />

                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">Totale Moduli</div>
                  <div className="text-xl font-semibold">
                    {formatCurrency(calculateTotal())}
                  </div>
                </div>

                {modules.length === 0 && (
                  <div className="flex justify-center mt-6">
                    <Button
                      size="lg"
                      onClick={handleAddModule}
                      className="gap-2"
                    >
                      <PlusCircle className="h-5 w-5" />
                      Crea il Primo Modulo
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {moduleManagerState === ModuleManagerState.SELECT && (
          <ModuleSelector
            onSelectModuleType={handleSelectModuleType}
          />
        )}

        {moduleManagerState === ModuleManagerState.EDIT_FIXED && (
          <FixedModuleEditor
            quoteId={quoteId}
            module={editingModule}
            onSave={handleSaveModule}
            onCancel={handleCancel}
          />
        )}

        {moduleManagerState === ModuleManagerState.EDIT_VARIABLE && (
          <VariableModuleEditor
            quoteId={quoteId}
            module={editingModule}
            onSave={handleSaveModule}
            onCancel={handleCancel}
          />
        )}
      </CardContent>
    </Card>
  );
}