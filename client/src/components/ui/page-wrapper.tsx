import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Heading } from './heading';

interface PageWrapperProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  container?: boolean;
  className?: string;
  contentClassName?: string;
}

/**
 * Wrapper per le pagine che include un titolo, un sottotitolo opzionale e un'azione opzionale
 */
export const PageWrapper = ({
  title,
  subtitle,
  children,
  action,
  container = true,
  className,
  contentClassName,
}: PageWrapperProps) => {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <Heading title={title} subtitle={subtitle} />
        {action && <div className="flex items-center justify-end">{action}</div>}
      </div>
      
      <div className={cn(container && 'container', contentClassName)}>
        {children}
      </div>
    </div>
  );
};

/**
 * Componente per visualizzare un insieme di azioni nell'header della pagina
 */
export const HeaderActions = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex items-center space-x-2">
      {children}
    </div>
  );
};