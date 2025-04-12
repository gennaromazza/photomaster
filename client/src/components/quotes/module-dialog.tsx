import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FixedModule } from "./fixed-module";
import { VariableModule } from "./variable-module";
import { QuoteModuleData } from "./module-selector";

interface ModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleType: 'fixed' | 'variable' | null;
  quoteId: number;
  module?: QuoteModuleData;
  onSave: (module: QuoteModuleData) => void;
  onDelete?: (moduleId: number) => void;
}

export function ModuleDialog({
  open,
  onOpenChange,
  moduleType,
  quoteId,
  module,
  onSave,
  onDelete
}: ModuleDialogProps) {
  if (!moduleType) return null;

  const handleSave = (module: QuoteModuleData) => {
    onSave(module);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleDelete = (moduleId: number) => {
    if (onDelete) {
      onDelete(moduleId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto" description="Configura le impostazioni del modulo e seleziona i servizi, pacchetti e prodotti da includere">
        <DialogHeader>
          <DialogTitle className="font-playfair text-2xl">
            {module?.id ? "Modifica Modulo" : "Nuovo Modulo"}
          </DialogTitle>
        </DialogHeader>
        
        {moduleType === 'fixed' ? (
          <FixedModule
            quoteId={quoteId}
            module={module}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={module?.id ? handleDelete : undefined}
          />
        ) : (
          <VariableModule
            quoteId={quoteId}
            module={module}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={module?.id ? handleDelete : undefined}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}