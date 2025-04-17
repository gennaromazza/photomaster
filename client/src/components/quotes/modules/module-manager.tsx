import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, PlusCircle, Package, Loader2, ArrowRight } from "lucide-react";
// Import le librerie e utility
import { formatCurrency } from "@/lib/utils";
import { roundToTwoDecimals } from "@/lib/moduleCalculations";

// Import i componenti locali
import ModuleList from "./module-list";
import ModuleSelector from "./module-selector";
import FixedModuleEditor from "./fixed-module-editor";
import VariableModuleEditor from "./variable-module-editor";

// Import i tipi condivisi
import { QuoteModule } from "./types";

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
  const [editingModule, setEditingModule] = useState<QuoteModule | null>(null);
  const { toast } = useToast();
  
  // Query per ottenere le informazioni del preventivo per verificare se è firmato
  const { data: quote } = useQuery({
    queryKey: [`/api/quotes/${quoteId}`],
    enabled: !!quoteId,
  });

  // Query per ottenere i moduli del preventivo
  const {
    data: modules = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<QuoteModule[]>({
    queryKey: [`/api/quotes/${quoteId}/modules`],
    enabled: !!quoteId,
    retry: 3
  });

  // Mutation per salvare un modulo
  const saveModuleMutation = useMutation({
    mutationFn: async (moduleData: QuoteModule) => {
      // Correzione URL per il salvataggio del modulo
      let url;
      if (moduleData.id) {
        // Se il modulo ha un ID, usa l'URL per l'aggiornamento
        url = `/api/modules/${moduleData.id}`;
      } else {
        // Se il modulo è nuovo, usa l'URL per la creazione
        url = `/api/quotes/${quoteId}/modules`;
      }
      
      // Usa PUT per aggiornare, POST per creare
      const method = moduleData.id ? "PUT" : "POST";
      
      console.log(`Salvando modulo con metodo ${method} all'URL ${url}`, moduleData);
      
      const res = await apiRequest(method, url, moduleData);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Modulo salvato",
        description: "Il modulo è stato salvato con successo",
      });
      
      console.log("Modulo salvato con successo:", data);
      
      // Aggiorna la cache per una risposta immediata
      if (data.id) {
        queryClient.invalidateQueries([`/api/quotes/${quoteId}/modules`]);
      }
      
      // Ricarica i dati per essere sicuri di avere l'ultimo stato
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
      const res = await apiRequest("DELETE", `/api/modules/${moduleId}`);
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

  // Gestisce la modifica di un modulo esistente con preparazione dei dati corretta
  const handleEditModule = (module: QuoteModule) => {
    // Log dei dati modulo per debug
    console.log("Modifica modulo - Dati originali:", module);
    
    // Controllo della presenza di selections nei moduli variabili
    if (module.type === "variable" && !module.selections) {
      // Caricamento specifico per il modulo variabile
      const fetchModuleDetails = async () => {
        try {
          const res = await fetch(`/api/modules/${module.id}`);
          if (res.ok) {
            const fullModuleData = await res.json();
            console.log("Dati completi modulo variabile:", fullModuleData);
            setEditingModule(fullModuleData);
          } else {
            console.error("Errore nel caricamento dei dettagli del modulo:", res.statusText);
            setEditingModule(module); // Fallback ai dati originali
          }
        } catch (error) {
          console.error("Errore nel caricamento dei dettagli del modulo:", error);
          setEditingModule(module); // Fallback ai dati originali
        }
      };
      
      // Fetch dei dettagli solo per i moduli variabili senza selections
      fetchModuleDetails();
    } else {
      // Per moduli fissi o variabili con selections già presenti
      setEditingModule(module);
    }

    // Imposta lo stato del manager in base al tipo di modulo
    if (module.type === "fixed") {
      setModuleManagerState(ModuleManagerState.EDIT_FIXED);
    } else {
      setModuleManagerState(ModuleManagerState.EDIT_VARIABLE);
    }
  };

  // Gestisce l'eliminazione di un modulo
  const handleDeleteModule = async (moduleId: number) => {
    if (window.confirm("Sei sicuro di voler eliminare questo modulo?")) {
      try {
        // Aggiorna immediatamente l'UI prima della chiamata al server
        // Rimuovi il modulo dalla lista locale
        const updatedModules = modules.filter(module => module.id !== moduleId);
        queryClient.setQueryData([`/api/quotes/${quoteId}/modules`], updatedModules);
        
        // Chiama il server per eliminare effettivamente il modulo
        await deleteModuleMutation.mutateAsync(moduleId);
        
        // Invalida la cache per forzare il refresh dei dati
        queryClient.invalidateQueries(['quotes']);
        queryClient.invalidateQueries(['quote', quoteId]);
        queryClient.invalidateQueries([`/api/quotes/${quoteId}/modules`]);
        
        toast({
          title: "Modulo eliminato",
          description: "Il modulo è stato eliminato con successo",
        });
        
        // Aggiorna il preventivo principale se necessario
        if (refreshQuote) {
          refreshQuote();
        }
      } catch (error) {
        // In caso di errore, ripristina i dati originali
        refetch();
        
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante l'eliminazione del modulo",
          variant: "destructive",
        });
      }
    }
  };

  // Gestisce il salvataggio di un modulo
  const handleSaveModule = (moduleData: QuoteModule) => {
    try {
      // Validazione dati
      if (!moduleData.name?.trim()) {
        throw new Error("Il nome del modulo è obbligatorio");
      }

      // Sanitizza e normalizza i dati
      const sanitizedData = {
        ...moduleData,
        id: moduleData.id || undefined,
        quoteId: quoteId,
        name: moduleData.name.trim(),
        description: moduleData.description?.trim(),
        type: moduleData.type as "fixed" | "variable",
        status: "active" as "active",
        // Ensure dates are properly formatted
        createdAt: moduleData.createdAt ? new Date(moduleData.createdAt) : undefined,
        updatedAt: new Date(),
        expiryDate: moduleData.expiryDate ? new Date(moduleData.expiryDate) : null,
        items: moduleData.items?.map((item: any) => ({
          ...item,
          id: item.id || undefined, // Preserviamo l'ID se esiste, altrimenti undefined per nuovo item
          moduleId: moduleData.id, // Associamo l'item al modulo
          quantity: Math.max(1, item.quantity || 1),
          unitPrice: Math.max(0, item.unitPrice || 0),
          total: item.total || 0,
          hasDiscount: item.hasDiscount || false,
          discountType: item.discountType || "percentage",
          discountValue: item.discountValue || 0,
          discountedPrice: item.discountedPrice || null,
          isRequired: item.isRequired || false,
          isSelected: item.isSelected || false,
          position: item.position || 0
        }))
      };

      saveModuleMutation.mutate(sanitizedData, {
        onSuccess: (data) => {
          toast({
            title: "Modulo salvato",
            description: "Il modulo è stato salvato correttamente"
          });
        },
        onError: (error) => {
          toast({
            title: "Errore",
            description: "Errore durante il salvataggio del modulo",
            variant: "destructive"
          });
        }
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante la validazione",
        variant: "destructive"
      });
    }
  };

  // Gestisce la cancellazione dell'operazione corrente
  const handleCancel = () => {
    setModuleManagerState(ModuleManagerState.LIST);
    setEditingModule(null);
  };

  // Calcola il totale di tutti i moduli
  const calculateTotal = (): number => {
    if (!Array.isArray(modules)) return 0;
    
    return modules.reduce((total: number, module: QuoteModule) => {
      const moduleTotal = module.total || module.subtotal || 0;
      return roundToTwoDecimals(total + moduleTotal);
    }, 0);
  };

  // Gestione errori
  if (isError) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Moduli Preventivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-destructive mb-4">
              Errore nel caricamento dei moduli.
            </p>
            <Button 
              variant="outline"
              onClick={() => refetch()}
              className="mx-auto"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Riprova
            </Button>
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

  // Verifica se il preventivo è firmato
  const isQuoteSigned = quote?.status === "approved";

  // Messaggio di avviso per preventivi firmati
  const renderSignedWarning = () => {
    if (isQuoteSigned) {
      return (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-8.414l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L9 9.586V5a1 1 0 112 0v4.586z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                Questo preventivo è stato firmato e non può essere modificato.
                I moduli sono bloccati per garantire la validità legale del contratto.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Rendering condizionale in base allo stato
  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5 text-primary/70" />
            Moduli Preventivo
          </CardTitle>

          {moduleManagerState === ModuleManagerState.LIST && !isQuoteSigned && (
            <Button size="sm" onClick={handleAddModule}>
              <Plus className="mr-1 h-4 w-4" />
              Aggiungi Modulo
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Mostra il messaggio di avviso per i preventivi firmati */}
        {renderSignedWarning()}
        
        {moduleManagerState === ModuleManagerState.LIST && (
          <>
            <ModuleList
              modules={modules}
              onEditModule={isQuoteSigned ? undefined : handleEditModule}
              onDeleteModule={isQuoteSigned ? undefined : handleDeleteModule}
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