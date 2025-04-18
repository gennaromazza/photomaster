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
}) => {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
};