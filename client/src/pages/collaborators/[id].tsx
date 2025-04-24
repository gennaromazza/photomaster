import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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

const formSchema = insertCollaboratorSchema.extend({});

export default function CollaboratorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const collaboratorId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");

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
  useState(() => {
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
  });

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
    <div className="lg:px-8 px-4 mt-6 lg:mt-8 pb-16">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div className="flex items-center">
          <Link href="/collaborators">
            <Button variant="ghost" size="icon" className="mr-2 h-8 w-8">
              <i className="ri-arrow-left-line"></i>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-semibold text-gray-900">
              {collaborator.firstName} {collaborator.lastName}
            </h1>
            <div className="flex items-center mt-1 text-gray-500">
              <Badge 
                variant={collaborator.status === "available" ? "green" : "red"}
                className="mr-2"
              >
                {collaborator.status === "available" ? "Disponibile" : "Occupato"}
              </Badge>
              <span>{collaborator.role}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 lg:mt-0 flex space-x-3">
          <Button variant="outline" onClick={handleDelete} className="text-red-600 border-red-200 hover:bg-red-50">
            <i className="ri-delete-bin-line mr-2"></i>
            Elimina
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonna sinistra con info collaboratore */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Collaboratore</CardTitle>
              <CardDescription>Dettagli e contatti del collaboratore</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center mb-6">
                {collaborator.profileImage ? (
                  <img
                    src={collaborator.profileImage}
                    alt={`${collaborator.firstName} ${collaborator.lastName}`}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="text-2xl font-medium">
                      {getInitials(collaborator.firstName, collaborator.lastName)}
                    </span>
                  </div>
                )}
                <h3 className="mt-4 font-medium text-lg">
                  {collaborator.firstName} {collaborator.lastName}
                </h3>
                <p className="text-gray-500">{collaborator.role}</p>
              </div>

              <div className="space-y-4">
                {collaborator.email && (
                  <div>
                    <Label className="text-xs text-gray-500">Email</Label>
                    <div className="flex items-center mt-1">
                      <i className="ri-mail-line mr-2 text-gray-400"></i>
                      <a href={`mailto:${collaborator.email}`} className="text-primary hover:underline">
                        {collaborator.email}
                      </a>
                    </div>
                  </div>
                )}

                {collaborator.phone && (
                  <div>
                    <Label className="text-xs text-gray-500">Telefono</Label>
                    <div className="flex items-center mt-1">
                      <i className="ri-phone-line mr-2 text-gray-400"></i>
                      <a href={`tel:${collaborator.phone}`} className="text-primary hover:underline">
                        {collaborator.phone}
                      </a>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-gray-500">Stato</Label>
                  <div className="flex items-center mt-1">
                    <i className={`ri-checkbox-circle-line mr-2 ${
                      collaborator.status === "available" ? "text-green-500" : "text-red-500"
                    }`}></i>
                    <span>
                      {collaborator.status === "available" ? "Disponibile" : "Occupato"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonna destra con tab e form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="px-6 pb-0">
              <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="details">Dettagli</TabsTrigger>
                  <TabsTrigger value="events">Eventi</TabsTrigger>
                  <TabsTrigger value="payments">Pagamenti</TabsTrigger>
                  <TabsTrigger value="montages">Montaggi</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="m-0 mt-6">
                  <CardContent className="p-0">
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
                                <FormControl>
                                  <Input placeholder="Es: Fotografo, Assistente, Videografo" {...field} />
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
                                      <SelectValue placeholder="Seleziona lo stato" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="available">Disponibile</SelectItem>
                                    <SelectItem value="busy">Occupato</SelectItem>
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
                </TabsContent>

                <TabsContent value="events" className="m-0">
                  <CardContent className="p-6">
                    <CollaboratoreDashboard collaboratoreId={collaboratorId} />
                  </CardContent>
                </TabsContent>
                
                <TabsContent value="payments" className="m-0">
                  <CardContent className="p-6">
                    <PagamentoCollaboratoreList collaboratoreId={collaboratorId} />
                  </CardContent>
                </TabsContent>
                
                <TabsContent value="montages" className="m-0">
                  <CardContent className="p-6">
                    <MontaggioCollaboratoreList collaboratoreId={collaboratorId} />
                  </CardContent>
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}