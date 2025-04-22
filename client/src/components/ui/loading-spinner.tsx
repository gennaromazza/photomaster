import React from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

const LoadingSpinner = ({
  className,
  size = "sm",
}: LoadingSpinnerProps) => {
  // Mappa delle dimensioni
  const sizeMap = {
    xs: "h-3 w-3 border-[1.5px]",
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-[3px]",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-primary border-t-transparent",
        sizeMap[size],
        className
      )}
      aria-label="Caricamento in corso"
    />
  );
};

export { LoadingSpinner };