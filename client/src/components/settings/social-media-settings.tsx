import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Instagram, Facebook, Twitter, Youtube, Linkedin, MessageCircle } from "lucide-react";

const socialMediaSchema = z.object({
  instagramUrl: z.string().url("Inserisci un URL valido").optional().or(z.literal("")),
  facebookUrl: z.string().url("Inserisci un URL valido").optional().or(z.literal("")),
  twitterUrl: z.string().url("Inserisci un URL valido").optional().or(z.literal("")),
  youtubeUrl: z.string().url("Inserisci un URL valido").optional().or(z.literal("")),
  tiktokUrl: z.string().url("Inserisci un URL valido").optional().or(z.literal("")),
  pinterestUrl: z.string().url("Inserisci un URL valido").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Inserisci un URL valido").optional().or(z.literal("")),
  companyDescription: z.string().optional(),
});

type SocialMediaFormValues = z.infer<typeof socialMediaSchema>;

export const SocialMediaSettings = ({ settings }: { settings: Settings | undefined }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SocialMediaFormValues>({
    resolver: zodResolver(socialMediaSchema),
    defaultValues: {
      instagramUrl: settings?.instagramUrl || "",
      facebookUrl: settings?.facebookUrl || "",
      twitterUrl: settings?.twitterUrl || "",
      youtubeUrl: settings?.youtubeUrl || "",
      tiktokUrl: settings?.tiktokUrl || "",
      pinterestUrl: settings?.pinterestUrl || "",
      linkedinUrl: settings?.linkedinUrl || "",
      companyDescription: settings?.companyDescription || "",
    },
    values: {
      instagramUrl: settings?.instagramUrl || "",
      facebookUrl: settings?.facebookUrl || "",
      twitterUrl: settings?.twitterUrl || "",
      youtubeUrl: settings?.youtubeUrl || "",
      tiktokUrl: settings?.tiktokUrl || "",
      pinterestUrl: settings?.pinterestUrl || "",
      linkedinUrl: settings?.linkedinUrl || "",
      companyDescription: settings?.companyDescription || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: SocialMediaFormValues) => {
      setIsLoading(true);
      const res = await apiRequest("PATCH", "/api/settings", values);
      const data = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Impostazioni social aggiornate",
        description: "Le impostazioni dei social media sono state aggiornate con successo.",
      });
      setIsLoading(false);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento delle impostazioni social.",
        variant: "destructive",
      });
      setIsLoading(false);
      console.error(error);
    },
  });

  function onSubmit(values: SocialMediaFormValues) {
    mutation.mutate(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Social Media e Descrizione Studio</CardTitle>
        <CardDescription>
          Gestisci i tuoi profili social e la descrizione del tuo studio fotografico.
          Questi dettagli saranno mostrati nei template delle pagine pubbliche.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="companyDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione Studio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrivi il tuo studio fotografico con una frase accattivante..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Questa descrizione apparirà nei footer e nelle sezioni informative dei template.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="instagramUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Instagram className="h-4 w-4" /> Instagram
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://instagram.com/tuostudio" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="facebookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Facebook className="h-4 w-4" /> Facebook
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://facebook.com/tuostudio" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="twitterUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Twitter className="h-4 w-4" /> Twitter
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://twitter.com/tuostudio" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="youtubeUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Youtube className="h-4 w-4" /> YouTube
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://youtube.com/c/tuostudio" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tiktokUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" /> TikTok
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://tiktok.com/@tuostudio" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="linkedinUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" /> LinkedIn
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://linkedin.com/company/tuostudio" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => form.reset()}
              >
                Annulla
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
              >
                {isLoading ? "Salvataggio..." : "Salva Impostazioni Social"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};