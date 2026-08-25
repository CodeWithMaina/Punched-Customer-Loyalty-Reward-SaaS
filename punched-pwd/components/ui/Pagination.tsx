"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
//  Pagination — shared, accessible pager for server-paginated
//  lists (staff roster, customer roster, activity feeds).
// ═══════════════════════════════════════════════════════════════

export function Pagination({
  page,
  totalPages,
  total,
  noun = "results",
  onChange,
  className,
}: {
  page: number;
  totalPages: number;
  total: number;
  /** Noun for the result count, e.g. "staff", "customers". */
  noun?: string;
  onChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) {
    return (
      <p
        className={cn(
          "px-5 py-4 text-[11px] font-medium text-[var(--text-tertiary)]",
          className
        )}
        aria-live="polite"
      >
        {total} {noun === "results" ? "result" : noun}
        {total !== 1 ? "s" : ""}
      </p>
    );
  }

  return (
    <nav
      aria-label={`${noun} pagination`}
      className={cn(
        "flex items-center justify-between px-5 py-3 border-t border-[var(--border-light)]",
        className
      )}
    >
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-40 min-h-[36px]"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      <p
        className="text-[11px] font-medium text-[var(--text-tertiary)] tabular-nums"
        aria-live="polite"
      >
        Page {page} of {totalPages} · {total}
      </p>

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-40 min-h-[36px]"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
