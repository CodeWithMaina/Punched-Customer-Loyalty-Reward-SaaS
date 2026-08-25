"use client";

import { CalendarDays } from "lucide-react";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";

/* ============================================================
   LOADING / EMPTY / ERROR STATES
   Composed from shared UI kit primitives.
   ============================================================ */

export function AppointmentsLoadingState() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-3 w-52 rounded" />
          </div>

          <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-[var(--radius-lg)]" />
          ))}
        </div>

        <Skeleton className="h-24 rounded-[var(--radius-lg)]" />

        <Skeleton className="h-[560px] rounded-[var(--radius-lg)]" />
      </div>
    </div>
  );
}

export function AppointmentsErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--text-primary)]">
      <ErrorState
        title="Appointments unavailable"
        message={error}
        onRetry={onRetry}
      />
    </div>
  );
}

export function AppointmentsEmptyState({ onBook }: { onBook: () => void }) {
  return (
    <EmptyState
      icon={<CalendarDays className="h-6 w-6" />}
      title="No appointments found"
      description="There are no appointments matching the current filters."
      action={
        <button
          onClick={onBook}
          className="mt-2 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-brand px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-hover"
        >
          Book appointment
        </button>
      }
    />
  );
}
