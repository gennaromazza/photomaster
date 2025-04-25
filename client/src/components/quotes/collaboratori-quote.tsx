import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Loader2,
  UserCheck,
  Phone,
  Plus,
  Edit,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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

// Definizione dell'interfaccia EventoCollaboratore
interface EventoCollaboratore {
  id: number;
  ruolo: string;
  note?: string;
  dataAssegnazione?: Date;
  collaboratore: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
}
import { getRoleLabel } from "@/lib/constants";

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
  clientNotes,
}: CollaboratoriQuoteProps) {
  const clientData: ClientData = client || {};
  const { toast } = useToast();

  const collaboratoreSchema = z.object({
    collaboratoreId: z.string().min(1, "Seleziona un collaboratore"),
    ruolo: z.string().min(1, "Seleziona un ruolo"),
    note: z.string().optional(),
  });
  type CollaboratoreFormValues = z.infer<typeof collaboratoreSchema>;

  const form = useForm<CollaboratoreFormValues>({
    resolver: zodResolver(collaboratoreSchema),
    defaultValues: { ruolo: "fotografo", note: "" },
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCollaboratore, setCurrentCollaboratore] = useState<EventoCollaboratore | null>(null);

  const {
    data: collaboratori = [],
    isLoading,
    error,
  } = useQuery<EventoCollaboratore[]>({
    queryKey: [`/api/eventi/preventivo/${quoteId}/collaboratori`],
    enabled: !!quoteId,
  });

  const { data: collaboratoriDisponibili = [] } = useQuery<{
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  }[]>({
    queryKey: ["/api/collaborators"],
    enabled: isDialogOpen,
  });

  const { data: csrfData } = useQuery<{ csrfToken: string }>({
    queryKey: ["/api/csrf-token"],
    staleTime: 3600000,
  });

  // Mutation per aggiungere un collaboratore
  const addMutation = useMutation({
    mutationFn: (data: CollaboratoreFormValues) => {
      return apiRequest("POST", `/api/eventi/preventivo/${quoteId}/collaboratori`, {
        collaboratoreId: parseInt(data.collaboratoreId),
        ruolo: data.ruolo,
        note: data.note || "",
      }, {
        headers: {
          "X-CSRF-Token": csrfData?.csrfToken || "",
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Collaboratore assegnato",
        description: "Assegnato con successo.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/eventi/preventivo/${quoteId}/collaboratori`],
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile assegnare collaboratore.",
        variant: "destructive",
      });
    },
  });

  // Mutation per rimuovere un collaboratore
  const removeMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest("DELETE", `/api/eventi/preventivo/${quoteId}/collaboratori/${id}`, null, {
        headers: {
          "X-CSRF-Token": csrfData?.csrfToken || "",
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Collaboratore rimosso",
        description: "Rimosso con successo.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/eventi/preventivo/${quoteId}/collaboratori`],
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile rimuovere collaboratore.",
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare un collaboratore
  const updateMutation = useMutation({
    mutationFn: (data: { id: number; ruolo: string; note?: string }) => {
      return apiRequest("PATCH", `/api/eventi/preventivo/${quoteId}/collaboratori/${data.id}`, {
        ruolo: data.ruolo,
        note: data.note || "",
      }, {
        headers: {
          "X-CSRF-Token": csrfData?.csrfToken || "",
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Collaboratore aggiornato",
        description: "Informazioni aggiornate.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/eventi/preventivo/${quoteId}/collaboratori`],
      });
      setIsDialogOpen(false);
      setIsEditMode(false);
      setCurrentCollaboratore(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare collaboratore.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-primary/80" /> Collaboratori
            Assegnati
          </CardTitle>
          <CardDescription>Caricamento in corso…</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
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
            <UserCheck className="w-5 h-5 mr-2 text-primary/80" /> Collaboratori
            Assegnati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-destructive/10 rounded-md text-center text-destructive">
            Errore nel caricamento.
          </div>
        </CardContent>
      </Card>
    );
  }

  const formattedDate = date
    ? format(new Date(date), "dd/MM/yyyy", { locale: it })
    : "N/D";

  const createWhatsAppMessage = (c: EventoCollaboratore) => {
    let clientInfo = "";
    if (clientData.firstName && clientData.lastName) {
      clientInfo += `👥 Cliente: ${clientData.firstName} ${clientData.lastName}\n`;
      if (clientData.phone) clientInfo += `📱 Tel: ${clientData.phone}\n`;
      if (clientData.email) clientInfo += `📧 Email: ${clientData.email}\n`;
      if (clientData.address)
        clientInfo += `🏠 Indirizzo: ${clientData.address}\n`;
      if (clientData.notes) clientInfo += `📝 Note: ${clientData.notes}\n`;
    }
    let extraNotes = clientNotes ? `\n📋 Note Cliente: ${clientNotes}\n` : "";
    extraNotes += internalNotes ? `\n🔒 Note Interne: ${internalNotes}\n` : "";
    const msg = encodeURIComponent(
      `Ciao ${c.collaboratore.firstName},\n\n` +
        `Evento: "${title}"\n` +
        `📅 ${formattedDate}\n` +
        `📍 ${location}\n` +
        (ceremonyLocation ? `🏛️ Cerimonia: ${ceremonyLocation}\n` : "") +
        (ceremonyTime ? `⏰ ${ceremonyTime}\n` : "") +
        clientInfo +
        extraNotes +
        `🎯 Ruolo: ${getRoleLabel(c.ruolo)}\n` +
        (c.note ? `📌 Note: ${c.note}\n` : "") +
        `\nContattami per info.`,
    );
    const phoneClean = c.collaboratore.phone?.replace(/\D/g, "");
    if (!phoneClean) {
      toast({
        title: "Errore",
        description: "Numero mancante",
        variant: "destructive",
      });
      return "#";
    }
    return `https://wa.me/${phoneClean}?text=${msg}`;
  };

  function onSubmit(data: CollaboratoreFormValues) {
    if (isEditMode && currentCollaboratore) {
      updateMutation.mutate({
        id: currentCollaboratore.id,
        ruolo: data.ruolo,
        note: data.note,
      });
    } else {

      addMutation.mutate(data);
    }
  }

  function handleEdit(coll: EventoCollaboratore) {
    setIsEditMode(true);
    setCurrentCollaboratore(coll);
    form.setValue("ruolo", coll.ruolo);
    form.setValue("note", coll.note || "");
    setIsDialogOpen(true);
  }

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
              <UserCheck className="w-5 h-5 mr-2 text-primary/80" />{" "}
              Collaboratori Assegnati
            </CardTitle>
            <CardDescription>
              {collaboratori.length
                ? `${collaboratori.length} assegnati`
                : "Nessuno assegnato"}
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleAdd}>
                <UserPlus className="h-4 w-4 mr-2" /> Aggiungi
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {isEditMode ? "Modifica" : "Aggiungi"} collaboratore
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
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
                                <SelectValue placeholder="Seleziona" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {collaboratoriDisponibili.map((cd) => (
                                <SelectItem
                                  key={cd.id}
                                  value={cd.id.toString()}
                                >
                                  {cd.firstName} {cd.lastName}
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
                              <SelectValue placeholder="Seleziona ruolo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fotografo">Fotografo</SelectItem>
                            <SelectItem value="videomaker">
                              Videomaker
                            </SelectItem>
                            <SelectItem value="assistente">
                              Assistente
                            </SelectItem>
                            <SelectItem value="grafico">Grafico</SelectItem>
                            <SelectItem value="secondofotografo">
                              Secondo fotografo
                            </SelectItem>
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
                          className="resize-none"
                          placeholder="Note..."
                          {...field}
                        />
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
                      disabled={
                        addMutation.isPending || updateMutation.isPending
                      }
                    >
                      {(addMutation.isPending || updateMutation.isPending) && (
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
              Nessun collaboratore assegnato.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdd}
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" /> Aggiungi
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {collaboratori.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {c.collaboratore.firstName[0]}
                      {c.collaboratore.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {c.collaboratore.firstName} {c.collaboratore.lastName}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {getRoleLabel(c.ruolo)}
                      </Badge>
                      {c.note && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="italic text-xs cursor-help">
                                Note
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{c.note}</p>
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
                            href={createWhatsAppMessage(c)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Phone className="h-4 w-4 text-green-600" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>WhatsApp</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(c)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Modifica</p>
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
                          onClick={() => removeMutation.mutate(c.id)}
                          disabled={removeMutation.isPending}
                        >
                          {removeMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Rimuovi</p>
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
