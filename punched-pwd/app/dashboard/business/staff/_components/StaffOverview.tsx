"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  Mail,
  Stamp,
  Target,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";

import type { StaffOverviewResponse } from "@/types";
import { EmptyState } from "@/components/ui/States";
import { GoalProgress } from "./GoalProgress";

/* -------------------------------------------------------------------------- */
/* Summary metric                                                              */
/* -------------------------------------------------------------------------- */

function SummaryMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  detail?: string;
}) {
  return (
    <div className="group min-w-0">
      <div className="flex items-center gap-2">
        <div
          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-[var(--brand-surface)]
            text-[var(--brand)]
          "
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>

        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
          {label}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-headline text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {value}
        </span>

        {detail && (
          <span className="truncate text-[10px] text-[var(--text-tertiary)]">
            {detail}
          </span>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Staff list                                                                  */
/* -------------------------------------------------------------------------- */

function MiniStaffList({
  title,
  description,
  icon: Icon,
  staff,
  emptyText,
  showGoal = false,
  metric = "week",
  accent = false,
}: {
  title: string;
  description?: string;
  icon: typeof Trophy;
  staff: StaffOverviewResponse["topPerformers"];
  emptyText: string;
  showGoal?: boolean;
  metric?: "week" | "today";
  accent?: boolean;
}) {
  return (
    <section
      className="
        overflow-hidden
        rounded-2xl
        border
        border-[var(--border)]
        bg-[var(--surface)]
      "
    >
      {/* Header */}
      <header className="flex items-start gap-3 border-b border-[var(--border-light)] px-4 py-4">
        <div
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            accent
              ? "bg-[var(--accent-light)] text-[var(--accent-text)]"
              : "bg-[var(--brand-surface)] text-[var(--brand)]",
          ].join(" ")}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </h3>

          {description && (
            <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">
              {description}
            </p>
          )}
        </div>

        <span className="ml-auto shrink-0 rounded-full bg-[var(--border-light)] px-2 py-1 text-[9px] font-semibold tabular-nums text-[var(--text-secondary)]">
          {staff.length}
        </span>
      </header>

      {staff.length === 0 ? (
        <div className="px-4 py-7">
          <p className="text-xs leading-5 text-[var(--text-tertiary)]">
            {emptyText}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-light)]">
          {staff.map((member) => (
            <li key={member.userId}>
              <Link
                href={`/dashboard/business/staff/${member.userId}`}
                className="
                  group
                  flex
                  items-center
                  gap-3
                  px-4
                  py-3.5
                  transition-colors
                  hover:bg-[var(--brand-surface)]
                "
              >
                {/* Avatar */}
                <div
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-[var(--brand-light)]
                    text-[10px]
                    font-bold
                    text-[var(--brand-text)]
                  "
                >
                  {member.fullName
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>

                {/* Identity */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                    {member.fullName}
                  </p>

                  <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                    <Mail className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">
                      {member.email}
                    </span>
                  </p>
                </div>

                {/* Goal */}
                {showGoal && (
                  <div className="hidden w-24 shrink-0 sm:block">
                    <GoalProgress
                      value={member.stampsToday ?? 0}
                      goal={member.dailyGoal}
                      compact
                    />
                  </div>
                )}

                {/* Metric */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <Stamp
                    className="h-3 w-3 text-[var(--brand)]"
                    aria-hidden
                  />

                  <span className="text-xs font-bold tabular-nums text-[var(--text-primary)]">
                    {metric === "today"
                      ? member.stampsToday ?? 0
                      : member.stampsLast7d ?? 0}
                  </span>
                </div>

                <ChevronRight
                  className="
                    h-3.5
                    w-3.5
                    shrink-0
                    text-[var(--text-muted)]
                    transition-all
                    group-hover:translate-x-0.5
                    group-hover:text-[var(--brand)]
                  "
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Main overview                                                               */
/* -------------------------------------------------------------------------- */

export function StaffOverview({
  overview,
  isLoading,
}: {
  overview: StaffOverviewResponse | null;
  isLoading: boolean;
}) {
  /* ------------------------------------------------------------------------ */
  /* Loading                                                                   */
  /* ------------------------------------------------------------------------ */

  if (isLoading || !overview) {
    return (
      <div className="mx-4 mt-6 space-y-5 md:mx-6">
        {/* Summary skeleton */}
        <div
          className="
            grid
            grid-cols-2
            gap-5
            rounded-2xl
            border
            border-[var(--border)]
            bg-[var(--surface)]
            p-5
            md:grid-cols-4
          "
          aria-hidden
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <div className="h-8 w-8 rounded-lg skeleton" />
              <div className="h-6 w-14 rounded-md skeleton" />
              <div className="h-2.5 w-20 rounded-md skeleton" />
            </div>
          ))}
        </div>

        {/* Insight skeleton */}
        <div
          className="
            rounded-2xl
            border
            border-[var(--border)]
            bg-[var(--surface)]
            p-5
          "
          aria-hidden
        >
          <div className="h-3 w-28 rounded-md skeleton" />
          <div className="mt-3 h-8 w-24 rounded-md skeleton" />
          <div className="mt-5 h-1.5 w-full rounded-full skeleton" />
        </div>

        {/* Lists */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="
                h-56
                rounded-2xl
                border
                border-[var(--border)]
                bg-[var(--surface)]
                skeleton
              "
            />
          ))}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Empty state                                                               */
  /* ------------------------------------------------------------------------ */

  if (
    overview.totalStaff === 0 &&
    overview.pendingInvitations === 0
  ) {
    return (
      <div className="mx-4 mt-6 md:mx-6">
        <div
          className="
            overflow-hidden
            rounded-2xl
            border
            border-[var(--border)]
            bg-[var(--surface)]
          "
        >
          <EmptyState
            icon={<UserPlus className="h-6 w-6" />}
            title="Build your team"
            description="Invite your first team member to start tracking stamps, goals and activity."
          />
        </div>
      </div>
    );
  }

  const staffWithGoals = overview.staffWithGoals || 0;

  const goalPercentage =
    staffWithGoals > 0
      ? Math.round(
          (overview.goalsMetToday / staffWithGoals) * 100
        )
      : 0;

  const attentionCount =
    overview.needsAttention.length;

  /* ------------------------------------------------------------------------ */
  /* Main                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="mx-4 mt-6 space-y-5 pb-8 md:mx-6 lg:mx-8">
      {/* -------------------------------------------------------------------- */}
      {/* Team summary                                                          */}
      {/* -------------------------------------------------------------------- */}

      <section
        className="
          rounded-2xl
          border
          border-[var(--border)]
          bg-[var(--surface)]
          p-5
          md:p-6
        "
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Team overview
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
              A quick look at your team&apos;s activity.
            </p>
          </div>

          <Link
            href="/dashboard/business/staff"
            className="
              group
              inline-flex
              items-center
              gap-1.5
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.12em]
              text-[var(--brand)]
              transition-colors
              hover:text-[var(--brand-hover)]
            "
          >
            View team

            <ArrowUpRight
              className="
                h-3.5
                w-3.5
                transition-transform
                group-hover:-translate-y-0.5
                group-hover:translate-x-0.5
              "
              aria-hidden
            />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-6 md:grid-cols-4">
          <SummaryMetric
            icon={Users}
            label="Team members"
            value={overview.totalStaff}
          />

          <SummaryMetric
            icon={Activity}
            label="Active this week"
            value={overview.activeStaff7d}
            detail={
              overview.totalStaff > 0
                ? `${Math.round(
                    (overview.activeStaff7d /
                      overview.totalStaff) *
                      100
                  )}%`
                : undefined
            }
          />

          <SummaryMetric
            icon={Stamp}
            label="Stamps today"
            value={overview.stampsToday}
          />

          <SummaryMetric
            icon={Mail}
            label="Pending invites"
            value={overview.pendingInvitations}
          />
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* Performance insight                                                   */}
      {/* -------------------------------------------------------------------- */}

      <section
        className="
          overflow-hidden
          rounded-2xl
          border
          border-[var(--border)]
          bg-[var(--surface)]
        "
      >
        <div className="grid md:grid-cols-[1fr_auto]">
          {/* Goal performance */}
          <div className="p-5 md:p-6">
            <div className="flex items-center gap-2">
              <div
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  bg-[var(--brand-surface)]
                  text-[var(--brand)]
                "
              >
                <Target
                  className="h-3.5 w-3.5"
                  aria-hidden
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Today&apos;s goals
                </p>

                <p className="text-[10px] text-[var(--text-tertiary)]">
                  Team progress against daily targets
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-end gap-2">
              <span className="font-headline text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                {overview.goalsMetToday}
              </span>

              <span className="mb-1 text-xs text-[var(--text-tertiary)]">
                of {staffWithGoals} goal holders
              </span>
            </div>

            <div className="mt-4 max-w-xl">
              <GoalProgress
                value={overview.goalsMetToday}
                goal={staffWithGoals || undefined}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[var(--text-tertiary)]">
              <span>
                {goalPercentage}% of goal holders on target
              </span>

              <span className="text-[var(--border)]">
                •
              </span>

              <span>
                {overview.stampsThisWeek} team stamps this week
              </span>
            </div>
          </div>

          {/* Attention */}
          <div
            className="
              border-t
              border-[var(--border-light)]
              p-5
              md:min-w-[260px]
              md:border-l
              md:border-t-0
              md:p-6
            "
          >
            <div className="flex items-center justify-between gap-4">
              <div
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  attentionCount > 0
                    ? "bg-[var(--accent-light)] text-[var(--accent-text)]"
                    : "bg-[var(--border-light)] text-[var(--text-tertiary)]",
                ].join(" ")}
              >
                <AlertTriangle
                  className="h-3.5 w-3.5"
                  aria-hidden
                />
              </div>

              {attentionCount > 0 && (
                <span
                  className="
                    rounded-full
                    bg-[var(--accent-light)]
                    px-2
                    py-1
                    text-[9px]
                    font-bold
                    text-[var(--accent-text)]
                  "
                >
                  Needs attention
                </span>
              )}
            </div>

            <p className="mt-5 font-headline text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {attentionCount}
            </p>

            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              {attentionCount === 1
                ? "staff member behind goal"
                : "staff members behind goal"}
            </p>

            {staffWithGoals > 0 && (
              <p className="mt-4 text-[10px] leading-4 text-[var(--text-tertiary)]">
                {goalPercentage}% of goal holders have reached their target today.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* Performance lists                                                     */}
      {/* -------------------------------------------------------------------- */}

      <div>
        <div className="mb-3 flex items-end justify-between gap-4 px-1">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Staff performance
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
              See who&apos;s leading, who needs support and who&apos;s active.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <MiniStaffList
            title="Top performers"
            description="Highest stamp activity in 7 days"
            icon={Trophy}
            staff={overview.topPerformers}
            emptyText="No stamp activity in the last 7 days."
            metric="week"
          />

          <MiniStaffList
            title="Needs attention"
            description="Behind their daily goal"
            icon={AlertTriangle}
            staff={overview.needsAttention}
            emptyText="Everyone with a goal is on track today."
            showGoal
            metric="today"
            accent
          />

          <MiniStaffList
            title="Recently active"
            description="Latest team activity"
            icon={Activity}
            staff={overview.recentlyActive}
            emptyText="No activity recorded yet."
            metric="week"
          />
        </div>
      </div>
    </div>
  );
}