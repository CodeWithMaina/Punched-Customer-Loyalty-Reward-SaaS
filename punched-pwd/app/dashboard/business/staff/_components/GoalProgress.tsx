"use client";

import { cn } from "@/lib/utils";

/**
 * Premium goal progress indicator.
 *
 * Visual principles:
 * - Very thin progress track
 * - Brand color for active progress
 * - Success color only when the goal is actually complete
 * - Minimal typography
 * - Works across all application themes
 */
export function GoalProgress({
  value,
  goal,
  className,
  compact = false,
}: {
  value: number;
  goal?: number | null;
  className?: string;
  compact?: boolean;
}) {
  const pct =
    goal && goal > 0
      ? Math.min(Math.round((value / goal) * 100), 100)
      : null;

  const met = pct !== null && pct >= 100;

  return (
    <div className={cn("w-full", className)}>
      <div
        role="progressbar"
        aria-valuenow={pct ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={goal ? `${pct}% of daily goal` : "No goal set"}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-[var(--border-light)]",
          compact ? "h-1" : "h-1.5"
        )}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
            met ? "bg-[var(--success)]" : "bg-[var(--brand)]"
          )}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>

      {!compact && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.14em]",
              met
                ? "text-[var(--success-text)]"
                : "text-[var(--text-tertiary)]"
            )}
          >
            {pct === null
              ? "No goal set"
              : met
                ? "Goal complete"
                : `${pct}% complete`}
          </span>

          <span className="text-[11px] font-medium tabular-nums text-[var(--text-secondary)]">
            {goal ? `${value} / ${goal}` : `${value} today`}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact activity indicator.
 *
 * Intentionally subtle:
 * - Green only communicates recent activity
 * - Inactive states remain neutral
 * - No loud pills unless necessary
 */
export function ActivityBadge({
  lastActivityAt,
}: {
  lastActivityAt?: string | null;
}) {
  if (!lastActivityAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-tertiary)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--border)]" />
        Never active
      </span>
    );
  }

  const diff = Date.now() - new Date(lastActivityAt).getTime();

  const days = Math.max(
    0,
    Math.floor(diff / 86_400_000)
  );

  const active7d = days < 7;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-medium",
        active7d
          ? "text-[var(--success-text)]"
          : "text-[var(--text-tertiary)]"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active7d
            ? "bg-[var(--success)]"
            : "bg-[var(--border)]"
        )}
      />

      {active7d
        ? days < 1
          ? "Active today"
          : `${days}d ago`
        : "Inactive"}
    </span>
  );
}