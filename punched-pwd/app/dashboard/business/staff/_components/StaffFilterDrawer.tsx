"use client";

import { Drawer } from "@/components/ui/Modal";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { StaffListFilters } from "./filters";

export const STATUS_OPTIONS: { value: StaffListFilters["status"]; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const ACTIVITY_OPTIONS: { value: StaffListFilters["activity"]; label: string }[] = [
  { value: undefined, label: "Any day" },
  { value: "today", label: "Active today" },
  { value: "week", label: "Active this week" },
  { value: "idle", label: "Idle 7 days" },
];

const GOAL_OPTIONS: { value: StaffListFilters["goalStatus"]; label: string }[] = [
  { value: undefined, label: "All goals" },
  { value: "met", label: "Met today" },
  { value: "behind", label: "Behind today" },
  { value: "none", label: "No goal set" },
];

function OptionRow<T extends string | undefined>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">
        {label}
      </legend>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.label}
            type="button"
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-2 rounded-full text-xs font-semibold transition-all active:scale-[0.97] min-h-[36px] ${
              value === opt.value
                ? "bg-brand text-white shadow-sm"
                : "bg-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Advanced staff filters.
 * Mobile: bottom sheet (Drawer's base behaviour).
 * sm+: right-side partial-width drawer.
 */
export function StaffFilterDrawer({
  open,
  onClose,
  draft,
  onDraftChange,
  onApply,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  draft: StaffListFilters;
  onDraftChange: (f: StaffListFilters) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const hasDraftValues = Boolean(draft.status || draft.activity || draft.goalStatus);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Filters"
      description="Narrow the roster by status, activity and goals."
      size="md"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" fullWidth onClick={onClear} disabled={!hasDraftValues}>
            Clear all
          </Button>
          <Button variant="primary" fullWidth onClick={onApply}>
            Apply filters
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <OptionRow
          label="Status"
          options={STATUS_OPTIONS}
          value={draft.status}
          onChange={(status) => onDraftChange({ ...draft, status })}
        />
        <OptionRow
          label="Activity"
          options={ACTIVITY_OPTIONS}
          value={draft.activity}
          onChange={(activity) => onDraftChange({ ...draft, activity })}
        />
        <OptionRow
          label="Daily goal"
          options={GOAL_OPTIONS}
          value={draft.goalStatus}
          onChange={(goalStatus) => onDraftChange({ ...draft, goalStatus })}
        />
      </div>
    </Drawer>
  );
}

/** Removable chips describing every applied filter. */
export function StaffFilterChips({
  applied,
  onRemove,
  onClearAll,
}: {
  applied: StaffListFilters;
  onRemove: (key: keyof StaffListFilters) => void;
  onClearAll: () => void;
}) {
  const labels: Partial<Record<keyof StaffListFilters, string>> = {
    status: applied.status ? `Status: ${applied.status === "active" ? "Active" : "Inactive"}` : "",
    activity:
      applied.activity === "today"
        ? "Active today"
        : applied.activity === "week"
          ? "Active this week"
          : applied.activity
            ? "Idle 7 days"
            : "",
    goalStatus:
      applied.goalStatus === "met"
        ? "Goal: Met"
        : applied.goalStatus === "behind"
          ? "Goal: Behind"
          : applied.goalStatus
            ? "No goal set"
            : "",
  };

  const activeKeys = (Object.keys(labels) as (keyof StaffListFilters)[]).filter(
    (k) => labels[k]
  );

  if (activeKeys.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="list" aria-label="Applied filters">
      {activeKeys.map((key) => (
        <span
          role="listitem"
          key={key}
          className="inline-flex items-center gap-1 bg-[var(--border-light)] text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-xl border border-[var(--border)] animate-fade-in motion-reduce:animate-none"
        >
          {labels[key]}
          <button
            onClick={() => onRemove(key)}
            aria-label={`Remove filter ${labels[key]}`}
            className="hover:text-[var(--text-primary)] ml-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {activeKeys.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand)] hover:underline px-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/** Trigger button showing an active-filter count. */
export function FilterTrigger({
  count,
  onClick,
  active,
}: {
  count: number;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`Open filters${count ? ` (${count} active)` : ""}`}
      aria-expanded={active}
      className={`relative h-auto w-12 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all min-h-[44px] ${
        active
          ? "bg-[var(--brand)] border-[var(--brand)] text-[var(--background)]"
          : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)]"
      }`}
    >
      <SlidersHorizontal className="h-4 w-4" />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 bg-[var(--accent)] text-[var(--accent-text)] text-[9px] font-bold flex items-center justify-center rounded-full"
        >
          {count}
        </span>
      )}
    </button>
  );
}
