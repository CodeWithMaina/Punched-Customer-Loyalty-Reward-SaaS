"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import type { AnalyticsPeriod, StaffMemberAnalyticsResponse, StampDto } from "@/types";
import {
  Loader2, User, Shield, ChevronLeft, RefreshCw,
  Stamp, Trophy, QrCode,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
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

export default function StaffDetailPage() {
  useRoleGuard("Business");
  const { staffId } = useParams<{ staffId: string }>();

  const [analytics, setAnalytics] = useState<StaffMemberAnalyticsResponse | null>(null);
  const [recentStamps, setRecentStamps] = useState<StampDto[]>([]);
  const [isStampsLoading, setIsStampsLoading] = useState(true);
  const [period, setPeriod] = useState<AnalyticsPeriod>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isPeriodLoading, setIsPeriodLoading] = useState(false);

  const loadRecentStamps = useCallback(async () => {
    try {
            const bizRes = await businessesApi.getMine();
      if (!bizRes.success || !bizRes.data) return;
      const stampsRes = await businessesApi.getRecentStamps(bizRes.data.id, staffId, 20);
      if (stampsRes.success && stampsRes.data) setRecentStamps(stampsRes.data);
    } catch {
      /* keep existing list on transient errors */
    } finally {
      setIsStampsLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    setIsLoading(true);
    businessesApi.getStaffMemberAnalytics(staffId, "all")
      .then((res) => {
        if (res.success && res.data) setAnalytics(res.data);
      })
      .finally(() => setIsLoading(false));

    loadRecentStamps();
  }, [staffId, loadRecentStamps]);

  // Lightweight polling refresh every 45s.
  useEffect(() => {
    const t = setInterval(loadRecentStamps, 45_000);
    return () => clearInterval(t);
  }, [loadRecentStamps]);

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
        <div className="border border-[var(--border)] bg-[var(--surface-raised)] p-5">
          <User className="h-10 w-10 text-[var(--text-muted)]" />
        </div>
        <p className="text-[12px] tracking-[0.15em] uppercase font-bold text-[var(--text-secondary)]">
          Staff member not found
        </p>
        <Link
          href="/dashboard/business/staff"
          className="border border-[var(--border)] px-4 py-2 text-[12px] tracking-[0.15em] uppercase font-bold text-brand hover:bg-brand hover:text-[var(--surface)] transition-colors"
        >
          ← Back to staff
        </Link>
      </div>
    );
  }

  const { stampsIssued, customersServed, totalStampsAllTime, totalCustomersAllTime } = analytics;

  const heroValue = period === "all" ? totalStampsAllTime : stampsIssued;
  const dailyGoal = analytics.dailyGoal ?? 25;
  const dailyProgress = period === "today" ? Math.min((stampsIssued / dailyGoal) * 100, 100) : 100;
  const goalReached = period === "today" && stampsIssued >= dailyGoal;

  // Insights
  const avgPerDay = period === "7d" ? Math.round(stampsIssued / 7) :
    period === "30d" ? Math.round(stampsIssued / 30) : 0;
  const efficiency = customersServed > 0 ? Math.round((stampsIssued / customersServed) * 10) / 10 : 0;

  return (
    <div className="relative overflow-x-hidden min-h-screen pb-12">
      {/* Watermark */}
      <div
        aria-hidden
        className="hidden md:block absolute top-24 right-0 font-extrabold leading-none select-none pointer-events-none z-0"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: "340px",
          color: "var(--text-primary)",
          opacity: 0.02,
        }}
      >
        PUNCH
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-5 md:px-8 lg:px-16 py-6 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
        {/* ── Left column: profile & goal ───────────────────────── */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <Link
            href="/dashboard/business/staff"
            className="inline-flex items-center gap-2 self-start border border-[var(--border)] px-4 py-2.5 text-[12px] tracking-[0.15em] uppercase font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-brand transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Staff
          </Link>

          {/* Profile card */}
          <section className="border border-[var(--border)] bg-[var(--surface-raised)] p-8 flex flex-col items-center text-center relative overflow-hidden group">
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100"
              style={{ background: "linear-gradient(to top, var(--brand-surface), transparent)" }}
            />
            <div className="relative w-28 h-28 mb-5">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-[var(--border)] bg-brand-surface flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-500">
                {analytics.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={analytics.avatarUrl} alt={analytics.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span
                    className="text-4xl font-extrabold text-brand"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {analytics.fullName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[var(--background)] border border-[var(--border)] rounded-full p-1.5 flex items-center justify-center">
                <Shield className="h-3 w-3 text-brand" />
              </div>
            </div>
            <h1
              className={`text-2xl md:text-[32px] font-bold tracking-tight text-[var(--text-primary)] mb-2 ${isPeriodLoading ? "opacity-40" : ""}`}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {analytics.fullName}
            </h1>
            <p className="font-mono text-xs text-[var(--text-tertiary)] mb-4 break-all" style={{ fontFamily: "'Space Mono', monospace" }}>
              {analytics.email}
            </p>
            <div className="bg-[var(--surface-container-high, var(--surface))] border border-[var(--border)] px-3 py-1 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isPeriodLoading ? "" : "animate-pulse"} bg-brand`} />
              <span className="text-[12px] tracking-[0.15em] uppercase font-bold text-[var(--text-primary)]">
                Staff Member
              </span>
            </div>
          </section>

          {/* Daily Goal */}
          <section className="border border-[var(--border)] bg-[var(--background)] p-6">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-4 mb-5">
              <h2
                className="text-lg font-semibold tracking-tight text-[var(--text-primary)]"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Daily Goal
              </h2>
              {goalReached && <Trophy className="h-4 w-4 text-brand" />}
            </div>
            <div className="flex justify-between font-mono text-xs mb-3" style={{ fontFamily: "'Space Mono', monospace" }}>
              <span className="text-[var(--text-tertiary)]">Current Progress</span>
              <span className={`font-bold ${goalReached ? "text-ok" : "text-[var(--text-primary)]"}`}>
                {period === "today" ? stampsIssued : dailyGoal} / {dailyGoal}
              </span>
            </div>
            {period === "today" ? (
              <>
                <div className="w-full h-2 bg-[var(--surface-container-high, var(--border-light))] relative overflow-hidden">
                  <div className="absolute inset-y-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, var(--text-primary) 10px, var(--text-primary) 20px)" }} />
                  <div
                    className={`absolute left-0 top-0 bottom-0 transition-all duration-700 ${goalReached ? "bg-ok" : "bg-brand"}`}
                    style={{ width: `${dailyProgress}%` }}
                  />
                </div>
                <p className="text-right text-[12px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)] mt-3">
                  {Math.round(dailyProgress)}% COMPLETED
                </p>
                {!goalReached && (
                  <p className="font-mono text-xs text-[var(--text-secondary)] mt-1" style={{ fontFamily: "'Space Mono', monospace" }}>
                    {dailyGoal - stampsIssued} more to hit today&apos;s goal
                  </p>
                )}
              </>
            ) : (
              <p className="font-mono text-xs text-[var(--text-tertiary)] mt-1" style={{ fontFamily: "'Space Mono', monospace" }}>
                Switch to &quot;Today&quot; to track today&apos;s progress.
              </p>
            )}
          </section>

          {/* Attribution note */}
          <section className="bg-brand-surface border border-brand/20 p-4 flex items-start gap-3">
            <QrCode className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />
            <p className="font-mono text-xs leading-relaxed text-[var(--text-secondary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
              Stamps are attributed to the exact staff or business account that scanned the customer QR.
            </p>
          </section>
        </div>

        {/* ── Right column: metrics & analytics ─────────────────── */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Overview grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: period === "today" ? "Today's Stamps" : period === "7d" ? "7-Day Stamps" : period === "30d" ? "30-Day Stamps" : "All-Time Stamps", value: heroValue },
              { label: "Customers Served", value: customersServed },
              { label: "All-Time Stamps", value: totalStampsAllTime },
              { label: "All-Time Customers", value: totalCustomersAllTime },
            ].map(({ label, value }) => (
              <div key={label} className={`border border-[var(--border)] bg-[var(--surface-raised)] p-5 flex flex-col gap-2 hover:bg-brand-surface transition-colors ${isPeriodLoading ? "opacity-50" : ""}`}>
                <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">{label}</span>
                <span
                  className="text-[32px] md:text-[40px] font-extrabold leading-none tracking-tight text-[var(--text-primary)]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {value}
                </span>
              </div>
            ))}
          </section>

          {/* Actionable Insights */}
          {(period === "7d" || period === "30d") && (
            <section className="border border-[var(--border)] bg-[var(--background)] p-6">
              <h2
                className="text-lg font-semibold tracking-tight text-[var(--text-primary)] border-b border-[var(--border)] pb-4 mb-4"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Insights
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs" style={{ fontFamily: "'Space Mono', monospace" }}>
                {[
                  { label: "Avg Stamps / Day", value: avgPerDay },
                  { label: "Stamps Per Customer", value: efficiency },
                  { label: "Unique Customers", value: customersServed },
                ].map(({ label, value }) => (
                  <div key={label} className="p-4 border border-[var(--border)] bg-[var(--surface-raised)]">
                    <div className="text-[var(--text-tertiary)] mb-1">{label}</div>
                    <div className="text-xl font-bold text-[var(--text-primary)]">{value}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Stamp Activity chart + period selector */}
          <section className="border border-[var(--border)] bg-[var(--background)] p-6 flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[var(--border)] pb-4 mb-6 gap-4">
              <h2
                className="text-lg font-semibold tracking-tight text-[var(--text-primary)]"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Stamp Activity
              </h2>
              <div className="flex gap-2" role="group" aria-label="Analytics period">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    aria-pressed={period === p.value}
                    className={`px-3 py-1 text-[12px] tracking-[0.15em] uppercase font-bold border transition-colors ${
                      period === p.value
                        ? "bg-brand text-[var(--background)] border-brand"
                        : "bg-transparent text-[var(--text-tertiary)] border-[var(--border)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={`relative h-64 border border-[var(--border)] bg-[var(--surface-raised)] transition-opacity ${isPeriodLoading ? "opacity-40" : ""}`}>
              {dailyData.length > 1 ? (
                <div className="h-full p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData} margin={{ top: 12, right: 12, bottom: 4, left: -16 }}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-tertiary)", fontFamily: "'Space Mono', monospace" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--text-tertiary)", fontFamily: "'Space Mono', monospace" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 0,
                          fontSize: 12,
                          background: "var(--surface-raised)",
                          border: "1px solid var(--border)",
                          color: "var(--text-primary)",
                          fontFamily: "'Space Mono', monospace",
                        }}
                        cursor={{ stroke: "var(--border)" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="stamps"
                        stroke="var(--brand)"
                        strokeWidth={2}
                        dot={{ r: 2, fill: "var(--brand)", strokeWidth: 0 }}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-xs text-[var(--text-tertiary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
                    Not enough activity data for this period
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Recent Activity */}
          <section className="border border-[var(--border)] bg-[var(--background)] flex flex-col">
            <div className="flex justify-between items-center border-b border-[var(--border)] px-6 py-4">
              <h2
                className="text-[12px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Recent Activity
              </h2>
              <button
                type="button"
                aria-label="Refresh activity"
                onClick={loadRecentStamps}
                disabled={isStampsLoading}
                className="p-1 text-[var(--text-secondary)] hover:text-brand disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isStampsLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {isStampsLoading && recentStamps.length === 0 ? (
              <ul className="px-6 py-6 flex flex-col gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-4">
                    <div className="h-8 w-8 bg-[var(--surface-container-high, var(--border-light))] animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/5 bg-[var(--surface-container-high, var(--border-light))] animate-pulse" />
                      <div className="h-2 w-1/4 bg-[var(--surface-container-high, var(--border-light))] animate-pulse" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : recentStamps.length === 0 ? (
              <div className="p-10 text-center">
                <Stamp className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
                <p className="font-mono text-xs text-[var(--text-tertiary)]" style={{ fontFamily: "'Space Mono', monospace" }}>
                  No activity recorded yet
                </p>
              </div>
            ) : (
              <ul className="px-6 py-6 flex flex-col gap-5">
                {recentStamps.map((stamp, idx) => (
                  <li key={stamp.id} className="contents">
                    <div className="flex items-start gap-4">
                      <span
                        className={`mt-0.5 ${stamp.source === "enrollment" ? "text-[var(--text-tertiary)]" : "text-brand"}`}
                      >
                        <QrCode className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-sm text-[var(--text-primary)] truncate" style={{ fontFamily: "'Space Mono', monospace" }}>
                          Scanned loyalty card for <span className="font-bold">{stamp.customerName}</span>.
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[12px] tracking-[0.15em] uppercase font-bold px-2 py-0.5 border ${
                              stamp.source === "enrollment"
                                ? "text-[var(--text-secondary)] border-[var(--border)]"
                                : "text-brand border-brand/40"
                            }`}
                          >
                            {stamp.source === "enrollment" ? "Welcome" : "Scan"}
                          </span>
                          {stamp.rewardDescription ? (
                            <span className="font-mono text-[11px] text-[var(--text-tertiary)] truncate" style={{ fontFamily: "'Space Mono', monospace" }}>
                              {stamp.rewardDescription}
                            </span>
                          ) : null}
                        </div>
                        <p className="font-mono text-[11px] text-[var(--text-tertiary)] mt-1" style={{ fontFamily: "'Space Mono', monospace" }}>
                          {timeAgo(stamp.timestamp)}
                        </p>
                      </div>
                    </div>
                    {idx < recentStamps.length - 1 && <div className="w-full h-px bg-[var(--border)] mt-5" aria-hidden />}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Access Privileges */}
          <section className="bg-[var(--surface-raised)] p-6 md:p-8">
            <h3 className="text-[12px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)] mb-4">
              Staff Access
            </h3>
            <div className="flex flex-col gap-2">
              {[
                { icon: QrCode, label: "Scan Stamps", description: "Award stamps on every visit", enabled: true },
                { icon: Shield, label: "Verified Access", description: "Identity tied to their Punched account", enabled: true },
              ].map(({ icon: Icon, label, description }) => (
                <div key={label} className="flex items-center justify-between gap-3 py-1">
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4 w-4 text-brand flex-shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-mono text-sm text-[var(--text-primary)] truncate" style={{ fontFamily: "'Space Mono', monospace" }}>{label}</span>
                      <span className="block font-mono text-[11px] text-[var(--text-tertiary)] truncate" style={{ fontFamily: "'Space Mono', monospace" }}>{description}</span>
                    </span>
                  </span>
                  <span className="text-brand flex-shrink-0" aria-hidden>✓</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
