import React from 'react';

interface HeadingProps {
  title: string;
  subtitle?: string;
}

export const Heading: React.FC<HeadingProps> = ({
  title,
  subtitle
}) => {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && (
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
};