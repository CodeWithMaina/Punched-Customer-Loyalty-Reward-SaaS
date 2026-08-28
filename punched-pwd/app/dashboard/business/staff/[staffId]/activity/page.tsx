"use client";

import { RequireModule } from "@/components/modules/RequireModule";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import type {
  StaffActivityItem,
  StaffActivitySummary,
} from "@/types";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Filter,
  Gift,
  QrCode,
  Stamp,
  Users,
} from "lucide-react";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { getWeekRange } from "../../_components/filters";

const PAGE_SIZE = 20;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();

  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);

  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);

  return `${days}d ago`;
}

type TypeFilter = "all" | "stamp" | "redemption";

const TYPE_FILTERS: {
  value: TypeFilter;
  label: string;
}[] = [
  { value: "all", label: "Everything" },
  { value: "stamp", label: "Stamps" },
  { value: "redemption", label: "Rewards" },
];

function ActivityItem({
  item,
}: {
  item: StaffActivityItem;
}) {
  const isStamp = item.activityType === "stamp";

  return (
    <li className="relative flex gap-4 px-5 py-5 transition-colors hover:bg-[var(--surface-container-low,var(--surface-raised))] sm:px-6">
      {/* Timeline connector */}
      <span
        aria-hidden
        className="absolute bottom-0 left-[39px] top-14 w-px bg-[var(--border-light,var(--border))] last:hidden"
      />

      <div
        className={[
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm",
          isStamp
            ? "bg-[var(--brand)] text-white"
            : "bg-[var(--accent)] text-[var(--accent-text,var(--background))]",
        ].join(" ")}
      >
        {isStamp ? (
          <Stamp className="h-4 w-4" />
        ) : (
          <Gift className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 flex-1 rounded-xl border border-[var(--border-light,var(--border))] bg-[var(--background)] p-4 shadow-[0_4px_12px_rgba(31,108,58,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-sm font-semibold leading-5 text-[var(--text-primary)]">
            <span className="truncate">{item.customerName}</span>
            {!isStamp && (
              <span className="ml-2 rounded-full bg-[var(--accent-light)] px-2 py-0.5 align-middle text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--accent-text)]">
                Reward
              </span>
            )}
          </p>

          <span className="shrink-0 text-xs text-[var(--text-muted)]">
            {timeAgo(item.stampedAt)}
          </span>
        </div>

        <p className="mt-1.5 text-xs leading-5 text-[var(--text-secondary)]">
          {isStamp
            ? `Granted Stamp #${item.stampNumber} on their loyalty card`
            : "Redeemed a loyalty reward"}

          <span className="mx-1.5 text-[var(--border)]">•</span>

          {new Date(item.stampedAt).toLocaleString(
            undefined,
            {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
            }
          )}
        </p>
      </div>
    </li>
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  tone = "brand",
}: {
  icon: typeof Stamp;
  label: string;
  value: number;
  tone?: "brand" | "green";
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center p-4 text-center sm:p-6">
      <p
        className={[
          "font-headline text-3xl font-extrabold tabular-nums tracking-[-0.04em] sm:text-4xl",
          tone === "green"
            ? "text-[var(--accent-text,var(--accent))]"
            : "text-[var(--brand)]",
        ].join(" ")}
      >
        {value.toLocaleString()}
      </p>

      <p className="mt-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        <Icon
          className={[
            "h-3.5 w-3.5",
            tone === "green"
              ? "text-[var(--accent)]"
              : "text-[var(--brand)]",
          ].join(" ")}
          aria-hidden
        />
        {label}
      </p>
    </div>
  );
}

function StaffActivityPageContent() {
  useRoleGuard("Business");

  const { staffId } = useParams<{ staffId: string }>();

  const [weekOffset, setWeekOffset] = useState(0);
  const [typeFilter, setTypeFilter] =
    useState<TypeFilter>("all");

  const [page, setPage] = useState(1);

  const [activity, setActivity] = useState<StaffActivityItem[]>([]);
  const [summary, setSummary] =
    useState<StaffActivitySummary | null>(null);

  const [totalPages, setTotalPages] = useState(1);
  const [staffName, setStaffName] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const week = getWeekRange(weekOffset);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    businessesApi
      .getStaffMemberActivity(staffId, {
        from: week.from.toISOString(),
        to: week.to.toISOString(),
        activityType: typeFilter,
        page,
        pageSize: PAGE_SIZE,
      })
      .then((res) => {
        if (cancelled) return;

        if (res.success && res.data) {
          setActivity(res.data.activity);
          setSummary(res.data.summary);
          setTotalPages(
            Math.max(
              1,
              Math.ceil(res.data.total / PAGE_SIZE)
            )
          );
          setStaffName(res.data.staff.name);
        } else {
          setError(
            res.error?.message ?? "Failed to load activity."
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load activity.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    staffId,
    week.from,
    week.to,
    typeFilter,
    page,
  ]);

  const changeWeek = (delta: number) => {
    setWeekOffset((current) => current + delta);
    setPage(1);
  };

  const changeType = (type: TypeFilter) => {
    setTypeFilter(type);
    setPage(1);
  };

  const isCurrentWeek = weekOffset === 0;

  const weekTitle = isCurrentWeek
    ? "This week"
    : weekOffset === -1
      ? "Last week"
      : `Week of ${week.label.split(" ")[0]}`;

  return (
    <main className="min-h-screen pb-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="pt-5 sm:pt-7">
          <Link
            href={`/dashboard/business/staff/${staffId}`}
            className="group inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-container-low)] hover:text-[var(--brand)]"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Staff profile
          </Link>

          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)]">
              Activity
            </p>

            <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
              {staffName || "Staff activity"}
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-tertiary)]">
              Review stamps and rewards processed by this team
              member.
            </p>
          </div>
        </header>

        {/* Controls */}
        <section className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_8px_30px_rgba(0,0,0,0.025)] sm:p-4">

          {/* Week pill selector */}
          <div className="flex items-center justify-between gap-2 rounded-full bg-[var(--surface-container-low,var(--surface-raised))] p-1.5 shadow-[0_4px_12px_rgba(31,108,58,0.04)]">
            <button
              onClick={() => changeWeek(-1)}
              aria-label="Previous week"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)] transition-all hover:bg-[var(--surface)] hover:text-[var(--brand)] active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="min-w-0 text-center">
              <p className="truncate text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-primary)]">
                {weekTitle}
              </p>

              <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
                {week.label}
              </p>
            </div>

            <button
              onClick={() => changeWeek(1)}
              aria-label="Next week"
              disabled={weekOffset >= 0}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)] transition-all hover:bg-[var(--surface)] hover:text-[var(--brand)] active:scale-95 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {!isCurrentWeek && (
            <button
              onClick={() => setWeekOffset(0)}
              className="mt-3 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand)] hover:underline"
            >
              Return to current week
            </button>
          )}

          {/* Filters */}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <div className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-container-low)] text-[var(--text-muted)]">
                <Filter className="h-3.5 w-3.5" />
              </div>

              {TYPE_FILTERS.map((type) => {
                const active =
                  typeFilter === type.value;

                return (
                  <button
                    key={type.value}
                    onClick={() =>
                      changeType(type.value)
                    }
                    aria-pressed={active}
                    className={[
                      "shrink-0 rounded-full px-3.5 py-2 text-[10px] font-bold transition-all",
                      active
                        ? "bg-[var(--brand)] text-[var(--background)] shadow-sm"
                        : "bg-[var(--surface-container-low)] text-[var(--text-secondary)] hover:bg-[var(--border-light)]",
                    ].join(" ")}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>

            {summary && (
              <span className="shrink-0 px-2 text-[10px] font-semibold text-[var(--text-muted)]">
                {summary.totalActivities.toLocaleString()} activities
              </span>
            )}
          </div>
        </section>

        {/* Summary */}
        {summary &&
          typeFilter === "all" &&
          summary.totalActivities > 0 && (
            <section className="mt-5 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_30px_rgba(0,0,0,0.025)]">
              <div className="grid grid-cols-3 divide-x divide-[var(--border-light)]">
                <SummaryMetric
                  icon={Stamp}
                  label="Stamps"
                  value={summary.totalStamps}
                />

                <SummaryMetric
                  icon={Gift}
                  label="Rewards"
                  value={summary.totalRedemptions}
                  tone="green"
                />

                <SummaryMetric
                  icon={Users}
                  label="Customers"
                  value={summary.customersServed}
                />
              </div>
            </section>
          )}

        {/* Activity */}
        <section className="mt-5">
          {error ? (
            <ErrorState
              message={error}
              onRetry={() => setPage(1)}
            />
          ) : isLoading ? (
            <div
              className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]"
              aria-busy="true"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[84px] border-b border-[var(--border-light)] skeleton last:border-0"
                />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
              <EmptyState
                icon={<QrCode className="h-6 w-6" />}
                title={
                  typeFilter === "all"
                    ? "No activity this week"
                    : `No ${
                        typeFilter === "stamp"
                          ? "stamps"
                          : "rewards"
                      } this week`
                }
                description={
                  isCurrentWeek
                    ? "Nothing has been recorded for the current week yet."
                    : "No activity was recorded during the selected week."
                }
                action={
                  !isCurrentWeek ? (
                    <button
                      onClick={() =>
                        setWeekOffset(0)
                      }
                      className="mt-1 rounded-xl border border-[var(--brand)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand)] transition-colors hover:bg-[var(--brand)] hover:text-[var(--background)]"
                    >
                      Jump to current week
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_30px_rgba(0,0,0,0.025)]">
                <ul className="divide-y divide-[var(--border-light)]">
                  {activity.map((item) => (
                    <ActivityItem
                      key={`${item.activityType}-${item.activityId}`}
                      item={item}
                    />
                  ))}
                </ul>
              </div>

              {/* Pagination */}
              <nav
                aria-label="Activity pagination"
                className="mt-4 flex items-center justify-between"
              >
                <button
                  onClick={() =>
                    setPage((p) => Math.max(1, p - 1))
                  }
                  disabled={page <= 1}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:pointer-events-none disabled:opacity-35"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>

                <p className="text-[10px] font-semibold text-[var(--text-muted)]">
                  {page} / {totalPages}
                </p>

                <button
                  onClick={() =>
                    setPage((p) =>
                      Math.min(totalPages, p + 1)
                    )
                  }
                  disabled={page >= totalPages}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:pointer-events-none disabled:opacity-35"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </nav>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default function StaffActivityPage() {
  return (
    <RequireModule module="staff">
      <StaffActivityPageContent />
    </RequireModule>
  );
}