import React from "react";
import { cn } from "@/lib/utils";

interface WatermarkProps {
  text: string;
  opacity?: number;
  fontSize?: string;
  rotate?: number;
  color?: string;
  repeat?: number;
  className?: string;
  position?: "center" | "top" | "bottom";
}

/**
 * Componente per generare una filigrana di testo personalizzata
 */
export function Watermark({
  text,
  opacity = 0.08,
  fontSize = "2rem",
  rotate = -30,
  color = "currentColor",
  repeat = 10,
  className,
  position = "center",
}: WatermarkProps) {
  // Calcola il numero di ripetizioni per riga
  const repetitions = Array.from({ length: repeat }, (_, i) => i);

  // Calcola il numero di righe (leggermente più del necessario per coprire l'intera pagina)
  const rows = Array.from({ length: Math.ceil(repeat / 1.5) }, (_, i) => i);
  
  // Calcola la posizione verticale in base all'opzione scelta
  const getPositionClass = () => {
    switch (position) {
      case "top":
        return "items-start pt-10";
      case "bottom":
        return "items-end pb-10";
      case "center":
      default:
        return "items-center";
    }
  };

  return (
    <div 
      className={cn(
        "pointer-events-none select-none overflow-hidden fixed inset-0 flex flex-col justify-between",
        getPositionClass(),
        className
      )}
      style={{ zIndex: 10 }}
      aria-hidden="true"
    >
      {rows.map((row) => (
        <div 
          key={`row-${row}`} 
          className="flex justify-between w-full my-4"
          style={{ 
            transform: row % 2 === 0 ? "translateX(-5%)" : "translateX(5%)",
          }}
        >
          {repetitions.map((rep) => (
            <div
              key={`watermark-${row}-${rep}`}
              className="whitespace-nowrap mx-4"
              style={{
                opacity,
                color,
                fontSize,
                fontWeight: "bold",
                transform: `rotate(${rotate}deg)`,
                transformOrigin: "center",
              }}
            >
              {text}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}