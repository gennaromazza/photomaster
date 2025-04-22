import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Caricamento in corso...",
  size = "md",
  className = "",
}) => {
  const spinnerSizes = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      <Loader2 className={`${spinnerSizes[size]} animate-spin text-primary`} />
      {message && <p className="mt-4 text-muted-foreground text-sm">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;