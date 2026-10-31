import type React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "subtle" | "destructive" | "ghost";
}

export const Button = ({
  children,
  variant = "secondary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ref,
  ...props
}: ButtonProps & { ref?: React.RefObject<HTMLButtonElement | null> }) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 cursor-pointer focus-ring select-none disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeStyles = {
    lg: "px-4 py-2.5 text-base gap-2.5 min-h-[44px]",
    md: "px-3.5 py-2 text-sm gap-2 min-h-[40px]",
    sm: "px-2.5 py-1.5 text-xs gap-1.5 min-h-[36px]",
  };

  const variantStyles = {
    destructive:
      "bg-destructive text-white hover:opacity-90 active:scale-[0.98] shadow-subtle focus-visible:ring-destructive",
    ghost:
      "text-text-muted hover:text-text-main hover:bg-bg-subtle active:scale-[0.98]",
    primary:
      "bg-brand-primary text-brand-onPrimary hover:opacity-90 active:scale-[0.98] shadow-subtle",
    secondary:
      "bg-bg-surface border border-border-subtle text-text-main hover:bg-bg-subtle active:scale-[0.98] shadow-subtle",
    subtle:
      "bg-bg-subtle text-text-main hover:bg-border-subtle active:scale-[0.98]",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      ref={ref}
      {...props}
    >
      {isLoading ? (
        <svg
          aria-hidden="true"
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            fill="currentColor"
          />
        </svg>
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};

Button.displayName = "Button";
