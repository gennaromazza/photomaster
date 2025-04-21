import { useState, useEffect } from "react";
import { 
  Settings, 
  Lock, 
  Globe, 
  Copy, 
  Calendar, 
  Building,
  QrCode, 
  Check,
  Image,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GalleryItem, Photo } from "@/types/gallery";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GallerySettingsProps {
  gallery: GalleryItem;
  events?: any[];
  onSaveComplete?: () => void;
  className?: string;
}

export function GallerySettings({
  gallery,
  events = [],
  onSaveComplete,
  className = "",
}: GallerySettingsProps) {
  const { toast } = useToast();
  const [isPublic, setIsPublic] = useState(gallery.isPublic);
  const [passwordProtected, setPasswordProtected] = useState(!!gallery.password);
  const [password, setPassword] = useState(gallery.password || "");
  const [eventId, setEventId] = useState<number | null>(gallery.eventId);
  const [galleryUrl, setGalleryUrl] = useState(`${window.location.origin}/public/galleries/${gallery.slug}`);
  const [isSaving, setIsSaving] = useState(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [selectionEnabled, setSelectionEnabled] = useState(gallery.selectionEnabled !== false);
  const [downloadEnabled, setDownloadEnabled] = useState(gallery.downloadEnabled !== false);
  const [selectedCoverImage, setSelectedCoverImage] = useState<string | null>(gallery.coverImage || null);
  
  // Carica le foto della galleria per la selezione della copertina
  const { data: photosData } = useQuery({
    queryKey: [`/api/gallery/galleries/${gallery.id}/photos`],
    queryFn: async () => {
      const response = await fetch(`/api/gallery/galleries/${gallery.id}/photos`);
      if (!response.ok) throw new Error("Errore nel caricamento delle foto");
      return response.json();
    },
    enabled: !!gallery.id
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(galleryUrl);
      toast({
        title: "Link copiato",
        description: "Il link alla galleria è stato copiato negli appunti",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile copiare il link",
        variant: "destructive",
      });
    }
  };

  const handleGenerateQrCode = () => {
    window.open(`/api/gallery/galleries/${gallery.id}/qr`, "_blank");
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);

    try {
      await apiRequest("PUT", `/api/gallery/galleries/${gallery.id}`, {
        isPublic,
        password: passwordProtected ? password : null,
        eventId,
        selectionEnabled,
        downloadEnabled,
        coverImage: selectedCoverImage,
      });

      queryClient.invalidateQueries({ 
        queryKey: [`/api/gallery/galleries/${gallery.id}`] 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['/api/gallery/galleries'] 
      });

      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni della galleria sono state aggiornate",
      });

      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio delle impostazioni",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      await apiRequest("PUT", `/api/gallery/galleries/${gallery.id}/reset-password`, {});
      
      setPasswordProtected(false);
      setPassword("");
      
      queryClient.invalidateQueries({ 
        queryKey: [`/api/gallery/galleries/${gallery.id}`] 
      });
      
      toast({
        title: "Password rimossa",
        description: "La protezione con password è stata rimossa dalla galleria",
      });
      
      setResetPasswordDialog(false);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la rimozione della password",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Impostazioni Galleria
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informazioni Galleria</h3>
            
            <div className="rounded-md border p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Nome:</div>
                  <div>{gallery.name}</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="font-medium">Creata il:</div>
                  <div>{format(new Date(gallery.createdAt), "dd MMMM yyyy", { locale: it })}</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="font-medium">Ultima modifica:</div>
                  <div>{format(new Date(gallery.updatedAt), "dd MMMM yyyy", { locale: it })}</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="font-medium">Visualizzazioni:</div>
                  <div>{gallery.viewCount}</div>
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Visibilità e Accesso</h3>
            
            <div className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-3">
              <div className="space-y-0.5">
                <div className="flex items-center">
                  <Globe className="h-4 w-4 mr-2" />
                  <Label className="text-base">Galleria Pubblica</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  La galleria sarà visibile a chiunque abbia il link
                </p>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
            
            <div className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-3">
              <div className="space-y-0.5">
                <div className="flex items-center">
                  <Lock className="h-4 w-4 mr-2" />
                  <Label className="text-base">Protezione con Password</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Richiedi una password per accedere alla galleria
                </p>
              </div>
              <Switch
                checked={passwordProtected}
                onCheckedChange={setPasswordProtected}
              />
            </div>
            
            {passwordProtected && (
              <div className="border rounded-lg p-3">
                <Label htmlFor="galleryPassword">Password Galleria</Label>
                <div className="flex mt-1">
                  <Input
                    id="galleryPassword"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Inserisci una password"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    className="ml-2"
                    onClick={() => setResetPasswordDialog(true)}
                  >
                    Reset
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {gallery.password
                    ? "Questa galleria è attualmente protetta da password. Puoi modificarla o rimuoverla."
                    : "Imposta una password per proteggere la galleria."}
                </p>
              </div>
            )}
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Collegamenti</h3>
            
            <div className="space-y-2">
              <Label htmlFor="eventSelect">Evento Collegato</Label>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <Select
                  value={eventId?.toString() || "null"}
                  onValueChange={(value) => setEventId(value && value !== "null" ? parseInt(value) : null)}
                >
                  <SelectTrigger id="eventSelect" className="flex-1">
                    <SelectValue placeholder="Seleziona un evento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Nessun evento</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id.toString()}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Collega questa galleria a un evento esistente
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Immagine di Copertina</h3>
            
            <div className="space-y-2">
              <Label htmlFor="coverImageSelect">Immagine di Copertina</Label>
              <div className="flex items-center">
                <Image className="h-4 w-4 mr-2 text-muted-foreground" />
                <Select
                  value={selectedCoverImage || "null"}
                  onValueChange={(value) => setSelectedCoverImage(value === "null" ? null : value)}
                >
                  <SelectTrigger id="coverImageSelect" className="flex-1">
                    <SelectValue placeholder="Seleziona un'immagine di copertina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Nessuna immagine</SelectItem>
                    {photosData?.photos?.map((photo: Photo) => (
                      <SelectItem key={photo.id} value={photo.filename || `photo-${photo.id}`}>
                        {photo.title || `Foto ${photo.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                L'immagine di copertina verrà mostrata in alto nella galleria pubblica e come anteprima nella dashboard
              </p>
              
              {selectedCoverImage && (
                <div className="mt-4 border rounded-lg overflow-hidden">
                  <img 
                    src={`/uploads/galleries/${selectedCoverImage}`}
                    alt="Anteprima immagine di copertina"
                    className="w-full h-auto"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/assets/image-placeholder.svg";
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Interazione</h3>
            
            <div className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-3">
              <div className="space-y-0.5">
                <div className="flex items-center">
                  <Check className="h-4 w-4 mr-2" />
                  <Label className="text-base">Selezione Foto</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Consenti ai clienti di selezionare le loro foto preferite
                </p>
              </div>
              <Switch
                checked={selectionEnabled}
                onCheckedChange={setSelectionEnabled}
              />
            </div>
            
            <div className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-3">
              <div className="space-y-0.5">
                <div className="flex items-center">
                  <Download className="h-4 w-4 mr-2" />
                  <Label className="text-base">Download Foto</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Consenti ai visitatori di scaricare le foto della galleria
                </p>
              </div>
              <Switch
                checked={downloadEnabled}
                onCheckedChange={setDownloadEnabled}
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Condivisione</h3>
            
            <div className="space-y-2">
              <Label htmlFor="galleryUrl">Link alla Galleria</Label>
              <div className="flex items-center">
                <Input
                  id="galleryUrl"
                  value={galleryUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  className="ml-2"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Condividi questo link con i tuoi clienti per accedere alla galleria
              </p>
            </div>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGenerateQrCode}
            >
              <QrCode className="h-4 w-4 mr-2" />
              Genera Codice QR
            </Button>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end space-x-2">
          <Button
            variant="default"
            onClick={handleSaveSettings}
            disabled={isSaving}
          >
            {isSaving ? (
              <>Salvataggio in corso...</>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Salva Impostazioni
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      <AlertDialog open={resetPasswordDialog} onOpenChange={setResetPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovi protezione password</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler rimuovere la password da questa galleria?
              Dopo questa operazione, chiunque abbia il link potrà accedere alla galleria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialog(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleResetPassword}>
              Rimuovi Password
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}