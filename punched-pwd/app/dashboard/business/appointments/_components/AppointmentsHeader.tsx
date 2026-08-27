"use client";

import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { Button, IconButton } from "@/components/ui";

export function AppointmentsHeader({
  onToggleFilters,
  onBook,
  query,
  onQueryChange,
}: {
  onToggleFilters: () => void;
  onBook: () => void;
  /** Server-backed search value (controlled from the page). */
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="mx-auto max-w-[1600px] space-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
              Appointments
            </h1>

            <p className="hidden text-xs text-[var(--text-secondary)] sm:block">
              Manage your schedule and upcoming bookings
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile filter toggle — opens the right-side filter drawer */}
            <IconButton
              label="Filters"
              onClick={onToggleFilters}
              variant="outline"
              className="rounded-[var(--radius-md)] lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </IconButton>

            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={onBook}>
              <span className="hidden sm:inline">Book appointment</span>
              <span className="sm:hidden">Book</span>
            </Button>
          </div>
        </div>

        {/* Server-backed search — always visible in the sticky header */}
        <div className="relative md:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />

          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search customer, service or staff..."
            aria-label="Search appointments"
            className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-[var(--brand-ring)]"
          />
        </div>
      </div>
    </header>
  );
}
