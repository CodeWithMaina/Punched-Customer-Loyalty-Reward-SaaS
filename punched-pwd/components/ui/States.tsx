"use client";

import type { ReactNode } from "react";
import { Search, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
//  SearchInput / EmptyState / ErrorState — shared search + state
//  patterns used across dashboards.
// ═══════════════════════════════════════════════════════════════

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  label = "Search",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible name (visually hidden). */
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative flex-1", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-[var(--brand-ring)]"
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center space-y-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center animate-fade-in",
        className
      )}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-surface text-brand">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-bold">{title}</h3>
      {description && (
        <p className="mx-auto max-w-sm text-xs leading-5 text-[var(--text-secondary)]">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center max-w-xl px-6 py-16 text-center animate-fade-in">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-red-50 text-red-500">
        <AlertTriangle className="h-7 w-7" />
      </div>

      <h1 className="text-xl font-bold">{title}</h1>

      <p className="mt-2 text-sm text-[var(--text-secondary)]">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
}