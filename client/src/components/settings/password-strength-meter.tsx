import { Progress } from "@/components/ui/progress";

interface PasswordStrengthMeterProps {
  strength: number; // 0-4, dove 4 è la massima sicurezza
}

export function PasswordStrengthMeter({ strength }: PasswordStrengthMeterProps) {
  // Calcolo della percentuale di forza (0-4 -> 0-100%)
  const percentage = (strength / 4) * 100;
  
  // Determinazione del colore in base alla forza
  let colorClass = "bg-red-500";
  let strengthText = "Debole";
  
  if (strength === 0) {
    colorClass = "bg-gray-300";
    strengthText = "Inserisci una password";
  } else if (strength === 1) {
    colorClass = "bg-red-500";
    strengthText = "Debole";
  } else if (strength === 2) {
    colorClass = "bg-amber-500";
    strengthText = "Media";
  } else if (strength === 3) {
    colorClass = "bg-green-400";
    strengthText = "Buona";
  } else if (strength === 4) {
    colorClass = "bg-green-600";
    strengthText = "Forte";
  }
  
  return (
    <div className="space-y-1 mt-1">
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all duration-300`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{strengthText}</p>
    </div>
  );
}