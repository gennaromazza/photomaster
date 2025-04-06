import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ServiceCategory, insertServiceCategorySchema, InsertServiceCategory } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreHorizontal, Plus, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Estensione dello schema per aggiungere validazione
const serviceCategorySchema = insertServiceCategorySchema.extend({
  name: z.string().min(2, { message: "Il nome deve avere almeno 2 caratteri" }),
});

export default function CategoriesPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Ottieni tutte le categorie
  const { data: categories, isLoading } = useQuery<ServiceCategory[]>({
    queryKey: ['/api/service-categories'],
  });

  // Form per creazione
  const createForm = useForm<InsertServiceCategory>({
    resolver: zodResolver(serviceCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  // Form per modifica
  const editForm = useForm<InsertServiceCategory>({
    resolver: zodResolver(serviceCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  // Mutation per creazione
  const createMutation = useMutation({
    mutationFn: async (data: InsertServiceCategory) => {
      const response = await apiRequest("POST", "/api/service-categories", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Categoria creata",
        description: "La categoria è stata creata con successo",
      });
      setIsCreating(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/service-categories'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la creazione della categoria",
        variant: "destructive",
      });
    },
  });

  // Mutation per modifica
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertServiceCategory }) => {
      const response = await apiRequest("PUT", `/api/service-categories/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Categoria aggiornata",
        description: "La categoria è stata aggiornata con successo",
      });
      setIsEditing(null);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/service-categories'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento della categoria",
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminazione
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/service-categories/${id}`);
      if (response.ok) return true;
      throw new Error("Errore durante l'eliminazione");
    },
    onSuccess: () => {
      toast({
        title: "Categoria eliminata",
        description: "La categoria è stata eliminata con successo",
      });
      setDeleteDialog(null);
      queryClient.invalidateQueries({ queryKey: ['/api/service-categories'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'eliminazione della categoria",
        variant: "destructive",
      });
    },
  });

  // Mutation per toggle stato
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest("PUT", `/api/service-categories/${id}`, { isActive });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-categories'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento dello stato",
        variant: "destructive",
      });
    },
  });

  // Gestione del submit per la creazione
  function handleCreateSubmit(data: InsertServiceCategory) {
    createMutation.mutate(data);
  }

  // Gestione del submit per la modifica
  function handleEditSubmit(data: InsertServiceCategory) {
    if (isEditing === null) return;
    updateMutation.mutate({ id: isEditing, data });
  }

  // Prepara il form di modifica
  function prepareEditForm(category: ServiceCategory) {
    editForm.reset({
      name: category.name,
      description: category.description || "",
      isActive: category.isActive,
    });
    setIsEditing(category.id);
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Categorie Servizi</h1>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button className="ml-auto">
              <Plus className="mr-2 h-4 w-4" /> Nuova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea nuova categoria</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Categoria</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Fotografia, Riprese, etc..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrizione</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descrizione facoltativa"
                          value={field.value as string}
                          onChange={field.onChange}
                          disabled={field.disabled}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Stato</FormLabel>
                        <FormDescription>
                          La categoria sarà visibile e utilizzabile
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
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={createMutation.isPending}>
                      Annulla
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvataggio...
                      </>
                    ) : (
                      "Salva"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Dialog per la modifica */}
        <Dialog open={isEditing !== null} onOpenChange={(open) => !open && setIsEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifica categoria</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Categoria</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Fotografia, Riprese, etc..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrizione</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descrizione facoltativa"
                          value={field.value as string}
                          onChange={field.onChange}
                          disabled={field.disabled}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Stato</FormLabel>
                        <FormDescription>
                          La categoria sarà visibile e utilizzabile
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
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(null)} 
                    disabled={updateMutation.isPending}
                    type="button"
                  >
                    Annulla
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Aggiornamento...
                      </>
                    ) : (
                      "Aggiorna"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestione Categorie</CardTitle>
          <CardDescription>
            Gestisci le categorie dei servizi per organizzare la tua offerta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : categories && categories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Data Creazione</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {category.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center">
                        <Switch 
                          checked={category.isActive}
                          onCheckedChange={(checked) => 
                            toggleMutation.mutate({ id: category.id, isActive: checked })
                          }
                        />
                        <Badge variant={category.isActive ? "outline" : "destructive"} className={category.isActive ? "bg-green-500 text-white hover:bg-green-600" : ""}>
                          {category.isActive ? "Attiva" : "Inattiva"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {category.createdAt ? new Date(category.createdAt).toLocaleDateString('it-IT') : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Apri Menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => prepareEditForm(category)}>
                            <Edit className="mr-2 h-4 w-4" /> Modifica
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteDialog(category.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">Nessuna categoria trovata</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Crea la prima categoria
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogo di conferma eliminazione */}
      <AlertDialog 
        open={deleteDialog !== null} 
        onOpenChange={(open) => !open && setDeleteDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di voler eliminare questa categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Elimina questa categoria solo se sei sicuro di non averne più bisogno.
              Se la categoria è utilizzata da servizi o prodotti, l'eliminazione potrebbe causare problemi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteDialog && deleteMutation.mutate(deleteDialog)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminazione...
                </>
              ) : (
                "Elimina"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}