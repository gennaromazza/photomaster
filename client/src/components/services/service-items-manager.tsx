import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Schema per il form di aggiunta item
const serviceItemSchema = z.object({
  serviceId: z.number(),
  productId: z.number(),
  quantity: z.number().min(1, "La quantità minima è 1")
});

type ServiceItemFormValues = z.infer<typeof serviceItemSchema>;

interface ServiceItemsManagerProps {
  serviceId: number;
}

export default function ServiceItemsManager({ serviceId }: ServiceItemsManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query per ottenere i prodotti disponibili
  const { data: products = [] } = useQuery({
    queryKey: ['/api/services'],
    select: (data) => data.filter((item) => item.type === 'product' && item.isActive)
  });

  // Query per ottenere gli item del servizio
  const { data: serviceItems = [], isLoading } = useQuery({
    queryKey: ['/api/service-items', serviceId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/service-items/${serviceId}`);
      return res.json();
    },
    enabled: !!serviceId,
  });

  // Form per l'aggiunta di un nuovo item
  const form = useForm<ServiceItemFormValues>({
    resolver: zodResolver(serviceItemSchema),
    defaultValues: {
      serviceId: serviceId,
      productId: undefined,
      quantity: 1
    }
  });

  // Reset form quando cambia il serviceId
  useEffect(() => {
    form.setValue('serviceId', serviceId);
  }, [serviceId, form]);

  // Mutation per aggiungere un nuovo item
  const addItemMutation = useMutation({
    mutationFn: async (data: ServiceItemFormValues) => {
      const res = await apiRequest('POST', '/api/service-items', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-items', serviceId] });
      setIsDialogOpen(false);
      form.reset({ serviceId, productId: undefined, quantity: 1 });
      toast({
        title: "Prodotto aggiunto",
        description: "Il prodotto è stato aggiunto al servizio con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Non è stato possibile aggiungere il prodotto: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation per eliminare un item
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/service-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-items', serviceId] });
      toast({
        title: "Prodotto rimosso",
        description: "Il prodotto è stato rimosso dal servizio con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: `Non è stato possibile rimuovere il prodotto: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Funzione per gestire l'aggiunta di un item
  const onSubmit = (data: ServiceItemFormValues) => {
    addItemMutation.mutate(data);
  };

  // Funzione per gestire l'eliminazione di un item
  const handleDeleteItem = (id: number) => {
    if (confirm("Sei sicuro di voler rimuovere questo prodotto dal servizio?")) {
      deleteItemMutation.mutate(id);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Prodotti inclusi nel servizio</CardTitle>
        <CardDescription>
          Gestisci i prodotti che compongono questo servizio composto
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center my-4">Caricamento in corso...</div>
        ) : serviceItems.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            Nessun prodotto incluso in questo servizio. 
            Aggiungi prodotti per creare un servizio composto.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prodotto</TableHead>
                <TableHead>Quantità</TableHead>
                <TableHead>Prezzo unitario</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceItems.map((item) => {
                // Trova il prodotto corrispondente
                const product = products.find(p => p.id === item.productId);
                return (
                  <TableRow key={item.id}>
                    <TableCell>{product?.name || 'Prodotto sconosciuto'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>€{product?.price ? (product.price / 100).toFixed(2) : '0.00'}</TableCell>
                    <TableCell>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setIsDialogOpen(true)}
          disabled={products.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi prodotto
        </Button>
      </CardFooter>

      {/* Dialog per aggiungere un nuovo prodotto */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi prodotto al servizio</DialogTitle>
            <DialogDescription>
              Seleziona un prodotto e la quantità da includere in questo servizio.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prodotto</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un prodotto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name} - €{(product.price / 100).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantità</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={addItemMutation.isPending}
                >
                  {addItemMutation.isPending ? "Aggiunta in corso..." : "Aggiungi"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}