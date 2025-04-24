import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const nuovoCollaboratoreSchema = z.object({
  firstName: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
  lastName: z.string().min(2, "Il cognome deve contenere almeno 2 caratteri"),
  email: z.string().email("Email non valida"),
  phone: z.string().min(6, "Numero di telefono non valido"),
  role: z.string().min(2, "Il ruolo è obbligatorio"),
  profileImage: z.string().optional(),
  status: z.enum(["available", "unavailable"]),
});

export type NuovoCollaboratoreFormValues = z.infer<typeof nuovoCollaboratoreSchema>;

type NuovoCollaboratoreFormProps = {
  onSuccess?: () => void;
};

export function NuovoCollaboratoreForm({ onSuccess }: NuovoCollaboratoreFormProps) {
  const { toast } = useToast();

  const form = useForm<NuovoCollaboratoreFormValues>({
    resolver: zodResolver(nuovoCollaboratoreSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "",
      profileImage: "",
      status: "available",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: NuovoCollaboratoreFormValues) => {
      const response = await apiRequest("POST", "/api/collaborators", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Collaboratore creato",
        description: "Il collaboratore è stato creato con successo.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/collaborators"] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione del collaboratore.",
        variant: "destructive",
      });
      console.error("Errore durante la creazione del collaboratore:", error);
    },
  });

  function onSubmit(data: NuovoCollaboratoreFormValues) {
    createMutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Nome del collaboratore" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cognome</FormLabel>
                <FormControl>
                  <Input placeholder="Cognome del collaboratore" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@esempio.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefono</FormLabel>
                <FormControl>
                  <Input placeholder="Numero di telefono" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ruolo</FormLabel>
                <FormControl>
                  <Input placeholder="Es. Fotografo, Videomaker, Grafico" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stato</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona stato" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="available">Disponibile</SelectItem>
                    <SelectItem value="unavailable">Non disponibile</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="profileImage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Immagine profilo (URL)</FormLabel>
              <FormControl>
                <Input placeholder="URL immagine profilo (opzionale)" {...field} />
              </FormControl>
              <FormDescription>
                Inserisci l'URL di un'immagine profilo per il collaboratore (opzionale)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Crea collaboratore
        </Button>
      </form>
    </Form>
  );
}