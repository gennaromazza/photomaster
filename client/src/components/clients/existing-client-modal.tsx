import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, User2, Check, ArrowRightCircle } from "lucide-react";

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
  if (!clients || clients.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Abbiamo trovato un cliente con informazioni simili</DialogTitle>
          <DialogDescription>
            Abbiamo trovato {clients.length === 1 ? "un cliente esistente" : `${clients.length} clienti esistenti`} 
            con questi dati. Se sei già nostro cliente, seleziona il tuo profilo. In caso contrario, clicca su "Continua come nuovo cliente".
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {clients.map((client) => (
            <div 
              key={client.id} 
              className="border rounded-lg p-4 shadow-sm hover:border-primary transition-colors cursor-pointer"
              onClick={() => onSelectClient(client.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-lg flex items-center">
                  <User2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  {client.firstName} {client.lastName}
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClient(client.id);
                  }}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Seleziona
                </Button>
              </div>
              
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <Mail className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                  <span className="text-primary truncate">{client.email}</span>
                </li>
                {client.phone && (
                  <li className="flex items-start">
                    <Phone className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                    <span>{client.phone}</span>
                  </li>
                )}
                {client.address && (
                  <li className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                    <span className="truncate">{client.address}</span>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={onContinue}
          >
            Continua come nuovo cliente
          </Button>
          <Button 
            onClick={onClose}
            variant="ghost"
          >
            Annulla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}