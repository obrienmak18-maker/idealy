import type React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
  variant?:
    | "default"
    | "primary"
    | "accent"
    | "warning"
    | "destructive"
    | "success";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "md",
  className = "",
}) => {
  const sizeStyles = {
    md: "px-2 py-0.5 text-xs",
    sm: "px-1.5 py-0.5 text-[10px]",
  };

  const variantStyles = {
    accent:
      "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 font-medium",
    default: "bg-bg-subtle text-text-muted border border-border-subtle",
    destructive:
      "bg-destructive/10 text-destructive border border-destructive/20 font-medium",
    primary:
      "bg-brand-primary/10 text-brand-primary border border-brand-primary/20 font-medium",
    success: "bg-success/10 text-success border border-success/20 font-medium",
    warning:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono uppercase tracking-wider rounded-md ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
