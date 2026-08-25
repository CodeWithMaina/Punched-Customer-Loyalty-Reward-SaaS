"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
//  IconButton — square, accessible icon-only button.
//  Requires a `label` (rendered as aria-label) since it has no
//  visible text. Touch target ≥ 36px on all sizes.
// ═══════════════════════════════════════════════════════════════

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name — required because the button is icon-only. */
  label: string;
  variant?: "outline" | "ghost" | "solid";
  size?: "sm" | "md";
}

const variantStyles = {
  outline:
    "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-brand hover:text-brand",
  ghost:
    "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--border-light)]",
  solid: "bg-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--border)]",
};

const sizeStyles = {
  sm: "h-8 w-8",
  md: "h-9 w-9 min-h-[36px] min-w-[36px]",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, variant = "outline", size = "md", className, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-colors active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  )
);

IconButton.displayName = "IconButton";