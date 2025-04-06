import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { LeadSource, insertLeadSourceSchema, InsertLeadSource } from "@shared/schema";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
const leadSourceSchema = insertLeadSourceSchema.extend({
  name: z.string().min(2, { message: "Il nome deve avere almeno 2 caratteri" }),
});

export default function OriginsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Ottieni tutte le origini
  const { data: origins, isLoading } = useQuery<LeadSource[]>({
    queryKey: ['/api/lead-sources'],
  });

  // Form per creazione
  const createForm = useForm<InsertLeadSource>({
    resolver: zodResolver(leadSourceSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  // Form per modifica
  const editForm = useForm<InsertLeadSource>({
    resolver: zodResolver(leadSourceSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  // Mutation per creazione
  const createMutation = useMutation({
    mutationFn: async (data: InsertLeadSource) => {
      const response = await apiRequest("POST", "/api/lead-sources", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Origine creata",
        description: "L'origine è stata creata con successo",
      });
      setIsCreating(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/lead-sources'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la creazione dell'origine",
        variant: "destructive",
      });
    },
  });

  // Mutation per modifica
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertLeadSource }) => {
      const response = await apiRequest("PUT", `/api/lead-sources/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Origine aggiornata",
        description: "L'origine è stata aggiornata con successo",
      });
      setIsEditing(null);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/lead-sources'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento dell'origine",
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminazione
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/lead-sources/${id}`);
      if (response.ok) return true;
      throw new Error("Errore durante l'eliminazione");
    },
    onSuccess: () => {
      toast({
        title: "Origine eliminata",
        description: "L'origine è stata eliminata con successo",
      });
      setDeleteDialog(null);
      queryClient.invalidateQueries({ queryKey: ['/api/lead-sources'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'eliminazione dell'origine",
        variant: "destructive",
      });
    },
  });

  // Mutation per toggle stato
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest("PUT", `/api/lead-sources/${id}`, { isActive });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lead-sources'] });
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
  function handleCreateSubmit(data: InsertLeadSource) {
    createMutation.mutate(data);
  }

  // Gestione del submit per la modifica
  function handleEditSubmit(data: InsertLeadSource) {
    if (isEditing === null) return;
    updateMutation.mutate({ id: isEditing, data });
  }

  // Prepara il form di modifica
  function prepareEditForm(origin: LeadSource) {
    editForm.reset({
      name: origin.name,
      description: origin.description || "",
      isActive: origin.isActive,
    });
    setIsEditing(origin.id);
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Origini Lead</h1>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button className="ml-auto">
              <Plus className="mr-2 h-4 w-4" /> Nuova Origine
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea nuova origine</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Origine</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Social Media, Fiere, etc..." />
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
                          L'origine sarà visibile e utilizzabile
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
              <DialogTitle>Modifica origine</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Origine</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Social Media, Fiere, etc..." />
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
                          L'origine sarà visibile e utilizzabile
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
          <CardTitle>Gestione Origini</CardTitle>
          <CardDescription>
            Gestisci le origini dei lead per tracciare la provenienza dei clienti
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : origins && origins.length > 0 ? (
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
                {origins.map((origin) => (
                  <TableRow key={origin.id}>
                    <TableCell className="font-medium">{origin.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {origin.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center">
                        <Switch 
                          checked={origin.isActive}
                          onCheckedChange={(checked) => 
                            toggleMutation.mutate({ id: origin.id, isActive: checked })
                          }
                        />
                        <Badge variant={origin.isActive ? "outline" : "destructive"} className={origin.isActive ? "bg-green-500 text-white hover:bg-green-600" : ""}>
                          {origin.isActive ? "Attiva" : "Inattiva"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {origin.createdAt ? new Date(origin.createdAt).toLocaleDateString('it-IT') : "-"}
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
                          <DropdownMenuItem onClick={() => prepareEditForm(origin)}>
                            <Edit className="mr-2 h-4 w-4" /> Modifica
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteDialog(origin.id)}
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
              <p className="text-muted-foreground">Nessuna origine trovata</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Crea la prima origine
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
            <AlertDialogTitle>Sei sicuro di voler eliminare questa origine?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Elimina questa origine solo se sei sicuro di non averne più bisogno.
              Se l'origine è utilizzata da eventi o clienti, l'eliminazione potrebbe causare problemi.
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