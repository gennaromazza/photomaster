import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Phone, Mail, User, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useClientValidation } from "@/hooks/use-client-validation";

interface ClientSearchProps {
  onSelectClient: (client: any) => void;
  placeholder?: string;
  className?: string;
}

export function ClientSearch({
  onSelectClient,
  placeholder = "Cerca cliente per nome, email o telefono...",
  className,
}: ClientSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  
  // Gestisce il debounce della ricerca per non effettuare troppe chiamate API
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Usa il hook di validazione per la ricerca
  const { searchClients } = useClientValidation();
  const {
    data,
    isLoading,
    isError,
    error
  } = searchClients({
    query: debouncedSearchTerm,
    page: currentPage,
    limit: 5
  });

  // Gestisce il cambio pagina
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && (!data || newPage <= data.pagination.totalPages)) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className={className}>
      <div className="relative mb-4">
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isError && (
        <p className="text-destructive text-sm mb-4">
          Si è verificato un errore: {error?.message || "Errore sconosciuto"}
        </p>
      )}

      <div className="space-y-2 min-h-[200px]">
        {data?.clients && data.clients.length > 0 ? (
          data.clients.map((client) => (
            <Card 
              key={client.id} 
              className="hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => onSelectClient(client)}
            >
              <CardContent className="p-3">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center font-medium">
                    <User className="h-4 w-4 mr-2 text-primary" />
                    {client.firstName} {client.lastName}
                  </div>
                  {client.email && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 mr-2 text-primary/60" />
                      {client.email}
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 mr-2 text-primary/60" />
                      {client.phone}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : debouncedSearchTerm.length > 2 && !isLoading ? (
          <p className="text-center text-muted-foreground py-4">
            Nessun cliente trovato con "{debouncedSearchTerm}"
          </p>
        ) : debouncedSearchTerm.length > 0 && debouncedSearchTerm.length <= 2 ? (
          <p className="text-center text-muted-foreground py-4">
            Inserisci almeno 3 caratteri per iniziare la ricerca
          </p>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            Inizia a digitare per cercare un cliente
          </p>
        )}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Precedente
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {currentPage} di {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= data.pagination.totalPages || isLoading}
          >
            Successiva
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}