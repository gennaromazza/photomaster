import { CardFooter } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface GalleryCardFooterProps {
  className?: string;
}

export function GalleryCardFooter({ className = "" }: GalleryCardFooterProps) {
  // Recuperare i dati del fotografo/studio dalle impostazioni
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) {
        return { studioName: "ImageStudio", copyrightText: "© " + new Date().getFullYear() };
      }
      const data = await res.json();
      return data;
    },
  });

  // Utilizza i dati delle impostazioni o valori predefiniti
  const studioName = settings?.studioName || "ImageStudio";
  const copyrightYear = new Date().getFullYear();
  const copyrightText = settings?.copyrightText || `© ${copyrightYear}`;

  return (
    <CardFooter className={`flex justify-between text-xs text-muted-foreground ${className}`}>
      <p>{studioName}</p>
      <p>{copyrightText}</p>
    </CardFooter>
  );
}