"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import type {
  AnalyticsPeriod, BusinessCustomer, CustomerActivityItem,
  CustomerPeriodStatsResponse,
} from "@/types";
import {
  Calendar, ChevronLeft, Clock, Gift, Loader2,
  Mail, Phone, RotateCcw, Stamp, TrendingUp, Trophy, Users,
} from "lucide-react";
import { ErrorState } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { Pagination } from "@/components/ui/Pagination";
import { RewardProgress } from "../_components/CustomerCard";

const ACTIVITY_PAGE_SIZE = 5;

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: "Today", value: "today" },
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "All", value: "all" },
];

function formatDate(value?: string): string {
  if (!value) return "No visits yet";
  return new Date(value).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

export default function CustomerDetailPage() {
  useRoleGuard("Business");
  const { customerId } = useParams<{ customerId: string }>();

  const [customer, setCustomer] = useState<BusinessCustomer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [periodStats, setPeriodStats] = useState<CustomerPeriodStatsResponse | null>(null);
  const [isPeriodLoading, setIsPeriodLoading] = useState(false);

  const [activity, setActivity] = useState<CustomerActivityItem[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  // Initial load: profile + default period stats.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      businessesApi.getSingleCustomer(customerId),
      businessesApi.getCustomerPeriodStats(customerId, "7d").catch(() => null),
    ])
      .then(([custRes, statsRes]) => {
        if (cancelled) return;
        if (custRes.success && custRes.data) setCustomer(custRes.data);
        else setNotFound(true);
        if (statsRes?.success && statsRes.data) setPeriodStats(statsRes.data);
      })
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  // Period switching reuses the same endpoint.
  useEffect(() => {
    if (isLoading) return;
    let cancelled = false;
    setIsPeriodLoading(true);
    businessesApi
      .getCustomerPeriodStats(customerId, period)
      .then((res) => {
        if (!cancelled && res.success && res.data) setPeriodStats(res.data);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setIsPeriodLoading(false));
    return () => {
      cancelled = true;
    };
  }, [period, isLoading, customerId]);

  // Paginated stamp/redemption history (5 per page preview).
  const loadActivity = useCallback(
    (page: number) => {
      let cancelled = false;
      setIsActivityLoading(true);
      businessesApi
        .getCustomerActivity(customerId, { page, pageSize: ACTIVITY_PAGE_SIZE })
        .then((res) => {
          if (!cancelled && res.success && res.data) {
            setActivity(res.data.items);
            setActivityTotalPages(Math.max(1, res.data.totalPages));
            setActivityTotal(res.data.total);
          }
        })
        .catch(() => undefined)
        .finally(() => !cancelled && setIsActivityLoading(false));
      return () => {
        cancelled = true;
      };
    },
    [customerId]
  );

  useEffect(() => {
    loadActivity(activityPage);
  }, [activityPage, loadActivity]);

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-5 py-6 space-y-4">
        <div className="h-20 rounded-2xl skeleton" />
        <div className="h-40 rounded-2xl skeleton" />
        <div className="h-48 rounded-2xl skeleton" />
        <div className="flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  if (notFound || !customer) {
    return (
      <div className="max-w-lg mx-auto px-5 pt-16">
        <ErrorState
          title="Customer not found"
          message="This customer is not enrolled in your loyalty program."
        />
        <div className="text-center mt-2">
          <Link href="/dashboard/business/customers" className="text-sm font-semibold text-brand hover:underline">
            Back to customers
          </Link>
        </div>
      </div>
    );
  }

  const stampsRequired = customer.stampsRequired ?? 0;
  const rewardReady = stampsRequired > 0 && customer.totalStamps >= stampsRequired;
  const stampsLeft = stampsRequired > 0 ? Math.max(stampsRequired - customer.totalStamps, 0) : 0;
  const daysFromLastVisit = customer.lastStampAt
    ? Math.max(0, Math.floor((Date.now() - new Date(customer.lastStampAt).getTime()) / 86_400_000))
    : null;
  const redemptionRate =
    customer.lifetimeStamps > 0
      ? Math.round((customer.totalRedemptions / customer.lifetimeStamps) * 100)
      : 0;
  const loyaltyTier =
    customer.lifetimeStamps >= 80
      ? "VIP"
      : customer.lifetimeStamps >= 35
        ? "Regular"
        : customer.lifetimeStamps > 0
          ? "Growing"
          : "New";
return (
    <div className="max-w-lg mx-auto px-5 py-6 pb-12">
      {/* Back */}
      <Link
        href="/dashboard/business/customers?view=roster"
        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-brand hover:text-brand transition-colors mb-5 min-h-[36px]"
      >
        <ChevronLeft className="h-3.5 w-3.5" />Customers
      </Link>

      {/* Header card */}
      <header className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] shadow-card p-5 mb-4 animate-fade-in motion-reduce:animate-none">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-brand-surface flex items-center justify-center text-lg font-bold text-brand overflow-hidden flex-shrink-0">
            {customer.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={customer.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              customer.fullName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-[var(--text-primary)] truncate">
                {customer.fullName}
              </h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  loyaltyTier === "VIP"
                    ? "bg-amber-50 text-amber-600"
                    : loyaltyTier === "Regular"
                      ? "bg-brand-surface text-brand"
                      : "bg-[var(--border-light)] text-[var(--text-secondary)]"
                }`}
              >
                {loyaltyTier}
              </span>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] truncate flex items-center gap-1 mt-0.5">
              <Mail className="h-3 w-3 flex-shrink-0" />{customer.email}
            </p>
            {customer.phoneNumber && (
              <p className="text-xs text-[var(--text-tertiary)] truncate flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3 flex-shrink-0" />{customer.phoneNumber}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Reward progress */}
      <section
        className={`rounded-2xl border p-5 mb-4 relative overflow-hidden shadow-card ${
          rewardReady ? "border-amber-300 bg-amber-50/60" : "border-[var(--border-light)] bg-[var(--surface)]"
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
              Current cycle
            </p>
            <p className={`text-[40px] leading-none font-extrabold tracking-tight mt-1 ${rewardReady ? "text-amber-600" : "text-[var(--text-primary)]"}`}>
              {customer.totalStamps}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              {stampsRequired > 0 ? `of ${stampsRequired} to a reward` : "No active reward threshold"}
            </p>
          </div>
          <div
            className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
              rewardReady ? "bg-amber-100" : "bg-brand-surface"
            }`}
          >
            {rewardReady ? (
              <Trophy className="h-7 w-7 text-amber-500" strokeWidth={1.25} aria-hidden />
            ) : (
              <Stamp className="h-7 w-7 text-brand" strokeWidth={1.25} aria-hidden />
            )}
          </div>
        </div>

        {stampsRequired > 0 && (
          <>
            <div className="mt-4">
              <RewardProgress value={customer.totalStamps} goal={stampsRequired} compact={false} />
            </div>
            {stampsLeft > 0 && (
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                {stampsLeft} more stamp{stampsLeft !== 1 ? "s" : ""} until the next reward
              </p>
            )}
          </>
        )}
      </section>
{/* Period activity */}
      <section className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] shadow-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
            Activity in period
          </p>
          {isPeriodLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" aria-label="Loading" />}
        </div>
        <Tabs
          label="Stats period"
          idPrefix="cust-period"
          value={period}
          onChange={setPeriod}
          items={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
          className="w-full mb-4"
        />
        <div className={`grid grid-cols-2 gap-3 transition-opacity ${isPeriodLoading ? "opacity-40" : "opacity-100"}`}>
          <div className="bg-brand-surface rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-brand tabular-nums">{periodStats?.stampsInPeriod ?? "—"}</p>
            <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mt-0.5">Stamps</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600 tabular-nums">{periodStats?.visitsInPeriod ?? "—"}</p>
            <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mt-0.5">Visits</p>
          </div>
        </div>
        {periodStats?.lastVisitInPeriod && (
          <p className="text-[11px] text-[var(--text-tertiary)] text-center mt-3">
            Last visit in period: {new Date(periodStats.lastVisitInPeriod).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
        {periodStats && periodStats.stampsInPeriod === 0 && (
          <p className="text-[11px] text-[var(--text-tertiary)] text-center mt-3">No activity in this period</p>
        )}
      </section>

      {/* Lifetime metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Lifetime stamps", value: customer.lifetimeStamps, icon: TrendingUp, tone: "text-brand" },
          { label: "Rewards claimed", value: customer.totalRedemptions, icon: Gift, tone: "text-emerald-600" },
          { label: "Redemption rate", value: `${redemptionRate}%`, icon: RotateCcw, tone: "text-accent-text" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] shadow-card p-3 text-center">
            <Icon className={`h-4 w-4 mx-auto mb-1.5 ${tone}`} aria-hidden />
            <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums leading-none">{value}</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Owner insight */}
      <section className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] shadow-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Owner insight</p>
          <Users className="h-4 w-4 text-[var(--text-muted)]" aria-hidden />
        </div>
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--text-secondary)]">Current cycle status</span>
            <span className="font-semibold text-[var(--text-primary)] text-right">
              {rewardReady ? "Ready to redeem" : stampsRequired > 0 ? `${stampsLeft} more needed` : "No program"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--text-secondary)]">Engagement signal</span>
            <span className="font-semibold text-[var(--text-primary)] text-right">
              {daysFromLastVisit === null
                ? "Not yet active"
                : daysFromLastVisit <= 7
                  ? "Healthy"
                  : daysFromLastVisit <= 21
                    ? "Cooling"
                    : "At risk"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--text-secondary)]">Reward behavior</span>
            <span className="font-semibold text-[var(--text-primary)] text-right">
              {customer.totalRedemptions > 0 ? "Redeems regularly" : "No reward claimed yet"}
            </span>
          </div>
        </div>
      </section>
{/* Recent activity — small window + pagination */}
      <section className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] shadow-card overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-light)]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
            Recent activity
          </p>
          {isActivityLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" aria-label="Loading" />}
        </div>

        {!isActivityLoading && activity.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Stamp className="h-6 w-6 text-[var(--text-muted)] mx-auto" aria-hidden />
            <p className="mt-2 text-xs font-semibold text-[var(--text-secondary)]">No activity yet</p>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
              Stamps and rewards will appear here after their first visit.
            </p>
          </div>
        ) : (
          <>
            <ul className={`divide-y divide-[var(--border-light)] transition-opacity ${isActivityLoading ? "opacity-40" : "opacity-100"}`}>
              {activity.map((item) => (
                <li key={`${item.activityType}-${item.activityId}`} className="px-4 py-3.5 flex items-start gap-3">
                  <span
                    className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      item.activityType === "stamp" ? "bg-brand-surface text-brand" : "bg-emerald-50 text-emerald-600"
                    }`}
                    aria-hidden
                  >
                    {item.activityType === "stamp" ? (
                      <Stamp className="h-4 w-4" />
                    ) : (
                      <Gift className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--text-primary)] truncate">
                      {item.activityType === "stamp"
                        ? `Stamp #${item.stampNumber ?? "—"} collected`
                        : `Reward redeemed${item.rewardValue != null ? ` · KES ${item.rewardValue}` : ""}`}
                    </p>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate">
                      {timeAgo(item.timestamp)}
                      {item.staffName ? ` · by ${item.staffName}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            {activityTotalPages > 1 && (
              <Pagination
                page={activityPage}
                totalPages={activityTotalPages}
                total={activityTotal}
                noun="event"
                onChange={setActivityPage}
              />
            )}
          </>
        )}
      </section>

      {/* Profile timeline */}
      <section className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] shadow-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3">Timeline</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-brand-surface rounded-xl flex items-center justify-center flex-shrink-0">
              <Calendar className="h-4 w-4 text-brand" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Enrolled</p>
              <p className="text-xs text-[var(--text-tertiary)]">{formatDate(customer.enrolledAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-green-600" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Last visit</p>
              <p className="text-xs text-[var(--text-tertiary)]">{formatDate(customer.lastStampAt)}</p>
            </div>
          </div>
          {customer.totalRedemptions > 0 && (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <RotateCcw className="h-4 w-4 text-accent-text" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)]">Rewards claimed</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {customer.totalRedemptions} time{customer.totalRedemptions !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
