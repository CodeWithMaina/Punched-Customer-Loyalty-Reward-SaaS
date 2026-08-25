"use client";

import { Drawer } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SlidersHorizontal, X } from "lucide-react";
import type { CustomerListFilters } from "./filters";

const STATUS_OPTIONS: { value: CustomerListFilters["status"]; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "active", label: "Active · 7d" },
  { value: "ready", label: "Reward ready" },
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
 * Advanced customer filters.
 * Mobile: bottom sheet. sm+: right-side partial-width drawer.
 */
export function CustomerFilterDrawer({
  open,
  onClose,
  draft,
  onDraftChange,
  onApply,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  draft: CustomerListFilters;
  onDraftChange: (f: CustomerListFilters) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const hasDraftValues = Boolean(
    draft.status || draft.enrolledFrom || draft.enrolledTo
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Filters"
      description="Narrow customers by status or enrolment window."
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

        <fieldset>
          <legend className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">
            Enrolled between
          </legend>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="enrolled-from">Enrolled from</label>
            <input
              id="enrolled-from"
              type="date"
              value={draft.enrolledFrom ?? ""}
              onChange={(e) =>
                onDraftChange({ ...draft, enrolledFrom: e.target.value || undefined })
              }
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-[var(--brand-ring)] min-h-[44px]"
            />
            <span className="text-xs text-[var(--text-muted)]">to</span>
            <label className="sr-only" htmlFor="enrolled-to">Enrolled to</label>
            <input
              id="enrolled-to"
              type="date"
              value={draft.enrolledTo ?? ""}
              onChange={(e) =>
                onDraftChange({ ...draft, enrolledTo: e.target.value || undefined })
              }
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-[var(--brand-ring)] min-h-[44px]"
            />
          </div>
        </fieldset>
      </div>
    </Drawer>
  );
}
/** Removable chips describing every applied filter. */
export function CustomerFilterChips({
  applied,
  onRemove,
  onClearAll,
}: {
  applied: CustomerListFilters;
  onRemove: (key: keyof CustomerListFilters) => void;
  onClearAll: () => void;
}) {
  const labels: Partial<Record<keyof CustomerListFilters, string>> = {
    status:
      applied.status === "active"
        ? "Active · 7d"
        : applied.status
          ? "Reward ready"
          : "",
    enrolledFrom: applied.enrolledFrom ? `From ${applied.enrolledFrom}` : "",
    enrolledTo: applied.enrolledTo ? `To ${applied.enrolledTo}` : "",
  };

  const activeKeys = (Object.keys(labels) as (keyof CustomerListFilters)[]).filter(
    (k) => labels[k]
  );

  if (activeKeys.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="list" aria-label="Applied filters">
      {activeKeys.map((key) => (
        <span
          role="listitem"
          key={key}
          className="inline-flex items-center gap-1 bg-brand-surface text-brand text-[11px] font-semibold px-2.5 py-1 rounded-full animate-fade-in motion-reduce:animate-none"
        >
          {labels[key]}
          <button
            onClick={() => onRemove(key)}
            aria-label={`Remove filter ${labels[key]}`}
            className="hover:text-brand-dark ml-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {activeKeys.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-[10px] font-bold uppercase tracking-widest text-brand hover:underline px-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/** Trigger button showing an active-filter count. */
export function CustomerFilterTrigger({
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
      className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-2xl border flex items-center justify-center flex-shrink-0 transition-all ${
        active
          ? "bg-brand border-brand text-white shadow-sm"
          : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-brand"
      }`}
    >
      <SlidersHorizontal className="h-4 w-4" />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 bg-accent text-accent-text text-[9px] font-bold flex items-center justify-center rounded-full"
        >
          {count}
        </span>
      )}
    </button>
  );
}
