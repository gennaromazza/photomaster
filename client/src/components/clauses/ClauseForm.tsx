import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/rich-text-editor';
import { ContractClause, CreateClauseData } from './types';
import { useClauses } from '@/hooks/use-clauses';

const clauseSchema = z.object({
  title: z.string().min(3, 'Il titolo deve contenere almeno 3 caratteri'),
  content: z.string().min(10, 'Il contenuto deve contenere almeno 10 caratteri'),
  categoryId: z.number().nullable(),
  isRequired: z.boolean().default(true),
  isActive: z.boolean().default(true),
  order: z.number().min(0, 'L\'ordine non può essere negativo').default(0),
});

type ClauseFormData = z.infer<typeof clauseSchema>;

interface ClauseFormProps {
  clause?: ContractClause;
  onSubmit: (data: CreateClauseData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ClauseForm({ clause, onSubmit, onCancel, isSubmitting = false }: ClauseFormProps) {
  const { categoriesQuery } = useClauses();
  const [editorContent, setEditorContent] = useState('');
  
  const form = useForm<ClauseFormData>({
    resolver: zodResolver(clauseSchema),
    defaultValues: {
      title: '',
      content: '',
      categoryId: null,
      isRequired: true,
      isActive: true,
      order: 0,
    },
  });

  // Popola il form quando viene fornita una clausola per la modifica
  useEffect(() => {
    if (clause) {
      form.reset({
        title: clause.title,
        content: clause.content,
        categoryId: clause.categoryId,
        isRequired: clause.isRequired,
        isActive: clause.isActive,
        order: clause.order,
      });
      
      setEditorContent(clause.content);
    }
  }, [clause, form]);

  // Gestisce il cambiamento nell'editor di testo e aggiorna il form
  const handleEditorChange = (content: string) => {
    setEditorContent(content);
    form.setValue('content', content, { shouldValidate: true });
  };

  const handleSubmit = (data: ClauseFormData) => {
    // Creiamo un oggetto che rispetti l'interfaccia CreateClauseData
    const submitData: CreateClauseData = {
      title: data.title,
      content: data.content,
      categoryId: data.categoryId,
      eventType: null, // Impostiamo sempre a null come richiesto
      isRequired: data.isRequired,
      isActive: data.isActive,
      order: data.order
    };
    
    onSubmit(submitData);
  };

  // Caricamento delle categorie
  const categories = categoriesQuery.data || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titolo</FormLabel>
              <FormControl>
                <Input placeholder="Titolo della clausola" {...field} />
              </FormControl>
              <FormDescription>
                Un titolo breve e descrittivo per la clausola
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contenuto</FormLabel>
              <FormControl>
                <RichTextEditor 
                  content={editorContent} 
                  onChange={handleEditorChange}
                  placeholder="Testo completo della clausola contrattuale..." 
                />
              </FormControl>
              <FormDescription>
                Il testo completo della clausola che verrà mostrato al cliente
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))}
                  value={field.value?.toString() || "null"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona una categoria (opzionale)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="null">Nessuna categoria (generale)</SelectItem>
                    {categoriesQuery.isLoading ? (
                      <SelectItem value="loading" disabled>
                        Caricamento categorie...
                      </SelectItem>
                    ) : (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Associa la clausola a una categoria di servizio specifica
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ordine</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>
                  Posizione di visualizzazione (0 = prima)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="isRequired"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Obbligatoria</FormLabel>
                  <FormDescription>
                    Il cliente deve accettare questa clausola
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Attiva</FormLabel>
                  <FormDescription>
                    La clausola è disponibile per i nuovi preventivi
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annulla
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvataggio...' : clause ? 'Aggiorna clausola' : 'Crea clausola'}
          </Button>
        </div>
      </form>
    </Form>
  );
}