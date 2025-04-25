import React, { useState, useEffect, ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useClientValidation } from '@/hooks/use-client-validation';
import { ExistingClientModal } from './existing-client-modal';

interface ClientValidationInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement> | string) => void;
  onClientFound?: (client: any) => void;
  debounceMs?: number;
  validateOn?: 'change' | 'blur';
}

export function ClientValidationInput({
  type = 'text',
  value,
  onChange,
  onClientFound,
  debounceMs = 500,
  validateOn = 'blur',
  ...props
}: ClientValidationInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [hasBlurred, setHasBlurred] = useState(false);
  
  const {
    checkExistingClient,
    foundClients,
    isModalOpen,
    setIsModalOpen,
    selectExistingClient,
    continueWithNewClient,
    isChecking
  } = useClientValidation();

  // Aggiorna lo stato locale quando value cambia dall'esterno
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Gestisci il cambio dell'input
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(e);
    
    // Se validateOn è 'change', verifica dopo il debounce
    if (validateOn === 'change' && newValue.trim() !== '') {
      debouncedValidate(newValue);
    }
  };

  // Gestisci il blur dell'input
  const handleBlur = async () => {
    setHasBlurred(true);
    
    // Verifica solo se è il primo blur e c'è un valore
    if (validateOn === 'blur' && inputValue.trim() !== '') {
      validateField();
    }
  };

  // Funzione di validazione
  const validateField = async () => {
    // Se è email, valida con email
    if (type === 'email' && inputValue) {
      const clientExists = await checkExistingClient(inputValue, undefined);
      return clientExists;
    }
    
    // Se è telefono, valida con telefono
    if (type === 'tel' && inputValue) {
      const clientExists = await checkExistingClient(undefined, inputValue);
      return clientExists;
    }
    
    return false;
  };

  // Implementazione di un debounce semplice
  const debouncedValidate = (() => {
    let timeoutId: NodeJS.Timeout;
    
    return (value: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (value.trim() !== '') {
          validateField();
        }
      }, debounceMs);
    };
  })();

  // Gestisci la selezione di un cliente esistente
  const handleSelectClient = (clientId: number) => {
    const selectedClient = selectExistingClient(clientId);
    
    if (selectedClient && onClientFound) {
      onClientFound(selectedClient);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          type={type}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={`w-full ${isChecking ? 'pr-10' : ''}`}
          {...props}
        />
        {isChecking && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
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
    </div>
  );
}