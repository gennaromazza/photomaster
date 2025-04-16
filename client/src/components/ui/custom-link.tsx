import { Link as WouterLink } from "wouter";
import React, { forwardRef } from "react";

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

type CustomLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  [key: string]: any;  // Per consentire l'utilizzo di prop aggiuntive
};

/**
 * Componente Link personalizzato che supporta il forwarding dei ref e la normalizzazione degli URL
 */
export const Link = forwardRef<HTMLAnchorElement, CustomLinkProps>((props, ref) => {
  const { href, children, className, ...rest } = props;
  // Normalizza l'URL prima di passarlo al componente Link di wouter
  const normalizedHref = normalizeUrl(href);
  
  // Usiamo l'attributo to perché è quello che wouter si aspetta e passiamo il ref
  return (
    <WouterLink ref={ref} to={normalizedHref} className={className} {...rest}>
      {children}
    </WouterLink>
  );
});

// Aggiungiamo un displayName per migliorare l'esperienza di debugging
Link.displayName = "Link";