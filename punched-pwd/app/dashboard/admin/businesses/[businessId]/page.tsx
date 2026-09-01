"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { adminApi } from "@/lib/api/admin";
import type { AdminBusinessSummary } from "@/types";
import {
  Loader2, Store, ArrowLeft, MapPin, Users, Stamp, Gift,
  UserCheck, CreditCard, Calendar, Mail, Trash2, BarChart3, ShieldCheck,
  Wallet, Puzzle,
} from "lucide-react";
import type { PlanSummary } from "@/types";
import toast from "react-hot-toast";

export default function AdminBusinessDetail() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const [biz, setBiz] = useState<AdminBusinessSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const businessId = params.businessId as string;

  const refresh = useCallback(() => {
    return adminApi
      .getBusiness(businessId)
      .then((res) => { if (res.success && res.data) setBiz(res.data); })
      .catch(() => {});
  }, [businessId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "Admin") { router.replace("/dashboard"); return; }

    refresh().finally(() => setLoading(false));
  }, [user, authLoading, router, businessId, refresh]);

  const handleDelete = async () => {
    if (!biz) return;
    if (!confirm(`Delete business "${biz.name}"? This cannot be undone.`)) return;
    const res = await adminApi.deleteBusiness(biz.id);
    if (res.success) {
      toast.success("Business deleted");
      router.replace("/dashboard/admin/businesses");
    } else {
      toast.error(res.error?.message || "Failed to delete");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto text-center py-20">
        <Store className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-[var(--text-secondary)]">Business not found</p>
        <Link href="/dashboard/admin/businesses" className="text-brand text-sm font-medium mt-2 inline-block">
          Back to businesses
        </Link>
      </div>
    );
  }

  const stats = [
    { label: "Customers", value: biz.totalCustomers, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Total Stamps", value: biz.totalStamps, icon: Stamp, color: "text-accent-text bg-amber-50" },
    { label: "Redemptions", value: biz.totalRedemptions, icon: Gift, color: "text-rose-600 bg-rose-50" },
    { label: "Staff Members", value: biz.totalStaff, icon: UserCheck, color: "text-violet-600 bg-violet-50" },
    { label: "Programs", value: biz.programCount, icon: CreditCard, color: "text-cyan-600 bg-cyan-50" },
  ];

  const stampRate = biz.totalCustomers > 0 ? (biz.totalStamps / biz.totalCustomers).toFixed(1) : "0";
  const redemptionRate = biz.totalStamps > 0 ? ((biz.totalRedemptions / biz.totalStamps) * 100).toFixed(1) : "0";

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5 pb-24">
      {/* Back */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/admin/businesses"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Businesses
        </Link>
        <Link
          href={`/dashboard/admin/businesses/${businessId}/modules`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
        >
          <ShieldCheck className="h-4 w-4" /> Module Overrides
        </Link>
      </div>

      {/* Hero Card */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden">
        <div className="bg-gradient-to-r from-brand to-brand-hover px-5 py-8 text-white">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Store className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold truncate">{biz.name}</h1>
              <div className="flex items-center gap-2 mt-1 text-white/70 text-sm">
                <MapPin className="h-3.5 w-3.5" />
                <span>{biz.location}</span>
                <span className="mx-1">·</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {biz.category}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Owner Info */}
        <div className="px-5 py-4 border-b border-[var(--border-light)] flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Owner</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{biz.ownerName}</p>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mt-0.5">
              <Mail className="h-3 w-3" />
              <span>{biz.ownerEmail}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
            <Calendar className="h-3.5 w-3.5" />
            <span>Joined {new Date(biz.createdAt).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-[var(--surface)] rounded-xl border border-[var(--border-light)] shadow-card p-3.5 text-center">
            <div className={`h-9 w-9 rounded-lg ${s.color} flex items-center justify-center mx-auto mb-2`}>
              <s.icon className="h-4 w-4" />
            </div>
            <div className="text-xl font-bold text-[var(--text-primary)]">{s.value.toLocaleString()}</div>
            <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Subscription & Billing */}
      <SubscriptionCard biz={biz} onChanged={refresh} onManageModules={() => router.push(`/dashboard/admin/businesses/${businessId}/modules`)} />

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border-light)] shadow-card p-4">
          <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Avg Stamps per Customer</p>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{stampRate}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {biz.totalStamps.toLocaleString()} stamps across {biz.totalCustomers} customers
          </p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border-light)] shadow-card p-4">
          <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Redemption Rate</p>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{redemptionRate}%</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {biz.totalRedemptions} redemptions from {biz.totalStamps.toLocaleString()} stamps
          </p>
        </div>
      </div>

      {/* Quick Ratios */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border-light)] shadow-card p-4">
        <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3">Operational Overview</p>
        <div className="space-y-3">
          {[
            { label: "Staff to Customer Ratio", value: biz.totalCustomers > 0 ? `1 : ${Math.round(biz.totalCustomers / Math.max(biz.totalStaff, 1))}` : "N/A" },
            { label: "Programs per Staff", value: biz.totalStaff > 0 ? (biz.programCount / biz.totalStaff).toFixed(1) : biz.programCount.toString() },
            { label: "Customers per Program", value: biz.programCount > 0 ? Math.round(biz.totalCustomers / biz.programCount).toString() : "N/A" },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">{r.label}</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Business Health */}
      <BusinessHealthCard biz={biz} />

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2.5 rounded-xl border border-red-200 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Delete Business
        </button>
      </div>
    </div>
  );
}

function BusinessHealthCard({ biz }: { biz: AdminBusinessSummary }) {
  // Score: 0-100 based on having customers, stamps, staff, programs, redemptions
  const factors = [
    { label: "Has customers", ok: biz.totalCustomers > 0, weight: 25 },
    { label: "Active stamping", ok: biz.totalStamps > 5, weight: 25 },
    { label: "Has staff", ok: biz.totalStaff > 0, weight: 15 },
    { label: "Programs set up", ok: biz.programCount > 0, weight: 20 },
    { label: "Redemptions happening", ok: biz.totalRedemptions > 0, weight: 15 },
  ];
  const score = factors.reduce((s, f) => s + (f.ok ? f.weight : 0), 0);
  const color = score >= 75 ? "text-emerald-600" : score >= 40 ? "text-accent-text" : "text-red-500";
  const bgColor = score >= 75 ? "bg-emerald-50" : score >= 40 ? "bg-amber-50" : "bg-red-50";
  const label = score >= 75 ? "Healthy" : score >= 40 ? "Growing" : "Needs Attention";

  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border-light)] shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          Business Health
        </p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bgColor} ${color}`}>
          {label} · {score}%
        </span>
      </div>

      {/* Health bar */}
      <div className="h-2 bg-[var(--border-light)] rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all ${score >= 75 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Factor checklist */}
      <div className="space-y-2">
        {factors.map((f) => (
          <div key={f.label} className="flex items-center gap-2.5">
            <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              f.ok ? "bg-emerald-100 text-emerald-600" : "bg-[var(--border-light)] text-[var(--text-tertiary)]"
            }`}>
              {f.ok ? "✓" : "—"}
            </div>
            <span className={`text-sm ${f.ok ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)]"}`}>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubscriptionCard({
  biz,
  onChanged,
  onManageModules,
}: {
  biz: AdminBusinessSummary;
  onChanged: () => Promise<void>;
  onManageModules: () => void;
}) {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi
      .getPlans()
      .then((res) => {
        if (res.success && res.data) setPlans(res.data);
      })
      .catch(() => {});
  }, []);

  const active =
    biz.subscriptionStatus === "active" || biz.subscriptionStatus === "trial";

  const applyPlan = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const res = await adminApi.assignPlan(biz.id, selected, "Assigned from admin business detail");
      if (!res.success) throw new Error(res.error?.message || "Failed to assign plan");
      toast.success(`Plan changed to "${selected}"`);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign plan");
    } finally {
      setBusy(false);
    }
  };

  const cancelSub = async () => {
    if (busy) return;
    if (!confirm(`Cancel the subscription for "${biz.name}"? The business will lose plan modules.`)) return;
    setBusy(true);
    try {
      const res = await adminApi.cancelSubscription(biz.id);
      if (!res.success) throw new Error(res.error?.message || "Failed to cancel");
      toast.success("Subscription canceled");
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border-light)] shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5" />
          Subscription & Billing
        </p>
        <button
          onClick={onManageModules}
          className="text-xs font-bold px-3 py-1.5 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border-light)] transition-colors flex items-center gap-1.5"
        >
          <Puzzle className="h-3.5 w-3.5" />
          Manage modules
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {biz.planName ? (
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              active ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
            }`}
          >
            {biz.planName} · {biz.subscriptionStatus}
          </span>
        ) : (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-500">
            No subscription
          </span>
        )}
        {biz.subscriptionEndsAt && active && (
          <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Renews/ends {new Date(biz.subscriptionEndsAt).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 px-3 py-2.5 rounded-xl border border-[var(--border)] text-sm bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">Change plan to…</option>
          {plans.map((p) => (
            <option key={p.key} value={p.key} disabled={p.key === biz.planKey}>
              {p.name} — {p.price} {p.billingInterval} · {p.modules.length} modules
            </option>
          ))}
        </select>
        <button
          onClick={applyPlan}
          disabled={!selected || busy}
          className="px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
        </button>
        {active && (
          <button
            onClick={cancelSub}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-bold hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            Cancel subscription
          </button>
        )}
      </div>
      <p className="text-xs text-[var(--text-tertiary)] mt-2">
        Changing the plan invalidates the business&apos;s module entitlement cache immediately; module access updates in real time.
      </p>
    </div>
  );
}
