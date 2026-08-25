"use client";

import { Plus, SlidersHorizontal } from "lucide-react";
import { Button, IconButton } from "@/components/ui";

export function AppointmentsHeader({
  onToggleFilters,
  onBook,
}: {
  onToggleFilters: () => void;
  onBook: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
            Appointments
          </h1>

          <p className="hidden text-xs text-[var(--text-secondary)] sm:block">
            Manage your schedule and upcoming bookings
          </p>
        </div>

        <div className="flex items-center gap-2">
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
    </header>
  );
}