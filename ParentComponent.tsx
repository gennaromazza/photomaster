import { useQuery } from "@tanstack/react-query";
import { CollaboratoriQuote } from "./CollaboratoriQuote";

export function ParentComponent({ quoteId }: { quoteId: number }) {
  const { data: preventivo, isLoading } = useQuery({
    queryKey: ["preventivo", quoteId],
    queryFn: () =>
      fetch(`/api/eventi/preventivo/${quoteId}`).then(res => res.json()),
  });

  if (isLoading || !preventivo) return <div>Caricamento…</div>;

  return (
    <CollaboratoriQuote
      quoteId={quoteId}
      title={preventivo.title}
      date={new Date(preventivo.date)}
      location={preventivo.location}
      ceremonyLocation={preventivo.ceremonyLocation}
      ceremonyTime={preventivo.ceremonyTime}
      client={{
        firstName: preventivo.client.firstName,
        lastName: preventivo.client.lastName,
        phone: preventivo.client.phone,
      }}
    />
  );
}