
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, UserCheck, Phone, Plus, Edit, Trash2, UserPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { getRoleLabel } from "@/lib/constants";
import { adaptedApiRequest } from "@/utils/api-adapter";

interface CollaboratoriQuoteProps {
  quoteId: number;
  title: string;
  date: Date;
  location: string;
  ceremonyLocation?: string;
  ceremonyTime?: string;
  client?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
}

export function CollaboratoriQuote({ 
  quoteId, 
  title, 
  date, 
  location, 
  ceremonyLocation, 
  ceremonyTime,
  client
}: CollaboratoriQuoteProps) {

  if (!client) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-primary/80" />
            Collaboratori Assegnati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4 bg-yellow-50 rounded-md">
            <p className="text-yellow-700">Dati cliente non disponibili.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  const { data: collaboratori = [], isLoading, error } = useQuery<any[]>({
    queryKey: [`/api/eventi/preventivo/${quoteId}/collaboratori`],
    enabled: !!quoteId
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-primary/80" />
            Collaboratori Assegnati
          </CardTitle>
          <CardDescription>
            Visualizza i collaboratori assegnati al servizio
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-primary/80" />
            Collaboratori Assegnati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-destructive/10 rounded-md text-center text-destructive">
            Si è verificato un errore nel caricamento dei collaboratori.
          </div>
        </CardContent>
      </Card>
    );
  }

  const formattedDate = date ? format(new Date(date), "dd/MM/yyyy", { locale: it }) : 'Data non disponibile';

  // Funzione per creare il messaggio WhatsApp con i dati completi del cliente
  const createWhatsAppMessage = (collaboratore: any) => {
    if (!client) {
      toast({
        title: "Dati cliente mancanti",
        description: "Non è possibile inviare il messaggio senza i dati del cliente",
        variant: "destructive"
      });
      return "#";
    }
    
    // Assicuriamoci che i dati del cliente siano sempre inclusi
    const clientInfo = `👥 Cliente: ${client.firstName} ${client.lastName}\n` +
      (client.phone ? `📱 Telefono Cliente: ${client.phone}\n` : '');
      
    const message = encodeURIComponent(
      `Ciao ${collaboratore.collaboratore.firstName},\n\n` +
      `Ti confermo l'evento "${title}"\n\n` +
      `📅 Data: ${formattedDate}\n` +
      `📍 Location: ${location}\n` +
      (ceremonyLocation ? `🏛️ Cerimonia: ${ceremonyLocation}\n` : '') +
      (ceremonyTime ? `⏰ Orario Cerimonia: ${ceremonyTime}\n` : '') +
      clientInfo +
      `🎯 Il tuo ruolo: ${getRoleLabel(collaboratore.ruolo)}\n\n` +
      `Per qualsiasi informazione, contattami.`
    );
    return `https://wa.me/${collaboratore.collaboratore.phone?.replace(/\D/g, '')}?text=${message}`;
  };

  // Schema per la validazione del form di aggiunta collaboratore
  const collaboratoreSchema = z.object({
    collaboratoreId: z.string().min(1, "Seleziona un collaboratore"),
    ruolo: z.string().min(1, "Seleziona un ruolo"),
    note: z.string().optional(),
  });

  type CollaboratoreFormValues = z.infer<typeof collaboratoreSchema>;

  // Form per l'aggiunta di un nuovo collaboratore
  const form = useForm<CollaboratoreFormValues>({
    resolver: zodResolver(collaboratoreSchema),
    defaultValues: {
      ruolo: "fotografo",
      note: "",
    },
  });

  // State per il modale di aggiunta/modifica
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCollaboratore, setCurrentCollaboratore] = useState<any>(null);
  const { toast } = useToast();

  // Recupera la lista dei collaboratori disponibili
  const { data: collaboratoriDisponibili = [] } = useQuery<any[]>({
    queryKey: ["/api/collaborators"],
    enabled: isDialogOpen,
  });

  // Mutation per aggiungere un collaboratore
  const addCollaboratoreMutation = useMutation({
    mutationFn: async (data: CollaboratoreFormValues) => {
      const response = await adaptedApiRequest(
        "POST",
        `/api/eventi/preventivo/${quoteId}/collaboratori`,
        {
          collaboratoreId: parseInt(data.collaboratoreId),
          ruolo: data.ruolo,
          note: data.note || "",
        }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Collaboratore assegnato",
        description: "Il collaboratore è stato assegnato con successo al preventivo.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/eventi/preventivo/${quoteId}/collaboratori`] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'assegnazione del collaboratore.",
        variant: "destructive",
      });
      console.error("Errore durante l'assegnazione del collaboratore:", error);
    },
  });

  // Mutation per rimuovere un collaboratore
  const removeCollaboratoreMutation = useMutation({
    mutationFn: async (collaboratoreId: number) => {
      const response = await adaptedApiRequest(
        "DELETE",
        `/api/eventi/preventivo/${quoteId}/collaboratori/${collaboratoreId}`,
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Collaboratore rimosso",
        description: "Il collaboratore è stato rimosso con successo dal preventivo.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/eventi/preventivo/${quoteId}/collaboratori`] });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la rimozione del collaboratore.",
        variant: "destructive",
      });
      console.error("Errore durante la rimozione del collaboratore:", error);
    },
  });

  // Mutation per modificare un collaboratore
  const updateCollaboratoreMutation = useMutation({
    mutationFn: async (data: { id: number, ruolo: string, note?: string }) => {
      const response = await adaptedApiRequest(
        "PATCH",
        `/api/eventi/preventivo/${quoteId}/collaboratori/${data.id}`,
        {
          ruolo: data.ruolo,
          note: data.note || "",
        }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Collaboratore aggiornato",
        description: "Le informazioni del collaboratore sono state aggiornate con successo.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/eventi/preventivo/${quoteId}/collaboratori`] });
      setIsDialogOpen(false);
      setIsEditMode(false);
      setCurrentCollaboratore(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento del collaboratore.",
        variant: "destructive",
      });
      console.error("Errore durante l'aggiornamento del collaboratore:", error);
    },
  });

  // Gestisce la sottomissione del form
  function onSubmit(data: CollaboratoreFormValues) {
    if (isEditMode && currentCollaboratore) {
      updateCollaboratoreMutation.mutate({
        id: currentCollaboratore.id,
        ruolo: data.ruolo,
        note: data.note,
      });
    } else {
      addCollaboratoreMutation.mutate(data);
    }
  }

  // Apre il modal in modalità modifica
  function handleEdit(collaboratore: any) {
    setIsEditMode(true);
    setCurrentCollaboratore(collaboratore);
    form.setValue("ruolo", collaboratore.ruolo);
    form.setValue("note", collaboratore.note || "");
    setIsDialogOpen(true);
  }

  // Apre il modal in modalità aggiunta
  function handleAdd() {
    setIsEditMode(false);
    setCurrentCollaboratore(null);
    form.reset();
    setIsDialogOpen(true);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center">
              <UserCheck className="w-5 h-5 mr-2 text-primary/80" />
              Collaboratori Assegnati
            </CardTitle>
            <CardDescription>
              {collaboratori?.length ? `${collaboratori.length} collaboratori assegnati all'evento` : 'Nessun collaboratore assegnato'}
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleAdd}>
                <UserPlus className="h-4 w-4 mr-2" />
                Aggiungi
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{isEditMode ? "Modifica collaboratore" : "Aggiungi collaboratore"}</DialogTitle>
                <DialogDescription>
                  {isEditMode 
                    ? "Modifica le informazioni del collaboratore" 
                    : "Assegna un nuovo collaboratore al preventivo"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {!isEditMode && (
                    <FormField
                      control={form.control}
                      name="collaboratoreId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Collaboratore</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona un collaboratore" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {collaboratoriDisponibili.map((collab) => (
                                <SelectItem key={collab.id} value={collab.id.toString()}>
                                  {collab.firstName} {collab.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={form.control}
                    name="ruolo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ruolo</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona un ruolo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fotografo">Fotografo</SelectItem>
                            <SelectItem value="videomaker">Videomaker</SelectItem>
                            <SelectItem value="assistente">Assistente</SelectItem>
                            <SelectItem value="grafico">Grafico</SelectItem>
                            <SelectItem value="secondofotografo">Secondo Fotografo</SelectItem>
                            <SelectItem value="drone">Drone</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note (opzionale)</FormLabel>
                        <Textarea
                          placeholder="Note sull'assegnazione..."
                          className="resize-none"
                          {...field}
                        />
                        <FormDescription>Aggiungi eventuali note sull'assegnazione</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annulla
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={addCollaboratoreMutation.isPending || updateCollaboratoreMutation.isPending}
                    >
                      {(addCollaboratoreMutation.isPending || updateCollaboratoreMutation.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isEditMode ? "Salva modifiche" : "Aggiungi collaboratore"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {collaboratori?.length === 0 ? (
          <div className="text-center p-4 bg-muted/40 rounded-md">
            <p className="text-muted-foreground">
              Nessun collaboratore assegnato a questo preventivo.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {collaboratori?.map((collaboratore: any) => (
              <div 
                key={collaboratore.id} 
                className="border rounded-md p-3 flex items-center"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {collaboratore.collaboratore.firstName.charAt(0)}
                      {collaboratore.collaboratore.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {collaboratore.collaboratore.firstName} {collaboratore.collaboratore.lastName}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline" className="capitalize">
                        {getRoleLabel(collaboratore.ruolo)}
                      </Badge>
                      {collaboratore.dataAssegnazione && (
                        <span className="text-xs text-muted-foreground">
                          Assegnato il {format(new Date(collaboratore.dataAssegnazione), "dd/MM/yyyy", { locale: it })}
                        </span>
                      )}
                    </div>
                    {collaboratore.note && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium">Note:</span> {collaboratore.note}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {collaboratore.collaboratore.phone && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-9 w-9 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => window.open(createWhatsAppMessage(collaboratore), '_blank')}
                          >
                            <Phone className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Invia dettagli evento via WhatsApp</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-9 w-9 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleEdit(collaboratore)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Modifica collaboratore</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm("Sei sicuro di voler rimuovere questo collaboratore?")) {
                              removeCollaboratoreMutation.mutate(collaboratore.id);
                            }
                          }}
                          disabled={removeCollaboratoreMutation.isPending}
                        >
                          {removeCollaboratoreMutation.isPending 
                            ? <Loader2 className="h-4 w-4 animate-spin" /> 
                            : <Trash2 className="h-4 w-4" />
                          }
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Rimuovi collaboratore</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
