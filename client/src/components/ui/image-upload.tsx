import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps extends React.HTMLAttributes<HTMLDivElement> {
  onImageChange: (file: File | null) => void;
  initialImage?: string;
  currentImageUrl?: string;
  className?: string;
}

export const ImageUpload = forwardRef<HTMLDivElement, ImageUploadProps>(
  ({ onImageChange, initialImage, currentImageUrl, className = '', ...props }, ref) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialImage || currentImageUrl || null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    useEffect(() => {
      if (initialImage) {
        setPreviewUrl(initialImage);
      } else if (currentImageUrl) {
        setPreviewUrl(currentImageUrl);
      }
    }, [initialImage, currentImageUrl]);

    const validateImage = (file: File): boolean => {
      // Verifica il tipo di file
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Formato file non supportato. Utilizza JPG, PNG, GIF o WebP.');
        return false;
      }

      // Verifica la dimensione (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError('L\'immagine è troppo grande. Dimensione massima: 5MB.');
        return false;
      }

      setError(null);
      return true;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      const file = files[0];
      
      if (validateImage(file)) {
        setLoading(true);
        
        // Crea un URL per l'anteprima
        const newPreviewUrl = URL.createObjectURL(file);
        setPreviewUrl(newPreviewUrl);
        
        // Notifica il componente padre
        onImageChange(file);
        
        setLoading(false);
      } else {
        // Resetta l'input file in caso di errore
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        toast({
          title: "Errore upload immagine",
          description: error,
          variant: "destructive",
        });
      }
    };

    const handleRemoveImage = () => {
      setPreviewUrl(null);
      onImageChange(null);
      
      // Resetta l'input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const handleButtonClick = () => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    return (
      <div className={`flex flex-col items-center ${className}`} ref={ref} {...props}>
        <div className="w-full mb-4">
          <Label htmlFor="image-upload" className="block mb-2">
            Immagine
          </Label>
          
          <Input
            ref={fileInputRef}
            id="image-upload"
            type="file"
            accept="image/jpeg, image/png, image/gif, image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {previewUrl ? (
            <div className="relative w-full h-48 border rounded-md overflow-hidden">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemoveImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div 
              className="w-full h-48 border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={handleButtonClick}
            >
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clicca per caricare un'immagine
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, GIF o WebP (max. 5MB)
                  </p>
                </>
              )}
            </div>
          )}
          
          {error && (
            <p className="text-sm text-destructive mt-1">{error}</p>
          )}
        </div>
      </div>
    );
  }
);

ImageUpload.displayName = "ImageUpload";