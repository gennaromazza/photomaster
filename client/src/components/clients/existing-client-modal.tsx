import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, User } from "lucide-react";

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  [key: string]: any;
}

interface ExistingClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onSelectClient: (clientId: number) => void;
  onCreateNewClient: () => void;
}

export function ExistingClientModal({
  isOpen,
  onClose,
  clients,
  onSelectClient,
  onCreateNewClient,
}: ExistingClientModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Clienti esistenti trovati</DialogTitle>
          <DialogDescription>
            Abbiamo trovato clienti con dati simili già registrati nel sistema.
            Vuoi utilizzare uno di questi clienti esistenti o crearne uno nuovo?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-[400px] overflow-y-auto">
          {clients.map((client) => (
            <Card key={client.id} className="mb-4 hover:bg-muted/30 cursor-pointer" onClick={() => onSelectClient(client.id)}>
              <CardContent className="p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center font-medium text-lg">
                    <User className="h-5 w-5 mr-2 text-primary" />
                    {client.firstName} {client.lastName}
                  </div>
                  {client.email && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2 text-primary/60" />
                      {client.email}
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2 text-primary/60" />
                      {client.phone}
                    </div>
                  )}
                  {client.address && (
                    <div className="text-sm text-muted-foreground">
                      Indirizzo: {client.address}
                      {client.city ? `, ${client.city}` : ""}
                      {client.province ? ` (${client.province})` : ""}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="secondary"
            onClick={onCreateNewClient}
            className="sm:order-1"
          >
            Crea nuovo cliente
          </Button>
          <Button variant="outline" onClick={onClose} className="sm:order-2">
            Annulla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}