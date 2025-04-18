import React from 'react';

interface HeadingProps {
  title: string;
  subtitle?: string;
}

/**
 * Componente per visualizzare un titolo e un sottotitolo opzionale
 */
export const Heading: React.FC<HeadingProps> = ({
  title,
  subtitle
}: HeadingProps) => {
  return (
    <div className="space-y-0.5">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {subtitle && (
        <p className="text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
};