import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { User, Phone, MapPin, Mail, Building2 } from 'lucide-react';

interface ExistingClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    [key: string]: any;
  }>;
  onSelectClient: (clientId: number) => void;
  onContinue: () => void;
}

export function ExistingClientModal({
  isOpen,
  onClose,
  clients,
  onSelectClient,
  onContinue,
}: ExistingClientModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>Cliente esistente trovato</DialogTitle>
          <DialogDescription>
            Abbiamo trovato un cliente già registrato con queste informazioni. Si tratta di te o qualcun altro?
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {clients.length > 0 ? (
            <div className="space-y-4">
              {clients.map((client) => (
                <Card key={client.id} className="overflow-hidden border border-gray-200 hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {client.firstName} {client.lastName}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-primary" />
                        <span>{client.email}</span>
                      </div>
                      
                      {client.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-primary" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      
                      {client.address && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>{client.address}</span>
                        </div>
                      )}
                      
                      {client.company && (
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span>{client.company}</span>
                        </div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        className="mt-2 w-full"
                        onClick={() => onSelectClient(client.id)}
                      >
                        Seleziona questo cliente
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Nessun cliente trovato</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onContinue}
          >
            Continua come nuovo cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}