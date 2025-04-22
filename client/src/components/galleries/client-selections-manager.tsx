import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  HeartIcon,
  Star,
  ThumbsUp,
  Download,
  BookOpen,
  Search,
  Users,
  Mail,
  Trash2,
  FileText,
  CheckSquare,
  Image as ImageIcon
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import EmptyState from "@/components/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";

type SelectionType = "favorite" | "must_have" | "like";

interface PhotoSelection {
  id: number;
  galleryId: number;
  photoId: number;
  clientId?: number;
  clientEmail?: string;
  clientName?: string;
  selectionType: SelectionType;
  notes?: string;
  createdAt: string;
  photo?: {
    id: number;
    filename: string;
    thumbnailPath: string;
    title?: string;
  };
}

interface SelectionGroup {
  clientName: string;
  clientEmail: string;
  clientId?: number;
  createdAt: string;
  selectionCount: number;
  selections: PhotoSelection[];
}

interface ClientSelectionsManagerProps {
  galleryId: number;
}

export function ClientSelectionsManager({ galleryId }: ClientSelectionsManagerProps) {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("byClient");
  
  // Carica tutte le selezioni per questa galleria
  const { data: selectionsData, isLoading, refetch } = useQuery({
    queryKey: [`/api/gallery/galleries/${galleryId}/selections/all`],
    queryFn: async () => {
      const response = await fetch(`/api/gallery/galleries/${galleryId}/selections/all`, {
        credentials: 'include' // Aggiungi le credenziali (cookie) alla richiesta
      });
      if (!response.ok) throw new Error("Errore nel recupero delle selezioni");
      return response.json();
    },
    enabled: !!galleryId
  });
  
  // Raggruppa le selezioni per cliente
  const groupedSelections: SelectionGroup[] = [];
  
  if (selectionsData?.selections) {
    const selectionsByClient: Record<string, PhotoSelection[]> = {};
    
    selectionsData.selections.forEach((selection: PhotoSelection) => {
      const clientKey = selection.clientEmail || 'anonymous';
      if (!selectionsByClient[clientKey]) {
        selectionsByClient[clientKey] = [];
      }
      selectionsByClient[clientKey].push(selection);
    });
    
    Object.entries(selectionsByClient).forEach(([clientKey, selections]) => {
      const firstSelection = selections[0];
      groupedSelections.push({
        clientName: firstSelection.clientName || 'Visitatore anonimo',
        clientEmail: firstSelection.clientEmail || '',
        clientId: firstSelection.clientId,
        createdAt: firstSelection.createdAt,
        selectionCount: selections.length,
        selections
      });
    });
    
    // Ordina per data più recente
    groupedSelections.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  
  // Filtra i clienti in base alla ricerca
  const filteredGroups = searchQuery 
    ? groupedSelections.filter(group => 
        group.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.clientEmail.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : groupedSelections;
  
  // Ottieni le selezioni del cliente selezionato
  const selectedClientSelections = selectedClient 
    ? groupedSelections.find(g => g.clientEmail === selectedClient)?.selections || []
    : [];
  
  // Contatori per i diversi tipi di selezione
  const selectionCounts = selectionsData?.selections?.reduce(
    (acc: Record<string, number>, curr: PhotoSelection) => {
      acc[curr.selectionType] = (acc[curr.selectionType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};
  
  const totalSelections = selectionsData?.selections?.length || 0;
  
  // Genera un report CSV delle selezioni
  const handleGenerateReport = async () => {
    try {
      // Utilizziamo fetch con credenziali per ottenere l'URL con l'autenticazione corretta
      const response = await fetch(`/api/gallery/galleries/${galleryId}/selections/report`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }
      
      // Crea un blob dall'oggetto response e crea un URL per il download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Crea un elemento <a> per avviare il download
      const a = document.createElement('a');
      a.href = url;
      a.download = `selezioni-galleria-${galleryId}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Pulisce l'elemento e l'URL
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Report generato",
        description: "Il report delle selezioni è stato scaricato.",
      });
    } catch (error) {
      console.error("Errore durante la generazione del report:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la generazione del report.",
        variant: "destructive",
      });
    }
  };
  
  // Elimina tutte le selezioni di un cliente
  const handleDeleteClientSelections = async (clientEmail: string) => {
    if (!clientEmail) return;
    
    try {
      // Utilizziamo fetch direttamente con credentials per assicurarci che i cookie vengano inviati
      const response = await fetch(
        `/api/gallery/galleries/${galleryId}/selections/client/${encodeURIComponent(clientEmail)}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );
      
      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }
      
      refetch();
      
      // Se è il cliente selezionato, deselezionalo
      if (selectedClient === clientEmail) {
        setSelectedClient(null);
      }
      
      toast({
        title: "Selezioni eliminate",
        description: "Le selezioni del cliente sono state eliminate con successo.",
      });
    } catch (error) {
      console.error("Errore durante l'eliminazione delle selezioni:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione delle selezioni.",
        variant: "destructive",
      });
    }
  };
  
  // Funzione per ottenere l'icona del tipo di selezione
  const getSelectionTypeIcon = (type: SelectionType) => {
    switch (type) {
      case "favorite":
        return <HeartIcon className="h-4 w-4 text-rose-500" />;
      case "must_have":
        return <Star className="h-4 w-4 text-amber-500" />;
      case "like":
        return <ThumbsUp className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckSquare className="h-4 w-4" />;
    }
  };
  
  // Funzione per ottenere il nome del tipo di selezione
  const getSelectionTypeName = (type: SelectionType) => {
    switch (type) {
      case "favorite":
        return "Preferita";
      case "must_have":
        return "Imperdibile";
      case "like":
        return "Mi piace";
      default:
        return "Selezione";
    }
  };
  
  // Funzione per ottenere il colore del badge del tipo di selezione
  const getSelectionTypeVariant = (type: SelectionType): "default" | "secondary" | "destructive" => {
    switch (type) {
      case "favorite":
        return "destructive";
      case "must_have":
        return "default";
      case "like":
        return "secondary";
      default:
        return "default";
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center text-xl">
              <Users className="h-5 w-5 mr-2" />
              Selezioni dei visitatori
            </CardTitle>
            <CardDescription>
              Visualizza e gestisci le foto selezionate dai visitatori della galleria
            </CardDescription>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateReport}
              disabled={!totalSelections}
            >
              <FileText className="h-4 w-4 mr-2" />
              Esporta report
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">Caricamento delle selezioni...</p>
            </div>
          </div>
        ) : !totalSelections ? (
          <EmptyState 
            icon={<HeartIcon className="h-10 w-10" />}
            title="Nessuna selezione" 
            description="I visitatori non hanno ancora effettuato selezioni per questa galleria."
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">Visitatori</span>
                    </div>
                    <Badge>{groupedSelections.length}</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HeartIcon className="h-5 w-5 text-rose-500" />
                      <span className="text-sm font-medium">Preferite</span>
                    </div>
                    <Badge variant="destructive">{selectionCounts.favorite || 0}</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-amber-500" />
                      <span className="text-sm font-medium">Imperdibili</span>
                    </div>
                    <Badge>{selectionCounts.must_have || 0}</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium">Mi piace</span>
                    </div>
                    <Badge variant="secondary">{selectionCounts.like || 0}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="byClient">
                  <Users className="h-4 w-4 mr-2" />
                  Visitatori
                </TabsTrigger>
                <TabsTrigger value="photos" disabled={!selectedClient}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Foto selezionate
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="byClient" className="mt-0">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cerca per nome o email..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="hidden md:table-cell">Data</TableHead>
                        <TableHead className="text-center">Foto</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGroups.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            Nessun risultato trovato
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredGroups.map((group) => (
                          <TableRow 
                            key={group.clientEmail || 'anonymous'} 
                            className={selectedClient === group.clientEmail ? "bg-muted/50" : ""}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {group.clientName?.substring(0, 2) || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="font-medium">{group.clientName}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{group.clientEmail || '-'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {format(new Date(group.createdAt), "d MMM yyyy", { locale: it })}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{group.selectionCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSelectedClient(group.clientEmail)}
                                >
                                  <BookOpen className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Conferma eliminazione</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleDeleteClientSelections(group.clientEmail)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Elimina selezioni
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              <TabsContent value="photos" className="mt-0">
                {!selectedClient ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Seleziona un visitatore per visualizzare le sue foto selezionate
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">
                          Selezioni di {groupedSelections.find(g => g.clientEmail === selectedClient)?.clientName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedClientSelections.length} foto selezionate
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedClient(null)}
                      >
                        Torna alla lista
                      </Button>
                    </div>
                    
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead style={{ width: "60px" }}>Foto</TableHead>
                            <TableHead>Nome file</TableHead>
                            <TableHead className="hidden md:table-cell">Tipo</TableHead>
                            <TableHead className="hidden md:table-cell">Data</TableHead>
                            <TableHead className="text-right">Azioni</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedClientSelections.map((selection) => (
                            <TableRow key={selection.id}>
                              <TableCell>
                                <div className="h-10 w-10 rounded-md overflow-hidden">
                                  {selection.photo?.thumbnailPath ? (
                                    <img 
                                      src={selection.photo.thumbnailPath} 
                                      alt="Thumbnail" 
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full bg-muted flex items-center justify-center">
                                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {selection.photo?.title || selection.photo?.filename || `Foto #${selection.photoId}`}
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge variant={getSelectionTypeVariant(selection.selectionType)}>
                                  <div className="flex items-center gap-1">
                                    {getSelectionTypeIcon(selection.selectionType)}
                                    <span>{getSelectionTypeName(selection.selectionType)}</span>
                                  </div>
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {format(new Date(selection.createdAt), "d MMM yyyy", { locale: it })}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(`/api/gallery/photos/${selection.photoId}/download`, "_blank")}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {selectedClientSelections.some(s => s.notes) && (
                      <div className="mt-4 p-4 border rounded-md">
                        <h4 className="font-medium mb-2">Note</h4>
                        {selectedClientSelections
                          .filter(s => s.notes)
                          .map(s => (
                            <div key={s.id} className="mb-2 last:mb-0">
                              <div className="flex items-center gap-2 mb-1">
                                {getSelectionTypeIcon(s.selectionType)}
                                <span className="text-sm font-medium">
                                  {getSelectionTypeName(s.selectionType)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(s.createdAt), "d MMM yyyy HH:mm", { locale: it })}
                                </span>
                              </div>
                              <div className="text-sm pl-6">
                                {s.notes}
                              </div>
                              <Separator className="my-2" />
                            </div>
                          ))}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}