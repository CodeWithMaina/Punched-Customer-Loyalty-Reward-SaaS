"use client";

import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { BusinessCustomer } from "@/types";
import { Avatar } from "@/components/ui";

/* ============================================================
   CUSTOMER ROSTER ITEM — design-system entity pattern.
   Mobile (<md): user card. Desktop (≥md): clickable row.
   Both are a single <Link> to the customer detail page and
   accept an optional "⋮" ActionMenu for contextual actions.
   ============================================================ */

/** Rounded reward-progress bar (current cycle stamps vs threshold). */
export function RewardProgress({
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
  const pct = goal && goal > 0 ? Math.min(Math.round((value / goal) * 100), 100) : null;
  const met = pct !== null && pct >= 100;

  return (
    <div className={cn("w-full", className)}>
      <div
        role="progressbar"
        aria-valuenow={pct ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={goal ? `${pct}% of reward progress` : "No reward program"}
        className="w-full h-1.5 bg-[var(--border-light)] overflow-hidden rounded-full"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
            met ? "bg-[var(--accent)]" : "bg-brand"
          )}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
      {!compact && (
        <div className="mt-1 flex items-center justify-between text-[11px] font-medium">
          <span className={met ? "text-[var(--accent-text)]" : "text-[var(--text-tertiary)]"}>
            {pct === null ? "No active program" : met ? "Ready to redeem" : `${pct}%`}
          </span>

          {goal ? (
            <span className="text-[var(--text-muted)] tabular-nums">
              {value} / {goal}
            </span>
          ) : (
            <span className="text-[var(--text-muted)] tabular-nums">{value} stamps</span>
          )}
        </div>
      )}
    </div>
  );
}

export function lastVisitLabel(lastStampAt?: string): string | null {
  if (!lastStampAt) return null;
  const diff = Date.now() - new Date(lastStampAt).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "Visited today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(lastStampAt).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Shared ready-to-reduce / top-rank trophy condition. */
function showTrophy(customer: BusinessCustomer, showRank: boolean, rank?: number) {
  const ready =
    customer.stampsRequired != null &&
    customer.stampsRequired > 0 &&
    customer.totalStamps >= customer.stampsRequired;
  return ready || (showRank && rank !== undefined && rank <= 3);
}

/* ── MOBILE USER CARD (<md) ────────────────────────────────────── */

export function CustomerCard({
  customer,
  rank,
  showRank = false,
  menu,
}: {
  customer: BusinessCustomer;
  rank?: number;
  showRank?: boolean;
  /** Rendered ActionMenu (⋮) pinned to the card header. */
  menu?: ReactNode;
}) {
  return (
    <article className="relative rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-brand md:hidden">
      <Link
        href={`/dashboard/business/customers/${customer.userId}`}
        aria-label={`Open details for ${customer.fullName}`}
        className={cn("block", menu && "pr-10")}
      >
        <div className="flex items-center gap-3">
          <Avatar name={customer.fullName} src={customer.avatarUrl} size="md" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">
                {customer.fullName}
              </h3>

              {showTrophy(customer, showRank, rank) && (
                <Trophy className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" aria-label="Reward highlight" />
              )}
            </div>

            <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{customer.email}</p>
          </div>

          {!menu && <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />}
        </div>

        {/* Metadata grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[var(--text-secondary)]">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Stamps</p>

            <p className="mt-1 font-medium tabular-nums text-[var(--text-primary)]">
              {customer.totalStamps}
              {customer.stampsRequired ? (
                <span className="text-[var(--text-tertiary)]"> / {customer.stampsRequired}</span>
              ) : null}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">
              Last visit
            </p>

            <p className="mt-1 font-medium text-[var(--text-primary)]">
              {lastVisitLabel(customer.lastStampAt) ?? "No visits"}
            </p>
          </div>
        </div>

        {/* Reward progress */}
        <div className="mt-4 border-t border-[var(--border-light)] pt-4">
          <RewardProgress value={customer.totalStamps} goal={customer.stampsRequired} compact />
        </div>
      </Link>

      {/* Card actions (⋮) — sibling of the Link so it never navigates */}
      {menu && <div className="absolute right-2 top-2">{menu}</div>}
    </article>
  );
}

/* ── DESKTOP CLICKABLE ROW (≥md) ───────────────────────────────── */

export function CustomerRow({
  customer,
  rank,
  showRank = false,
  menu,
}: {
  customer: BusinessCustomer;
  rank?: number;
  showRank?: boolean;
  /** Rendered ActionMenu (⋮) pinned to the row end. */
  menu?: ReactNode;
}) {
  return (
    <div className="relative hidden border-b border-[var(--border-light)] transition-colors last:border-b-0 hover:bg-[var(--surface-raised)] md:block">
      <Link
        href={`/dashboard/business/customers/${customer.userId}`}
        aria-label={`Open details for ${customer.fullName}`}
        className={cn("group flex items-center gap-4 py-3.5 pl-4", menu ? "pr-14" : "pr-4")}
      >
        <Avatar name={customer.fullName} src={customer.avatarUrl} size="sm" />

        {/* Identity + contact */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-bold text-[var(--text-primary)]">
              {customer.fullName}
            </p>

            {showTrophy(customer, showRank, rank) && (
              <Trophy className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" aria-label="Reward highlight" />
            )}
          </div>

          <p className="truncate text-xs text-[var(--text-secondary)]">
            {customer.email}
            {customer.phoneNumber ? ` · ${customer.phoneNumber}` : ""}
          </p>
        </div>

        {/* Stamps */}
        <div className="w-24 shrink-0 text-right">
          <p className="text-sm font-bold tabular-nums text-[var(--text-primary)]">
            {customer.totalStamps}
            {customer.stampsRequired ? (
              <span className="text-xs font-medium text-[var(--text-tertiary)]">
                {" "}
                / {customer.stampsRequired}
              </span>
            ) : null}
          </p>

          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            stamps
          </p>
        </div>

        {/* Reward progress */}
        <div className="hidden w-40 shrink-0 lg:block">
          <RewardProgress value={customer.totalStamps} goal={customer.stampsRequired} compact />
        </div>

        {/* Last visit */}
        <div className="hidden w-28 shrink-0 text-right sm:block">
          <p className="text-xs font-medium text-[var(--text-primary)]">
            {lastVisitLabel(customer.lastStampAt) ?? "No visits"}
          </p>

          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            last visit
          </p>
        </div>

        {!menu && (
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-all group-hover:translate-x-0.5 group-hover:text-brand" />
        )}
      </Link>

      {/* Row actions (⋮) — sibling of the Link so it never navigates */}
      {menu && <div className="absolute right-3 top-1/2 -translate-y-1/2">{menu}</div>}
    </div>
  );
}

/** Skeleton placeholder matching the roster item layouts. */
export function CustomerItemSkeleton({ variant }: { variant: "card" | "row" }) {
  if (variant === "card") {
    return (
      <div
        className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 md:hidden"
        aria-hidden
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full skeleton" />

          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 rounded skeleton" />
            <div className="h-2 w-44 rounded skeleton" />
          </div>
        </div>

        <div className="h-1.5 w-full rounded-full skeleton" />
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-4 px-4 py-4 md:flex" aria-hidden>
      <div className="h-9 w-9 rounded-full skeleton" />

      <div className="flex-1 space-y-2">
        <div className="h-3 w-40 rounded skeleton" />
        <div className="h-2 w-56 rounded skeleton" />
      </div>

      <div className="h-3 w-16 rounded skeleton" />
      <div className="hidden h-1.5 w-40 rounded-full skeleton lg:block" />
      <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
    </div>
  );
}


