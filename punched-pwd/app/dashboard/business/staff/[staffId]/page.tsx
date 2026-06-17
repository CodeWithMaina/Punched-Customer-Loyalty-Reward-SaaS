"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import type { AnalyticsPeriod, StaffMemberAnalyticsResponse } from "@/types";
import {
  Loader2, Mail, User, Shield, ChevronLeft, ScanLine,
  Stamp, Users, Flame, Trophy, Clock3, CalendarDays, TrendingUp,
  BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: "Today", value: "today" },
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "All", value: "all" },
];

const DAILY_GOAL = 25;

export default function StaffDetailPage() {
  useRoleGuard("Business");
  const { staffId } = useParams<{ staffId: string }>();

  const [analytics, setAnalytics] = useState<StaffMemberAnalyticsResponse | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isPeriodLoading, setIsPeriodLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    businessesApi.getStaffMemberAnalytics(staffId, "all")
      .then((res) => {
        if (res.success && res.data) setAnalytics(res.data);
      })
      .finally(() => setIsLoading(false));
  }, [staffId]);

  useEffect(() => {
    if (isLoading) return;
    setIsPeriodLoading(true);
    businessesApi.getStaffMemberAnalytics(staffId, period)
      .then((res) => {
        if (res.success && res.data) setAnalytics(res.data);
      })
      .finally(() => setIsPeriodLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Build daily breakdown from recent activity
  const dailyData = useMemo(() => {
    if (!analytics) return [];
    const now = new Date();
    const dayCount = period === "today" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 14;
    const buckets: Record<string, number> = {};
    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    analytics.recentActivity.forEach((a) => {
      const key = new Date(a.stampedAt).toISOString().slice(0, 10);
      if (key in buckets) buckets[key]++;
    });
    return Object.entries(buckets).map(([date, count]) => ({
      label: new Date(date).toLocaleDateString("en", { weekday: "short", day: "numeric" }),
      stamps: count,
    }));
  }, [analytics, period]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <User className="h-12 w-12 text-[var(--text-muted)]" />
        <p className="text-[var(--text-secondary)] font-medium">Staff member not found</p>
        <Link href="/dashboard/business/staff" className="text-sm text-brand font-semibold">
          ← Back to staff
        </Link>
      </div>
    );
  }

  const { stampsIssued, customersServed, totalStampsAllTime, totalCustomersAllTime, recentActivity } = analytics;

  const heroValue = period === "all" ? totalStampsAllTime : stampsIssued;
  const heroSubLabel =
    period === "all" ? "total stamps issued (all time)" :
    period === "today" ? "stamps issued today" :
    period === "7d" ? "stamps issued – last 7 days" :
    "stamps issued – last 30 days";
  const dailyProgress = period === "today" ? Math.min((stampsIssued / DAILY_GOAL) * 100, 100) : 100;
  const goalReached = period === "today" && stampsIssued >= DAILY_GOAL;

  // Insights
  const avgPerDay = period === "7d" ? Math.round(stampsIssued / 7) :
    period === "30d" ? Math.round(stampsIssued / 30) : 0;
  const efficiency = customersServed > 0 ? Math.round((stampsIssued / customersServed) * 10) / 10 : 0;

  return (
    <div className="max-w-lg mx-auto pb-12">
      <div className="px-5 pt-5 pb-4">
        <Link href="/dashboard/business/staff" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)]">
          <ChevronLeft className="h-4 w-4" />Staff
        </Link>
      </div>

      {/* ── Hero performance card ────────────────────────────── */}
      <div className={`mx-5 mb-5 rounded-2xl p-5 ${goalReached ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-brand to-brand-hover"}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest">
              {analytics.fullName.split(" ")[0]}&apos;s Performance
            </p>
            <p className={`text-white text-4xl font-bold mt-1 leading-none transition-opacity ${isPeriodLoading ? "opacity-40" : "opacity-100"}`}>
              {heroValue}
            </p>
            <p className="text-white/70 text-xs mt-1">{heroSubLabel}</p>
          </div>
          <div className="h-16 w-16 rounded-2xl bg-white/15 flex items-center justify-center">
            {goalReached ? <Trophy className="h-8 w-8 text-white" /> : <Stamp className="h-8 w-8 text-white" />}
          </div>
        </div>

        {/* Period tabs */}
        <div className="bg-white/15 rounded-xl p-1 flex gap-1 mb-3">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${
                period === p.value ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-card" : "text-white/80 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === "today" && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-white/70 text-xs">Daily goal: {DAILY_GOAL} stamps</p>
              <p className="text-white text-xs font-bold">{Math.round(dailyProgress)}%</p>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--surface)] rounded-full transition-all duration-700" style={{ width: `${dailyProgress}%` }} />
            </div>
            <p className="text-white/70 text-xs mt-2">
              {goalReached ? "Goal reached! Great work" : `${DAILY_GOAL - stampsIssued} more to hit today's goal`}
            </p>
          </div>
        )}
      </div>

      {/* ── Identity card ────────────────────────────────────── */}
      <div className="mx-5 mb-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-brand-surface text-brand text-xl font-bold flex items-center justify-center flex-shrink-0 overflow-hidden border-3 border-brand/10">
            {analytics.avatarUrl
              ? <img src={analytics.avatarUrl} alt={analytics.fullName} className="h-full w-full object-cover rounded-full" />
              : analytics.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[var(--text-primary)] truncate">{analytics.fullName}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Mail className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              <p className="text-xs text-[var(--text-tertiary)] truncate">{analytics.email}</p>
            </div>
            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-brand bg-brand-surface px-2.5 py-0.5 rounded-full">
              <Shield className="h-3 w-3" />Staff Member
            </span>
          </div>
        </div>
      </div>

      {/* ── Stat grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 px-5 mb-5">
        {[
          { label: period === "today" ? "Today" : period === "7d" ? "7 Days" : period === "30d" ? "30 Days" : "All Time", value: stampsIssued, icon: CalendarDays, color: "text-brand", bg: "bg-brand-surface" },
          { label: "Customers Served", value: customersServed, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "All-Time Stamps", value: totalStampsAllTime, icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "All-Time Customers", value: totalCustomersAllTime, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 flex items-center gap-3 transition-opacity ${isPeriodLoading ? "opacity-50" : "opacity-100"}`}>
            <div className={`${bg} h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--text-primary)] leading-none">{value}</p>
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Actionable Insights ──────────────────────────────── */}
      {(period === "7d" || period === "30d") && (
        <div className="mx-5 mb-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-brand" />
            <p className="text-sm font-bold text-[var(--text-primary)]">Insights</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-[var(--surface-raised)] rounded-xl px-3 py-2.5">
              <span className="text-xs text-[var(--text-secondary)]">Avg stamps/day</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{avgPerDay}</span>
            </div>
            <div className="flex items-center justify-between bg-[var(--surface-raised)] rounded-xl px-3 py-2.5">
              <span className="text-xs text-[var(--text-secondary)]">Stamps per customer</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{efficiency}</span>
            </div>
            <div className="flex items-center justify-between bg-[var(--surface-raised)] rounded-xl px-3 py-2.5">
              <span className="text-xs text-[var(--text-secondary)]">Unique customers</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{customersServed}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Stamp activity chart ─────────────────────────────── */}
      {dailyData.length > 1 && (
        <div className="mx-5 mb-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-brand" />
            <p className="text-sm font-bold text-[var(--text-primary)]">Stamp Activity</p>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={25} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e5e7eb" }}
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                />
                <Bar dataKey="stamps" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Recent stamps ────────────────────────────────────── */}
      <div className="px-5 mb-5">
        <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3">
          Recent Stamps
        </p>
        {recentActivity.length === 0 ? (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-8 text-center">
            <Stamp className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-tertiary)]">No stamps recorded yet</p>
          </div>
        ) : (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden divide-y divide-[var(--border-light)]">
            {recentActivity.slice(0, 10).map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <div className="h-9 w-9 rounded-full bg-brand-surface flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-brand">{item.customerName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.customerName}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Stamp #{item.stampNumber}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-[var(--text-tertiary)]">{timeAgo(item.stampedAt)}</p>
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400 ml-auto mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Capabilities & restrictions ──────────────────────── */}
      <div className="mx-5 mb-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
        <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3">What they can do</p>
        <div className="space-y-3">
          {[
            { icon: ScanLine, label: "Scan customer QR codes", description: "Award stamps on every visit" },
            { icon: Shield, label: "Verified access", description: "Identity tied to their Punched account" },
          ].map(({ icon: Icon, label, description }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-xl bg-brand-surface flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-brand" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attribution note */}
      <div className="mx-5 bg-brand-surface border border-brand/10 rounded-2xl p-4 flex items-start gap-3">
        <Clock3 className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />
        <p className="text-xs text-brand/80 leading-relaxed">
          Stamps are attributed to the exact staff or business account that scanned the customer QR.
        </p>
      </div>
    </div>
  );
}
