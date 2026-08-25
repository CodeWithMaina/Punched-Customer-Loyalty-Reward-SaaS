"use client";

import Link from "next/link";
import {
  Mail,
  MoreHorizontal,
  Stamp,
} from "lucide-react";

import type { StaffMember } from "@/types";
import {
  GoalProgress,
  ActivityBadge,
} from "./GoalProgress";

export function StaffCard({
  staff,
  rank,
  showRank = false,
}: {
  staff: StaffMember;
  rank?: number;
  showRank?: boolean;
}) {
  const initials = staff.fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const stampsToday = staff.stampsToday ?? 0;
  const stampsThisWeek = staff.stampsLast7d ?? 0;

  return (
    <Link
      href={`/dashboard/business/staff/${staff.userId}`}
      className="
        group
        relative
        block
        overflow-hidden
        rounded-[20px]
        border
        border-[var(--border-light,var(--border))]
        bg-[var(--surface)]
        p-5
        shadow-[0_4px_12px_rgba(31,108,58,0.04)]
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:border-[var(--brand)]/40
        hover:bg-[var(--surface-raised)]
        hover:shadow-[0_8px_24px_rgba(31,108,58,0.08)]
        active:scale-[0.99]
        motion-reduce:transition-none
        motion-reduce:hover:translate-y-0
        motion-reduce:active:scale-100
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
        {/* Avatar with live status dot */}
        <div className="relative shrink-0">
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              overflow-hidden
              rounded-full
              border-2
              border-[var(--surface)]
              bg-[var(--brand-surface)]
              text-sm
              font-bold
              text-[var(--brand)]
            "
          >
            {staff.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={staff.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          <span
            aria-hidden
            className="absolute -bottom-1 -right-1 rounded-full border-2 border-[var(--surface)] p-0.5"
          >
            <span className="block h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
          </span>
        </div>

        {/* Identity */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-[var(--text-primary)]">
            {staff.fullName}
          </p>

          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <Mail
              className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]"
              aria-hidden
            />

            <p className="truncate text-xs text-[var(--text-tertiary)]">
              {staff.email}
            </p>
          </div>
        </div>
      </div>

      {/* Overflow menu affordance */}
      <span
        aria-hidden
        className="
          shrink-0
          rounded-full
          p-1.5
          text-[var(--text-muted)]
          transition-colors
          group-hover:bg-[var(--surface-container-low,var(--surface-raised))]
          group-hover:text-[var(--text-secondary)]
        "
      >
        <MoreHorizontal className="h-4 w-4" />
      </span>
    </div>

    {/* Stats box */}
    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[var(--border-light,var(--border))] bg-[var(--background)] p-3">
      <div className="min-w-0">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
          Total stamps
        </p>
        <p className="flex items-center gap-1.5 font-headline text-lg font-extrabold tabular-nums text-[var(--text-primary)]">
          <Stamp
            className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]"
            aria-hidden
          />
          {staff.stampsIssued.toLocaleString()}
        </p>
      </div>

      <div className="min-w-0 border-l border-[var(--border-light,var(--border))] pl-3">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
          Last active
        </p>
        <ActivityBadge lastActivityAt={staff.lastActivityAt} />
      </div>
    </div>

    {/* Daily goal */}
    {staff.dailyGoal && staff.dailyGoal > 0 && (
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
            Daily goal progress
          </span>

          <span className="font-headline text-xs font-extrabold tabular-nums text-[var(--brand)]">
            {Math.min(
              Math.round((stampsToday / staff.dailyGoal) * 100),
              100
            )}
            %
          </span>
        </div>

        <GoalProgress
          value={stampsToday}
          goal={staff.dailyGoal}
          compact
        />
      </div>
    )}

      {/* Weekly context when no goal is set */}
      {!staff.dailyGoal && stampsThisWeek > 0 && (
        <p className="mt-4 truncate text-[11px] text-[var(--text-tertiary)]">
          {stampsThisWeek.toLocaleString()} stamps in the last 7 days
        </p>
      )}

      {/* Rank */}
      {showRank && rank !== undefined && (
        <div className="absolute right-4 top-3">
          <span className="text-[9px] font-semibold tabular-nums text-[var(--text-muted)]">
            #{rank}
          </span>
        </div>
      )}
    </Link>
  );
}

/**
 * Premium skeleton state matching the redesigned card.
 */
export function StaffCardSkeleton() {
  return (
    <div
      className="
        rounded-[20px]
        border
        border-[var(--border-light,var(--border))]
        bg-[var(--surface)]
        p-5
      "
      aria-hidden
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 rounded-full skeleton" />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-28 rounded-md skeleton" />
          <div className="h-2.5 w-40 rounded-md skeleton" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[var(--border-light,var(--border))] p-3">
        <div className="space-y-2">
          <div className="h-2.5 w-16 rounded-md skeleton" />
          <div className="h-4 w-12 rounded-md skeleton" />
        </div>

        <div className="space-y-2">
          <div className="h-2.5 w-14 rounded-md skeleton" />
          <div className="h-4 w-16 rounded-md skeleton" />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between">
          <div className="h-2.5 w-24 rounded-md skeleton" />
          <div className="h-2.5 w-8 rounded-md skeleton" />
        </div>

        <div className="h-2 rounded-full skeleton" />
      </div>
    </div>
  );
}