
import React, { useState } from "react";

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc: string;
}

export function ImageWithFallback({ fallbackSrc, src, alt, ...props }: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const handleError = () => setImgSrc(fallbackSrc);
  
  return (
    <img 
      src={imgSrc} 
      alt={alt} 
      onError={handleError} 
      {...props} 
    />
  );
}
