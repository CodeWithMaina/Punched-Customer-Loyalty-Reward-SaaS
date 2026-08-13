"use client";

import { useEffect, useState } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import type { StaffActivityFeedResponse, NotificationDto } from "@/types";
import {
  Loader2,
  Trophy,
  CheckCircle2,
  Gift,
  UserRound,
  Clock3,
  AlertCircle,
  ChevronRight,
  Star,
  Bell,
  ChevronDown,
} from "lucide-react";

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

const dailyGoalValue = 20;

export default function StaffActivityPage() {
  useRoleGuard("Staff");

  const [feed, setFeed] =
    useState<StaffActivityFeedResponse | null>(null);
  const [dailyGoal, setDailyGoal] = useState<number>(dailyGoalValue);
  const [isLoading, setIsLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    businessesApi
      .getMyStaffActivity({
        activityType: "all",
        page: 1,
        pageSize: 50,
      })
      .then((res) => {
        if (res.success && res.data) {
          setFeed(res.data);
        } else {
          setError(res.error?.message || "Could not load activity.");
        }
      })
      .catch(() => {
        setError("Could not load activity.");
      })
      .finally(() => {
        setIsLoading(false);
      });

            // Effective daily goal (staff override, else business default) from the
    // staff analytics endpoint — never hardcoded.
    businessesApi
      .getStaffAnalytics()
      .then((res) => {
        if (res.success && res.data?.dailyGoal) setDailyGoal(res.data.dailyGoal);
      })
      .catch(() => {
        /* keep fallback */
      });

    // Unread notifications for the collapsible feed (item H).
    businessesApi
      .getMyNotifications(true)
      .then((res) => {
        if (res.success && res.data) setNotifications(res.data);
      })
      .catch(() => {
        /* non-fatal: notifications degrade gracefully */
      })
      .finally(() => setNotificationsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  if (error || !feed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--border-light)]">
            <AlertCircle className="h-5 w-5 text-[var(--text-tertiary)]" />
          </div>

          <p className="text-sm font-medium text-[var(--text-secondary)]">
            {error ?? "No data available."}
          </p>
        </div>
      </div>
    );
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  const stampsToday = feed.activity.filter(
    (activity) =>
      activity.activityType === "stamp" &&
      activity.stampedAt.slice(0, 10) === todayIso
  ).length;

  const progress = Math.min((stampsToday / dailyGoal) * 100, 100);
  const goalReached = stampsToday >= dailyGoal;
  const remaining = Math.max(dailyGoal - stampsToday, 0);

  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-10">
      {/* Header */}
      <header className="pt-6 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">
              Good day,
            </p>

            <h1 className="mt-0.5 font-display text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {feed.staff.name.split(" ")[0]}
            </h1>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-surface">
            <span className="text-sm font-bold text-brand">
              {feed.staff.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </header>

            {/* Notifications (collapsible) */}
      <section className="mb-4">
        <button
          type="button"
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          className="w-full flex items-center justify-between rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] px-4 py-3 shadow-card"
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-brand flex-shrink-0" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Notifications
            </span>
            {notifications.length > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1.5 text-[9px] font-bold text-white">
                {notifications.length}
              </span>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 text-[var(--text-tertiary)] transition-transform ${
              notificationsOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {notificationsOpen && (
          <div className="mt-1 rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] shadow-card overflow-hidden divide-y divide-[var(--border-light)]">
            {notificationsLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-3.5 w-3/4 rounded bg-[var(--border-light)] animate-pulse"
                  />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[var(--text-tertiary)]">
                All caught up! 🎉
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={async () => {
                    await businessesApi.markNotificationsRead(n.id);
                    setNotifications((prev) =>
                      prev.filter((x) => x.id !== n.id)
                    );
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-[var(--surface-raised)] transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 mt-0.5">
                      {n.type === "RewardReady" ? (
                        <Gift className="h-3.5 w-3.5 text-[var(--accent)]" />
                      ) : (
                        <Star className="h-3.5 w-3.5 text-[var(--accent)]" />
                      )}
                    </span>
                    <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {n.type === "RewardReady"
                          ? "Reward ready for a customer"
                          : n.type === "GoalReached"
                          ? "Goal reached today!"
                          : n.type}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">
                        {n.stampsCount} stamp{n.stampsCount === 1 ? "" : "s"} ·{" "}
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </section>

      {/* Today's goal */}
      <section
        className={`relative overflow-visible rounded-3xl p-5 ${
          goalReached
            ? "bg-[var(--success-light)]"
            : "bg-[var(--brand-surface)]"
        }`}
      >
        {goalReached && (
          <>
            <Star
              className="star-sparkle pointer-events-none absolute h-3.5 w-3.5 text-[var(--accent)]"
              style={{ top: "16%", left: "12%", animationDelay: "0ms" }}
            />
            <Star
              className="star-sparkle pointer-events-none absolute h-3.5 w-3.5 text-[var(--accent)]"
              style={{ top: "28%", right: "16%", animationDelay: "200ms" }}
            />
            <Star
              className="star-sparkle pointer-events-none absolute h-3.5 w-3.5 text-[var(--accent)]"
              style={{ bottom: "20%", left: "10%", animationDelay: "400ms" }}
            />
            <Star
              className="star-sparkle pointer-events-none absolute h-3.5 w-3.5 text-[var(--accent)]"
              style={{ bottom: "30%", right: "18%", animationDelay: "600ms" }}
            />
            <Star
              className="star-sparkle pointer-events-none absolute h-3.5 w-3.5 text-[var(--accent)]"
              style={{ top: "50%", left: "30%", animationDelay: "800ms" }}
            />
          </>
        )}
        <div className="flex items-start justify-between">
          <div>
            <p
              className={`text-sm font-medium ${
                goalReached
                  ? "text-[var(--success-text)]"
                  : "text-[var(--brand-text)]"
              }`}
            >
              Today's goal
            </p>

            <div className="mt-2 flex items-baseline gap-1.5">
              <span
                className={`text-4xl font-bold tracking-tight ${
                  goalReached
                    ? "text-[var(--success-text)]"
                    : "text-[var(--brand)]"
                }`}
              >
                {stampsToday}
              </span>

              <span className="text-sm text-[var(--text-secondary)]">
                / {dailyGoal} stamps
              </span>
            </div>
          </div>

          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full ${
              goalReached
                ? "bg-[var(--success)] text-white"
                : "bg-[var(--brand)] text-white"
            }`}
          >
            {goalReached ? (
              <Trophy className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                goalReached
                  ? "bg-[var(--success)]"
                  : "bg-[var(--brand)]"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-[var(--text-secondary)]">
              {goalReached
                ? "You've reached your goal 🎉"
                : `${remaining} more ${
                    remaining === 1 ? "stamp" : "stamps"
                  } to go`}
            </p>

            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-surface">
              <UserRound className="h-4 w-4 text-brand" />
            </div>

            <div>
              <p className="text-xl font-bold text-[var(--text-primary)]">
                {feed.summary.customersServed}
              </p>

              <p className="text-xs text-[var(--text-tertiary)]">
                Customers served
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-light)]">
              <Gift className="h-4 w-4 text-[var(--accent)]" />
            </div>

            <div>
              <p className="text-xl font-bold text-[var(--text-primary)]">
                {feed.summary.totalRedemptions}
              </p>

              <p className="text-xs text-[var(--text-tertiary)]">
                Rewards redeemed
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Today's summary */}
      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Your activity
            </h2>

            <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
              Your latest customer activity
            </p>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-brand">
            <Clock3 className="h-3.5 w-3.5" />
            Recent
          </div>
        </div>

        {feed.activity.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] px-5 py-10 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--border-light)]">
              <Clock3 className="h-5 w-5 text-[var(--text-tertiary)]" />
            </div>

            <p className="text-sm font-medium text-[var(--text-secondary)]">
              No activity yet
            </p>

            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Your customer activity will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--surface)]">
            {feed.activity.map((item, index) => {
              const isRedemption =
                item.activityType === "redemption";

              return (
                <div
                  key={`${item.activityId ?? "activity"}-${index}`}
                  className={`flex items-center gap-3 px-4 py-4 ${
                    index !== feed.activity.length - 1
                      ? "border-b border-[var(--border-light)]"
                      : ""
                  }`}
                >
                  {/* Activity icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      isRedemption
                        ? "bg-[var(--accent-light)]"
                        : "bg-[var(--brand-surface)]"
                    }`}
                  >
                    {isRedemption ? (
                      <Gift className="h-4 w-4 text-[var(--accent)]" />
                    ) : (
                      <span className="text-sm font-semibold text-brand">
                        {item.customerName
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Activity */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {item.customerName}
                    </p>

                    <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                      {isRedemption ? (
                        <>
                          Reward redeemed
                          {item.rewardValue
                            ? ` • KES ${item.rewardValue}`
                            : ""}
                        </>
                      ) : (
                        <>Stamp #{item.stampNumber}</>
                      )}
                    </p>
                  </div>

                  {/* Time */}
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      {timeAgo(item.stampedAt)}
                    </span>

                    <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Small footer summary */}
      <section className="mt-6 rounded-2xl bg-[var(--surface)] px-4 py-3 border border-[var(--border-light)]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-tertiary)]">
            Total stamps processed
          </span>

          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {feed.summary.totalScans}
          </span>
        </div>
      </section>
    </main>
  );
}