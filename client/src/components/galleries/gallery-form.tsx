import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Info, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GalleryFormValues } from "@/types/gallery";

const galleryFormSchema = z.object({
  name: z.string().min(3, { message: "Il nome deve contenere almeno 3 caratteri" }),
  description: z.string().optional(),
  eventId: z.number().optional().nullable(),
  password: z.string().optional(),
  isPublic: z.boolean().default(true),
  isPasswordProtected: z.boolean().default(false)
});

interface GalleryFormProps {
  defaultValues?: Partial<GalleryFormValues>;
  events: any[];
  onSubmit: (data: GalleryFormValues) => void;
  isSubmitting?: boolean;
}

export function GalleryForm({ defaultValues, events, onSubmit, isSubmitting = false }: GalleryFormProps) {
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  
  const form = useForm<GalleryFormValues>({
    resolver: zodResolver(galleryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      eventId: null,
      password: "",
      isPublic: true,
      isPasswordProtected: false,
      coverImage: null,
      ...defaultValues
    },
  });
  
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    form.setValue("coverImage", file);
    
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setCoverImagePreview(null);
    }
  };

  const watchIsPasswordProtected = form.watch("isPasswordProtected");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                onValueChange={(value) => field.onChange(value === "0" ? null : parseInt(value))}
                value={field.value?.toString() || "0"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un evento (opzionale)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">Nessun evento</SelectItem>
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
        
        <FormItem>
          <FormLabel>Immagine di Copertina</FormLabel>
          <div className="flex flex-col space-y-2">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Input
                type="file"
                accept="image/*"
                onChange={handleCoverImageChange}
                className="cursor-pointer"
                id="coverImage"
              />
            </div>
            {coverImagePreview && (
              <div className="mt-2">
                <div className="relative w-full max-w-sm h-40 overflow-hidden rounded-md">
                  <img 
                    src={coverImagePreview} 
                    alt="Anteprima copertina" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              </div>
            )}
          </div>
          <FormDescription>
            Carica un'immagine di copertina per la galleria (consigliato)
          </FormDescription>
        </FormItem>
        
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
        
        {form.formState.errors && Object.keys(form.formState.errors).length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Errori nel form</AlertTitle>
            <AlertDescription>
              Ci sono degli errori nel form. Correggi i campi evidenziati prima di procedere.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creazione in corso...</> : 
              'Crea Galleria'}
          </Button>
        </div>
      </form>
    </Form>
  );
}