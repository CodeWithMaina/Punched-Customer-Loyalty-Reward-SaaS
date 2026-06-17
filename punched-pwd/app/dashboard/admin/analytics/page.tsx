"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { adminApi } from "@/lib/api/admin";
import type {
  AdminGrowthResponse,
  AdminBusinessAnalyticsResponse,
  AdminCustomerAnalyticsResponse,
  AdminStaffAnalyticsResponse,
} from "@/types";
import { Loader2, TrendingUp, Users, Store, UserCheck, ChevronRight, MapPin, Stamp, Gift } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const COLORS = ["#2563EB", "#059669", "#7C3AED", "#D97706", "#EC4899", "#0891B2", "#DC2626", "#6366F1"];

export default function AdminAnalytics() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const [growth, setGrowth] = useState<AdminGrowthResponse | null>(null);
  const [bizAnalytics, setBizAnalytics] = useState<AdminBusinessAnalyticsResponse | null>(null);
  const [custAnalytics, setCustAnalytics] = useState<AdminCustomerAnalyticsResponse | null>(null);
  const [staffAnalytics, setStaffAnalytics] = useState<AdminStaffAnalyticsResponse | null>(null);
  const [growthPeriod, setGrowthPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"growth" | "business" | "customer" | "staff">("growth");

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "Admin") {
      router.replace("/dashboard");
      return;
    }

    setLoading(true);
    Promise.all([
      adminApi.getGrowth(growthPeriod),
      adminApi.getBusinessAnalytics(),
      adminApi.getCustomerAnalytics(),
      adminApi.getStaffAnalytics(),
    ])
      .then(([g, b, c, s]) => {
        if (g.success && g.data) setGrowth(g.data);
        if (b.success && b.data) setBizAnalytics(b.data);
        if (c.success && c.data) setCustAnalytics(c.data);
        if (s.success && s.data) setStaffAnalytics(s.data);
      })
      .finally(() => setLoading(false));
  }, [user, authLoading, router, growthPeriod]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  const tabs = [
    { key: "growth" as const, label: "Growth", icon: TrendingUp },
    { key: "business" as const, label: "Business", icon: Store },
    { key: "customer" as const, label: "Customer", icon: Users },
    { key: "staff" as const, label: "Staff", icon: UserCheck },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-5 overflow-hidden">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">Analytics</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">Deep insights across the platform</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-[var(--border-light)] rounded-xl p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
              activeTab === t.key
                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-card"
                : "text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <t.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Growth Tab */}
      {activeTab === "growth" && growth && (
        <div className="space-y-5">
          {/* Period Selector */}
          <div className="flex gap-2">
            {["7d", "30d", "90d"].map((p) => (
              <button
                key={p}
                onClick={() => setGrowthPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  growthPeriod === p
                    ? "bg-brand text-white"
                    : "bg-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
                }`}
              >
                {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
              </button>
            ))}
          </div>

          {/* Growth Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GrowthChart title="New Customers" data={growth.customers} color="#2563EB" />
            <GrowthChart title="New Businesses" data={growth.businesses} color="#059669" />
            <GrowthChart title="Stamps Issued" data={growth.stamps} color="#D97706" />
            <GrowthChart title="Redemptions" data={growth.redemptions} color="#EC4899" />
          </div>
        </div>
      )}

      {/* Business Tab */}
      {activeTab === "business" && bizAnalytics && (
        <div className="space-y-4">
          {/* Category Distribution */}
          <div className="bg-[var(--surface)] rounded-xl p-4 shadow-card border border-[var(--border-light)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Business Distribution by Category</h3>
            <div className="h-48 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bizAnalytics.categoryBreakdown}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    strokeWidth={2}
                  >
                    {bizAnalytics.categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Mobile: Category Cards */}
            <div className="space-y-2 md:hidden">
              {bizAnalytics.categoryBreakdown.map((cat, i) => (
                <div key={cat.category} className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--surface-raised)]">
                  <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-[var(--text-primary)]">{cat.category}</div>
                    <div className="flex gap-3 text-[11px] text-[var(--text-secondary)] mt-0.5">
                      <span>{cat.count} biz</span>
                      <span>{cat.totalCustomers.toLocaleString()} cust</span>
                      <span>{cat.totalStamps.toLocaleString()} stamps</span>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-[var(--text-secondary)]">{cat.totalRedemptions} red.</div>
                </div>
              ))}
            </div>

            {/* Desktop: Category Table */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border-light)]">
                    <th className="pb-2 pr-3">Category</th>
                    <th className="pb-2 pr-3 text-right">Count</th>
                    <th className="pb-2 pr-3 text-right">Stamps</th>
                    <th className="pb-2 pr-3 text-right">Customers</th>
                    <th className="pb-2 text-right">Redemptions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-light)]">
                  {bizAnalytics.categoryBreakdown.map((cat, i) => (
                    <tr key={cat.category} className="hover:bg-[var(--surface-raised)]">
                      <td className="py-2 pr-3 flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-medium text-[var(--text-primary)]">{cat.category}</span>
                      </td>
                      <td className="py-2 pr-3 text-right text-[var(--text-secondary)]">{cat.count}</td>
                      <td className="py-2 pr-3 text-right text-[var(--text-secondary)]">{cat.totalStamps.toLocaleString()}</td>
                      <td className="py-2 pr-3 text-right text-[var(--text-secondary)]">{cat.totalCustomers.toLocaleString()}</td>
                      <td className="py-2 text-right text-[var(--text-secondary)]">{cat.totalRedemptions.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Businesses */}
          <div className="bg-[var(--surface)] rounded-xl p-4 shadow-card border border-[var(--border-light)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Top Businesses by Stamp Activity</h3>

            {/* Mobile: Business Cards */}
            <div className="space-y-2 md:hidden">
              {bizAnalytics.topBusinesses.map((b) => (
                <button
                  key={b.id}
                  onClick={() => router.push(`/dashboard/admin/businesses/${b.id}`)}
                  className="w-full text-left p-3 rounded-xl bg-[var(--surface-raised)] hover:bg-[var(--border-light)] active:bg-[var(--border-light)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Store className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[var(--text-primary)] truncate">{b.name}</div>
                      <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{b.location}</span>
                        <span className="mx-0.5">·</span>
                        <span className="font-medium">{b.category}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                  </div>
                  <div className="flex gap-3 mt-2.5 ml-12">
                    <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                      <Users className="h-3 w-3" /><span className="font-semibold text-[var(--text-secondary)]">{b.totalCustomers}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                      <Stamp className="h-3 w-3" /><span className="font-semibold text-[var(--text-secondary)]">{b.totalStamps.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                      <Gift className="h-3 w-3" /><span className="font-semibold text-[var(--text-secondary)]">{b.totalRedemptions}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop: Business Table */}
            <div className="hidden md:block overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border-light)]">
                    <th className="pb-2 pr-3">Business</th>
                    <th className="pb-2 pr-3">Category</th>
                    <th className="pb-2 pr-3 text-right">Customers</th>
                    <th className="pb-2 pr-3 text-right">Stamps</th>
                    <th className="pb-2 text-right">Redemptions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-light)]">
                  {bizAnalytics.topBusinesses.map((b) => (
                    <tr key={b.id} className="hover:bg-[var(--surface-raised)] cursor-pointer" onClick={() => router.push(`/dashboard/admin/businesses/${b.id}`)}>
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-[var(--text-primary)] hover:text-brand">{b.name}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{b.location}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--border-light)] text-[var(--text-secondary)]">
                          {b.category}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-right text-[var(--text-secondary)]">{b.totalCustomers}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-[var(--text-primary)]">{b.totalStamps.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-[var(--text-secondary)]">{b.totalRedemptions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customer Tab */}
      {activeTab === "customer" && custAnalytics && (
        <div className="space-y-4">
          {/* Charts row - stack on mobile, side by side on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gender Breakdown */}
            <div className="bg-[var(--surface)] rounded-xl p-4 shadow-card border border-[var(--border-light)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Gender Distribution</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={custAnalytics.genderBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" width={60} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#7C3AED" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Age Breakdown */}
            <div className="bg-[var(--surface)] rounded-xl p-4 shadow-card border border-[var(--border-light)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Age Distribution</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={custAnalytics.ageBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis tick={{ fontSize: 11 }} width={30} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Engagement Breakdown */}
          <div className="bg-[var(--surface)] rounded-xl p-4 shadow-card border border-[var(--border-light)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Customer Engagement (Last 30 Days)</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Highly Active", value: custAnalytics.engagementBreakdown.highlyActive, desc: "10+ stamps", color: "text-emerald-600 bg-emerald-50" },
                { label: "Active", value: custAnalytics.engagementBreakdown.active, desc: "5-9 stamps", color: "text-blue-600 bg-blue-50" },
                { label: "Occasional", value: custAnalytics.engagementBreakdown.occasional, desc: "1-4 stamps", color: "text-accent-text bg-amber-50" },
                { label: "Dormant", value: custAnalytics.engagementBreakdown.dormant, desc: "0 stamps", color: "text-red-600 bg-red-50" },
              ].map((seg) => (
                <div key={seg.label} className={`rounded-xl p-3 ${seg.color}`}>
                  <div className="text-xl sm:text-2xl font-bold">{seg.value.toLocaleString()}</div>
                  <div className="text-xs sm:text-sm font-semibold mt-0.5">{seg.label}</div>
                  <div className="text-[10px] sm:text-xs opacity-75">{seg.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-[var(--surface)] rounded-xl p-4 shadow-card border border-[var(--border-light)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Top Customers by Lifetime Stamps</h3>

            {/* Mobile: Customer Cards */}
            <div className="space-y-2 md:hidden">
              {custAnalytics.topCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/dashboard/admin/users/${c.id}`)}
                  className="w-full text-left p-3 rounded-xl bg-[var(--surface-raised)] hover:bg-[var(--border-light)] active:bg-[var(--border-light)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      {c.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[var(--text-primary)] truncate">{c.fullName}</div>
                      <div className="text-[11px] text-[var(--text-secondary)] truncate">{c.email}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                  </div>
                  <div className="flex gap-4 mt-2 ml-12 text-[11px] text-[var(--text-secondary)]">
                    <span><span className="font-semibold text-[var(--text-secondary)]">{c.totalCards}</span> cards</span>
                    <span><span className="font-semibold text-[var(--text-secondary)]">{c.lifetimeStamps}</span> stamps</span>
                    <span><span className="font-semibold text-[var(--text-secondary)]">{c.totalRedemptions}</span> redeemed</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop: Customer Table */}
            <div className="hidden md:block overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border-light)]">
                    <th className="pb-2 pr-3">Name</th>
                    <th className="pb-2 pr-3">Email</th>
                    <th className="pb-2 pr-3 text-right">Cards</th>
                    <th className="pb-2 pr-3 text-right">Stamps</th>
                    <th className="pb-2 text-right">Redemptions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-light)]">
                  {custAnalytics.topCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--surface-raised)] cursor-pointer" onClick={() => router.push(`/dashboard/admin/users/${c.id}`)}>
                      <td className="py-2.5 pr-3 font-medium text-[var(--text-primary)] hover:text-brand">{c.fullName}</td>
                      <td className="py-2.5 pr-3 text-[var(--text-secondary)] text-xs">{c.email}</td>
                      <td className="py-2.5 pr-3 text-right text-[var(--text-secondary)]">{c.totalCards}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-[var(--text-primary)]">{c.lifetimeStamps}</td>
                      <td className="py-2.5 text-right text-[var(--text-secondary)]">{c.totalRedemptions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Staff Tab */}
      {activeTab === "staff" && staffAnalytics && (
        <div className="space-y-4">
          {/* Staff Overview */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-[var(--surface)] rounded-xl p-3 shadow-card border border-[var(--border-light)] text-center">
              <div className="text-lg sm:text-2xl font-bold text-[var(--text-primary)]">{staffAnalytics.totalStaff}</div>
              <div className="text-[10px] sm:text-xs text-[var(--text-secondary)] font-medium">Total Staff</div>
            </div>
            <div className="bg-[var(--surface)] rounded-xl p-3 shadow-card border border-[var(--border-light)] text-center">
              <div className="text-lg sm:text-2xl font-bold text-emerald-600">{staffAnalytics.linkedStaff}</div>
              <div className="text-[10px] sm:text-xs text-[var(--text-secondary)] font-medium">Linked</div>
            </div>
            <div className="bg-[var(--surface)] rounded-xl p-3 shadow-card border border-[var(--border-light)] text-center">
              <div className="text-lg sm:text-2xl font-bold text-accent-text">{staffAnalytics.unlinkedStaff}</div>
              <div className="text-[10px] sm:text-xs text-[var(--text-secondary)] font-medium">Unlinked</div>
            </div>
          </div>

          {/* Top Staff */}
          <div className="bg-[var(--surface)] rounded-xl p-4 shadow-card border border-[var(--border-light)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Top Staff by Stamps Issued</h3>

            {/* Mobile: Staff Cards */}
            <div className="space-y-2 md:hidden">
              {staffAnalytics.topStaff.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/dashboard/admin/users/${s.id}`)}
                  className="w-full text-left p-3 rounded-xl bg-[var(--surface-raised)] hover:bg-[var(--border-light)] active:bg-[var(--border-light)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      {s.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[var(--text-primary)] truncate">{s.fullName}</div>
                      <div className="text-[11px] text-[var(--text-secondary)] truncate">{s.businessName || "Unlinked"}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                  </div>
                  <div className="flex gap-4 mt-2 ml-12 text-[11px] text-[var(--text-secondary)]">
                    <span><span className="font-semibold text-[var(--text-secondary)]">{s.totalStampsIssued}</span> stamps issued</span>
                    <span><span className="font-semibold text-[var(--text-secondary)]">{s.customersServed}</span> customers</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop: Staff Table */}
            <div className="hidden md:block overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border-light)]">
                    <th className="pb-2 pr-3">Name</th>
                    <th className="pb-2 pr-3">Business</th>
                    <th className="pb-2 pr-3 text-right">Stamps</th>
                    <th className="pb-2 text-right">Customers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-light)]">
                  {staffAnalytics.topStaff.map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--surface-raised)] cursor-pointer" onClick={() => router.push(`/dashboard/admin/users/${s.id}`)}>
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-[var(--text-primary)] hover:text-brand">{s.fullName}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{s.email}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="text-xs text-[var(--text-secondary)]">{s.businessName || "Unlinked"}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-[var(--text-primary)]">{s.totalStampsIssued}</td>
                      <td className="py-2.5 text-right text-[var(--text-secondary)]">{s.customersServed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable Growth Chart ────────────────────────────────────

function GrowthChart({ title, data, color }: { title: string; data: { date: string; count: number }[]; color: string }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  return (
    <div className="bg-[var(--surface)] rounded-xl p-3 sm:p-4 shadow-card border border-[var(--border-light)]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        <span className="text-xs sm:text-sm font-bold" style={{ color }}>{total.toLocaleString()}</span>
      </div>
      <div className="h-32 sm:h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -10, right: 4, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis tick={{ fontSize: 10 }} width={30} />
            <Tooltip
              labelFormatter={(v) => new Date(v).toLocaleDateString()}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={color}
              fill={`url(#grad-${title})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
