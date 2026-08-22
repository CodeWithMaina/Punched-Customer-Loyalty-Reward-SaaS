"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import type { AnalyticsPeriod, BusinessCustomer, CustomerPeriodStatsResponse } from "@/types";
import {
  Loader2,
  User,
  Mail,
  Calendar,
  Award,
  RotateCcw,
  Clock,
  ChevronLeft,
  CheckCircle2,
  Stamp,
  TrendingUp,
  Trophy,
  Users,
  Clock3,
  Flame,
  Wallet,
} from "lucide-react";

function formatDate(value?: string): string {
  if (!value) return "No visits yet";
  return new Date(value).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysSince(value?: string): number | null {
  if (!value) return null;
  const diff = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

export default function CustomerDetailPage() {
  useRoleGuard("Business");
  const { customerId } = useParams<{ customerId: string }>();
  const [customer, setCustomer] = useState<BusinessCustomer | null>(null);
  const [stampsRequired, setStampsRequired] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [periodStats, setPeriodStats] = useState<CustomerPeriodStatsResponse | null>(null);
  const [isPeriodLoading, setIsPeriodLoading] = useState(false);

  const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
    { label: "Today", value: "today" },
    { label: "7D",    value: "7d"    },
    { label: "30D",   value: "30d"   },
    { label: "All",   value: "all"   },
  ];

  useEffect(() => {
    async function load() {
      const [custRes, bizRes, statsRes] = await Promise.all([
        businessesApi.getSingleCustomer(customerId),
        businessesApi.getMine().catch(() => null),
        businessesApi.getCustomerPeriodStats(customerId, "7d").catch(() => null),
      ]);
      if (custRes.success && custRes.data) {
        setCustomer(custRes.data);
      } else {
        setNotFound(true);
      }
      const req = bizRes?.data?.loyaltyProgram?.stampsRequired ?? 0;
      setStampsRequired(req);
      if (statsRes?.success && statsRes.data) setPeriodStats(statsRes.data);
      setIsLoading(false);
    }
    load();
  }, [customerId]);

  useEffect(() => {
    if (isLoading) return;
    setIsPeriodLoading(true);
    businessesApi.getCustomerPeriodStats(customerId, period)
      .then((res) => {
        if (res.success && res.data) setPeriodStats(res.data);
      })
      .finally(() => setIsPeriodLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (notFound || !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <User className="h-12 w-12 text-[var(--text-muted)]" />
        <p className="text-[var(--text-secondary)] font-medium">Customer not found</p>
        <Link href="/dashboard/business/customers" className="text-sm text-brand font-semibold">
          ← Back to customers
        </Link>
      </div>
    );
  }

  const rewardReady = stampsRequired > 0 && customer.totalStamps >= stampsRequired;
  const progress = stampsRequired > 0 ? Math.min((customer.totalStamps / stampsRequired) * 100, 100) : 0;
  const enrolledDate = formatDate(customer.enrolledAt);
  const lastVisit = formatDate(customer.lastStampAt);
  const daysFromLastVisit = daysSince(customer.lastStampAt);
  const stampsLeft = stampsRequired > 0 ? Math.max(stampsRequired - customer.totalStamps, 0) : 0;
  const redemptionRate = customer.lifetimeStamps > 0
    ? Math.round((customer.totalRedemptions / customer.lifetimeStamps) * 100)
    : 0;
  const loyaltyTier = customer.lifetimeStamps >= 80
    ? "VIP"
    : customer.lifetimeStamps >= 35
      ? "Regular"
      : customer.lifetimeStamps > 0
        ? "Growing"
        : "New";

  return (
    <div className="max-w-lg mx-auto px-5 py-6 pb-10">
      <Link
        href="/dashboard/business/customers"
        className="inline-flex items-center gap-2 border border-[var(--border)] px-4 py-2 text-[12px] tracking-[0.15em] uppercase font-bold text-[var(--text-secondary)] hover:border-brand hover:text-brand transition-colors mb-6"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <ChevronLeft className="h-4 w-4" />
        Customers
      </Link>

      {/* Stamp progress — tactical bar */}
      <div className={`border p-5 mb-5 relative overflow-hidden ${rewardReady ? "border-accent/40" : "border-[var(--border)] bg-[var(--surface-raised)]"}`}>
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/10" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">Customer Progress</p>
            <p
              className={`text-[40px] leading-none font-extrabold tracking-tight mt-1 ${rewardReady ? "text-accent" : "text-[var(--text-primary)]"}`}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {customer.totalStamps}
            </p>
            <p className="font-mono text-xs text-[var(--text-tertiary)] mt-1" style={{ fontFamily: "'Space Mono', monospace" }}>
              {stampsRequired > 0 ? `Current cycle out of ${stampsRequired}` : "No active loyalty threshold"}
            </p>
          </div>
          <div className="h-14 w-14 border border-[var(--border)] flex items-center justify-center">
            {rewardReady ? <Trophy className="h-7 w-7 text-accent" strokeWidth={1.25} /> : <Stamp className="h-7 w-7 text-brand" strokeWidth={1.25} />}
          </div>
        </div>
        {stampsRequired > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">Reward progress</p>
              <p className="font-mono text-xs font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Space Mono', monospace" }}>{Math.round(progress)}%</p>
            </div>
            <div className="h-2 bg-[var(--surface-container-high, var(--border-light))] relative overflow-hidden">
              <div
                aria-hidden
                className="absolute inset-y-0 opacity-10"
                style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, var(--text-primary) 10px, var(--text-primary) 20px)" }}
              />
              <div
                className={`absolute left-0 top-0 bottom-0 transition-all duration-700 ${rewardReady ? "bg-accent" : "bg-brand"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="font-mono text-xs text-[var(--text-tertiary)] mt-2" style={{ fontFamily: "'Space Mono', monospace" }}>
              {rewardReady ? "Reward can be redeemed now." : `${stampsLeft} stamp${stampsLeft !== 1 ? "s" : ""} to next reward.`}
            </p>
          </div>
        )}
      </div>

      {/* Identity card */}
      <div className="border border-[var(--border)] bg-[var(--surface-raised)] p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 border-2 border-[var(--border)] bg-brand-surface flex items-center justify-center text-brand text-2xl font-extrabold flex-shrink-0 overflow-hidden grayscale hover:grayscale-0 transition-all"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {customer.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={customer.avatarUrl} alt={customer.fullName} className="h-full w-full object-cover" />
            ) : (
              customer.fullName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)] truncate"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {customer.fullName}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Mail className="h-3 w-3 text-[var(--text-tertiary)] flex-shrink-0" />
              <p className="font-mono text-xs text-[var(--text-tertiary)] truncate" style={{ fontFamily: "'Space Mono', monospace" }}>{customer.email}</p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 text-[10px] tracking-[0.15em] uppercase font-bold px-2.5 py-1 border ${rewardReady ? "text-accent-text border-accent/40 bg-[var(--accent-light)]" : "text-brand border-brand/40 bg-brand-surface"}`}
              >
                {rewardReady ? <Award className="h-3 w-3" /> : <Flame className="h-3 w-3" />}
                {rewardReady ? "Reward Ready" : `${stampsLeft} to reward`}
              </span>
              <span className="inline-flex items-center text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-secondary)] border border-[var(--border)] px-2.5 py-1">
                {loyaltyTier} Tier
              </span>
            </div>
          </div>
        </div>
      </div>

      {stampsRequired > 0 && (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Stamp className="h-4 w-4 text-brand" />
              <p className="text-sm font-bold text-[var(--text-primary)]">Stamp Progress</p>
            </div>
            <span className="text-sm font-bold text-brand">
              {customer.totalStamps} / {stampsRequired}
            </span>
          </div>
          <div className="h-2.5 bg-[var(--border-light)] rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-700 ${rewardReady ? "bg-amber-500" : "bg-brand"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: Math.min(stampsRequired, 10) }).map((_, i) => (
              <div
                key={i}
                className={`h-5 w-5 rounded-full flex items-center justify-center border-2 transition-colors ${
                  i < customer.totalStamps
                    ? rewardReady
                      ? "bg-amber-500 border-amber-500"
                      : "bg-brand border-brand"
                    : "bg-[var(--surface-raised)] border-[var(--border)]"
                }`}
              >
                {i < customer.totalStamps && (
                  <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            ))}
            {stampsRequired > 10 && (
              <span className="text-xs text-[var(--text-tertiary)] self-center">+{stampsRequired - 10} more</span>
            )}
          </div>
        </div>
      )}

      {/* Period activity filter */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Activity in Period</p>
          {isPeriodLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />}
        </div>
        {/* Tabs */}
        <div className="bg-[var(--border-light)] rounded-xl p-1 flex gap-1 mb-4">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${
                period === p.value ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-card" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className={`grid grid-cols-2 gap-3 transition-opacity ${isPeriodLoading ? "opacity-40" : "opacity-100"}`}>
          <div className="bg-brand-surface rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-brand">{periodStats?.stampsInPeriod ?? "—"}</p>
            <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mt-0.5">Stamps</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{periodStats?.visitsInPeriod ?? "—"}</p>
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
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          {
            label: "Lifetime Stamps",
            value: customer.lifetimeStamps,
            icon: TrendingUp,
            bg: "bg-brand-surface",
            color: "text-brand",
          },
          {
            label: "Total Redeemed",
            value: customer.totalRedemptions,
            icon: CheckCircle2,
            bg: "bg-green-50",
            color: "text-green-600",
          },
          {
            label: "Redemption Rate",
            value: `${redemptionRate}%`,
            icon: Wallet,
            bg: "bg-indigo-50",
            color: "text-indigo-600",
          },
          {
            label: "Visit Recency",
            value: daysFromLastVisit === null ? "N/A" : `${daysFromLastVisit}d`,
            icon: Clock3,
            bg: "bg-amber-50",
            color: "text-accent-text",
          },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
            <div className={`h-10 w-10 ${bg} rounded-xl flex items-center justify-center mb-2`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-[var(--text-tertiary)] font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Owner Insight</p>
          <Users className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Current cycle status</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {rewardReady ? "Ready to redeem" : `${stampsLeft} more needed`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Engagement signal</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {daysFromLastVisit === null ? "Not yet active" : daysFromLastVisit <= 7 ? "Healthy" : daysFromLastVisit <= 21 ? "Cooling" : "At risk"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Reward behavior</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {customer.totalRedemptions > 0 ? "Redeems regularly" : "No reward claimed yet"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
        <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3">Activity</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-brand-surface rounded-xl flex items-center justify-center flex-shrink-0">
              <Calendar className="h-4 w-4 text-brand" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Enrolled</p>
              <p className="text-xs text-[var(--text-tertiary)]">{enrolledDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Last Visit</p>
              <p className="text-xs text-[var(--text-tertiary)]">{lastVisit}</p>
            </div>
          </div>
          {customer.totalRedemptions > 0 && (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <RotateCcw className="h-4 w-4 text-accent-text" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)]">Rewards Claimed</p>
                <p className="text-xs text-[var(--text-tertiary)]">{customer.totalRedemptions} time{customer.totalRedemptions !== 1 ? "s" : ""}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
