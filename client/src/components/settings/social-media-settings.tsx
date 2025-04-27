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
import { Facebook, Instagram, Twitter, Youtube, Globe, Linkedin, Save } from 'lucide-react';
import { FaPinterest, FaTiktok } from 'react-icons/fa';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Schema di validazione per i social media
const socialMediaSchema = z.object({
  facebookUrl: z.string().url("URL di Facebook non valido").or(z.string().length(0)).optional(),
  instagramUrl: z.string().url("URL di Instagram non valido").or(z.string().length(0)).optional(),
  twitterUrl: z.string().url("URL di Twitter non valido").or(z.string().length(0)).optional(),
  youtubeUrl: z.string().url("URL di YouTube non valido").or(z.string().length(0)).optional(),
  websiteUrl: z.string().url("URL del sito web non valido").or(z.string().length(0)).optional(),
  linkedinUrl: z.string().url("URL di LinkedIn non valido").or(z.string().length(0)).optional(),
  tiktokUrl: z.string().url("URL di TikTok non valido").or(z.string().length(0)).optional(),
  pinterestUrl: z.string().url("URL di Pinterest non valido").or(z.string().length(0)).optional()
});

type SocialMediaFormValues = z.infer<typeof socialMediaSchema>;

export const SocialMediaSettings = ({ settings }: { settings: Settings | undefined }) => {
  const { toast } = useToast();

  const defaultValues: SocialMediaFormValues = {
    facebookUrl: settings?.facebook || '',
    instagramUrl: settings?.instagram || '',
    twitterUrl: settings?.twitter || '',
    youtubeUrl: settings?.youtube || '',
    websiteUrl: settings?.website || '',
    linkedinUrl: settings?.linkedinUrl || '',
    tiktokUrl: settings?.tiktokUrl || '',
    pinterestUrl: settings?.pinterestUrl || ''
  };

  const form = useForm<SocialMediaFormValues>({
    resolver: zodResolver(socialMediaSchema),
    defaultValues
  });

  const mutation = useMutation({
    mutationFn: async (values: SocialMediaFormValues) => {
      // Invia solo i campi dei social media, non tutti i settings
      const res = await apiRequest('PUT', '/api/settings', values);
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
              name="facebookUrl"
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
              name="instagramUrl"
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
              name="twitterUrl"
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
              name="youtubeUrl"
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
              name="websiteUrl"
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

            <FormField
              control={form.control}
              name="linkedinUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Linkedin className="mr-2 h-4 w-4 text-blue-700" />
                    LinkedIn
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://linkedin.com/in/tuoprofilo" {...field} />
                  </FormControl>
                  <FormDescription>
                    URL completo del tuo profilo LinkedIn professionale
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tiktokUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <FaTiktok className="mr-2 h-4 w-4 text-black" />
                    TikTok
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://tiktok.com/@tuoprofilo" {...field} />
                  </FormControl>
                  <FormDescription>
                    URL completo del tuo account TikTok
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pinterestUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <FaPinterest className="mr-2 h-4 w-4 text-red-500" />
                    Pinterest
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://pinterest.com/tuoprofilo" {...field} />
                  </FormControl>
                  <FormDescription>
                    URL completo del tuo profilo Pinterest
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