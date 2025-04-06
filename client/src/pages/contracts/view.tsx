import { useState } from "react";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDate, getStatusBadge, getStatusText } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Contract, Client, Event } from "@shared/schema";

const ContractViewPage = () => {
  const [, params] = useRoute<{ id: string }>("/contracts/:id");
  const contractId = params ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  
  const { data: contract, isLoading, error } = useQuery<Contract>({
    queryKey: [`/api/contracts/${contractId}`],
    enabled: !!contractId,
  });
  
  const { data: client } = useQuery<Client>({
    queryKey: [`/api/clients/${contract?.clientId}`],
    enabled: !!contract,
  });
  
  const { data: event } = useQuery<Event>({
    queryKey: [`/api/events/${contract?.eventId}`],
    enabled: !!contract,
  });
  
  const signContractMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", `/api/contracts/${contractId}`, {
        signedByClient: true,
        status: "signed",
        signatureDate: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/${contractId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Contratto firmato",
        description: "Il contratto è stato firmato con successo.",
      });
      setShowSignatureModal(false);
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la firma del contratto.",
        variant: "destructive",
      });
    },
  });
  
  if (isLoading) {
    return (
      <div className="lg:px-8 px-4 mt-6 lg:mt-8 flex justify-center">
        <div className="animate-pulse text-gray-500">Caricamento contratto...</div>
      </div>
    );
  }
  
  if (error || !contract) {
    return (
      <div className="lg:px-8 px-4 mt-6 lg:mt-8">
        <div className="p-8 text-center">
          <h2 className="text-xl font-medium text-gray-900 mb-2">Contratto non trovato</h2>
          <p className="text-gray-500 mb-4">Il contratto richiesto non esiste o non è accessibile.</p>
          <Link href="/contracts">
            <Button variant="outline">Torna ai contratti</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="lg:px-8 px-4 mt-6 lg:mt-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-gray-900">{contract.title}</h1>
          <div className="mt-2 flex items-center">
            <Badge variant={getStatusBadge(contract.status)}>
              {getStatusText(contract.status)}
            </Badge>
            <span className="mx-2 text-gray-400">•</span>
            <span className="text-gray-500">
              Creato il {formatDate(contract.createdAt, "dd/MM/yyyy")}
            </span>
          </div>
        </div>
        <div className="mt-4 lg:mt-0 flex space-x-3">
          <Button
            variant="outline"
            className="inline-flex items-center"
            onClick={() => window.print()}
          >
            <i className="ri-printer-line mr-2"></i>
            Stampa
          </Button>
          
          {contract.status !== "signed" && (
            <Button
              className="inline-flex items-center"
              onClick={() => setShowSignatureModal(true)}
            >
              <i className="ri-pen-nib-line mr-2"></i>
              Firma Contratto
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Dettagli Contratto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div className="border p-6 rounded-md bg-gray-50">
                  <h2 className="text-center text-2xl font-display font-semibold mb-6">CONTRATTO DI SERVIZI FOTOGRAFICI</h2>
                  
                  <p className="mb-4">
                    <strong>Tra:</strong> Studio Arté, rappresentato da Marco Rossi
                  </p>
                  
                  <p className="mb-4">
                    <strong>E:</strong> {client?.firstName} {client?.lastName}
                  </p>
                  
                  <p className="mb-6">
                    <strong>Per l'evento:</strong> {event?.title} - {formatDate(event?.date || new Date())}
                  </p>
                  
                  <div className="mb-6">
                    {contract.content}
                  </div>
                  
                  <div className="mt-8 flex justify-between">
                    <div>
                      <p className="font-semibold">Studio Arté</p>
                      <div className="mt-1 h-12 w-32">
                        {contract.signedByAdmin && (
                          <div className="italic text-primary text-sm pt-2">Firmato digitalmente</div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <p className="font-semibold">Il Cliente</p>
                      <div className="mt-1 h-12 w-32">
                        {contract.signedByClient && (
                          <div className="italic text-primary text-sm pt-2">Firmato digitalmente</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {contract.signatureDate && (
                    <p className="mt-6 text-sm text-center text-gray-500">
                      Contratto firmato il {formatDate(contract.signatureDate, "dd/MM/yyyy")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Informazioni Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              {client ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <span className="font-medium">
                        {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className="ml-3">
                      <h3 className="font-medium text-gray-900">
                        {client.firstName} {client.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">{client.email}</p>
                    </div>
                  </div>
                  
                  {client.phone && (
                    <div className="flex items-center text-sm">
                      <i className="ri-phone-line text-gray-400 mr-2"></i>
                      <span>{client.phone}</span>
                    </div>
                  )}
                  
                  {client.address && (
                    <div className="flex items-start text-sm">
                      <i className="ri-map-pin-line text-gray-400 mr-2 mt-1"></i>
                      <span>{client.address}</span>
                    </div>
                  )}
                  
                  <Link href={`/clients/${client.id}`}>
                    <Button variant="outline" className="w-full mt-2">
                      Visualizza Profilo Cliente
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-gray-500">Informazioni cliente non disponibili</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Evento</CardTitle>
            </CardHeader>
            <CardContent>
              {event ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{event.title}</h3>
                    <p className="text-sm text-gray-500 capitalize">{event.eventType}</p>
                  </div>
                  
                  <div className="flex items-center text-sm">
                    <i className="ri-calendar-line text-gray-400 mr-2"></i>
                    <span>{formatDate(event.date)}</span>
                  </div>
                  
                  {event.location && (
                    <div className="flex items-start text-sm">
                      <i className="ri-map-pin-line text-gray-400 mr-2 mt-1"></i>
                      <span>{event.location}</span>
                    </div>
                  )}
                  
                  <Link href={`/events/${event.id}`}>
                    <Button variant="outline" className="w-full mt-2">
                      Visualizza Evento
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-gray-500">Informazioni evento non disponibili</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Firma Contratto</CardTitle>
              <CardDescription>
                Conferma la firma digitale del contratto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                Firmando questo contratto, accetti tutti i termini e le condizioni descritte nel documento.
              </p>
              <div className="border rounded-md p-4 bg-gray-50 text-center">
                <p className="text-sm text-gray-500 mb-2">Inserisci la tua firma qui sotto</p>
                <div className="h-24 border border-dashed border-gray-300 rounded-md flex items-center justify-center text-gray-400">
                  Firma Digitale
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setShowSignatureModal(false)}
              >
                Annulla
              </Button>
              <Button 
                onClick={() => signContractMutation.mutate()}
                disabled={signContractMutation.isPending}
              >
                {signContractMutation.isPending ? (
                  <span className="flex items-center">
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Elaborazione...
                  </span>
                ) : "Conferma Firma"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ContractViewPage;
