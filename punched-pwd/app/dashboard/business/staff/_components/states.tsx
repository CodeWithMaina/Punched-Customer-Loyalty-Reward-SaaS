"use client";

import { CalendarDays } from "lucide-react";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";

/* ============================================================
   LOADING / EMPTY / ERROR STATES
   Composed from shared UI kit primitives — skeleton mirrors
   the real Staff page layout so nothing jumps on load.
   ============================================================ */

export function StaffLoadingState() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header skeleton */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-3 w-56 rounded" />
          </div>

          <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-[var(--radius-lg)]" />
          ))}
        </div>

        {/* Control bar */}
        <Skeleton className="h-20 rounded-[var(--radius-lg)]" />

        {/* Staff cards */}
        <div className="grid gap-3 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StaffErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--text-primary)]">
      <ErrorState
        title="Staff unavailable"
        message={error}
        onRetry={onRetry}
      />
    </div>
  );
}

export function StaffListEmptyState({
  filtered,
  onInvite,
}: {
  /** True when a search/filter is active (vs. no staff at all). */
  filtered: boolean;
  onInvite: () => void;
}) {
  return (
    <EmptyState
      icon={<CalendarDays className="h-6 w-6" />}
      title={filtered ? "No staff found" : "No staff yet"}
      description={
        filtered
          ? "No team members match your current filters."
          : "Invite your first team member to start issuing stamps and rewards."
      }
      action={
        !filtered && (
          <button
            onClick={onInvite}
            className="mt-2 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-brand px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-hover"
          >
            Invite staff
          </button>
        )
      }
    />
  );
}
