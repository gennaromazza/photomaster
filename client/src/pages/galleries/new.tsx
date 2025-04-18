import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, Save, Loader2, Camera } from "lucide-react";

// Definiamo un'interfaccia per l'evento
interface Event {
  id: number;
  title: string;
  description?: string;
}

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const galleryFormSchema = z.object({
  name: z.string().min(3, { message: "Il nome deve contenere almeno 3 caratteri" }),
  description: z.string().optional(),
  isPublic: z.boolean().default(true),
  password: z.string().optional(),
  eventId: z.string().optional(),
});

type GalleryFormValues = z.infer<typeof galleryFormSchema>;

export default function NewGalleryPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  // Query per ottenere gli eventi disponibili
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const form = useForm<GalleryFormValues>({
    resolver: zodResolver(galleryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      isPublic: true,
      password: "",
      eventId: "",
    },
  });

  const createGalleryMutation = useMutation({
    mutationFn: async (data: GalleryFormValues) => {
      const formData = new FormData();
      
      // Aggiungi dati della galleria
      formData.append("name", data.name);
      if (data.description) formData.append("description", data.description);
      formData.append("isPublic", data.isPublic.toString());
      
      if (passwordProtected && data.password) {
        formData.append("password", data.password);
      }
      
      if (data.eventId && data.eventId !== "0") {
        formData.append("eventId", data.eventId);
      }
      
      // Aggiungi immagine di copertina se presente
      if (coverImageFile) {
        formData.append("coverImage", coverImageFile);
      }
      
      // Utilizziamo fetch direttamente poiché apiRequest non gestisce bene FormData
      const csrfResponse = await fetch('/api/csrf-token');
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrfToken;
      
      const response = await fetch("/api/gallery/galleries", {
        method: "POST",
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore durante la creazione della galleria");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery/galleries"] });
      
      toast({
        title: "Galleria creata",
        description: "La galleria è stata creata con successo",
      });
      
      // Reindirizza alla pagina della galleria appena creata
      setLocation(`/galleries/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la creazione della galleria",
        variant: "destructive",
      });
    },
  });

  const handleCoverImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setCoverImageFile(file);
    
    // Crea anteprima
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (data: GalleryFormValues) => {
    // Creazione del FormData con tutti i dati
    const formData = new FormData();
    formData.append("name", data.name);
    
    if (data.description) {
      formData.append("description", data.description);
    }
    
    formData.append("isPublic", data.isPublic ? "true" : "false");
    
    if (passwordProtected && data.password) {
      formData.append("password", data.password);
    }
    
    if (data.eventId && data.eventId !== "0") {
      formData.append("eventId", data.eventId);
    }
    
    if (coverImageFile) {
      formData.append("coverImage", coverImageFile);
    }
    
    // Invio al server
    createGalleryMutation.mutate(formData);
  };

  return (
    <div className="container py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/galleries")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Nuova Galleria</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Galleria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Galleria</FormLabel>
                    <FormControl>
                      <Input placeholder="Matrimonio di Alice e Marco" {...field} />
                    </FormControl>
                    <FormDescription>
                      Un nome descrittivo per la galleria
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
                        placeholder="Una raccolta di foto del matrimonio..."
                        className="resize-none min-h-[100px]"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Una breve descrizione della galleria (opzionale)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormLabel>Immagine di Copertina</FormLabel>
                <div
                  className="border-2 border-dashed rounded-lg p-6 hover:border-muted-foreground/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("coverImage")?.click()}
                >
                  {coverImagePreview ? (
                    <div className="relative w-full aspect-[3/2] rounded-md overflow-hidden">
                      <img
                        src={coverImagePreview}
                        alt="Anteprima copertina"
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4">
                      <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground text-center">
                        Clicca per selezionare un'immagine di copertina
                      </p>
                    </div>
                  )}
                  <input
                    id="coverImage"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverImageChange}
                  />
                </div>
                <FormDescription>
                  L'immagine di copertina verrà mostrata nella lista delle gallerie (opzionale)
                </FormDescription>
              </div>

              <FormField
                control={form.control}
                name="eventId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collega a un evento</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un evento (opzionale)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Nessun evento</SelectItem>
                        {Array.isArray(events) && events.map((event) => (
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Impostazioni di Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Galleria Pubblica</FormLabel>
                      <FormDescription>
                        Se attivata, la galleria sarà accessibile a chiunque abbia il link
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

              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Protezione con Password</FormLabel>
                  <FormDescription>
                    Richiedi una password per accedere alla galleria
                  </FormDescription>
                </div>
                <Switch
                  checked={passwordProtected}
                  onCheckedChange={setPasswordProtected}
                />
              </div>

              {passwordProtected && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password Galleria</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Inserisci una password" {...field} />
                      </FormControl>
                      <FormDescription>
                        I visitatori dovranno inserire questa password per accedere alla galleria
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/galleries")}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={createGalleryMutation.isPending}
            >
              {createGalleryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creazione in corso...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Crea Galleria
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}