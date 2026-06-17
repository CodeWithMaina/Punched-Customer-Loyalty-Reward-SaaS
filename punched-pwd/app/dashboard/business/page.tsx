"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import { loyaltyApi } from "@/lib/api/loyalty";
import type {
  Business,
  BusinessCustomer,
  BusinessDashboardResponse,
  BusinessAnalyticsResponse,
  LoyaltyProgram,
  StaffMember,
} from "@/types";
import {
  Loader2, Store, ScanLine, Award, Plus, Stamp, Users, UserCheck,
  TrendingUp, TrendingDown, Gift, BarChart3, Crown,
  ChevronRight, ArrowRight, Clock, Zap, Target, Activity,
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ── Constants ────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
];

const PIE_COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#6B7280"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Sub-components ──────────────────────────────────────────

function MetricCard({
  label, value, sub, trend, accent, warn,
}: {
  label: string; value: number | string; sub?: string;
  trend?: "up" | "down" | "neutral"; accent?: boolean; warn?: boolean;
}) {
  const textClass = warn ? "text-amber-500" : accent ? "text-brand" : "text-[var(--text-primary)]";
  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 flex flex-col gap-1">
      <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">{label}</p>
      <div className="flex items-end gap-1.5">
        <p className={`text-2xl font-bold leading-none ${textClass}`}>{value}</p>
        {trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-green-500 mb-0.5" />}
        {trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-red-400 mb-0.5" />}
      </div>
      {sub && <p className="text-[10px] text-[var(--text-tertiary)]">{sub}</p>}
    </div>
  );
}

function PeriodTabs({ period, onChange }: { period: string; onChange: (p: string) => void }) {
  return (
    <div className="flex gap-1 bg-[var(--border-light)] rounded-xl p-0.5">
      {PERIOD_OPTIONS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${
            period === p.value ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-card" : "text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function SectionTitle({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand" />
        <p className="text-sm font-bold text-[var(--text-primary)]">{label}</p>
      </div>
      {href && (
        <Link href={href} className="text-xs font-semibold text-brand flex items-center gap-0.5">
          View <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────

export default function BusinessOverviewPage() {
  useRoleGuard("Business");
  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<BusinessCustomer[]>([]);
  const [dashboard, setDashboard] = useState<BusinessDashboardResponse | null>(null);
  const [analytics, setAnalytics] = useState<BusinessAnalyticsResponse | null>(null);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [period, setPeriod] = useState("30d");
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const initialPeriodLoaded = useState(false);

  // Phase 1: Load critical above-the-fold data first (business + dashboard metrics)
  useEffect(() => {
    Promise.all([
      businessesApi.getMine(),
      businessesApi.getDashboard().catch(() => null),
    ])
      .then(([bizRes, dashRes]) => {
        if (bizRes.success && bizRes.data) setBusiness(bizRes.data);
        else { setNotFound(true); return; }
        if (dashRes?.success && dashRes.data) setDashboard(dashRes.data);
        if (bizRes.data?.loyaltyPrograms) setPrograms(bizRes.data.loyaltyPrograms);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, []);

  // Phase 2: Load secondary data (customers, programs, staff) after initial render
  useEffect(() => {
    if (isLoading || notFound) return;
    Promise.all([
      businessesApi.getMyCustomers().catch(() => null),
      loyaltyApi.listPrograms().catch(() => null),
      businessesApi.getMyStaff().catch(() => null),
    ]).then(([custRes, progRes, staffRes]) => {
      if (custRes?.success && custRes.data) setCustomers(custRes.data);
      if (progRes?.success && progRes.data) setPrograms(progRes.data);
      if (staffRes?.success && staffRes.data) setStaff(staffRes.data);
    });
  }, [isLoading, notFound]);

  // Phase 3: Load analytics (heaviest call) — also handles period changes
  useEffect(() => {
    if (isLoading || notFound) return;
    setAnalyticsLoading(true);
    businessesApi.getAnalytics(period)
      .then((res) => {
        if (res.success && res.data) setAnalytics(res.data);
      })
      .finally(() => setAnalyticsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, isLoading, notFound]);

  // Derived data
  const newThisWeek = useMemo(() =>
    customers.filter((c) => Date.now() - new Date(c.enrolledAt).getTime() < 7 * 86400000).length,
    [customers]
  );

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (notFound) return <CreateBusinessPrompt />;

  const activeCards = dashboard?.activeCards ?? customers.length;
  const stampsToday = dashboard?.stampsToday ?? 0;
  const rewardReadyCards = dashboard?.rewardReadyCards ?? 0;
  const totalRedemptions = dashboard?.totalRedemptions ?? 0;
  const totalStampsIssued = dashboard?.totalStampsIssued ?? 0;
  const activeProgram = programs.find((p) => p.isActive);
  const stampsRequired = activeProgram?.stampsRequired ?? 0;

  function heatColor(v: number) {
    if (v === 0) return "bg-[var(--border-light)]";
    const ratio = v / heatmapMax;
    if (ratio < 0.2) return "bg-brand/20";
    if (ratio < 0.4) return "bg-brand/40";
    if (ratio < 0.6) return "bg-brand/60";
    if (ratio < 0.8) return "bg-brand/80";
    return "bg-brand";
  }

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ── Business identity ──────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-brand-surface border border-brand/10 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-card">
          {business?.logoUrl ? (
            <img src={business.logoUrl} alt={business.name} className="h-full w-full object-cover" />
          ) : (
            <Store className="h-7 w-7 text-brand" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[var(--text-primary)] truncate leading-tight">{business?.name}</h1>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">{business?.category} · {business?.location}</p>
        </div>
        <Link
          href="/dashboard/business/scan"
          className="h-10 w-10 bg-brand hover:bg-brand-hover shadow-card rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
          aria-label="Scan QR"
        >
          <ScanLine className="h-5 w-5 text-white" />
        </Link>
      </div>

      {/* ── Key metrics ────────────────────────────────────── */}
      <div className="px-5 grid grid-cols-2 gap-3 mb-5">
        <MetricCard label="Customers" value={activeCards} sub={newThisWeek > 0 ? `+${newThisWeek} this week` : undefined} trend={newThisWeek > 0 ? "up" : "neutral"} />
        <MetricCard label="Stamps Today" value={stampsToday} accent={stampsToday > 0} />
        <MetricCard label="Ready to Redeem" value={rewardReadyCards} warn={rewardReadyCards > 0} sub={rewardReadyCards > 0 ? "Customers waiting" : undefined} />
        <MetricCard label="Total Redeemed" value={totalRedemptions} sub={totalStampsIssued > 0 ? `${totalStampsIssued} stamps issued` : undefined} />
      </div>

      {/* ── Period selector ────────────────────────────────── */}
      <div className="px-5 mb-5">
        <PeriodTabs period={period} onChange={setPeriod} />
      </div>

      <div className={`transition-opacity ${analyticsLoading ? "opacity-50" : "opacity-100"}`}>
        {analytics && (
          <div className="px-5 space-y-5">
            {/* ── 1. Business Hours Performance (Line Chart) ── */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
              <SectionTitle icon={Clock} label="Peak Hours" />
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.hourlyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                      tickFormatter={(h: number) => h % 3 === 0 ? `${h}:00` : ""} />
                    <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={25} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e5e7eb" }}
                      labelFormatter={(h: any) => `${h}:00 - ${Number(h) + 1}:00`} />
                    <Line type="monotone" dataKey="stamps" stroke="var(--brand)" strokeWidth={2} dot={false} name="Stamps" />
                    <Line type="monotone" dataKey="redemptions" stroke="#10B981" strokeWidth={2} dot={false} name="Redemptions" />
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                        tickFormatter={(d: string) => new Date(d).toLocaleDateString("en", { day: "numeric", month: "short" })}
                        interval={Math.max(0, Math.floor(analytics.engagementTrends.length / 6))} />
                      <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={25} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e5e7eb" }}
                        labelFormatter={(d: any) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })} />
                      <Area type="monotone" dataKey="stamps" stroke="var(--brand)" fill="var(--brand)" fillOpacity={0.1} strokeWidth={2} name="Stamps" />
                      <Area type="monotone" dataKey="redemptions" stroke="#10B981" fill="#10B981" fillOpacity={0.1} strokeWidth={2} name="Redemptions" />
                      <Area type="monotone" dataKey="enrollments" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={2} name="Enrollments" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-3 mt-2 justify-center flex-wrap">
                  <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"><span className="h-2 w-2 rounded-full bg-brand" />Stamps</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"><span className="h-2 w-2 rounded-full bg-emerald-500" />Redemptions</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"><span className="h-2 w-2 rounded-full bg-amber-500" />Enrollments</span>
                </div>
              </div>
            )}

            {/* ── 4. Customer Demographics (Gender Donut + Age Bars) ── */}
            <div className="grid grid-cols-1 gap-3">
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
                          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e5e7eb" }} />
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={25} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e5e7eb" }} />
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
                    { label: "Stamped at least once", value: analytics.funnelData.stampedAtLeastOnce, color: "bg-blue-400" },
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                        tickFormatter={(d: string) => new Date(d).toLocaleDateString("en", { day: "numeric", month: "short" })}
                        interval={Math.max(0, Math.floor(analytics.customerGrowth.length / 5))} />
                      <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e5e7eb" }}
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
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-green-700">{analytics.retentionData.returningCustomers}</p>
                    <p className="text-[10px] text-green-600 font-semibold uppercase mt-0.5">Returning</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-blue-700">{analytics.retentionData.newCustomers}</p>
                    <p className="text-[10px] text-blue-600 font-semibold uppercase mt-0.5">New</p>
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
          </div>
        )}
      </div>

      {/* ── Loyalty programs ───────────────────────────────── */}
      <div className="px-5 mt-5">
        <ProgramsStrip programs={programs} />
      </div>

      {/* ── Staff strip ────────────────────────────────────── */}
      <div className="px-5 mt-5">
        <StaffStrip staff={staff} />
      </div>
    </div>
  );
}

// ── Sub-components (programs, staff, create prompt) ─────────

function ProgramsStrip({ programs }: { programs: LoyaltyProgram[] }) {
  if (programs.length === 0) {
    return (
      <Link href="/dashboard/business/profile"
        className="flex items-center gap-3 bg-brand-surface border border-brand/10 rounded-2xl px-4 py-3.5">
        <div className="h-9 w-9 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
          <Gift className="h-4 w-4 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-brand">Create your first loyalty program</p>
          <p className="text-xs text-brand/60 mt-0.5">Set up stamps &amp; rewards</p>
        </div>
        <ChevronRight className="h-4 w-4 text-brand/40 flex-shrink-0" />
      </Link>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-brand" />
          <p className="text-sm font-bold text-[var(--text-primary)]">Programs</p>
          <span className="text-[10px] font-bold bg-brand-surface text-brand px-1.5 py-0.5 rounded-full">{programs.length}</span>
        </div>
        <Link href="/dashboard/business/profile" className="text-xs font-semibold text-brand flex items-center gap-0.5">
          <Plus className="h-3 w-3" /> Add
        </Link>
      </div>
      <div className="divide-y divide-[var(--border-light)]">
        {programs.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3">
            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${p.isActive ? "bg-green-500" : "bg-[var(--text-muted)]"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{p.name}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">{p.stampsRequired} stamps → {p.rewardDescription}</p>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${p.isActive ? "bg-green-50 text-green-600" : "bg-[var(--border-light)] text-[var(--text-tertiary)]"}`}>
              {p.isActive ? "Active" : "Paused"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffStrip({ staff }: { staff: StaffMember[] }) {
  if (staff.length === 0) {
    return (
      <Link href="/dashboard/business/staff"
        className="flex items-center gap-3 bg-[var(--surface-raised)] border border-[var(--border-light)] rounded-2xl px-4 py-3.5">
        <UserCheck className="h-4 w-4 text-[var(--text-tertiary)]" />
        <p className="text-sm text-[var(--text-secondary)]">No staff linked yet — tap to add</p>
        <ChevronRight className="h-4 w-4 text-[var(--text-muted)] ml-auto flex-shrink-0" />
      </Link>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-brand" />
          <p className="text-sm font-bold text-[var(--text-primary)]">Staff</p>
          <span className="text-[10px] font-bold bg-brand-surface text-brand px-1.5 py-0.5 rounded-full">{staff.length}</span>
        </div>
        <Link href="/dashboard/business/staff" className="text-xs font-semibold text-brand">Manage</Link>
      </div>
      <div className="px-4 pb-4 flex gap-2 flex-wrap">
        {staff.map((s) => (
          <div key={s.userId} className="flex items-center gap-2 bg-[var(--surface-raised)] rounded-xl px-3 py-2">
            <div className="h-6 w-6 rounded-full bg-brand-surface text-brand text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              {s.fullName.charAt(0).toUpperCase()}
            </div>
            <p className="text-xs font-semibold text-[var(--text-secondary)]">{s.fullName.split(" ")[0]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateBusinessPrompt() {
  const [form, setForm] = useState({ name: "", category: "", location: "", mpesaNumber: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      const res = await businessesApi.create(form);
      if (res.success) window.location.reload();
      else setError(res.error?.message ?? "Failed to create business");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      <div className="text-center space-y-2">
        <div className="h-16 w-16 bg-brand-surface rounded-2xl flex items-center justify-center mx-auto">
          <Store className="h-8 w-8 text-brand" />
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Set Up Your Business</h1>
        <p className="text-sm text-[var(--text-secondary)]">Create your profile to start running loyalty programs</p>
      </div>
      <form onSubmit={handleCreate} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-5 space-y-4">
        {[
          { key: "name", label: "Business Name", placeholder: "Artisan Brews" },
          { key: "category", label: "Category", placeholder: "Cafe, Fitness, Retail…" },
          { key: "location", label: "Location", placeholder: "Nairobi, Kenya" },
          { key: "mpesaNumber", label: "M-Pesa Number", placeholder: "2547XXXXXXXX" },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">{label}</label>
            <input
              type="text"
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              required
            />
          </div>
        ))}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={isCreating}
          className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
          Create Business
        </button>
      </form>
    </div>
  );
}

