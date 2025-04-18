import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, Upload, SaveIcon, Check, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Schema e tipi per la forma
const galleryFormSchema = z.object({
  name: z.string().min(3, { message: "Il nome deve contenere almeno 3 caratteri" }),
  description: z.string().optional(),
  eventId: z.number().optional().nullable(),
  password: z.string().optional(),
  isPublic: z.boolean().default(true),
  isPasswordProtected: z.boolean().default(false)
});

type GalleryFormValues = z.infer<typeof galleryFormSchema>;

export default function NewGalleryPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  // Query per ottenere gli eventi disponibili
  const { data: events } = useQuery({
    queryKey: ["/api/events"],
    staleTime: 1000 * 60 * 5, // 5 minuti
  });

  const form = useForm<GalleryFormValues>({
    resolver: zodResolver(galleryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      eventId: null,
      password: "",
      isPublic: true,
      isPasswordProtected: false
    },
  });

  const watchIsPasswordProtected = form.watch("isPasswordProtected");

  const createGalleryMutation = useMutation({
    mutationFn: async (data: any) => {
      // Filtra i dati prima di inviarli
      const galleryData = {
        name: data.name,
        description: data.description || null,
        eventId: data.eventId || null,
        password: data.isPasswordProtected ? data.password : null,
        isPublic: data.isPublic
      };
      
      const response = await apiRequest("POST", "/api/gallery/galleries", galleryData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Galleria creata",
        description: "La galleria è stata creata con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/galleries"] });
      setLocation(`/galleries/${data.id}/edit`);
    },
    onError: (error) => {
      console.error("Errore nella creazione della galleria:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione della galleria",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: GalleryFormValues) => {
    createGalleryMutation.mutate(data);
  };

  return (
    <div className="container py-6 max-w-3xl mx-auto">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/galleries")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Crea Nuova Galleria</h1>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Galleria</CardTitle>
                <CardDescription>
                  Inserisci le informazioni di base per la tua nuova galleria fotografica
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Galleria</FormLabel>
                      <FormControl>
                        <Input placeholder="Es. Matrimonio di Mario e Giulia" {...field} />
                      </FormControl>
                      <FormDescription>
                        Il nome pubblico della galleria visibile ai tuoi clienti
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrizione</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Inserisci una descrizione dettagliata della galleria..." 
                          className="resize-none min-h-[100px]"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Una breve descrizione che verrà mostrata nella pagina della galleria
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="eventId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Evento Collegato</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona un evento (opzionale)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Nessun evento</SelectItem>
                          {events?.map((event: any) => (
                            <SelectItem key={event.id} value={event.id.toString()}>
                              {event.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Collega questa galleria a un evento esistente
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator className="my-4" />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Privacy e Protezione</h3>
                  
                  <FormField
                    control={form.control}
                    name="isPublic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Galleria Pubblica</FormLabel>
                          <FormDescription>
                            La galleria sarà visibile a chiunque abbia il link
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
                    name="isPasswordProtected"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Protetta da Password</FormLabel>
                          <FormDescription>
                            Richiedi una password per accedere alla galleria
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
                  
                  {watchIsPasswordProtected && (
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="Inserisci una password" {...field} />
                          </FormControl>
                          <FormDescription>
                            La password sarà richiesta per accedere alla galleria
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Nota bene</AlertTitle>
                  <AlertDescription>
                    Dopo aver creato la galleria, potrai caricare le foto, organizzarle in capitoli e personalizzare l'aspetto.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setLocation("/galleries")}>
                  Annulla
                </Button>
                <Button type="submit" disabled={createGalleryMutation.isPending}>
                  {createGalleryMutation.isPending ? (
                    <>Creazione in corso...</>
                  ) : (
                    <>
                      <SaveIcon className="mr-2 h-4 w-4" /> Crea Galleria
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}