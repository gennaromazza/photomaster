import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Interfaccia per supportare due diversi utilizzi del componente
interface CeremonyDetailsProps {
  // Modalità form per l'editing
  form?: any;
  
  // Modalità visualizzazione per pagina pubblica
  readOnly?: boolean;
  ceremony?: {
    location?: string;
    time?: string;
  };
  
  // Stile personalizzabile
  className?: string;
}

/**
 * Componente per la gestione dei dettagli della cerimonia
 * Responsabilità: Raccogliere le informazioni sulla cerimonia (luogo, orario, ecc.)
 * Due modalità di utilizzo:
 * 1. Con form per modifica dati
 * 2. Con readOnly e ceremony per visualizzazione
 */
export function CeremonyDetails({ form, readOnly, ceremony, className }: CeremonyDetailsProps) {
  // Se siamo in modalità visualizzazione
  if (readOnly && ceremony) {
    return (
      <div className={cn("space-y-2", className)}>
        <h3 className="text-sm font-medium">Dettagli Cerimonia</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {ceremony.location && (
            <div>
              <div className="text-xs text-muted-foreground">Luogo Cerimonia</div>
              <div>{ceremony.location}</div>
            </div>
          )}
          {ceremony.time && (
            <div>
              <div className="text-xs text-muted-foreground">Orario Cerimonia</div>
              <div>{ceremony.time}</div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Stiamo usando il componente senza form
  if (!form) {
    console.warn('CeremonyDetails: form prop is required when not in readOnly mode');
    return null;
  }
  
  // Modalità editing con form
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
      <FormField
        control={form.control}
        name="ceremonyLocation"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Luogo Cerimonia</FormLabel>
            <FormControl>
              <Input 
                placeholder="es. Chiesa di San Giovanni, Via Roma 1, Milano" 
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ceremonyTime"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Orario Cerimonia</FormLabel>
            <FormControl>
              <Input 
                type="time" 
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}