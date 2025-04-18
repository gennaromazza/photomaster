import React from 'react';
import { Heading } from './heading';

interface PageWrapperProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  title,
  subtitle,
  actions
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Heading title={title} subtitle={subtitle} />
        
        {actions && (
          <div>
            {actions}
          </div>
        )}
      </div>
      
      {children}
    </div>
  );
};