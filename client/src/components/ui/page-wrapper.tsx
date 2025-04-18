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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Heading title={title} subtitle={subtitle} />
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};