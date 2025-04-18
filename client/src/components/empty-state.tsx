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
    <Card className={`w-full ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        {description && <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>}
        {action && <div>{action}</div>}
      </CardContent>
    </Card>
  );
}