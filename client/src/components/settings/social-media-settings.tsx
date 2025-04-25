import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Facebook, Instagram, Twitter, Youtube, Globe, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Schema di validazione per i social media
const socialMediaSchema = z.object({
  facebook: z.string().url("URL di Facebook non valido").or(z.string().length(0)).optional(),
  instagram: z.string().url("URL di Instagram non valido").or(z.string().length(0)).optional(),
  twitter: z.string().url("URL di Twitter non valido").or(z.string().length(0)).optional(),
  youtube: z.string().url("URL di YouTube non valido").or(z.string().length(0)).optional(),
  website: z.string().url("URL del sito web non valido").or(z.string().length(0)).optional()
});

type SocialMediaFormValues = z.infer<typeof socialMediaSchema>;

export const SocialMediaSettings = ({ settings }: { settings: Settings | undefined }) => {
  const { toast } = useToast();

  const defaultValues: SocialMediaFormValues = {
    facebook: settings?.facebook || '',
    instagram: settings?.instagram || '',
    twitter: settings?.twitter || '',
    youtube: settings?.youtube || '',
    website: settings?.website || ''
  };

  const form = useForm<SocialMediaFormValues>({
    resolver: zodResolver(socialMediaSchema),
    defaultValues
  });

  const mutation = useMutation({
    mutationFn: async (values: SocialMediaFormValues) => {
      // Invia solo i campi dei social media, non tutti i settings
      const res = await apiRequest('PATCH', '/api/settings', values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Impostazioni social media aggiornate',
        description: 'Le tue impostazioni dei social media sono state salvate con successo.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: `Si è verificato un errore: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  function onSubmit(values: SocialMediaFormValues) {
    mutation.mutate(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Media</CardTitle>
        <CardDescription>
          Configura i link ai tuoi profili social che verranno mostrati nei pacchetti e preventivi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="facebook"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Facebook className="mr-2 h-4 w-4 text-blue-600" />
                    Facebook
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://facebook.com/tuoprofilo" {...field} />
                  </FormControl>
                  <FormDescription>
                    URL completo del tuo profilo Facebook professionale
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instagram"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Instagram className="mr-2 h-4 w-4 text-pink-600" />
                    Instagram
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://instagram.com/tuoprofilo" {...field} />
                  </FormControl>
                  <FormDescription>
                    URL completo del tuo profilo Instagram professionale
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="twitter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Twitter className="mr-2 h-4 w-4 text-blue-400" />
                    Twitter
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://twitter.com/tuoprofilo" {...field} />
                  </FormControl>
                  <FormDescription>
                    URL completo del tuo profilo Twitter professionale
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="youtube"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Youtube className="mr-2 h-4 w-4 text-red-600" />
                    YouTube
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://youtube.com/c/tuocanale" {...field} />
                  </FormControl>
                  <FormDescription>
                    URL completo del tuo canale YouTube professionale
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Globe className="mr-2 h-4 w-4 text-gray-600" />
                    Sito Web
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://tuosito.it" {...field} />
                  </FormControl>
                  <FormDescription>
                    URL completo del tuo sito web pubblico
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" className="flex items-center" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salva Impostazioni
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};