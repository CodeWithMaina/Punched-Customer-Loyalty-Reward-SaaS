"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import type {
  AnalyticsPeriod,
  StaffMemberAnalyticsResponse,
  StaffActivityItem,
} from "@/types";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Mail,
  Pencil,
  QrCode,
  ShieldCheck,
  Stamp,
} from "lucide-react";
import { ErrorState } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { GoalProgress, ActivityBadge } from "../_components/GoalProgress";
import { EditGoalModal } from "../_components/EditGoalModal";

const RECENT_COUNT = 5;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: "Today", value: "today" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "All time", value: "all" },
];

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: typeof Stamp;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand)]/10 text-[var(--brand)]">
        <Icon className="h-3.5 w-3.5" />
      </span>
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--border-light,var(--border))] bg-[var(--background)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
        {label}
      </p>

      <p className="mt-2 font-headline text-3xl font-extrabold tabular-nums tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function ActivityRow({ item }: { item: StaffActivityItem }) {
  const isStamp = item.activityType === "stamp";

  return (
    <li className="relative flex gap-3 px-5 py-4 transition-colors hover:bg-[var(--surface-container-low,var(--surface-raised))] sm:px-6">
      {/* Timeline connector */}
      <span
        aria-hidden
        className="absolute bottom-0 left-[31px] top-12 w-px bg-[var(--border-light,var(--border))]"
      />

      <div
        className={[
          "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isStamp
            ? "bg-[var(--brand-surface)] text-[var(--brand)]"
            : "bg-[var(--accent-light)] text-[var(--accent-text)]",
        ].join(" ")}
      >
        {isStamp ? (
          <Stamp className="h-3.5 w-3.5" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm leading-5 text-[var(--text-primary)]">
          {isStamp ? "Stamp issued" : "Reward redeemed"}{" "}
          <span className="font-semibold">for {item.customerName}</span>
          {isStamp && item.stampNumber > 0 && (
            <span className="text-[var(--text-tertiary)]">
              {" "}· Stamp {item.stampNumber}
            </span>
          )}
        </p>

        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {timeAgo(item.stampedAt)}
        </p>
      </div>
    </li>
  );
}

export default function StaffDetailPage() {
  useRoleGuard("Business");

  const { staffId } = useParams<{ staffId: string }>();

  const [analytics, setAnalytics] =
    useState<StaffMemberAnalyticsResponse | null>(null);

  const [period, setPeriod] = useState<AnalyticsPeriod>("all");
  const [recentActivity, setRecentActivity] = useState<StaffActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [businessDefaultGoal, setBusinessDefaultGoal] = useState<number | null>(
    null
  );

  const [todayStamps, setTodayStamps] = useState(0);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    Promise.all([
      businessesApi.getStaffMemberAnalytics(staffId, "all"),
      businessesApi.getStaffMemberAnalytics(staffId, "today"),
      businessesApi.getMine(),
    ])
      .then(([analyticsRes, todayRes, bizRes]) => {
        if (cancelled) return;

        if (analyticsRes.success && analyticsRes.data) {
          setAnalytics(analyticsRes.data);
        } else {
          setError(
            analyticsRes.error?.message ?? "Staff member not found."
          );
        }

        if (todayRes.success && todayRes.data) {
          setTodayStamps(todayRes.data.stampsIssued);
        }

        if (bizRes.success && bizRes.data) {
          setBusinessDefaultGoal(bizRes.data.defaultDailyGoal ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load staff member.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [staffId]);

  useEffect(() => {
    if (isLoading || period === "all" || error) return;

    let cancelled = false;

    businessesApi
      .getStaffMemberAnalytics(staffId, period)
      .then((res) => {
        if (!cancelled && res.success && res.data) {
          setAnalytics(res.data);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [period, staffId, isLoading, error]);

  const loadRecentActivity = useCallback(() => {
    let cancelled = false;

    setActivityLoading(true);

    businessesApi
      .getStaffMemberActivity(staffId, {
        page: 1,
        pageSize: RECENT_COUNT,
      })
      .then((res) => {
        if (!cancelled && res.success && res.data) {
          setRecentActivity(res.data.activity);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [staffId]);

  useEffect(() => {
    loadRecentActivity();
  }, [loadRecentActivity]);

  async function saveGoal(goal?: number) {
    setSavingGoal(true);

    try {
      const res = await businessesApi.setStaffDailyGoal(staffId, goal);

      if (res.success) {
        toast.success(
          res.data?.dailyGoalOverride
            ? "Daily goal updated"
            : "Personal goal removed — using business default"
        );

        setGoalModalOpen(false);

        setAnalytics((a) =>
          a
            ? {
                ...a,
                dailyGoal:
                  res.data?.dailyGoal ??
                  businessDefaultGoal ??
                  undefined,
              }
            : a
        );
      } else {
        toast.error(
          res.error?.message ?? "Failed to update goal."
        );
      }
    } catch {
      toast.error("Unexpected error.");
    } finally {
      setSavingGoal(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="space-y-5 pt-6">
          <div className="h-8 w-32 skeleton rounded-xl" />
          <div className="h-44 skeleton rounded-3xl" />
          <div className="h-56 skeleton rounded-3xl" />
          <div className="h-52 skeleton rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <ErrorState
          title="Staff member not found"
          message={
            error ??
            "This staff member is not part of your business."
          }
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const effectiveGoal = analytics.dailyGoal ?? businessDefaultGoal;

  const initials = analytics.fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const goalPercentage =
    effectiveGoal && effectiveGoal > 0
      ? Math.min(Math.round((todayStamps / effectiveGoal) * 100), 100)
      : null;

  return (
    <main className="min-h-screen pb-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* Back */}
        <div className="pt-5 sm:pt-7">
          <Link
            href="/dashboard/business/staff?view=team"
            className="group inline-flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--brand)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Team Directory
          </Link>
        </div>

        {/* Profile hero + today's goal bento */}
        <section className="mt-5 overflow-hidden rounded-[20px] border border-[var(--border-light,var(--border))] bg-[var(--surface)] p-5 shadow-[0_8px_24px_rgba(31,108,58,0.06)] sm:p-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-5">
              <div className="relative shrink-0">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--surface-container-low,var(--surface-raised))] bg-[var(--brand-surface)] text-2xl font-bold text-[var(--brand)] shadow-sm">
                  {analytics.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={analytics.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>

                <span
                  aria-label="Active staff member"
                  className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--brand)] text-white"
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </div>

              <div className="min-w-0">
                <h1 className="truncate font-headline text-2xl font-extrabold tracking-[-0.04em] text-[var(--text-primary)] sm:text-3xl">
                  {analytics.fullName}
                </h1>

                <p className="mt-1 text-sm font-semibold text-[var(--brand)]">
                  Staff Member
                </p>

                <p className="mt-1.5 flex items-center gap-1.5 truncate text-sm text-[var(--text-tertiary)]">
                  <Mail className="h-4 w-4 shrink-0" />
                  {analytics.email}
                </p>

                <div className="mt-2">
                  <ActivityBadge
                    lastActivityAt={
                      recentActivity[0]?.stampedAt ?? null
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 flex justify-end gap-3 border-t border-[var(--border-light,var(--border))] pt-5">
            <button
              onClick={() => setGoalModalOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(31,108,58,0.15)] transition-all hover:bg-[var(--brand-hover,var(--brand))] active:scale-[0.98]"
            >
              <Pencil className="h-4 w-4" />
              Manage Goal
            </button>
          </div>
        </section>

        {/* Today's goal */}
        <section className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.025)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                Today&apos;s Shift Goal
              </p>
              <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                Issue Loyalty Stamps
              </p>
            </div>

            {goalPercentage !== null && (
              <span
                className={[
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
                  goalPercentage >= 100
                    ? "bg-[var(--success-light,var(--brand-surface))] text-[var(--success-text)]"
                    : "bg-[var(--accent-light)] text-[var(--accent-text)]",
                ].join(" ")}
              >
                {goalPercentage >= 100 ? "Goal reached" : "On track"}
              </span>
            )}

            <button
              onClick={() => setGoalModalOpen(true)}
              className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand)] transition-colors hover:bg-[var(--brand)]/10"
            >
              Edit
            </button>
          </div>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="font-headline text-5xl font-extrabold tracking-[-0.05em] text-[var(--accent-text,var(--text-primary))]">
              {todayStamps}
            </span>

            <span className="font-headline text-xl font-semibold text-[var(--text-tertiary)]">
              / {effectiveGoal ?? "—"}
            </span>

            <span className="ml-2 text-sm text-[var(--text-tertiary)]">
              stamps issued
            </span>
          </div>

          <div className="mt-5">
            <GoalProgress
              value={todayStamps}
              goal={effectiveGoal}
            />
          </div>

          {!effectiveGoal && (
            <div className="mt-4 rounded-2xl bg-[var(--surface-container-low)] p-4">
              <p className="text-xs leading-5 text-[var(--text-secondary)]">
                Set a daily goal to start tracking this team
                member&apos;s performance.
              </p>
            </div>
          )}
        </section>

        {/* Performance */}
        <section className="mt-5 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_30px_rgba(0,0,0,0.025)]">
          <div className="flex flex-col gap-4 border-b border-[var(--border-light)] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <SectionLabel icon={Stamp}>
              Performance
            </SectionLabel>

            <Tabs
              label="Performance period"
              idPrefix="perf-period"
              value={period}
              onChange={setPeriod}
              items={PERIODS.map((p) => ({
                value: p.value,
                label: p.label,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 divide-x divide-[var(--border-light)]">
            <div className="p-5 sm:p-7">
              <Metric
                label="Stamps issued"
                value={analytics.stampsIssued.toLocaleString()}
              />
            </div>

            <div className="p-5 sm:p-7">
              <Metric
                label="Customers served"
                value={analytics.customersServed.toLocaleString()}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-[var(--border-light)] bg-[var(--surface-container-low)] px-5 py-4 sm:flex-row sm:justify-between sm:px-7">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              All-time stamps{" "}
              <strong className="text-[var(--text-secondary)]">
                {analytics.totalStampsAllTime.toLocaleString()}
              </strong>
            </span>

            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Unique customers{" "}
              <strong className="text-[var(--text-secondary)]">
                {analytics.totalCustomersAllTime.toLocaleString()}
              </strong>
            </span>
          </div>
        </section>

        {/* Recent activity */}
        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between px-1">
            <SectionLabel icon={QrCode}>
              Recent activity
            </SectionLabel>

            <Link
              href={`/dashboard/business/staff/${staffId}/activity`}
              className="group inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand)] transition-colors hover:bg-[var(--brand)]/10"
            >
              View all
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_30px_rgba(0,0,0,0.025)]">
            {activityLoading ? (
              <div className="divide-y divide-[var(--border-light)]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[76px] skeleton"
                  />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--text-muted)]">
                  <QrCode className="h-5 w-5" />
                </div>

                <p className="mt-4 text-sm font-bold text-[var(--text-primary)]">
                  No activity yet
                </p>

                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[var(--text-tertiary)]">
                  Stamps and rewards will appear here once{" "}
                  {analytics.fullName.split(" ")[0]} starts scanning.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border-light)]">
                {recentActivity.map((item) => (
                  <ActivityRow
                    key={`${item.activityType}-${item.activityId}`}
                    item={item}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Access */}
        <section className="mt-5 rounded-[20px] border border-[var(--border-light,var(--border))] bg-[var(--surface)] p-5 shadow-[0_8px_24px_rgba(31,108,58,0.06)] sm:p-7">
          <SectionLabel icon={ShieldCheck}>
            System Access &amp; Permissions
          </SectionLabel>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              {
                icon: QrCode,
                label: "Scan stamps",
                granted: true,
              },
              {
                icon: ShieldCheck,
                label: "Verified account access",
                granted: true,
              },
            ].map(({ icon: Icon, label, granted }) => (
              <span
                key={label}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium",
                  granted
                    ? "bg-[var(--surface-container-low,var(--surface-raised))] text-[var(--text-primary)]"
                    : "bg-[var(--surface-container-low,var(--surface-raised))] text-[var(--text-muted)] line-through opacity-60",
                ].join(" ")}
              >
                <Icon className={granted ? "h-3.5 w-3.5 text-[var(--brand)]" : "h-3.5 w-3.5"} aria-hidden />
                {label}
                {granted && <Check className="h-3.5 w-3.5 text-[var(--success)]" aria-hidden />}
              </span>
            ))}
          </div>
        </section>
      </div>

      <EditGoalModal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        staff={{
          fullName: analytics.fullName,
          dailyGoalOverride: analytics.dailyGoalOverride,
          dailyGoal: analytics.dailyGoal,
        }}
        businessDefaultGoal={businessDefaultGoal}
        onSave={saveGoal}
        saving={savingGoal}
      />
    </main>
  );
}