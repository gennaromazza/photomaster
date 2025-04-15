import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Mail, MapPin, Phone, User } from "lucide-react";

interface ClientInfoProps {
  client: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  };
  minimal?: boolean;
}

export default function ClientInfo({ client, minimal = false }: ClientInfoProps) {
  const [, navigate] = useLocation();

  const handleViewDetails = () => {
    navigate(`/clients/${client.id}`);
  };

  if (minimal) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">{client.firstName} {client.lastName}</h3>
            {client.email && (
              <p className="text-sm text-gray-500 truncate">{client.email}</p>
            )}
          </div>
        </div>
        
        {client.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-3.5 w-3.5 text-gray-500" />
            <span>{client.phone}</span>
          </div>
        )}
        
        {client.address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-3.5 w-3.5 text-gray-500 mt-0.5" />
            <span className="text-gray-700">{client.address}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{client.firstName} {client.lastName}</h2>
          {client.email && (
            <div className="flex items-center gap-1.5 text-gray-600 mt-1">
              <Mail className="h-4 w-4" />
              <a href={`mailto:${client.email}`} className="hover:underline">
                {client.email}
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="font-medium text-sm uppercase text-gray-500">Informazioni di contatto</h3>
        
        {client.phone && (
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-sm text-gray-500">Telefono</div>
              <div className="font-medium">
                <a href={`tel:${client.phone}`} className="hover:underline">
                  {client.phone}
                </a>
              </div>
            </div>
          </div>
        )}
        
        {client.address && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-gray-500 mt-1" />
            <div>
              <div className="text-sm text-gray-500">Indirizzo</div>
              <div className="font-medium">{client.address}</div>
            </div>
          </div>
        )}
      </div>

      {client.notes && (
        <div>
          <h3 className="font-medium text-sm uppercase text-gray-500 mb-2">Note</h3>
          <div className="rounded-lg border bg-card p-4">
            <div className="whitespace-pre-line text-gray-700">{client.notes}</div>
          </div>
        </div>
      )}

      <div className="flex justify-start">
        <Button onClick={handleViewDetails}>
          Visualizza dettagli completi
        </Button>
      </div>
    </div>
  );
}