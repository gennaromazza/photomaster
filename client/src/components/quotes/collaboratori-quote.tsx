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
    notes?: string;
    email?: string;
    address?: string;
  };
  internalNotes?: string;
  clientNotes?: string;
}

interface ClientData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  notes?: string;
  email?: string;
  address?: string;
}

export function CollaboratoriQuote({ 
  quoteId, 
  title, 
  date, 
  location, 
  ceremonyLocation, 
  ceremonyTime,
  client,
  internalNotes,
  clientNotes
}: CollaboratoriQuoteProps) {

  // Inizializziamo clientData con i dati che riceviamo come prop
  // In questo modo il componente funziona anche senza dati cliente,
  // ma li utilizzerà se disponibili
  const clientData: ClientData = client || {};
  
  // Importante: prima definiamo tutti gli hooks che utilizziamo
  const { toast } = useToast();
  
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
  
  // Query dei collaboratori assegnati
  const { data: collaboratori = [], isLoading, error } = useQuery<any[]>({
    queryKey: [`/api/eventi/preventivo/${quoteId}/collaboratori`],
    enabled: !!quoteId
  });
  
  // Recupera la lista dei collaboratori disponibili
  const { data: collaboratoriDisponibili = [] } = useQuery<any[]>({
    queryKey: ["/api/collaborators"],
    enabled: isDialogOpen,
  });
  
  // Recupera il token CSRF
  const { data: csrfData } = useQuery<{ csrfToken: string }>({
    queryKey: ["/api/csrf-token"],
    staleTime: 60 * 60 * 1000, // 1 ora
  });
  
  // Mutation per aggiungere un collaboratore
  const addCollaboratoreMutation = useMutation({
    mutationFn: async (data: CollaboratoreFormValues) => {
      // Utilizza apiRequest che include automaticamente l'header CSRF
      // Aggiungi l'header CSRF
      const headers = new Headers();
      if (csrfData?.csrfToken) {
        headers.append('X-CSRF-Token', csrfData.csrfToken);
      }
    
      // Configura la richiesta con headers CSRF
      const requestOptions = {
        method: "POST", 
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfData?.csrfToken || ""
        },
        body: JSON.stringify({
          collaboratoreId: parseInt(data.collaboratoreId),
          ruolo: data.ruolo,
          note: data.note || "",
        }),
        credentials: 'include'
      };
      
      const response = await fetch(`/api/eventi/preventivo/${quoteId}/collaboratori`, requestOptions);
      return await response.json();
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
      const response = await apiRequest(
        "DELETE",
        `/api/eventi/preventivo/${quoteId}/collaboratori/${collaboratoreId}`,
        undefined,
        {
          headers: {
            'X-CSRF-Token': csrfData?.csrfToken || '',
          },
        }
      );
      return await response.json();
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
    // Usiamo clientData invece di client per gestire anche il caso in cui client sia undefined
    // Creiamo un'info cliente di base che mostri i dati se disponibili
    let clientInfo = '';
    
    if (clientData.firstName && clientData.lastName) {
      clientInfo = `👥 Cliente: ${clientData.firstName} ${clientData.lastName}\n`;
      
      if (clientData.phone) {
        clientInfo += `📱 Telefono Cliente: ${clientData.phone}\n`;
      }
      
      if (clientData.email) {
        clientInfo += `📧 Email Cliente: ${clientData.email}\n`;
      }
      
      if (clientData.address) {
        clientInfo += `🏠 Indirizzo Cliente: ${clientData.address}\n`;
      }
      
      if (clientData.notes) {
        clientInfo += `📝 Note Cliente: ${clientData.notes}\n`;
      }
    }
    
    // Aggiungere note specifiche se disponibili
    let noteAggiuntive = '';
    if (clientNotes) {
      noteAggiuntive += `\n📋 Note Cliente: ${clientNotes}\n`;
    }
    
    if (internalNotes) {
      noteAggiuntive += `\n🔒 Note Interne: ${internalNotes}\n`;
    }
    
    const message = encodeURIComponent(
      `Ciao ${collaboratore.collaboratore.firstName},\n\n` +
      `Ti confermo l'evento "${title}"\n\n` +
      `📅 Data: ${formattedDate}\n` +
      `📍 Location: ${location}\n` +
      (ceremonyLocation ? `🏛️ Cerimonia: ${ceremonyLocation}\n` : '') +
      (ceremonyTime ? `⏰ Orario Cerimonia: ${ceremonyTime}\n` : '') +
      clientInfo +
      noteAggiuntive +
      `🎯 Il tuo ruolo: ${getRoleLabel(collaboratore.ruolo)}\n` +
      (collaboratore.note ? `📌 Note sul tuo ruolo: ${collaboratore.note}\n\n` : '\n') +
      `Per qualsiasi informazione, contattami.`
    );
    
    // Se non c'è un numero di telefono del collaboratore, mostriamo un toast
    if (!collaboratore.collaboratore?.phone) {
      toast({
        title: "Telefono mancante",
        description: "Il collaboratore non ha un numero di telefono registrato",
        variant: "destructive"
      });
      return "#";
    }
    
    return `https://wa.me/${collaboratore.collaboratore.phone.replace(/\D/g, '')}?text=${message}`;
  };

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
                      disabled={
                        addCollaboratoreMutation.isPending || 
                        updateCollaboratoreMutation.isPending
                      }
                    >
                      {(addCollaboratoreMutation.isPending || updateCollaboratoreMutation.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isEditMode ? "Aggiorna" : "Aggiungi"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {collaboratori.length === 0 ? (
          <div className="text-center p-8 bg-muted/30 rounded-md">
            <p className="text-muted-foreground">
              Nessun collaboratore assegnato a questo preventivo.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={handleAdd}
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi collaboratore
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {collaboratori.map((collaboratore) => (
              <div 
                key={collaboratore.id} 
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {collaboratore.collaboratore.firstName[0]}
                      {collaboratore.collaboratore.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {collaboratore.collaboratore.firstName} {collaboratore.collaboratore.lastName}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {getRoleLabel(collaboratore.ruolo)}
                      </Badge>
                      {collaboratore.note && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="italic text-xs text-muted-foreground cursor-help">
                                Note
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{collaboratore.note}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" asChild>
                          <a 
                            href={createWhatsAppMessage(collaboratore)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Phone className="h-4 w-4 text-green-600" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Invia dettagli evento via WhatsApp</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleEdit(collaboratore)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Modifica ruolo</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-destructive" 
                          onClick={() => removeCollaboratoreMutation.mutate(collaboratore.id)}
                          disabled={removeCollaboratoreMutation.isPending}
                        >
                          {removeCollaboratoreMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
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