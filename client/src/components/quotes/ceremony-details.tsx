import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, Church } from "lucide-react";

type CeremonyDetailsProps = {
  form: any;
  readOnly?: boolean;
  ceremony?: {
    location?: string;
    time?: string;
  };
  className?: string;
};

/**
 * Componente per la gestione dei dettagli del rito religioso (cerimonia)
 * Può essere utilizzato sia in modalità form (con controlli React Hook Form)
 * sia in modalità sola lettura per la visualizzazione
 */
export function CeremonyDetails({ form, readOnly = false, ceremony, className = "" }: CeremonyDetailsProps) {
  // In modalità sola lettura, mostra i dettagli in una card semplice
  if (readOnly) {
    if (!ceremony?.location && !ceremony?.time) return null;
    
    return (
      <div className={className}>
        <h4 className="text-sm font-medium text-muted-foreground mb-1">Rito Religioso</h4>
        <div className="space-y-1">
          {ceremony.location && (
            <div className="flex items-center">
              <Church className="h-4 w-4 mr-1 text-muted-foreground" />
              <p className="font-medium">{ceremony.location}</p>
            </div>
          )}
          {ceremony.time && (
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
              <p className="font-medium">{ceremony.time}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // In modalità form, mostra i campi di input
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center">
          <Church className="h-4 w-4 mr-2" />
          Dettagli Rito Religioso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="ceremonyLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Luogo del rito (chiesa/comune)</FormLabel>
              <FormControl>
                <Input placeholder="Es: Chiesa San Francesco" {...field} value={field.value || ""} />
              </FormControl>
              <FormDescription>
                Indica dove si svolgerà il rito religioso o civile
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ceremonyTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Orario del rito</FormLabel>
              <FormControl>
                <Input type="time" {...field} value={field.value || ""} />
              </FormControl>
              <FormDescription>
                L'orario in cui inizierà il rito
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

export default CeremonyDetails;