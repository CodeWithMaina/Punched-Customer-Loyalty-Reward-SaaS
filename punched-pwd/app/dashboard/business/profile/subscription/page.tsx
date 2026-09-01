"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { modulesApi } from "@/lib/api/modules";
import { plansApi } from "@/lib/api/plans";
import { invalidateCache } from "@/lib/api/cache";
import { moduleRegistry } from "@/registry/modules";
import type { BusinessModuleDetail, PlanSummary } from "@/types";
import { ArrowLeft, Loader2, Check, Sparkles, Wallet, CalendarDays, Blocks, X } from "lucide-react";
import toast from "react-hot-toast";

// ═══════════════════════════════════════════════════════════════
//  Owner Subscription & Billing page.
//  - Current plan, status and renewal date (GET /v1/businesses/me/modules
//    → plan — the same entitlement authority the backend enforces).
//  - All available plans with price + bundled modules (GET /v1/plans).
//  - Self-service plan change (POST /v1/businesses/me/subscription/upgrade).
//  No hardcoded prices or plan names — everything comes from the API.
// ═══════════════════════════════════════════════════════════════

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-600",
  trial: "bg-blue-50 text-blue-600",
  canceled: "bg-red-50 text-red-500",
  expired: "bg-red-50 text-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trial: "Trial",
  canceled: "Canceled",
  expired: "Expired",
};

type CurrentPlan = { key: string; name: string; status: string; endsAt: string | null };

export default function BusinessSubscriptionPage() {
  useRoleGuard("Business");

  const [modules, setModules] = useState<BusinessModuleDetail[]>([]);
  const [plan, setPlan] = useState<CurrentPlan | null>(null);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<PlanSummary | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    const [modRes, planRes] = await Promise.all([
      modulesApi.getMyBusinessModules(),
      plansApi.getPlans(),
    ]);
    if (!mounted.current) return;
    if (modRes.success && modRes.data) {
      setModules(modRes.data.modules);
      setPlan(modRes.data.plan);
    } else {
      toast.error(modRes.error?.message || "Failed to load subscription");
    }
    if (planRes.success && planRes.data) setPlans(planRes.data);
    if (mounted.current) setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    load().catch(() => {
      if (mounted.current) {
        toast.error("Failed to load subscription");
        setLoading(false);
      }
    });
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const upgradeTo = useCallback(
    async (planKey: string) => {
      if (upgrading) return;
      setUpgrading(planKey);
      try {
        const res = await plansApi.upgrade(planKey);
        if (!res.success) throw new Error(res.error?.message || "Plan change failed");
        toast.success("Plan updated");
        invalidateCache("modules:");
        setConfirmPlan(null);
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Plan change failed");
      } finally {
        if (mounted.current) setUpgrading(null);
      }
    },
    [upgrading, load]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  const enabledCount = modules.filter((m) => m.hasAccess).length;
  const intervalSuffix = (p: PlanSummary) =>
    p.billingInterval === "yearly" ? "/yr" : "/mo";

  return (
    <div className="max-w-lg mx-auto pb-12">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <Link
          href="/dashboard/business/profile"
          className="h-9 w-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border-light)] transition-colors flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Subscription</h1>
          <p className="text-xs text-[var(--text-tertiary)]">Your plan, billing and module access</p>
        </div>
      </div>

      {/* Current plan card */}
      <div className="px-5">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-brand-surface flex items-center justify-center flex-shrink-0">
              <Wallet className="h-5 w-5 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Current plan
              </p>
              <p className="text-base font-bold text-[var(--text-primary)] truncate">
                {plan?.name ?? "No active subscription"}
              </p>
            </div>
            {plan && (
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                  STATUS_STYLES[plan.status] ?? "bg-[var(--border-light)] text-[var(--text-tertiary)]"
                }`}
              >
                {STATUS_LABELS[plan.status] ?? plan.status}
              </span>
            )}
          </div>

          {plan?.endsAt && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <CalendarDays className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              {plan.status === "active"
                ? `Renews ${new Date(plan.endsAt).toLocaleDateString()}`
                : plan.status === "trial"
                  ? `Trial ends ${new Date(plan.endsAt).toLocaleDateString()}`
                  : `Ended ${new Date(plan.endsAt).toLocaleDateString()}`}
            </div>
          )}

          <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Blocks className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            {enabledCount} of {modules.length} modules enabled
          </div>

          {!plan && (
            <div className="mt-4 rounded-xl bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-700">
                Your business has no active subscription, so most modules are locked. Choose a plan below to unlock
                features.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Available plans */}
      <div className="px-5 mt-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">Available plans</h2>
        <div className="space-y-3">
          {plans.map((p) => {
            const isCurrent = plan?.key === p.key;
            const bundledModules = moduleRegistry.filter((m) => p.modules.includes(m.id));
            return (
              <div
                key={p.key}
                className={`bg-[var(--surface)] rounded-2xl border shadow-card p-4 ${
                  isCurrent ? "border-brand" : "border-[var(--border-light)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{p.name}</p>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-surface text-brand">
                          Your plan
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5 line-clamp-2">{p.description}</p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)] flex-shrink-0">
                    KES {p.price.toLocaleString()}
                    <span className="text-[10px] font-medium text-[var(--text-tertiary)]">{intervalSuffix(p)}</span>
                  </p>
                </div>

                {/* Bundled modules */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {bundledModules.slice(0, 6).map((m) => (
                    <span
                      key={m.id}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--border-light)] text-[var(--text-secondary)]"
                    >
                      {m.name}
                    </span>
                  ))}
                  {bundledModules.length > 6 && (
                    <span className="text-[10px] font-medium text-[var(--text-tertiary)] px-1 py-0.5">
                      +{bundledModules.length - 6} more
                    </span>
                  )}
                </div>

                {!isCurrent && (
                  <button
                    onClick={() => setConfirmPlan(p)}
                    disabled={upgrading !== null}
                    className="mt-4 w-full text-xs font-bold py-2.5 rounded-xl bg-brand text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {upgrading === p.key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {plan ? `Switch to ${p.name}` : `Choose ${p.name}`}
                  </button>
                )}
              </div>
            );
          })}
          {plans.length === 0 && (
            <p className="text-xs text-[var(--text-tertiary)] text-center py-6">
              No plans available right now. Please contact support.
            </p>
          )}
        </div>

        <p className="text-[11px] text-[var(--text-tertiary)] text-center mt-5 px-4">
          To cancel your subscription or for billing questions, contact the Punched team via Support.
        </p>
      </div>

      {/* Confirmation dialog */}
      {confirmPlan && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-[var(--surface)] w-full max-w-md rounded-2xl shadow-card border border-[var(--border-light)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Confirm plan change</h2>
              <button
                onClick={() => setConfirmPlan(null)}
                aria-label="Close dialog"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--border-light)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Switch to <span className="font-bold text-[var(--text-primary)]">{confirmPlan.name}</span> for{" "}
              <span className="font-bold text-[var(--text-primary)]">
                KES {confirmPlan.price.toLocaleString()}
                {intervalSuffix(confirmPlan)}
              </span>
              ?
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              Your module access updates immediately. Downgrading keeps your data — modules not in the new plan are
              locked but nothing is deleted.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setConfirmPlan(null)}
                className="flex-1 text-xs font-bold py-2.5 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={() => upgradeTo(confirmPlan.key)}
                disabled={upgrading !== null}
                className="flex-1 text-xs font-bold py-2.5 rounded-xl bg-brand text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {upgrading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
