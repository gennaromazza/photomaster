import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera } from "lucide-react";

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
import { GalleryChapter } from "@/types/gallery";

const chapterFormSchema = z.object({
  title: z.string().min(3, { message: "Il titolo deve contenere almeno 3 caratteri" }),
  description: z.string().optional(),
  sortOrder: z.number().default(0),
  coverImage: z.string().optional(),
});

type ChapterFormValues = z.infer<typeof chapterFormSchema>;

interface ChapterFormProps {
  defaultValues?: Partial<ChapterFormValues>;
  onSubmit: (data: ChapterFormValues) => void;
  isSubmitting?: boolean;
}

export function ChapterForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
}: ChapterFormProps) {
  const form = useForm<ChapterFormValues>({
    resolver: zodResolver(chapterFormSchema),
    defaultValues: {
      title: "",
      description: "",
      sortOrder: 0,
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titolo Capitolo</FormLabel>
              <FormControl>
                <Input placeholder="Es. Preparazione della sposa" {...field} />
              </FormControl>
              <FormDescription>
                Il nome del capitolo visibile ai tuoi clienti
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
                  placeholder="Inserisci una descrizione per questo capitolo..." 
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
          name="coverImage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Immagine di Copertina (opzionale)</FormLabel>
              <FormDescription>
                Seleziona un'immagine di copertina per questo capitolo.
                Puoi caricare le foto dopo la creazione del capitolo.
              </FormDescription>
              <FormControl>
                <div className="mt-2 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-md p-6 cursor-pointer hover:border-muted-foreground/50">
                  {field.value ? (
                    <img 
                      src={field.value} 
                      alt="Copertina"
                      className="max-h-32 object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <Camera className="mx-auto h-10 w-10 text-muted-foreground" />
                      <div className="mt-2 text-sm text-muted-foreground">
                        Nessuna immagine selezionata
                      </div>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="sortOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ordine</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  value={field.value}
                />
              </FormControl>
              <FormDescription>
                L'ordine in cui questo capitolo apparirà nella galleria (i numeri più bassi vengono visualizzati per primi)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="hidden">
          <button type="submit" disabled={isSubmitting}></button>
        </div>
      </form>
    </Form>
  );
}