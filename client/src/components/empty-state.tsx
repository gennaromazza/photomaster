
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <Card className={`w-full border-2 border-dashed bg-muted/5 ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
        {icon && (
          <div className="mb-6 text-muted-foreground/60 [&>svg]:h-12 [&>svg]:w-12">
            {icon}
          </div>
        )}
        <h3 className="text-xl font-medium tracking-tight mb-3">{title}</h3>
        {description && (
          <p className="text-muted-foreground mb-8 max-w-sm leading-relaxed">
            {description}
          </p>
        )}
        {action && <div className="[&>button]:shadow-sm">{action}</div>}
      </CardContent>
    </Card>
  );
}
