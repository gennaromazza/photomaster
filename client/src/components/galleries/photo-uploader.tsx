import { useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, Image, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PhotoUploaderProps {
  galleryId: number;
  chapterId?: number | null;
  onUploadComplete?: (newPhotos: any[]) => void;
  maxFiles?: number;
  acceptedFileTypes?: string[];
  className?: string;
}

interface UploadingFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  error?: string;
  uploading: boolean;
  uploaded: boolean;
}

export function PhotoUploader({
  galleryId,
  chapterId = null,
  onUploadComplete,
  maxFiles = 20,
  acceptedFileTypes = ["image/jpeg", "image/png", "image/webp"],
  className = "",
}: PhotoUploaderProps) {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const uploadPromisesRef = useRef<Record<string, { controller: AbortController, promise: Promise<any> }>>({});

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles,
    maxSize: 20 * 1024 * 1024, // 20MB
    noClick: files.length > 0,
    onDrop: (acceptedFiles) => {
      // Limitare il numero totale di file
      const remainingSlots = maxFiles - files.length;
      const filesToAdd = acceptedFiles.slice(0, remainingSlots);
      
      if (filesToAdd.length < acceptedFiles.length) {
        toast({
          title: "Troppi file",
          description: `Puoi caricare un massimo di ${maxFiles} file alla volta.`,
          variant: "destructive",
        });
      }
      
      // Aggiungere i nuovi file alla lista
      const newFiles = filesToAdd.map(file => ({
        id: Math.random().toString(36).substring(2, 11),
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        uploading: false,
        uploaded: false
      }));
      
      setFiles(prev => [...prev, ...newFiles]);
    },
    onDropRejected: (rejectedFiles) => {
      // Gestire i file rifiutati (troppo grandi o di tipo non supportato)
      const errors = rejectedFiles.map(({ file, errors }) => {
        return `${file.name}: ${errors.map(e => e.message).join(", ")}`;
      });
      
      toast({
        title: "File non accettati",
        description: errors.join("\n"),
        variant: "destructive",
      });
    }
  });

  const removeFile = (id: string) => {
    // Se il file è in fase di caricamento, annulla la richiesta
    if (uploadPromisesRef.current[id]) {
      uploadPromisesRef.current[id].controller.abort();
      delete uploadPromisesRef.current[id];
    }
    
    // Rilascia l'URL dell'anteprima
    const file = files.find(f => f.id === id);
    if (file) {
      URL.revokeObjectURL(file.preview);
    }
    
    setFiles(files.filter(file => file.id !== id));
  };

  const uploadFile = async (file: UploadingFile) => {
    // Aggiorna lo stato del file
    setFiles(prevFiles => 
      prevFiles.map(f => 
        f.id === file.id ? { ...f, uploading: true, progress: 0 } : f
      )
    );
    
    const formData = new FormData();
    formData.append("photo", file.file);
    formData.append("galleryId", galleryId.toString());
    if (chapterId) formData.append("chapterId", chapterId.toString());
    
    // Crea un controller per poter annullare la richiesta
    const controller = new AbortController();
    const { signal } = controller;
    
    try {
      // Simula l'upload con progress tracking
      const uploadPromise = new Promise<any>(async (resolve, reject) => {
        try {
          // Simula l'avanzamento durante l'upload
          const progressInterval = setInterval(() => {
            setFiles(prevFiles => 
              prevFiles.map(f => {
                if (f.id === file.id && f.progress < 90) {
                  return { ...f, progress: f.progress + 5 };
                }
                return f;
              })
            );
          }, 300);
          
          // Invia la richiesta effettiva
          const response = await apiRequest("POST", "/api/gallery/photos", formData, { signal });
          
          // Ferma la simulazione dell'avanzamento
          clearInterval(progressInterval);
          
          // Completa al 100%
          setFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === file.id ? { ...f, uploading: false, uploaded: true, progress: 100 } : f
            )
          );
          
          const data = await response.json();
          resolve(data);
        } catch (error: any) {
          if (error.name === 'AbortError') {
            reject(new Error('Upload annullato'));
          } else {
            setFiles(prevFiles => 
              prevFiles.map(f => 
                f.id === file.id ? { ...f, uploading: false, error: "Errore durante l'upload" } : f
              )
            );
            reject(error);
          }
        }
      });
      
      // Salva il promise e il controller per poter annullare l'upload in seguito
      uploadPromisesRef.current[file.id] = { promise: uploadPromise, controller };
      
      // Attendi il completamento dell'upload
      const result = await uploadPromise;
      return result;
    } catch (error: any) {
      console.error(`Errore nell'upload di ${file.file.name}:`, error);
      return null;
    } finally {
      // Rimuovi il promise dalla lista
      delete uploadPromisesRef.current[file.id];
    }
  };

  const uploadAllFiles = async () => {
    if (files.length === 0 || isUploading) return;
    
    setIsUploading(true);
    
    const filesToUpload = files.filter(f => !f.uploaded && !f.uploading);
    const results = [];
    
    toast({
      title: "Caricamento in corso",
      description: `Caricamento di ${filesToUpload.length} file...`,
    });
    
    for (const file of filesToUpload) {
      try {
        const result = await uploadFile(file);
        if (result) results.push(result);
      } catch (error) {
        console.error(`Errore nell'upload di ${file.file.name}:`, error);
      }
    }
    
    setIsUploading(false);
    
    if (results.length > 0) {
      toast({
        title: "Caricamento completato",
        description: `${results.length} file caricati con successo.`,
      });
      
      if (onUploadComplete) {
        onUploadComplete(results);
      }
      
      // Rimuovi i file caricati con successo dopo 1 secondo
      setTimeout(() => {
        setFiles(prevFiles => prevFiles.filter(f => !f.uploaded));
      }, 1000);
    }
  };

  const cancelAllUploads = () => {
    // Annulla tutti gli upload in corso
    Object.values(uploadPromisesRef.current).forEach(({ controller }) => {
      controller.abort();
    });
    
    // Pulisci gli URL delle anteprime
    files.forEach(file => {
      URL.revokeObjectURL(file.preview);
    });
    
    // Svuota la lista dei file
    setFiles([]);
    
    uploadPromisesRef.current = {};
  };

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
          isDragActive 
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/30 hover:border-muted-foreground/50",
          files.length > 0 && "border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        
        {files.length === 0 ? (
          <div className="py-8 flex flex-col items-center space-y-2 text-muted-foreground">
            <UploadCloud className="h-10 w-10 mb-2" />
            <h3 className="text-lg font-medium">
              {isDragActive ? "Rilascia i file qui" : "Trascina e rilascia le foto"}
            </h3>
            <p className="text-sm">oppure</p>
            <Button 
              variant="outline" 
              onClick={open}
              type="button"
            >
              Seleziona file
            </Button>
            <p className="text-xs mt-2">
              JPG, PNG, WebP • Max {maxFiles} file • Max 20MB per file
            </p>
          </div>
        ) : (
          <div className="flex flex-col space-y-4 mt-4 mb-2">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">
                {files.length} {files.length === 1 ? "file selezionato" : "file selezionati"}
              </h3>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={open}
                  type="button"
                  disabled={files.length >= maxFiles || isUploading}
                >
                  <Image className="h-4 w-4 mr-1" /> 
                  Aggiungi
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelAllUploads();
                  }}
                  type="button"
                  disabled={isUploading}
                >
                  <X className="h-4 w-4 mr-1" /> 
                  Rimuovi tutti
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {files.map((file) => (
                <Card key={file.id} className="relative overflow-hidden group">
                  <div className="aspect-square overflow-hidden bg-muted rounded-md">
                    <img
                      src={file.preview}
                      className="w-full h-full object-cover"
                      alt={file.file.name}
                      onLoad={() => {
                        URL.revokeObjectURL(file.preview);
                      }}
                    />
                  </div>
                  
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className={cn(
                      "absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                      file.uploading && "opacity-0 !important"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                    disabled={file.uploading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  
                  {(file.uploading || file.uploaded) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white">
                      {file.uploading && <Loader2 className="h-6 w-6 animate-spin mb-2" />}
                      {file.uploaded && <Check className="h-8 w-8 text-green-500 mb-2" />}
                      <Progress
                        value={file.progress}
                        className="w-4/5 h-2"
                      />
                      <p className="text-xs mt-1">{file.progress}%</p>
                    </div>
                  )}
                  
                  {file.error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/60 text-white">
                      <X className="h-6 w-6 mb-1" />
                      <p className="text-xs text-center px-2">{file.error}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {files.length > 0 && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="default"
            onClick={uploadAllFiles}
            disabled={isUploading || files.every(f => f.uploaded)}
            className="w-full md:w-auto"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Caricamento in corso...
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4 mr-2" />
                Carica {files.filter(f => !f.uploaded).length} foto
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}