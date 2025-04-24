import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { COLLABORATOR_ROLES, COLLABORATOR_STATUSES, getRoleLabel, getStatusLabel } from "@shared/constants";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { insertCollaboratorSchema, Collaborator, Event } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { getInitials } from "@/lib/utils";
import { CollaboratoreDashboard } from "@/components/collaboratori/collaboratore-dashboard";
import { PagamentoCollaboratoreList } from "@/components/collaboratori/pagamenti-collaboratore";
import { MontaggioCollaboratoreList } from "@/components/collaboratori/montaggi-collaboratore";
import { GeneraTokenDashboard } from "@/components/collaboratori/genera-token-dashboard";

const formSchema = insertCollaboratorSchema.extend({});

export default function CollaboratorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const collaboratorId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  // Non abbiamo più bisogno di gestire un activeTab in questa pagina

  // Fetch collaborator data
  const {
    data: collaborator,
    isLoading: isLoadingCollaborator,
  } = useQuery<Collaborator>({
    queryKey: [`/api/collaborators/${collaboratorId}`],
    enabled: !isNaN(collaboratorId),
  });

  // Fetch events for this collaborator
  const {
    data: collaboratorEvents = [],
    isLoading: isLoadingEvents,
  } = useQuery<Event[]>({
    queryKey: [`/api/collaborators/${collaboratorId}/events`],
    enabled: !isNaN(collaboratorId),
  });

  // Update collaborator form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: collaborator?.firstName || "",
      lastName: collaborator?.lastName || "",
      email: collaborator?.email || "",
      phone: collaborator?.phone || "",
      role: collaborator?.role || "",
      status: collaborator?.status || "available",
      profileImage: collaborator?.profileImage || "",
    },
  });

  // Set form values when collaborator data loads
  useEffect(() => {
    if (collaborator) {
      form.reset({
        firstName: collaborator.firstName,
        lastName: collaborator.lastName,
        email: collaborator.email,
        phone: collaborator.phone,
        role: collaborator.role,
        status: collaborator.status,
        profileImage: collaborator.profileImage,
      });
    }
  }, [collaborator, form]);

  // Update collaborator mutation
  const updateCollaboratorMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const res = await apiRequest("PUT", `/api/collaborators/${collaboratorId}`, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Errore durante l'aggiornamento del collaboratore");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/collaborators/${collaboratorId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/collaborators"] });
      toast({
        title: "Collaboratore aggiornato",
        description: "Le informazioni del collaboratore sono state aggiornate con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento del collaboratore",
        variant: "destructive",
      });
    },
  });

  // Delete collaborator mutation
  const deleteCollaboratorMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/collaborators/${collaboratorId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Errore durante l'eliminazione del collaboratore");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collaborators"] });
      navigate("/collaborators");
      toast({
        title: "Collaboratore eliminato",
        description: "Il collaboratore è stato eliminato con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'eliminazione del collaboratore",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    updateCollaboratorMutation.mutate(data);
  };

  const handleDelete = () => {
    if (window.confirm("Sei sicuro di voler eliminare questo collaboratore? Questa azione non può essere annullata.")) {
      deleteCollaboratorMutation.mutate();
    }
  };

  if (isLoadingCollaborator) {
    return (
      <div className="lg:px-8 px-4 mt-6 py-8 flex justify-center">
        <div className="animate-pulse text-gray-500">Caricamento collaboratore...</div>
      </div>
    );
  }

  if (!collaborator) {
    return (
      <div className="lg:px-8 px-4 mt-6 py-8 flex flex-col items-center justify-center">
        <div className="text-4xl text-gray-300 mb-2">
          <i className="ri-error-warning-line"></i>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Collaboratore non trovato</h3>
        <p className="text-gray-500 mb-4">Il collaboratore che stai cercando non esiste o è stato rimosso</p>
        <Link href="/collaborators">
          <Button variant="outline">
            <i className="ri-arrow-left-line mr-2"></i>
            Torna alla lista collaboratori
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-6 pb-16">
      <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/collaborators">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-full shrink-0">
                <i className="ri-arrow-left-line"></i>
              </Button>
            </Link>
            
            {collaborator.profileImage ? (
              <img
                src={collaborator.profileImage}
                alt={`${collaborator.firstName} ${collaborator.lastName}`}
                className="w-14 h-14 rounded-full object-cover border-2 border-background shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-medium border-2 border-background shadow-sm">
                {getInitials(collaborator.firstName, collaborator.lastName)}
              </div>
            )}
            
            <div>
              <h1 className="text-2xl font-bold mb-1">
                {collaborator.firstName} {collaborator.lastName}
              </h1>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                  {getRoleLabel(collaborator.role)}
                </Badge>
                <Badge 
                  variant={collaborator.status === "available" ? "default" : "secondary"}
                >
                  {getStatusLabel(collaborator.status)}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <a href={`mailto:${collaborator.email}`}>
                <i className="ri-mail-line mr-2"></i>
                Email
              </a>
            </Button>
            
            {collaborator.phone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${collaborator.phone}`}>
                  <i className="ri-phone-line mr-2"></i>
                  Chiama
                </a>
              </Button>
            )}
            
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <i className="ri-delete-bin-line mr-2"></i>
              Elimina
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sidebar con info e strumenti collaboratore */}
        <div>
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <i className="ri-user-settings-line text-primary"></i>
                  Profilo Collaboratore
                </CardTitle>
                <CardDescription>Informazioni di contatto e stato</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-center pb-3 border-b">
                    <div className="text-muted-foreground text-sm">Email</div>
                    <div className="text-sm font-medium">{collaborator.email}</div>
                  </div>
                  
                  {collaborator.phone && (
                    <div className="grid grid-cols-[1fr_auto] gap-2 items-center pb-3 border-b">
                      <div className="text-muted-foreground text-sm">Telefono</div>
                      <div className="text-sm font-medium">{collaborator.phone}</div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-center pb-3 border-b">
                    <div className="text-muted-foreground text-sm">Ruolo</div>
                    <div className="text-sm font-medium">{getRoleLabel(collaborator.role)}</div>
                  </div>
                  
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                    <div className="text-muted-foreground text-sm">Stato</div>
                    <Badge variant={collaborator.status === "available" ? "default" : "secondary"}>
                      {getStatusLabel(collaborator.status)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Sezione per generare il token dashboard */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <i className="ri-shield-keyhole-line text-primary"></i>
                  Dashboard Pubblica
                </CardTitle>
                <CardDescription>
                  Gestisci l'accesso alla dashboard pubblica
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <GeneraTokenDashboard collaboratoreId={collaboratorId} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Scheda principale con form e dashboard */}
        <div className="xl:col-span-2">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <i className="ri-edit-line text-primary"></i>
                  Modifica Dati Collaboratore
                </CardTitle>
                <CardDescription>Aggiorna le informazioni anagrafiche</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome" {...field} />
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
                              <Input placeholder="Cognome" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Email" {...field} />
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
                              <Input placeholder="Telefono" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ruolo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger aria-label="Seleziona ruolo">
                                  <SelectValue placeholder="Seleziona ruolo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {COLLABORATOR_ROLES.map((role) => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.label}
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
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stato</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger aria-label="Seleziona stato">
                                  <SelectValue placeholder="Seleziona lo stato" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {COLLABORATOR_STATUSES.map((status) => (
                                  <SelectItem key={status.id} value={status.id}>
                                    {status.label}
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
                        name="profileImage"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Immagine Profilo (URL)</FormLabel>
                            <FormControl>
                              <Input placeholder="URL immagine profilo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={updateCollaboratorMutation.isPending}
                      >
                        {updateCollaboratorMutation.isPending && (
                          <i className="ri-loader-4-line animate-spin mr-2"></i>
                        )}
                        Salva Modifiche
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          
          {/* Dashboard completa del collaboratore (include Eventi, Pagamenti, Montaggi) */}
          <Card className="mt-6">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <i className="ri-dashboard-line text-primary"></i>
                Dashboard Collaboratore
              </CardTitle>
              <CardDescription>Gestisci eventi, pagamenti e montaggi</CardDescription>
            </CardHeader>
            <CardContent>
              <CollaboratoreDashboard collaboratoreId={collaboratorId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}