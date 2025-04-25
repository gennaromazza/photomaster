import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ExistingClientModal } from "./existing-client-modal";
import { useClientValidation } from "@/hooks/use-client-validation";
import { Loader2 } from "lucide-react";

interface ClientValidationInputProps {
  type: "email" | "tel";
  value: string;
  onChange: (value: string) => void;
  onClientFound?: (client: any) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  skipValidation?: boolean;
  validateDelay?: number;
}

export function ClientValidationInput({
  type,
  value,
  onChange,
  onClientFound,
  placeholder,
  className,
  disabled,
  required,
  skipValidation = false,
  validateDelay = 1000, // Ritardo di validazione in ms
}: ClientValidationInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [hasBlurred, setHasBlurred] = useState(false);
  const {
    checkExistingClient,
    foundClients,
    isModalOpen,
    setIsModalOpen,
    selectExistingClient,
    continueWithNewClient,
    isChecking,
  } = useClientValidation();

  // Gestione del cambio valore locale
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  // Quando l'utente seleziona un cliente esistente
  const handleSelectClient = (clientId: number) => {
    const selectedClient = selectExistingClient(clientId);
    if (selectedClient && onClientFound) {
      onClientFound(selectedClient);
      
      // Aggiorna il valore del campo con il valore dal cliente selezionato
      const fieldValue = type === "email" ? selectedClient.email : selectedClient.phone;
      setLocalValue(fieldValue);
      onChange(fieldValue);
    }
  };

  // Verifica clienti esistenti quando l'utente esce dal campo
  const handleBlur = async () => {
    setHasBlurred(true);
    
    if (skipValidation || !localValue || localValue.length < 3) {
      return;
    }
    
    const params = type === "email" 
      ? { email: localValue } 
      : { phone: localValue };
      
    await checkExistingClient(params.email, params.phone);
  };

  // Gestire la chiusura del modale
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="relative">
      <Input
        type={type}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        disabled={disabled || isChecking}
        required={required}
      />
      {isChecking && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-primary/70" />
        </div>
      )}
      <ExistingClientModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        clients={foundClients}
        onSelectClient={handleSelectClient}
        onCreateNewClient={continueWithNewClient}
      />
    </div>
  );
}