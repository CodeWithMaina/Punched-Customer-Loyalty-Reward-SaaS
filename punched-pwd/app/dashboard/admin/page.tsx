"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { adminApi } from "@/lib/api/admin";
import type { AdminDashboardResponse, SmartInsight } from "@/types";
import {
  Users,
  Store,
  TrendingUp,
  Loader2,
  Zap,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [insights, setInsights] = useState<SmartInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "Admin") {
      router.replace("/dashboard");
      return;
    }

    Promise.all([adminApi.getDashboard(), adminApi.getInsights()])
      .then(([dashRes, insightRes]) => {
        if (dashRes.success && dashRes.data) setDashboard(dashRes.data);
        if (insightRes.success && insightRes.data) setInsights(insightRes.data.insights);
      })
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!dashboard) return null;

  const metrics = [
    { label: "Total Customers", value: dashboard.totalCustomers, today: dashboard.newCustomersToday, week: dashboard.newCustomers7d },
    { label: "Businesses", value: dashboard.totalBusinesses, today: dashboard.newBusinessesToday, week: dashboard.newBusinesses7d },
    { label: "Staff", value: dashboard.totalStaff, today: 0, week: 0 },
    { label: "Stamps", value: dashboard.totalStamps, today: dashboard.stampsToday, week: dashboard.stamps7d },
    { label: "Redemptions", value: dashboard.totalRedemptions, today: dashboard.redemptionsToday, week: dashboard.redemptions7d },
    { label: "Cards", value: dashboard.totalCards, today: 0, week: 0 },
    { label: "Referrals", value: dashboard.totalReferrals, today: 0, week: 0 },
  ];

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-8 font-mono">
      {/* Command Center Header */}
      <header className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end border-b border-[var(--border)] pb-6">
        <div className="md:col-span-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" aria-hidden="true" />
            Live Terminal
          </p>
          <h1 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tighter text-[var(--text-primary)] uppercase leading-none">
            Operational Command
          </h1>
        </div>
        <div className="md:col-span-4 flex md:justify-end">
          <span className="inline-block px-4 py-2 bg-[var(--surface-container-highest,var(--surface-raised))] text-[var(--brand)] text-[10px] font-bold uppercase tracking-[0.2em] rounded-none border border-[var(--brand)]/50">
            System Status: Optimal
          </span>
        </div>
      </header>

      {/* Metrics Grid */}
      <section aria-label="Platform metrics">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">System Overview</h2>
          <span className="text-[10px] text-[var(--text-muted)]">Last sync: Just now</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="group relative border border-[var(--border)] p-5 bg-[var(--surface-container-lowest,var(--surface))] hover:bg-[var(--surface-container-low,var(--surface-raised))] transition-colors overflow-hidden">
              <span aria-hidden="true" className="absolute top-0 left-0 w-1 h-full bg-[var(--brand)] opacity-20 group-hover:opacity-100 transition-opacity" />
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)] mb-4">{m.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-3xl font-extrabold tracking-tighter text-[var(--text-primary)]">{m.value.toLocaleString()}</span>
                {m.today > 0 && (
                  <span className="text-[11px] font-bold text-[var(--success-text,var(--accent))]">+{m.today}</span>
                )}
              </div>
              {m.week > 0 && (
                <p className="mt-3 text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">+{m.week} / 7d</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions — ops matrix */}
      <section aria-label="Quick actions">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Operations</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border)] border border-[var(--border)]">
          {[
            { href: "/dashboard/admin/analytics", label: "Analytics", desc: "Charts & trends", icon: TrendingUp },
            { href: "/dashboard/admin/businesses", label: "Businesses", desc: "Manage all", icon: Store },
            { href: "/dashboard/admin/users", label: "Users", desc: "All accounts", icon: Users },
            { href: "/dashboard/admin/insights", label: "Insights", desc: "Smart analysis", icon: Zap },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group bg-[var(--surface-dim,var(--surface))] p-6 flex flex-col justify-between min-h-[120px] hover:bg-[var(--surface-container,var(--surface-raised))] transition-colors"
            >
              <a.icon className="h-5 w-5 text-[var(--brand)] opacity-50 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} aria-hidden="true" />
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">{a.label}</div>
                <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5 flex items-center gap-1">
                  {a.desc}
                  <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[var(--brand)]" aria-hidden="true" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <section aria-label="Smart insights">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-[var(--accent)]" />Smart Insights
            </h2>
            {insights.length > 4 && (
              <Link
                href="/dashboard/admin/insights"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand)] hover:underline inline-flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          <div className="divide-y divide-[var(--border-light)] border border-[var(--border)]">
            {insights.slice(0, 4).map((insight, i) => (
              <div key={i} className="flex items-stretch gap-4 p-4 hover:bg-[var(--surface-container-low,var(--surface-raised))] transition-colors">
                <span
                  aria-hidden="true"
                  className={`w-1 flex-shrink-0 ${
                    insight.trend === "positive" ? "bg-[var(--success)]" :
                    insight.trend === "negative" ? "bg-[var(--accent)]" :
                    "bg-[var(--border)]"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">{insight.title}</span>
                    {insight.metric && (
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-none border ${
                        insight.trend === "positive" ? "text-[var(--success-text)] border-[var(--success)]/40" :
                        insight.trend === "negative" ? "text-[var(--accent-text,var(--accent))] border-[var(--accent)]/40" :
                        "text-[var(--text-secondary)] border-[var(--border)]"
                      }`}>
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1 line-clamp-2">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
