import { Link as WouterLink } from "wouter";

// Normalizza l'URL rimuovendo eventuali doppi slash
function normalizeUrl(url: string): string {
  // Se è un URL assoluto (con http o https), lo gestiamo in modo speciale
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Per URL assoluti, dobbiamo assicurarci di non alterare lo schema
    const parts = url.split('://');
    const schema = parts[0];
    let path = parts[1];
    
    // Rimuovi doppi slash nel percorso (dopo lo schema)
    while (path.includes('//')) {
      path = path.replace('//', '/');
    }
    
    return `${schema}://${path}`;
  }
  
  // Per URL relativi, possiamo semplicemente sostituire i doppi slash con singoli slash
  let normalized = url;
  while (normalized.includes('//')) {
    normalized = normalized.replace('//', '/');
  }
  
  return normalized;
}

// Estende le proprietà del componente Link di wouter
interface CustomLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  // Altri attributi possono essere aggiunti qui se necessario
}

export function Link({ href, children, className, ...rest }: CustomLinkProps) {
  // Normalizza l'URL prima di passarlo al componente Link di wouter
  const normalizedHref = normalizeUrl(href);
  
  return <WouterLink to={normalizedHref} {...rest}>{children}</WouterLink>;
}