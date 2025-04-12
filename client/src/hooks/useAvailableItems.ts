
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export interface AvailableItems {
  services: any[];
  products: any[];
  bundles: any[];
}

export function useAvailableItems() {
  const { toast } = useToast();
  const [items, setItems] = useState<AvailableItems>({
    services: [],
    products: [],
    bundles: [],
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res1 = await fetch("/api/services");
        if (res1.ok) {
          const allItems = await res1.json();
          const services = allItems.filter((item: any) => item.type === 'service');
          const products = allItems.filter((item: any) => item.type === 'product');
          setItems(prev => ({ ...prev, services, products }));
        }
        const res2 = await fetch("/api/service-bundles");
        if (res2.ok) {
          const bundles = await res2.json();
          setItems(prev => ({ ...prev, bundles }));
        }
      } catch (error) {
        setError("Errore nel caricamento dei dati");
        toast({
          title: "Errore",
          description: "Impossibile caricare i servizi, prodotti o pacchetti",
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, [toast]);

  return { ...items, error };
}
