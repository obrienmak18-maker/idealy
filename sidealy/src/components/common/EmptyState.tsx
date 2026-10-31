import type React from "react";
import { Button } from "./Button";

export interface EmptyStateProps {
  actionLabel?: string;
  description: string;
  icon: React.ReactNode;
  onAction?: () => void;
  title: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
    <div
      aria-hidden="true"
      className="p-3 bg-bg-subtle text-text-muted rounded-xl mb-4 border border-border-subtle"
    >
      {icon}
    </div>
    <h3 className="text-base font-semibold text-text-main mb-1.5">{title}</h3>
    <p className="text-sm text-text-muted mb-5 leading-relaxed">
      {description}
    </p>
    {actionLabel && onAction && (
      <Button onClick={onAction} size="md" variant="primary">
        {actionLabel}
      </Button>
    )}
  </div>
);
