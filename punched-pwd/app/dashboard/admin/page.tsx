"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { adminApi } from "@/lib/api/admin";
import type { AdminDashboardResponse, SmartInsight } from "@/types";
import {
  Users,
  Store,
  UserCheck,
  Stamp,
  Gift,
  CreditCard,
  Share2,
  TrendingUp,
  TrendingDown,
  Minus,
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
    { label: "Customers", value: dashboard.totalCustomers, today: dashboard.newCustomersToday, week: dashboard.newCustomers7d, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Businesses", value: dashboard.totalBusinesses, today: dashboard.newBusinessesToday, week: dashboard.newBusinesses7d, icon: Store, color: "text-emerald-600 bg-emerald-50" },
    { label: "Staff", value: dashboard.totalStaff, today: 0, week: 0, icon: UserCheck, color: "text-violet-600 bg-violet-50" },
    { label: "Stamps", value: dashboard.totalStamps, today: dashboard.stampsToday, week: dashboard.stamps7d, icon: Stamp, color: "text-accent-text bg-amber-50" },
    { label: "Redemptions", value: dashboard.totalRedemptions, today: dashboard.redemptionsToday, week: dashboard.redemptions7d, icon: Gift, color: "text-rose-600 bg-rose-50" },
    { label: "Cards", value: dashboard.totalCards, today: 0, week: 0, icon: CreditCard, color: "text-cyan-600 bg-cyan-50" },
    { label: "Referrals", value: dashboard.totalReferrals, today: 0, week: 0, icon: Share2, color: "text-orange-600 bg-orange-50" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">Platform overview &amp; key metrics</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="bg-[var(--surface)] rounded-xl p-3.5 shadow-card border border-[var(--border-light)]">
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`p-1.5 rounded-lg ${m.color}`}>
                <m.icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">{m.label}</span>
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{m.value.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--text-secondary)]">
              {m.today > 0 && (
                <span className="inline-flex items-center gap-0.5 text-emerald-600 font-medium">
                  +{m.today} today
                </span>
              )}
              {m.week > 0 && (
                <span className="text-[var(--text-tertiary)]">+{m.week} / 7d</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/dashboard/admin/analytics", label: "Analytics", desc: "Charts & trends", icon: TrendingUp, color: "text-blue-600" },
          { href: "/dashboard/admin/businesses", label: "Businesses", desc: "Manage all", icon: Store, color: "text-emerald-600" },
          { href: "/dashboard/admin/users", label: "Users", desc: "All accounts", icon: Users, color: "text-violet-600" },
          { href: "/dashboard/admin/insights", label: "Insights", desc: "Smart analysis", icon: Zap, color: "text-accent-text" },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="bg-[var(--surface)] rounded-xl p-3.5 shadow-card border border-[var(--border-light)] hover:shadow-md hover:border-[var(--border)] transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className={`${a.color} mb-1`}>
                  <a.icon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-sm text-[var(--text-primary)]">{a.label}</div>
                <div className="text-xs text-[var(--text-secondary)]">{a.desc}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Smart Insights
          </h2>
          <div className="space-y-2">
            {insights.slice(0, 4).map((insight, i) => (
              <div key={i} className="bg-[var(--surface)] rounded-xl p-3.5 shadow-card border border-[var(--border-light)] flex items-start gap-3">
                <div className={`p-1.5 rounded-lg mt-0.5 ${
                  insight.trend === "positive" ? "bg-emerald-50 text-emerald-600" :
                  insight.trend === "negative" ? "bg-red-50 text-red-600" :
                  "bg-[var(--surface-raised)] text-[var(--text-secondary)]"
                }`}>
                  {insight.trend === "positive" ? <TrendingUp className="h-4 w-4" /> :
                   insight.trend === "negative" ? <TrendingDown className="h-4 w-4" /> :
                   <Minus className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-[var(--text-primary)]">{insight.title}</span>
                    {insight.metric && (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        insight.trend === "positive" ? "bg-emerald-50 text-emerald-700" :
                        insight.trend === "negative" ? "bg-red-50 text-red-700" :
                        "bg-[var(--border-light)] text-[var(--text-secondary)]"
                      }`}>
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
          {insights.length > 4 && (
            <Link
              href="/dashboard/admin/insights"
              className="text-sm text-brand font-medium mt-2 inline-flex items-center gap-1 hover:underline"
            >
              View all insights <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
