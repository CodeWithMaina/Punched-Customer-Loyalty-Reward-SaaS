"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  Button — Production-ready with haptic-feel interactions
//  60-30-10: primary uses brand (30%), secondary uses accent (10%)
// ═══════════════════════════════════════════════════════════════

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<string, string> = {
  primary:
    "bg-brand text-white font-semibold hover:bg-brand-hover active:scale-[0.97] shadow-sm hover:shadow-md",
  secondary:
    "bg-accent text-white font-semibold hover:bg-accent-hover active:scale-[0.97] shadow-sm",
  danger:
    "bg-danger text-white font-semibold hover:bg-red-600 active:scale-[0.97] shadow-sm",
  outline:
    "bg-[var(--surface)] text-[var(--text-primary)] font-medium border border-[var(--border)] hover:bg-[var(--border-light)] active:scale-[0.97]",
  ghost:
    "bg-transparent text-[var(--text-secondary)] font-medium hover:bg-[var(--border-light)] active:scale-[0.97]",
};

const sizeStyles: Record<string, string> = {
  sm: "h-10 px-4 text-sm rounded-xl gap-1.5",
  md: "h-12 px-6 text-sm rounded-xl gap-2",
  lg: "h-14 px-8 text-base rounded-2xl gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center transition-all duration-200 select-none",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          (disabled || isLoading) &&
            "bg-[var(--border-light)] text-[var(--text-muted)] cursor-not-allowed hover:bg-[var(--border-light)] active:scale-100 shadow-none",
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
