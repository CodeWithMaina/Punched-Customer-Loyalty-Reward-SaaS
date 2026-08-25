"use client";

import Link from "next/link";
import { ChevronRight, Mail, Phone, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessCustomer } from "@/types";

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
            met ? "bg-amber-500" : "bg-brand"
          )}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
      {!compact && (
        <div className="mt-1 flex items-center justify-between text-[11px] font-medium">
          <span className={met ? "text-amber-600" : "text-[var(--text-tertiary)]"}>
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

function lastVisitLabel(lastStampAt?: string): string | null {
  if (!lastStampAt) return null;
  const diff = Date.now() - new Date(lastStampAt).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "Visited today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(lastStampAt).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * Customer roster item. Mobile-first card with reward progress inline.
 */
export function CustomerCard({
  customer,
  rank,
  showRank = false,
}: {
  customer: BusinessCustomer;
  /** 1-based rank when sorted by lifetime stamps. */
  rank?: number;
  showRank?: boolean;
}) {
  const ready =
    customer.stampsRequired != null &&
    customer.stampsRequired > 0 &&
    customer.totalStamps >= customer.stampsRequired;

  return (
    <Link
      href={`/dashboard/business/customers/${customer.userId}`}
      className="group block bg-[var(--surface)] p-4 hover:bg-[var(--surface-raised)] transition-colors animate-fade-in motion-reduce:animate-none"
    >
      <div className="flex items-center gap-3.5">
        <div className="h-11 w-11 rounded-full bg-brand-surface flex items-center justify-center text-sm font-bold text-brand overflow-hidden flex-shrink-0">
          {customer.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={customer.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            customer.fullName.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {customer.fullName}
            </p>
            {(ready || (showRank && rank !== undefined && rank <= 3)) && (
              <Trophy
                className={cn(
                  "h-3.5 w-3.5 flex-shrink-0 text-amber-500",
                  showRank && rank !== undefined && rank <= 3 && "fill-amber-400"
                )}
                aria-label={ready ? "Reward ready" : `Rank ${rank}`}
              />
            )}
          </div>
          <p className="text-xs text-[var(--text-tertiary)] truncate flex items-center gap-1">
            <Mail className="h-3 w-3 flex-shrink-0" />
            {customer.email}
          </p>
          {customer.phoneNumber && (
            <p className="text-[11px] text-[var(--text-tertiary)] truncate flex items-center gap-1 mt-0.5">
              <Phone className="h-3 w-3 flex-shrink-0" />
              {customer.phoneNumber}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
            {customer.totalStamps}
            {customer.stampsRequired ? (
              <span className="text-[11px] text-[var(--text-tertiary)]"> / {customer.stampsRequired}</span>
            ) : null}
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)] whitespace-nowrap">
            {lastVisitLabel(customer.lastStampAt) ?? "No visits"}
          </span>
        </div>

        <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-brand group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </div>

      <div className="mt-3">
        <RewardProgress value={customer.totalStamps} goal={customer.stampsRequired} compact />
      </div>
    </Link>
  );
}

/** Skeleton placeholder matching CustomerCard's layout. */
export function CustomerCardSkeleton() {
  return (
    <div className="bg-[var(--surface)] p-4 space-y-3" aria-hidden>
      <div className="flex items-center gap-3.5">
        <div className="h-11 w-11 rounded-full skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 skeleton rounded-full" />
          <div className="h-2 w-44 skeleton rounded-full" />
        </div>
        <div className="h-3 w-8 skeleton rounded-full" />
      </div>
      <div className="h-1.5 w-full skeleton rounded-full" />
    </div>
  );
}