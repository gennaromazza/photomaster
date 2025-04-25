import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useClientValidation } from '@/hooks/use-client-validation';
import { ExistingClientModal } from '@/components/clients/existing-client-modal';

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
  className = "",
  disabled = false,
  required = false,
  skipValidation = false,
  validateDelay = 800,
}: ClientValidationInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const timerRef = useRef<NodeJS.Timeout>();
  
  const {
    checkExistingClient,
    foundClients,
    isModalOpen,
    setIsModalOpen,
    selectExistingClient,
    continueWithNewClient,
    isChecking,
  } = useClientValidation();

  // Aggiorna lo stato locale quando il valore della prop cambia
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    // Pulizia del timer quando il componente viene smontato
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);

    // Annulla il timer precedente
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Imposta un nuovo timer per fare il controllo dopo il delay
    if (!skipValidation && newValue.trim() !== '') {
      timerRef.current = setTimeout(async () => {
        if (type === 'email') {
          // Verifica se è una email valida prima di fare la chiamata API
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (emailRegex.test(newValue)) {
            await checkExistingClient(newValue, undefined);
          }
        } else if (type === 'tel') {
          // Verifica che ci siano almeno 6 numeri nel telefono
          const phoneRegex = /.*\d{6}.*/;
          if (phoneRegex.test(newValue)) {
            await checkExistingClient(undefined, newValue);
          }
        }
      }, validateDelay);
    }
  };

  const handleSelectClient = (clientId: number) => {
    const selectedClient = selectExistingClient(clientId);
    if (selectedClient && onClientFound) {
      onClientFound(selectedClient);
    }
  };

  return (
    <>
      <div className="relative">
        <Input
          type={type === 'email' ? 'email' : 'tel'}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`${className} ${isChecking ? 'pr-10' : ''}`}
          disabled={disabled}
          required={required}
        />
        {isChecking && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="animate-spin h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      <ExistingClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clients={foundClients}
        onSelectClient={handleSelectClient}
        onContinue={continueWithNewClient}
      />
    </>
  );
}