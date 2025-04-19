import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Check, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getCsrfToken } from "@/lib/queryClient";

interface PhotoUploaderProps {
  galleryId: number;
  chapterId?: number | null;
  onUploadComplete?: () => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedFileTypes?: string[];
}

interface FileWithPreview extends File {
  preview: string;
  id: string;
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export function PhotoUploader({
  galleryId,
  chapterId = null,
  onUploadComplete,
  maxFiles = 20,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedFileTypes = ["image/jpeg", "image/png", "image/webp"],
}: PhotoUploaderProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (files.length + acceptedFiles.length > maxFiles) {
        toast({
          title: "Troppe foto",
          description: `Puoi caricare al massimo ${maxFiles} foto alla volta`,
          variant: "destructive",
        });
        return;
      }

      const filesToAdd = acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
          id: `${file.name}-${Date.now()}`,
          status: "idle" as const,
          progress: 0,
        })
      );

      setFiles((prev) => [...prev, ...filesToAdd]);
    },
    [files.length, maxFiles, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": acceptedFileTypes.map((type) => `.${type.split("/")[1]}`),
    },
    maxSize,
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const updatedFiles = prev.filter((file) => file.id !== id);
      return updatedFiles;
    });
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const uploadPromises = files.map(async (file) => {
      if (file.status === "success") return file;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: "uploading", progress: 0 } : f
        )
      );

      const formData = new FormData();
      formData.append("photo", file);
      formData.append("galleryId", galleryId.toString());
      if (chapterId) {
        formData.append("chapterId", chapterId.toString());
      }

      try {
        // Otteniamo il token CSRF prima di iniziare il caricamento
        const csrfToken = await getCsrfToken();
        const token = localStorage.getItem("auth_token");

        const xhr = new XMLHttpRequest();

        const progressPromise = new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded * 100) / event.total);
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === file.id ? { ...f, progress } : f
                )
              );
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`HTTP Error: ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Network Error")));
          xhr.addEventListener("abort", () => reject(new Error("Upload Aborted")));
        });

        xhr.open("POST", `/api/photos`);

        // Aggiungiamo gli header necessari
        if (csrfToken) {
          xhr.setRequestHeader('X-CSRF-Token', csrfToken);
        }

        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.withCredentials = true; // Necessario per inviare i cookie di sessione

        xhr.send(formData);

        await progressPromise;

        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "success", progress: 100 } : f
          )
        );

        return { ...file, status: "success", progress: 100 };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";

        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: "error", error: errorMessage }
              : f
          )
        );

        console.error(`Errore durante il caricamento di ${file.name}:`, error);
        toast({
          title: "Errore",
          description: `Impossibile caricare ${file.name}. Verifica il formato e la dimensione del file.`,
          variant: "destructive"
        });
        return { ...file, status: "error", error: errorMessage };
      }
    });

    try {
      await Promise.all(uploadPromises);

      toast({
        title: "Caricamento completato",
        description: "Le foto sono state caricate con successo",
      });

      if (onUploadComplete) {
        onUploadComplete();
      }

      // Rimuovi i file caricati con successo dopo un breve ritardo
      setTimeout(() => {
        setFiles((prev) => prev.filter((f) => f.status !== "success"));
      }, 2000);
    } catch (error) {
      console.error("Errore durante il caricamento:", error);

      toast({
        title: "Errore di caricamento",
        description: "Si è verificato un errore durante il caricamento delle foto",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);

    toast({
      title: "Caricamento annullato",
      description: "Il caricamento delle foto è stato annullato",
    });
  };

  const allFilesUploaded = files.length > 0 && files.every((file) => file.status === "success");
  const hasErrors = files.some((file) => file.status === "error");

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[200px]",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload
          className={cn(
            "h-10 w-10 mb-4",
            isDragActive ? "text-primary" : "text-muted-foreground"
          )}
        />
        <p className="text-center mb-1">
          {isDragActive
            ? "Rilascia le foto qui"
            : "Trascina le foto qui, o clicca per selezionarle"}
        </p>
        <p className="text-sm text-muted-foreground text-center">
          Formati supportati: JPG, PNG, WEBP. Dimensione massima: 10MB per foto.
        </p>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Puoi caricare fino a {maxFiles} foto alla volta.
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              Foto selezionate ({files.length})
            </h3>
            <div className="flex gap-2">
              {isUploading ? (
                <Button variant="outline" onClick={cancelUpload}>
                  Annulla
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setFiles([])}
                    disabled={isUploading}
                  >
                    Rimuovi tutto
                  </Button>
                  <Button
                    onClick={uploadFiles}
                    disabled={isUploading || allFilesUploaded}
                  >
                    {isUploading ? (
                      "Caricamento in corso..."
                    ) : allFilesUploaded ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Caricamento completato
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Carica foto
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file) => (
              <Card
                key={file.id}
                className="overflow-hidden flex flex-col relative group"
              >
                <div className="aspect-square overflow-hidden relative bg-muted">
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="object-cover h-full w-full transition-all group-hover:scale-105"
                    onLoad={() => {
                      URL.revokeObjectURL(file.preview);
                    }}
                  />
                  <Badge
                    variant={
                      file.status === "idle"
                        ? "outline"
                        : file.status === "uploading"
                        ? "secondary"
                        : file.status === "success"
                        ? "default"
                        : "destructive"
                    }
                    className="absolute top-2 right-2"
                  >
                    {file.status === "idle" && "In attesa"}
                    {file.status === "uploading" && "Caricamento..."}
                    {file.status === "success" && "Completato"}
                    {file.status === "error" && "Errore"}
                  </Badge>

                  {file.status !== "uploading" && file.status !== "success" && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {file.status === "uploading" && (
                  <Progress value={file.progress} className="rounded-none h-1" />
                )}

                <div className="p-3 text-sm">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>

                  {file.status === "error" && (
                    <div className="mt-2 flex items-start gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p className="text-xs">{file.error || "Errore durante il caricamento"}</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}