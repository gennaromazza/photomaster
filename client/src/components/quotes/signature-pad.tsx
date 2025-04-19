import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SignaturePadProps {
  onSignatureSubmit: (signature: string) => void;
  isSubmitting: boolean;
}

export function SignaturePad({ onSignatureSubmit, isSubmitting }: SignaturePadProps) {
  const [signature, setSignature] = useState("");

  // Lista di font per scrittura a mano
  const handwritingFonts = [
    { name: "Dancing Script", className: "font-handwriting-dancing" },
    { name: "Pacifico", className: "font-handwriting-pacifico" },
    { name: "Satisfy", className: "font-handwriting-satisfy" },
    { name: "Great Vibes", className: "font-handwriting-great-vibes" },
    { name: "Caveat", className: "font-handwriting-caveat" },
  ];

  const [selectedFont, setSelectedFont] = useState(handwritingFonts[0]);

  // Verifica se la firma è valida (non vuota e ha almeno 3 caratteri)
  const isSignatureValid = signature.trim().length >= 3;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="signature">Nome e Cognome</Label>
        <Input
          id="signature"
          placeholder="Inserisci il tuo nome e cognome"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          className="text-center"
        />
      </div>

      {signature.trim() && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {handwritingFonts.map((font) => (
              <Button
                key={font.name}
                variant={selectedFont.name === font.name ? "default" : "outline"}
                onClick={() => setSelectedFont(font)}
                size="sm"
                className="text-xs"
              >
                {font.name}
              </Button>
            ))}
          </div>

          <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 bg-primary/5">
            <p className="text-center text-sm text-muted-foreground mb-3">Anteprima firma:</p>
            <p
              className={cn(
                "text-center text-3xl text-primary",
                selectedFont.className
              )}
              style={{ fontFamily: selectedFont.name + ", cursive" }}
            >
              {signature}
            </p>
          </div>
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={() => onSignatureSubmit(signature)}
        disabled={!isSignatureValid || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Elaborazione...
          </>
        ) : (
          <>
            Firma e Conferma
          </>
        )}
      </Button>
    </div>
  );
}