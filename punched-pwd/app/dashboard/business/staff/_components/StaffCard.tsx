"use client";

import Link from "next/link";
import { Target } from "lucide-react";
import type { ReactNode } from "react";
import type { StaffMember } from "@/types";
import { Avatar, Badge, Button } from "@/components/ui";

/* ============================================================
   STAFF ROSTER ITEM — design-system entity pattern.
   Mobile (<md): entity card. Desktop (≥md): clickable table row
   with a "⋮" ActionMenu for contextual actions.
   ============================================================ */

export type ActivityTone = "active" | "idle" | "inactive";

/** Maps staff activity tone to a semantic Badge variant. */
const ACTIVITY_VARIANT = {
  active: "success",
  idle: "warning",
  inactive: "neutral",
} as const;

export function StaffCard({
  member,
  activity,
  goalPercent,
}: {
  member: StaffMember;
  activity: { text: string; tone: ActivityTone };
  /** 0–100 when a daily goal exists, otherwise null. */
  goalPercent: number | null;
}) {
  const goalBar =
    activity.tone === "active"
      ? "bg-[var(--brand)]"
      : activity.tone === "idle"
        ? "bg-[var(--accent-text)]"
        : "bg-[var(--text-tertiary)]";

  const goalText =
    activity.tone === "active"
      ? "text-[var(--brand)]"
      : activity.tone === "idle"
        ? "text-[var(--accent-text)]"
        : "text-[var(--text-tertiary)]";

  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-brand sm:p-5 md:hidden">
      {/* Identity */}
      <div className="flex items-start gap-3 sm:gap-4">
        <Avatar name={member.fullName} src={member.avatarUrl} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">
                {member.fullName}
              </h3>

              <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                {member.email}
              </p>
            </div>

            <Badge variant={ACTIVITY_VARIANT[activity.tone]} dot>
              {activity.text}
            </Badge>
          </div>
        </div>
      </div>

      {/* Metadata grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[var(--text-secondary)] sm:grid-cols-4">
        <div>
          <p className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Today</p>

          <p className="mt-1 font-medium text-[var(--text-primary)]">
            {(member.stampsToday ?? 0).toLocaleString()} stamps
          </p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Total</p>

          <p className="mt-1 font-medium text-[var(--text-primary)]">
            {(member.stampsIssued ?? 0).toLocaleString()}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Goal</p>

          {goalPercent !== null ? (
            <div className="mt-2 flex items-center gap-2">
              <div
                role="progressbar"
                aria-valuenow={goalPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Daily goal progress for ${member.fullName}`}
                className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border-light)]"
              >
                <div
                  className={`h-full rounded-full ${goalBar}`}
                  style={{ width: `${Math.max(goalPercent, 3)}%` }}
                />
              </div>

              <span className={`w-9 text-right font-semibold tabular-nums ${goalText}`}>
                {goalPercent}%
              </span>
            </div>
          ) : (
            <p className="mt-1 font-medium text-[var(--text-tertiary)]">No goal set</p>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">
            Last active
          </p>

          <p className="mt-1 truncate font-medium text-[var(--text-primary)]">
            {activity.tone === "inactive" && activity.text === "Never active"
              ? "—"
              : activity.text.replace("Active ", "")}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2 border-t border-[var(--border-light)] pt-4">
        <Link
          href={`/dashboard/business/staff/${member.userId}`}
          className="[flex:1_1_0]"
        >
          <Button size="sm" fullWidth className="min-h-[40px]">
            View details
          </Button>
        </Link>

        <Link
          href={`/dashboard/business/staff/${member.userId}/activity`}
          aria-label={`Full activity for ${member.fullName}`}
          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--border-light)]"
        >
          <Target className="h-4 w-4" />
          Activity
        </Link>
      </div>
    </article>
  );
}

/* ── DESKTOP CLICKABLE ROW (≥md) with ⋮ action menu ────────────── */

export function StaffRow({
  member,
  activity,
  goalPercent,
  menu,
}: {
  member: StaffMember;
  activity: { text: string; tone: ActivityTone };
  goalPercent: number | null;
  /** Rendered ActionMenu (⋮) pinned to the row end. */
  menu?: ReactNode;
}) {
  const goalBar =
    activity.tone === "active"
      ? "bg-[var(--brand)]"
      : activity.tone === "idle"
        ? "bg-[var(--accent-text)]"
        : "bg-[var(--text-tertiary)]";

  return (
    <div className="relative hidden items-center border-b border-[var(--border-light)] transition-colors last:border-b-0 hover:bg-[var(--surface-raised)] md:flex">
      <Link
        href={`/dashboard/business/staff/${member.userId}`}
        aria-label={`Open details for ${member.fullName}`}
        className="flex min-w-0 flex-1 items-center gap-4 py-3.5 pl-4 pr-14"
      >
        <Avatar name={member.fullName} src={member.avatarUrl} size="sm" />

        {/* Identity */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[var(--text-primary)]">
            {member.fullName}
          </p>

          <p className="truncate text-xs text-[var(--text-secondary)]">{member.email}</p>
        </div>

        {/* Status */}
        <Badge variant={ACTIVITY_VARIANT[activity.tone]} dot>
          {activity.text}
        </Badge>

        {/* Today */}
        <div className="hidden w-20 shrink-0 text-right lg:block">
          <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
            {member.stampsToday ?? 0}
          </p>

          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            today
          </p>
        </div>

        {/* Total */}
        <div className="w-16 shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
            {(member.stampsIssued ?? 0).toLocaleString()}
          </p>

          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            total
          </p>
        </div>

        {/* Goal progress */}
        <div className="hidden w-32 shrink-0 items-center gap-2 xl:flex">
          {goalPercent !== null ? (
            <>
              <div
                role="progressbar"
                aria-valuenow={goalPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Daily goal progress for ${member.fullName}`}
                className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border-light)]"
              >
                <div
                  className={`h-full rounded-full ${goalBar}`}
                  style={{ width: `${Math.max(goalPercent, 3)}%` }}
                />
              </div>

              <span className="w-9 text-right text-xs font-semibold tabular-nums text-[var(--text-secondary)]">
                {goalPercent}%
              </span>
            </>
          ) : (
            <span className="text-xs text-[var(--text-tertiary)]">No goal</span>
          )}
        </div>

        {/* Last active */}
        <div className="hidden w-28 shrink-0 text-right sm:block">
          <p className="text-xs font-medium text-[var(--text-primary)]">
            {activity.tone === "inactive" && activity.text === "Never active"
              ? "—"
              : activity.text.replace("Active ", "")}
          </p>

          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            last active
          </p>
        </div>
      </Link>

      {/* Row actions (⋮) — sibling of the Link so it never navigates */}
      {menu && <div className="absolute right-3 top-1/2 -translate-y-1/2">{menu}</div>}
    </div>
  );
}
