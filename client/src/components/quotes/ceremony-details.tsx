import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface CeremonyDetailsProps {
  form: any; // Usiamo any per compatibilità con vari tipi di form
}

/**
 * Componente per la gestione dei dettagli della cerimonia
 * Responsabilità: Raccogliere le informazioni sulla cerimonia (luogo, orario, ecc.)
 */
export function CeremonyDetails({ form }: CeremonyDetailsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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