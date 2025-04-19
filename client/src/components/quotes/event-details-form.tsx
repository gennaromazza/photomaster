import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

// Schema di validazione
const eventDetailsSchema = z.object({
  eventDate: z.date().optional().nullable(),
  eventType: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  isFullDay: z.boolean().default(false),
  eventTime: z.string().optional().nullable(),
  eventEndTime: z.string().optional().nullable(),
  ceremonyLocation: z.string().optional().nullable(),
  ceremonyTime: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof eventDetailsSchema>;

interface EventDetailsFormProps {
  quoteId: number;
  initialData?: Partial<FormValues>;
  onSuccess: () => void;
}

export function EventDetailsForm({ quoteId, initialData, onSuccess }: EventDetailsFormProps) {
  const { toast } = useToast();

  // Configurazione del form
  const form = useForm<FormValues>({
    resolver: zodResolver(eventDetailsSchema),
    defaultValues: {
      eventDate: initialData?.eventDate || null,
      eventType: initialData?.eventType || "",
      location: initialData?.location || "",
      isFullDay: initialData?.isFullDay || false,
      eventTime: initialData?.eventTime || "",
      eventEndTime: initialData?.eventEndTime || "",
      ceremonyLocation: initialData?.ceremonyLocation || "",
      ceremonyTime: initialData?.ceremonyTime || "",
    },
  });

  // Mutation per aggiornare i dettagli dell'evento
  const updateEventDetailsMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Prepariamo i dati per l'API - includiamo solo i campi non nulli
      const cleanData: Record<string, any> = {};
      Object.entries(data).forEach(([key, value]) => {
        // Convertiamo date in formato ISO
        if (key === "eventDate" && value) {
          cleanData[key] = (value as Date).toISOString();
        } else if (value !== null && value !== undefined && value !== "") {
          cleanData[key] = value;
        }
      });
      
      const response = await apiRequest("PATCH", `/api/quotes/${quoteId}`, cleanData);
      if (!response.ok) {
        throw new Error("Errore nell'aggiornamento dei dettagli dell'evento");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Dettagli aggiornati",
        description: "I dettagli dell'evento sono stati aggiornati con successo",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Submit handler
  const onSubmit = (data: FormValues) => {
    updateEventDetailsMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="eventDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data Evento</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : null;
                    field.onChange(date);
                  }}
                  disabled={updateEventDetailsMutation.isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="eventType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo Evento</FormLabel>
              <FormControl>
                <Input placeholder="Tipo di evento (matrimonio, battesimo, ecc.)" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="Location dell'evento" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isFullDay"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={updateEventDetailsMutation.isPending}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Tutto il giorno</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {!form.watch("isFullDay") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="eventTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orario Inizio</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      value={field.value || ""}
                      disabled={updateEventDetailsMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eventEndTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orario Fine</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      value={field.value || ""}
                      disabled={updateEventDetailsMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="ceremonyLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location Cerimonia</FormLabel>
              <FormControl>
                <Input placeholder="Location della cerimonia" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ceremonyTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Orario Cerimonia</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  {...field}
                  value={field.value || ""}
                  disabled={updateEventDetailsMutation.isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end mt-4 gap-2">
          <Button type="submit" disabled={updateEventDetailsMutation.isPending}>
            {updateEventDetailsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              "Salva Modifiche"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}