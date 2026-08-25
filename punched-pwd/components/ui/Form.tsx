"use client";

import type {
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
//  FormField / FormLabel / Select / Textarea — shared form
//  primitives. Work standalone or composed via FormField.
// ═══════════════════════════════════════════════════════════════

export function FormField({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("block", className)}>
      <FormLabel htmlFor={htmlFor}>{label}</FormLabel>
      {children}
      {hint && (
        <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">{hint}</p>
      )}
    </div>
  );
}

export function FormLabel({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]"
    >
      {children}
    </label>
  );
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  fullWidth?: boolean;
  /** Accessible name (rendered as aria-label) when no visible label wraps it. */
  label?: string;
  children?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, fullWidth = false, label, children, ...props }, ref) => (
    <div className={cn("relative", fullWidth && "w-full")}>
      <select
        ref={ref}
        aria-label={label}
        className={cn(
          "h-10 appearance-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 pr-8 text-xs font-medium text-[var(--text-secondary)] outline-none transition-colors hover:border-brand focus:border-brand",
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
    </div>
  )
);
Select.displayName = "Select";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 4, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(
      "w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-[var(--brand-ring)]",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";