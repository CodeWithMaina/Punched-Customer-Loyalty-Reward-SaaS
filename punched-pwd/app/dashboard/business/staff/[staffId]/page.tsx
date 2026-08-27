"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, ChevronRight, Clock, Mail, Pencil, Target,
  Users, XCircle,
} from "lucide-react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import type {
  AnalyticsPeriod,
  StaffMemberAnalyticsResponse,
  StaffActivityItem,
} from "@/types";
import toast from "react-hot-toast";
import {
  Avatar, Badge, Button, IconButton, Skeleton, Tabs,
} from "@/components/ui";
import { ErrorState } from "@/components/ui/States";
import { EditGoalModal } from "../_components/EditGoalModal";

const RECENT_COUNT = 5;

/* ------------------------------------------------------------------------ */
/* Helpers (business formatting — unchanged)                                */
/* ------------------------------------------------------------------------ */

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

const PERIODS = [
  { value: "today" as AnalyticsPeriod, label: "Today" },
  { value: "7d" as AnalyticsPeriod, label: "7 days" },
  { value: "30d" as AnalyticsPeriod, label: "30 days" },
  { value: "all" as AnalyticsPeriod, label: "All time" },
];

/** Activity status → semantic Badge variant. */
const ACTIVITY_VARIANT = { active: "success", idle: "warning", inactive: "neutral" } as const;

function activeLabel(lastActivityAt?: string | null) {
  if (!lastActivityAt) return { text: "Never active", tone: "inactive" as const };
  const diff = Date.now() - new Date(lastActivityAt).getTime();
  const days = Math.max(0, Math.floor(diff / 86_400_000));
  if (days < 1) return { text: "Active today", tone: "active" as const };
  if (days < 7) return { text: `Active ${days}d ago`, tone: "idle" as const };
  return { text: "Inactive", tone: "inactive" as const };
}

/* Detail definition row — icon + label left, semibold value right. */
function DetailRow({
  icon, label, value, last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3 ${
        !last ? "border-b border-[var(--border-light)]" : ""
      }`}
    >
      <div className="flex items-center gap-3 text-[var(--text-secondary)]">
        {icon}

        <span className="text-xs font-medium">{label}</span>
      </div>

      <span className="max-w-[55%] truncate text-right text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

export default function StaffDetailPage() {
  useRoleGuard("Business");
  const router = useRouter();

  const { staffId } = useParams<{ staffId: string }>();

  const [analytics, setAnalytics] =
    useState<StaffMemberAnalyticsResponse | null>(null);

  const [period, setPeriod] = useState<AnalyticsPeriod>("all");
  const [recentActivity, setRecentActivity] = useState<StaffActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [businessDefaultGoal, setBusinessDefaultGoal] = useState<number | null>(null);

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
          setError(analyticsRes.error?.message ?? "Staff member not found.");
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
      .getStaffMemberActivity(staffId, { page: 1, pageSize: RECENT_COUNT })
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
                dailyGoal: res.data?.dailyGoal ?? businessDefaultGoal ?? undefined,
              }
            : a
        );
      } else {
        toast.error(res.error?.message ?? "Failed to update goal.");
      }
    } catch {
      toast.error("Unexpected error.");
    } finally {
      setSavingGoal(false);
    }
  }

  /* Derived values */
  const effectiveGoal = analytics?.dailyGoal ?? businessDefaultGoal;
  const goalPercentage =
    effectiveGoal && effectiveGoal > 0 && analytics
      ? Math.min(Math.round((todayStamps / effectiveGoal) * 100), 100)
      : null;

  /* Ring geometry (r=45 → circumference ≈ 282.7) */
  const RING = 282.7;
  const ringOffset = goalPercentage !== null ? RING * (1 - goalPercentage / 100) : RING;

  const lastActive = recentActivity[0]?.stampedAt ?? null;
  const status = activeLabel(lastActive);

  if (isLoading || !analytics) {
    return (
      <div className="min-h-screen bg-[var(--background)] pb-24">
        {/* Header skeleton */}
        <div className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-5 w-28 rounded" />
            <Skeleton className="h-10 w-24 rounded-[var(--radius-md)]" />
          </div>
        </div>

        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
          <Skeleton className="h-40 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-36 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-44 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-56 rounded-[var(--radius-lg)]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
        <ErrorState
          title="Staff member not found"
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24 text-[var(--text-primary)]">
      {/* ── Detail header (back · title · primary action) ───────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <IconButton label="Go back" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </IconButton>

            <h1 className="truncate text-lg font-bold tracking-tight">Staff details</h1>
          </div>

          <Button
            size="sm"
            variant="outline"
            leftIcon={<Pencil className="h-4 w-4" />}
            onClick={() => setGoalModalOpen(true)}
          >
            <span className="hidden sm:inline">Edit goal</span>
            <span className="sm:hidden">Goal</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        {/* ── Identity block ─────────────────────────────────────────── */}
        <section className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-5 ring-1 ring-[var(--border-light)] sm:flex-row sm:text-left">
          <Avatar name={analytics.fullName} src={analytics.avatarUrl} size="lg" />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold sm:text-lg">{analytics.fullName}</h2>

                <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                  {analytics.email}
                </p>
              </div>

              <Badge variant={ACTIVITY_VARIANT[status.tone]} dot>
                {status.text}
              </Badge>
            </div>
          </div>
        </section>

        {/* ── Today's goal ───────────────────────────────────────────── */}
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold sm:text-base">Today&apos;s goal</h3>

            {analytics.dailyGoalOverride && (
              <Badge variant="brand">Personal override</Badge>
            )}
          </div>

          <div className="flex items-center gap-5">
            <div className="relative h-20 w-20 shrink-0">
              <svg
                className="h-full w-full -rotate-90"
                viewBox="0 0 100 100"
                role="progressbar"
                aria-valuenow={goalPercentage ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Today's goal progress"
              >
                <circle cx="50" cy="50" r="45" fill="none" strokeWidth="10" stroke="currentColor" className="text-[var(--border-light)]" />

                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  strokeWidth="10"
                  stroke="currentColor"
                  strokeDasharray={RING}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  className={
                    goalPercentage !== null && goalPercentage >= 100
                      ? "text-[var(--success)]"
                      : "text-brand"
                  }
                  style={{ transition: "stroke-dashoffset 0.6s ease" }}
                />
              </svg>

              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold tabular-nums">{goalPercentage ?? 0}%</span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[var(--text-secondary)]">Stamps today</p>

              <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
                {todayStamps.toLocaleString()}
                {effectiveGoal ? (
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    {" "}
                    / {effectiveGoal}
                  </span>
                ) : null}
              </p>

              {!effectiveGoal && (
                <button
                  onClick={() => setGoalModalOpen(true)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                >
                  Set a daily goal
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── Performance ────────────────────────────────────────────── */}
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <h3 className="mb-4 text-sm font-bold sm:text-base">Performance</h3>

          <Tabs
            items={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
            value={period}
            onChange={setPeriod}
            label="Analytics period"
            className="mb-4 flex w-full"
            idPrefix="staff-period"
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-md)] border border-[var(--border-light)] bg-[var(--background)] p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-light)] text-brand">
                <Target className="h-4 w-4" />
              </span>

              <p className="mt-3 text-xs font-medium text-[var(--text-secondary)]">Stamps issued</p>

              <p className="mt-1 text-xl font-bold tracking-tight tabular-nums">
                {analytics.stampsIssued.toLocaleString()}
              </p>
            </div>

            <div className="rounded-[var(--radius-md)] border border-[var(--border-light)] bg-[var(--background)] p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-light)] text-brand">
                <Users className="h-4 w-4" />
              </span>

              <p className="mt-3 text-xs font-medium text-[var(--text-secondary)]">Customers served</p>

              <p className="mt-1 text-xl font-bold tracking-tight tabular-nums">
                {analytics.customersServed.toLocaleString()}
              </p>
            </div>
          </div>
        </section>

        {/* ── Details (definition list) ──────────────────────────────── */}
        <section>
          <h3 className="mb-3 text-sm font-bold sm:text-base">Details</h3>

          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
            <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={analytics.email} />

            <DetailRow
              icon={<Clock className="h-4 w-4" />}
              label="Last active"
              value={status.text.replace("Active ", "")}
            />

            <DetailRow
              icon={<Target className="h-4 w-4" />}
              label="Daily goal"
              value={
                effectiveGoal
                  ? `${effectiveGoal} stamps${analytics.dailyGoalOverride ? " · personal" : " · default"}`
                  : "Not set"
              }
              last
            />
          </div>
        </section>

        {/* ── Recent activity ────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold sm:text-base">Recent activity</h3>

            <Link
              href={`/dashboard/business/staff/${staffId}/activity`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            >
              View all
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
            {activityLoading ? (
              <div className="space-y-px">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 border-b border-[var(--border-light)] p-3 last:border-b-0">
                    <Skeleton className="h-10 w-10 rounded-full" />

                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-28 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-semibold">No activity yet</p>

                <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[var(--text-secondary)]">
                  Stamps and rewards will appear here once{" "}
                  {analytics.fullName.split(" ")[0]} starts scanning.
                </p>
              </div>
            ) : (
              <ul>
                {recentActivity.map((item) => {
                  const isStamp = item.activityType === "stamp";

                  return (
                    <li
                      key={`${item.activityType}-${item.activityId}`}
                      className="flex items-center gap-3 border-b border-[var(--border-light)] p-3 last:border-b-0 sm:px-4"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          isStamp
                            ? "bg-brand-surface text-brand"
                            : "bg-[var(--accent-light)] text-[var(--accent-text)]"
                        }`}
                      >
                        {isStamp ? <Target className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {isStamp ? "Issued stamp" : "Redeemed reward"}
                        </p>

                        <p className="truncate text-xs text-[var(--text-secondary)]">
                          for {item.customerName}
                        </p>
                      </div>

                      <span className="shrink-0 text-xs tabular-nums text-[var(--text-tertiary)]">
                        {timeAgo(item.stampedAt)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ── Access levels ──────────────────────────────────────────── */}
        <section>
          <h3 className="mb-3 text-sm font-bold sm:text-base">Access levels</h3>

          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
            {[
              { label: "Issue stamps", granted: true },
              { label: "Redeem rewards", granted: true },
              { label: "Manage programs", granted: false },
            ].map(({ label, granted }, index, all) => (
              <div
                key={label}
                className={`flex items-center justify-between px-4 py-3 ${
                  index < all.length - 1 ? "border-b border-[var(--border-light)]" : ""
                }`}
              >
                <span className={`text-sm ${granted ? "font-medium" : "text-[var(--text-tertiary)]"}`}>
                  {label}
                </span>

                {granted ? (
                  <CheckCircle2 role="img" aria-label="Granted" className="h-4 w-4 text-brand" />
                ) : (
                  <XCircle role="img" aria-label="Not granted" className="h-4 w-4 text-[var(--text-muted)]" />
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Goal editor — responsive Modal (sheet on mobile → dialog on desktop) */}
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
    </div>
  );
}

