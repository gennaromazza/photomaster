
import React, { useState, useEffect } from "react";

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc: string;
  mediumSrc?: string;
  fill?: boolean;
}

/**
 * Componente immagine con fallback a più livelli:
 * 1. Tenta di caricare l'immagine principale (src)
 * 2. Se fallisce, prova con l'immagine media (mediumSrc)
 * 3. Se anche questa fallisce, usa l'immagine di fallback (fallbackSrc)
 */
export function ImageWithFallback({ 
  fallbackSrc, 
  src, 
  mediumSrc,
  alt, 
  fill,
  ...props 
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src || "");
  const [usedFallback, setUsedFallback] = useState(false);
  
  useEffect(() => {
    // Aggiorna l'immagine quando cambia la sorgente
    setImgSrc(src || "");
    setUsedFallback(false);
  }, [src]);

  const handleError = () => {
    if (!usedFallback && mediumSrc) {
      // Prima prova il fallback intermedio (versione media)
      setImgSrc(mediumSrc);
      setUsedFallback(true);
    } else {
      // Usa il fallback finale
      setImgSrc(fallbackSrc);
    }
  };
  
  // Stile per la modalità 'fill'
  const fillStyle = fill ? {
    position: 'absolute',
    height: '100%',
    width: '100%',
    top: 0,
    left: 0,
    objectFit: 'cover'
  } : {};

  return (
    <img 
      src={imgSrc} 
      alt={alt || ""} 
      onError={handleError} 
      style={fill ? fillStyle as React.CSSProperties : undefined}
      {...props} 
    />
  );
}
