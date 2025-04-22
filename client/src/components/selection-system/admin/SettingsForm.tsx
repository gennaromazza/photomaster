import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Schema di validazione
const formSchema = z.object({
  isEnabled: z.boolean().default(false),
  instructions: z.string().optional(),
  minSelections: z.number().min(0).default(0),
  maxSelections: z.number().min(0).default(0),
  expiresAt: z.date().optional().nullable(),
});

// Tipo per i dati delle impostazioni
type GallerySelectionSettings = {
  id: number;
  galleryId: number;
  isEnabled: boolean;
  instructions: string | null;
  minSelections: number;
  maxSelections: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SettingsFormProps = {
  galleryId: number;
};

export default function SettingsForm({ galleryId }: SettingsFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Caricare impostazioni esistenti
  const { data, isLoading } = useQuery<GallerySelectionSettings>({
    queryKey: [`/api/selection/settings/${galleryId}`],
    enabled: !!galleryId,
  });

  // Form con valori predefiniti
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isEnabled: data?.isEnabled || false,
      instructions: data?.instructions || '',
      minSelections: data?.minSelections || 0,
      maxSelections: data?.maxSelections || 0,
      expiresAt: data?.expiresAt ? new Date(data.expiresAt) : null,
    },
  });

  // Aggiornare valori quando i dati vengono caricati
  React.useEffect(() => {
    if (data) {
      form.reset({
        isEnabled: data.isEnabled,
        instructions: data.instructions || '',
        minSelections: data.minSelections,
        maxSelections: data.maxSelections,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      });
    }
  }, [data, form]);

  // Mutation per salvare le impostazioni
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const endpoint = data 
        ? `/api/selection/settings/${galleryId}` 
        : `/api/selection/settings`;
      
      const method = data ? 'PUT' : 'POST';
      
      const payload = {
        ...values,
        galleryId,
      };
      
      const response = await apiRequest(method, endpoint, payload);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante il salvataggio delle impostazioni');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Impostazioni salvate',
        description: 'Le impostazioni di selezione sono state aggiornate con successo',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/selection/settings/${galleryId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Errore durante il salvataggio: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Invia il form
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Impostazioni Selezione Foto</CardTitle>
        <CardDescription>
          Configura le opzioni per la selezione foto da parte dei clienti
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
                    <FormLabel className="text-base">Abilita Selezione</FormLabel>
                    <FormDescription>
                      Attiva la funzionalità di selezione foto per questa galleria
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

            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Istruzioni per il Cliente</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Inserisci le istruzioni per la selezione..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Queste istruzioni verranno mostrate al cliente quando accede alla selezione foto
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minSelections"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimo Foto</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Numero minimo di foto da selezionare (0 = nessun minimo)
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
                    <FormLabel>Massimo Foto</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Numero massimo di foto selezionabili (0 = nessun limite)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data di Scadenza</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "d MMMM yyyy", { locale: it })
                          ) : (
                            <span>Nessuna scadenza</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                        locale={it}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Opzionale: data dopo la quale non sarà più possibile effettuare selezioni
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={mutation.isPending}
              className="w-full"
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salva Impostazioni
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}