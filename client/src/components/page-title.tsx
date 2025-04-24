import React from 'react';

interface PageTitleProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const PageTitle: React.FC<PageTitleProps> = ({ title, subtitle, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex-shrink-0 flex gap-2">{actions}</div>
      )}
    </div>
  );
};

export default PageTitle;