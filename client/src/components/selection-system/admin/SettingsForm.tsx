import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Schema validazione per le impostazioni
const settingsSchema = z.object({
  isEnabled: z.boolean().default(false),
  instructions: z.string().nullable(),
  minSelections: z.number().min(0, "Il numero minimo non può essere negativo"),
  maxSelections: z.number().min(0, "Il numero massimo non può essere negativo"),
  expiresAt: z.date().nullable()
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

type SettingsFormProps = {
  galleryId: number;
  onSettingsUpdated?: () => void;
};

export default function SettingsForm({ galleryId, onSettingsUpdated }: SettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  // Form con validazione
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      isEnabled: false,
      instructions: null,
      minSelections: 0,
      maxSelections: 0,
      expiresAt: null,
    },
  });

  // Carica le impostazioni esistenti
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await apiRequest('GET', `/api/selection/settings/${galleryId}`);
        const data = await response.json();
        
        // Converti le date in oggetti Date
        form.reset({
          isEnabled: data.isEnabled,
          instructions: data.instructions,
          minSelections: data.minSelections,
          maxSelections: data.maxSelections,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
        });
      } catch (error) {
        console.error('Errore nel caricamento delle impostazioni:', error);
        toast({
          title: 'Errore',
          description: 'Impossibile caricare le impostazioni di selezione.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [galleryId, form, toast]);

  // Gestisce il submit del form
  const onSubmit = async (values: SettingsFormValues) => {
    setIsSaving(true);
    try {
      // Formatta la data per l'API
      const formattedData = {
        ...values,
        expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null
      };
      
      const response = await apiRequest('PUT', `/api/selection/settings/${galleryId}`, formattedData);
      
      if (response.ok) {
        toast({
          title: 'Impostazioni aggiornate',
          description: 'Le impostazioni di selezione sono state aggiornate con successo.',
        });
        
        if (onSettingsUpdated) {
          onSettingsUpdated();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore sconosciuto');
      }
    } catch (error: any) {
      console.error('Errore nel salvataggio delle impostazioni:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile aggiornare le impostazioni di selezione.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 flex justify-center items-center min-h-[300px]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Impostazioni Selezione Foto</CardTitle>
          <Badge variant={form.watch('isEnabled') ? 'default' : 'secondary'}>
            {form.watch('isEnabled') ? 'Abilitato' : 'Disabilitato'}
          </Badge>
        </div>
        <CardDescription>
          Configura le impostazioni per la selezione delle foto da parte dei clienti
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="isEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Abilita selezione foto</FormLabel>
                    <FormDescription>
                      Permetti ai clienti di selezionare le foto in questa galleria
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="minSelections"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numero minimo di foto</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Numero minimo di foto che il cliente deve selezionare (0 = nessun minimo)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="maxSelections"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numero massimo di foto</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Numero massimo di foto che il cliente può selezionare (0 = nessun limite)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Istruzioni per la selezione</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Inserisci eventuali istruzioni per il cliente..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Istruzioni che saranno mostrate al cliente nella pagina di selezione
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data di scadenza</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP", { locale: it })
                          ) : (
                            <span>Seleziona data (opzionale)</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Data dopo la quale la selezione non sarà più disponibile
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <CardFooter className="px-0 pb-0 pt-6">
              <Button type="submit" disabled={isSaving} className="ml-auto">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'Salvataggio...' : 'Salva impostazioni'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}