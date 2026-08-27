"use client";

import { Users } from "lucide-react";
import { ErrorState, Skeleton } from "@/components/ui";

/* ============================================================
   LOADING / ERROR STATES — skeleton mirrors the real layout.
   ============================================================ */

export function CustomersLoadingState() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header skeleton */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-3 w-52 rounded" />
          </div>

          <Skeleton className="h-10 w-24 rounded-[var(--radius-md)]" />
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* View switcher */}
        <Skeleton className="h-11 w-full rounded-[var(--radius-md)] sm:w-64" />

        {/* Overview summary tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-26 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CustomersErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--text-primary)]">
      <ErrorState title="Customers unavailable" message={error} onRetry={onRetry} />
    </div>
  );
}

export function CustomersRosterEmptyState({
  hasAnyFilter,
  onClear,
}: {
  hasAnyFilter: boolean;
  onClear: () => void;
}) {
  if (hasAnyFilter) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center animate-fade-in">
        <Users className="h-6 w-6 text-brand" />

        <h3 className="text-sm font-bold">No customers found</h3>

        <p className="mx-auto max-w-sm text-xs leading-5 text-[var(--text-secondary)]">
          No customers match your current search or filters.
        </p>

        <button
          onClick={onClear}
          className="mt-1 rounded-[var(--radius-md)] border border-brand px-4 py-2.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-surface"
        >
          Clear search &amp; filters
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center animate-fade-in">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-surface text-brand">
        <Users className="h-6 w-6" />
      </div>

      <h3 className="text-sm font-bold">No customers yet</h3>

      <p className="mx-auto max-w-sm text-xs leading-5 text-[var(--text-secondary)]">
        Customers will appear here once they join your loyalty program.
      </p>
    </div>
  );
}
