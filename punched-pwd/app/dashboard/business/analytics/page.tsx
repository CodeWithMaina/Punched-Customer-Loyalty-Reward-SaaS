"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import * as Fmt from "@/lib/format";
import type {
  BusinessAnalyticsResponse,
  BusinessAnalyticsComparisonResponse,
} from "@/types";
import {
  Loader2, ArrowLeft, AlertCircle, Users, UserCheck,
  TrendingUp, Gift, BarChart3, Crown,
  ChevronRight, Clock, Zap, Target, Activity, Inbox,
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { MetricCard, PeriodTabs, SectionTitle, MomentumRing, PIE_COLORS, DAYS } from "@/components/business/DashboardPrimitives";

// ── Business Analytics Page ──────────────────────────────────
// "Why is my business performing this way, and where should I focus?"
// Denser, richer view than the Dashboard — trends, breakdowns, comparisons.

export default function BusinessAnalyticsPage() {
  useRoleGuard("Business");
  const [analytics, setAnalytics] = useState<BusinessAnalyticsResponse | null>(null);
  const [compare, setCompare] = useState<BusinessAnalyticsComparisonResponse | null>(null);
  const [period, setPeriod] = useState("30d");
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      businessesApi.getAnalytics(period),
      businessesApi.getAnalyticsCompare(period).catch(() => null),
    ])
      .then(([aRes, cRes]) => {
        if (aRes?.success && aRes.data) setAnalytics(aRes.data);
        else setNotFound(true);
        if (cRes?.success && cRes.data) setCompare(cRes.data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [period]);

  const heatmapGrid = useMemo(() => {
    if (!analytics) return [];
    const grid: number[][] = Array.from({ length: 7 }, () => Array(6).fill(0));
    analytics.weeklyHeatmap.forEach(({ day, hour, value }) => {
      const bucket = Math.floor(hour / 4);
      if (day >= 0 && day < 7 && bucket >= 0 && bucket < 6) grid[day][bucket] += value;
    });
    return grid;
  }, [analytics]);

  const heatmapMax = useMemo(() => Math.max(...heatmapGrid.flat(), 1), [heatmapGrid]);

  function heatColor(v: number) {
    if (v === 0) return "bg-[var(--border-light)]";
    const ratio = v / heatmapMax;
    if (ratio < 0.2) return "bg-brand/20";
    if (ratio < 0.4) return "bg-brand/40";
    if (ratio < 0.6) return "bg-brand/60";
    if (ratio < 0.8) return "bg-brand/80";
    return "bg-brand";
  }

  // Composite "Business Health" score for the hero — blends redemption
  // rate and retention rate (0–100 each contribute) where available.
  // This is a presentation-layer read on the same numbers already shown
  // below; swap for a backend-computed score if one becomes available.
  const healthScore = useMemo(() => {
    if (!analytics) return 0;
    const redemption = Math.min(100, analytics.overview.redemptionRate);
    const retention = analytics.retentionData?.retentionRate ?? redemption;
    return Math.round(redemption * 0.5 + retention * 0.5);
  }, [analytics]);

  return (
    <div className="w-full max-w-lg mx-auto pb-28 overflow-x-hidden">
      {/* ── Sticky header ───────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[var(--background)]/95 backdrop-blur-sm">
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <Link
            href="/dashboard/business"
            className="h-9 w-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border-light)] transition-colors flex-shrink-0"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[var(--text-primary)] leading-tight truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Analytics
            </h1>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">Trends, breakdowns &amp; performance</p>
          </div>
        </div>
        <div className="px-4 pb-3">
          <PeriodTabs period={period} onChange={setPeriod} />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      )}

      {!isLoading && notFound && (
        <div className="px-4 py-10 text-center">
          <div className="h-14 w-14 bg-[var(--surface-raised)] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Inbox className="h-6 w-6 text-[var(--text-tertiary)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">No analytics available yet</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Set up your business on the Dashboard to see analytics here.</p>
          <Link href="/dashboard/business" className="inline-block mt-4 text-xs font-semibold text-brand">Go to Dashboard</Link>
        </div>
      )}

      {!isLoading && !notFound && analytics && (
        <div className="px-4 space-y-4">
          {/* ── 0. Hero: Business Health + Comparison ───────── */}
          {analytics.overview && (
            <div
              className="animate-scale-in w-full rounded-3xl p-4 shadow-card relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, var(--brand-dark), var(--brand))" }}
            >
              <div
                className="absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-20 pointer-events-none"
                style={{ background: "radial-gradient(circle, #fff, transparent 70%)" }}
              />
              <div className="relative flex items-center gap-3 min-w-0">
                <MomentumRing score={healthScore} label="Health" dark size={68} />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/70">Business health</p>
                  <p className="text-lg font-bold text-white mt-0.5 leading-tight truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {healthScore >= 75 ? "Thriving" : healthScore >= 45 ? "Healthy" : "Needs attention"}
                  </p>
                  <p className="text-[10px] text-white/70 mt-1 leading-snug line-clamp-2">
                    Blends redemption rate &amp; customer retention
                  </p>
                </div>
              </div>

              <div className="relative grid grid-cols-2 gap-2 mt-3.5">
                {compare ? (
                  <>
                    <HeroStat label="Stamps" current={Fmt.formatNumber(compare.summary.stamps.currentValue)} sub={Fmt.formatTrend(compare.summary.stamps.changePct, compare.summary.stamps.trend)} />
                    <HeroStat label="Active customers" current={Fmt.formatNumber(compare.summary.customers.currentValue)} sub={Fmt.formatTrend(compare.summary.customers.changePct, compare.summary.customers.trend)} />
                    <HeroStat label="Reward payout" current={Fmt.formatKes(compare.summary.payoutKes.currentValue)} sub={Fmt.formatTrend(compare.summary.payoutKes.changePct, compare.summary.payoutKes.trend)} />
                    <HeroStat label="Redemption rate" current={Fmt.formatPercent(analytics.overview.redemptionRate)} sub={`${Fmt.formatNumber(analytics.overview.rewardReadyCustomers)} reward-ready`} />
                  </>
                ) : (
                  <>
                    <HeroStat label="Total stamps" current={Fmt.formatNumber(analytics.overview.totalStamps)} />
                    <HeroStat label="New customers" current={Fmt.formatNumber(analytics.overview.newCustomers)} sub={`${Fmt.formatNumber(analytics.overview.returningCustomers)} returning`} />
                    <HeroStat label="Redemption rate" current={Fmt.formatPercent(analytics.overview.redemptionRate)} />
                    <HeroStat label="Reward payout" current={Fmt.formatKes(analytics.overview.rewardPayoutKes)} sub={`${Fmt.formatNumber(analytics.overview.rewardReadyCustomers)} ready`} />
                  </>
                )}
              </div>

              <div className="relative grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-white/15 text-center">
                <div className="min-w-0">
                  <p className="text-[8px] text-white/60 uppercase tracking-wide truncate">This week</p>
                  <p className="text-sm font-bold text-white mt-0.5 truncate">{Fmt.formatNumber(analytics.overview.stampsThisWeek)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-white/60 uppercase tracking-wide truncate">Avg/customer</p>
                  <p className="text-sm font-bold text-white mt-0.5 truncate">{Fmt.formatDecimal(analytics.overview.avgStampsPerCustomer)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-white/60 uppercase tracking-wide truncate">Net eng. value</p>
                  <p className="text-sm font-bold text-white mt-0.5 truncate">{Fmt.formatKes(analytics.overview.netEngagementValueKes)}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── 1. Business Hours Performance (Line Chart) ── */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
            <SectionTitle icon={Clock} label="Peak Hours" />
            <div className="h-44 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.hourlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    tickFormatter={(h: number) => h % 3 === 0 ? `${h}:00` : ""} />
                  <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={25} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid var(--border)" }}
                    labelFormatter={(h: any) => `${h}:00 - ${Number(h) + 1}:00`} />
                  <Line type="monotone" dataKey="stamps" stroke="var(--brand)" strokeWidth={2.5} dot={false} name="Stamps" />
                  <Line type="monotone" dataKey="redemptions" stroke="#10B981" strokeWidth={2.5} dot={false} name="Redemptions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2 justify-center">
              <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"><span className="h-2 w-2 rounded-full bg-brand" />Stamps</span>
              <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"><span className="h-2 w-2 rounded-full bg-emerald-500" />Redemptions</span>
            </div>
          </div>

          {/* ── 2. Weekly Heatmap ──────────────────────────── */}
          {heatmapGrid.length > 0 && (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
              <SectionTitle icon={Activity} label="Weekly Heatmap" />
              <div className="mt-3">
                <div className="flex gap-1 mb-1 pl-8">
                  {["12am", "4am", "8am", "12pm", "4pm", "8pm"].map((t) => (
                    <div key={t} className="flex-1 text-[9px] text-[var(--text-tertiary)] text-center">{t}</div>
                  ))}
                </div>
                {heatmapGrid.map((row, di) => (
                  <div key={di} className="flex items-center gap-1 mb-1">
                    <span className="text-[9px] text-[var(--text-tertiary)] w-7 text-right shrink-0">{DAYS[di]}</span>
                    {row.map((val, bi) => (
                      <div
                        key={bi}
                        title={`${DAYS[di]} ${["12am", "4am", "8am", "12pm", "4pm", "8pm"][bi]}: ${val}`}
                        className={`flex-1 h-5 rounded ${heatColor(val)} transition-all`}
                      />
                    ))}
                  </div>
                ))}
                <div className="flex items-center gap-1 mt-2 justify-end">
                  <span className="text-[9px] text-[var(--text-tertiary)]">Less</span>
                  {["bg-[var(--border-light)]", "bg-brand/20", "bg-brand/40", "bg-brand/70", "bg-brand"].map((c) => (
                    <div key={c} className={`h-3 w-3 rounded-sm ${c}`} />
                  ))}
                  <span className="text-[9px] text-[var(--text-tertiary)]">More</span>
                </div>
              </div>
            </div>
          )}

          {/* ── 3. Engagement Trends (Multi-Line) ──────────── */}
          {analytics.engagementTrends.length > 1 && (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
              <SectionTitle icon={TrendingUp} label="Engagement Trends" />
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.engagementTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                      tickFormatter={(d: string) => new Date(d).toLocaleDateString("en", { day: "numeric", month: "short" })}
                      interval={Math.max(0, Math.floor(analytics.engagementTrends.length / 6))} />
                    <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={25} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid var(--border)" }}
                      labelFormatter={(d: any) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })} />
                    <Area type="monotone" dataKey="stamps" stroke="var(--brand)" fill="var(--brand)" fillOpacity={0.1} strokeWidth={2} name="Stamps" />
                    <Area type="monotone" dataKey="redemptions" stroke="#10B981" fill="#10B981" fillOpacity={0.1} strokeWidth={2} name="Redemptions" />
                    <Area type="monotone" dataKey="enrollments" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.1} strokeWidth={2} name="Enrollments" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-3 mt-2 justify-center flex-wrap">
                <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"><span className="h-2 w-2 rounded-full bg-brand" />Stamps</span>
                <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"><span className="h-2 w-2 rounded-full bg-emerald-500" />Redemptions</span>
                <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"><span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />Enrollments</span>
              </div>
            </div>
          )}

          {/* ── 4. Customer Demographics (Gender Donut + Age Bars) ── */}
          <div className="grid grid-cols-1 gap-4">
            {analytics.genderBreakdown.length > 0 && (
              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
                <SectionTitle icon={Users} label="Gender Distribution" />
                <div className="flex items-center gap-4 mt-3">
                  <div className="h-28 w-28 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.genderBreakdown}
                          dataKey="count"
                          nameKey="label"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={3}
                        >
                          {analytics.genderBreakdown.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid var(--border)" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {analytics.genderBreakdown.map((g, i) => {
                      const total = analytics.genderBreakdown.reduce((s, x) => s + x.count, 0);
                      const pct = total > 0 ? Math.round((g.count / total) * 100) : 0;
                      return (
                        <div key={g.label} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-xs text-[var(--text-secondary)] flex-1">{g.label}</span>
                          <span className="text-xs font-bold text-[var(--text-primary)]">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {analytics.ageBreakdown.length > 0 && (
              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
                <SectionTitle icon={BarChart3} label="Age Distribution" />
                <div className="h-36 mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.ageBreakdown.filter((a) => a.label !== "Unknown")} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={25} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid var(--border)" }} />
                      <Bar dataKey="count" fill="var(--brand)" radius={[4, 4, 0, 0]} name="Customers" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* ── 5. Conversion Funnel ───────────────────────── */}
          {analytics.funnelData?.totalCustomers > 0 && (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
              <SectionTitle icon={Target} label="Conversion Funnel" />
              <div className="mt-3 space-y-2">
                {[
                  { label: "Total Customers", value: analytics.funnelData.totalCustomers, color: "bg-brand" },
                  { label: "Stamped at least once", value: analytics.funnelData.stampedAtLeastOnce, color: "bg-sky-400" },
                  { label: "Completed a card", value: analytics.funnelData.completedCard, color: "bg-emerald-500" },
                  { label: "Redeemed reward", value: analytics.funnelData.redeemed, color: "bg-amber-500" },
                ].map(({ label, value, color }, idx) => {
                  const pct = analytics.funnelData.totalCustomers > 0 ? Math.round((value / analytics.funnelData.totalCustomers) * 100) : 0;
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">{value} ({pct}%)</span>
                      </div>
                      <div className="h-3 bg-[var(--border-light)] rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                      {idx < 3 && (
                        <div className="flex justify-center my-0.5">
                          <svg className="h-3 w-3 text-[var(--text-muted)]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 6. Customer Growth (Area Chart) ────────────── */}
          {analytics.customerGrowth.length > 1 && (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
              <SectionTitle icon={TrendingUp} label="Customer Growth" />
              <div className="h-40 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.customerGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                      tickFormatter={(d: string) => new Date(d).toLocaleDateString("en", { day: "numeric", month: "short" })}
                      interval={Math.max(0, Math.floor(analytics.customerGrowth.length / 5))} />
                    <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid var(--border)" }}
                      labelFormatter={(d: any) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })} />
                    <Area type="monotone" dataKey="total" stroke="var(--brand)" fill="var(--brand)" fillOpacity={0.15} strokeWidth={2} name="Total" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── 7. Retention ───────────────────────────────── */}
          {analytics.retentionData && (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
              <SectionTitle icon={Zap} label="Retention (30 days)" />
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-emerald-700">{analytics.retentionData.returningCustomers}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold uppercase mt-0.5">Returning</p>
                </div>
                <div className="bg-brand-surface rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-brand">{analytics.retentionData.newCustomers}</p>
                  <p className="text-[10px] text-brand/70 font-semibold uppercase mt-0.5">New</p>
                </div>
                <div className="bg-[var(--surface-raised)] rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-[var(--text-secondary)]">{analytics.retentionData.dormantCustomers}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase mt-0.5">Dormant</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between bg-brand-surface rounded-xl px-3 py-2.5">
                <span className="text-xs text-brand font-semibold">Retention Rate</span>
                <span className="text-sm font-bold text-brand">{analytics.retentionData.retentionRate}%</span>
              </div>
            </div>
          )}

          {/* ── 8. Program Performance (Bar Chart) ─────────── */}
          {analytics.programPerformance.length > 0 && (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
              <SectionTitle icon={Gift} label="Program Performance" />
              <div className="space-y-3 mt-3">
                {analytics.programPerformance.map((p) => (
                  <div key={p.programId} className="bg-[var(--surface-raised)] rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{p.programName}</p>
                      <span className="text-xs font-bold text-brand">{p.completionRate}% completion</span>
                    </div>
                    <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${p.completionRate}%` }} />
                    </div>
                    <div className="flex gap-4 text-[10px] text-[var(--text-secondary)]">
                      <span>{p.activeCards} cards</span>
                      <span>{p.totalRedemptions} redemptions</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 9. Staff Performance (Horizontal Bar) ──────── */}
          {analytics.staffPerformance.length > 0 && (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
              <SectionTitle icon={UserCheck} label="Staff Performance" href="/dashboard/business/staff" />
              <div className="space-y-2 mt-3">
                {analytics.staffPerformance.slice(0, 5).map((s, i) => {
                  const max = analytics.staffPerformance[0]?.stampsIssued || 1;
                  return (
                    <Link key={s.staffId} href={`/dashboard/business/staff/${s.staffId}`}
                      className="flex items-center gap-3 bg-[var(--surface-raised)] rounded-xl px-3 py-2.5 hover:bg-[var(--border-light)] transition-colors">
                      <span className={`text-xs font-bold w-4 text-center ${i === 0 ? "text-amber-500" : "text-[var(--text-tertiary)]"}`}>
                        {i + 1}
                      </span>
                      <div className="h-7 w-7 rounded-full bg-brand-surface text-brand text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{s.name}</p>
                        <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-brand rounded-full" style={{ width: `${(s.stampsIssued / max) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)] flex-shrink-0">{s.stampsIssued}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 10. Top Customers ──────────────────────────── */}
          {analytics.topCustomers.length > 0 && (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-bold text-[var(--text-primary)]">Top Customers</p>
                </div>
                <Link href="/dashboard/business/customers" className="text-xs font-semibold text-brand">View all</Link>
              </div>
              <div className="divide-y divide-[var(--border-light)]">
                {analytics.topCustomers.slice(0, 5).map((c, i) => (
                  <Link key={c.customerId} href={`/dashboard/business/customers/${c.customerId}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-raised)] transition-colors">
                    <span className={`text-xs font-bold w-4 text-center ${i === 0 ? "text-amber-500" : "text-[var(--text-muted)]"}`}>{i + 1}</span>
                    <div className="h-8 w-8 rounded-full bg-brand-surface text-brand text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{c.name}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{c.lifetimeStamps} stamps · {c.totalRedemptions} redeemed</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── 11. Revenue & Payout Pipeline ─────────────────── */}
          {analytics.revenue && (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
              <SectionTitle icon={Gift} label="Revenue & Payout" href="/dashboard/business/redemptions" />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <MetricCard label="Reward Payout (period)" value={Fmt.formatKes(analytics.revenue.rewardPayoutKes)} accent />
                <MetricCard label="Rewards Paid" value={Fmt.formatKes(analytics.revenue.rewardsPaidKes)} />
                <MetricCard label="Pending Payout" value={Fmt.formatKes(analytics.revenue.pendingPayoutKes)} warn={analytics.revenue.pendingPayoutKes > 0} />
                <MetricCard label="Accrued Liability" value={Fmt.formatKes(analytics.revenue.accruedLiabilityKes)} sub={`${analytics.revenue.failedPayouts} failed`} />
              </div>
              {analytics.revenue.payoutSuccessRate > 0 && (
                <div className="mt-3 flex items-center justify-between bg-brand-surface rounded-xl px-3 py-2.5">
                  <span className="text-xs font-semibold text-brand">Payout success rate</span>
                  <span className="text-sm font-bold text-brand">{Fmt.formatPercent(analytics.revenue.payoutSuccessRate)}%</span>
                </div>
              )}
              {analytics.revenue.avgPayoutLatencyDays != null && (
                <p className="text-[10px] text-[var(--text-tertiary)] mt-2">Avg payout latency: {Fmt.formatDecimal(analytics.revenue.avgPayoutLatencyDays)} days</p>
              )}
            </div>
          )}

          {/* ── 12. Traffic Insights ─────────────────────────── */}
          {analytics.traffic && (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
              <SectionTitle icon={Zap} label="Traffic Insights" />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <MetricCard label="Busiest Day" value={analytics.traffic.busiestDayOfWeek ?? "—"} accent sub={`${analytics.traffic.busiestDayStamps} stamps`} />
                <MetricCard label="Visit Cadence" value={analytics.traffic.visitCadenceDays != null ? `${Fmt.formatDecimal(analytics.traffic.visitCadenceDays)}d` : "—"} accent sub="avg between visits" />
              </div>
              {analytics.traffic.peakHours.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5">Peak Hours</p>
                  <ResponsiveContainer width="100%" height={112}>
                    <BarChart data={analytics.traffic.peakHours.slice().sort((a, b) => a.hour - b.hour)} layout="vertical" margin={{ left: 28 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="hour" tickFormatter={(h: any) => Fmt.formatHour(h)} tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid var(--border)" }} labelFormatter={(h: any) => Fmt.formatHour(h)} />
                      <Bar dataKey="stampCount" fill="var(--brand)" radius={[0, 4, 4, 0]} name="Stamps" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {analytics.traffic.underutilizedHours.length > 0 && (
                <div className="mt-3 rounded-xl bg-[var(--surface-raised)] p-2.5">
                  <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5">Quiet Windows</p>
                  <div className="flex flex-wrap gap-1.5">
                    {analytics.traffic.underutilizedHours.slice(0, 4).map((u) => (
                      <span key={u.hour} className="text-[10px] text-[var(--text-secondary)] bg-[var(--border-light)] px-2 py-0.5 rounded-full">
                        {Fmt.formatHour(u.hour)} {u.label} · {u.stampCount} stamps
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 13. Actionable Recommendations ───────────────── */}
          {analytics.recommendations && analytics.recommendations.length > 0 && (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
              <SectionTitle icon={AlertCircle} label="Recommendations" />
              <div className="mt-3 space-y-2.5">
                {analytics.recommendations.map((r) => (
                  <div key={r.type} className="bg-[var(--surface-raised)] rounded-xl p-3 flex items-start gap-2.5">
                    <span className={`mt-0.5 text-[10px] font-bold uppercase tracking-widest flex-shrink-0 ${
                      r.priority === "high" ? "text-rose-500" : r.priority === "medium" ? "text-amber-500" : "text-sky-500"
                    }`}>{r.priority}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{r.title}</p>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{r.description}</p>
                    </div>
                    {r.actionUrl && (
                      <Link href={r.actionUrl} className="text-xs font-semibold text-brand flex-shrink-0">{r.action}</Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Local sub-components ──────────────────────────────────────

function HeroStat({ label, current, sub }: { label: string; current: string; sub?: string }) {
  return (
    <div className="bg-white/10 rounded-xl px-2.5 py-2 backdrop-blur-sm min-w-0">
      <p className="text-[8.5px] font-semibold uppercase tracking-wider text-white/60 truncate">{label}</p>
      <p className="text-sm font-bold text-white mt-0.5 leading-none truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {current}
      </p>
      {sub && <p className="text-[8.5px] text-white/60 mt-1 truncate">{sub}</p>}
    </div>
  );
}