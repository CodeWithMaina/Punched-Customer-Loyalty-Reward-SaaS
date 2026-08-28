"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { modulesApi } from "@/lib/api/modules";
import { plansApi } from "@/lib/api/plans";
import { invalidateCache } from "@/lib/api/cache";
import { addonPriceFor } from "@/lib/api/plans";
import { moduleRegistry } from "@/registry/modules";
import type { BusinessModuleDetail, PlanSummary } from "@/types";
import { ArrowLeft, Loader2, Lock, Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";

// ═══════════════════════════════════════════════════════════════
//  Owner module management — toggle add-on modules for the business.
//  Optimistic UI: the switch flips instantly and rolls back if the
//  API call fails. Every successful toggle busts modules:* caches.
//  Pricing is derived from GET /v1/plans (the billing authority) —
//  no client-side hardcoded prices. See docs/modules-entitlements.md.
// ═══════════════════════════════════════════════════════════════

const SOURCE_LABEL: Record<string, string> = {
  PLAN: "In plan",
  OVERRIDE: "Your toggle",
  ADMIN: "Granted by admin",
};

export default function BusinessModulesPage() {
  useRoleGuard("Business");

  const [modules, setModules] = useState<BusinessModuleDetail[]>([]);
  const [planName, setPlanName] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const mounted = useRef(true);

  const upgradeTo = useCallback(async (planKey: string) => {
    if (upgrading) return;
    setUpgrading(planKey);
    try {
      const res = await plansApi.upgrade(planKey);
      if (!res.success) throw new Error(res.error?.message || "Upgrade failed");
      toast.success("Plan updated");
      invalidateCache("modules:");
      if (mounted.current) {
        setUpgradeOpen(false);
        // Re-fetch modules so plan-derived availability reflects the new plan.
        const refreshed = await modulesApi.getMyBusinessModules();
        if (refreshed.success && refreshed.data && mounted.current) {
          setModules(refreshed.data.modules);
          setPlanName(refreshed.data.plan?.name ?? null);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upgrade failed");
    } finally {
      if (mounted.current) setUpgrading(null);
    }
  }, [upgrading]);

  const toggleModule = useCallback(
    async (mod: BusinessModuleDetail, nextEnabled: boolean) => {
      if (pendingKeys.has(mod.key)) return;

      const prev = modules;
      // Optimistic update.
      setModules((cur) =>
        cur.map((m) =>
          m.key === mod.key
            ? { ...m, enabled: nextEnabled, source: nextEnabled ? "OVERRIDE" : m.source }
            : m
        )
      );
      setPendingKeys((s) => new Set(s).add(mod.key));

      try {
        const res = nextEnabled
          ? await modulesApi.setModuleOverride(mod.key, true)
          : mod.source === "OVERRIDE"
            ? await modulesApi.removeModuleOverride(mod.key)
            : await modulesApi.setModuleOverride(mod.key, false);

        if (!res.success) throw new Error(res.error?.message || "Toggle failed");
        toast.success(`"${mod.name}" ${nextEnabled ? "enabled" : "disabled"}`);
      } catch (err) {
        // Rollback on failure.
        if (mounted.current) setModules(prev);
        toast.error(err instanceof Error ? err.message : `Failed to update "${mod.name}"`);
      } finally {
        if (mounted.current) {
          setPendingKeys((s) => {
            const next = new Set(s);
            next.delete(mod.key);
            return next;
          });
        }
      }
    },
    [modules, pendingKeys]
  );

  useEffect(() => {
    mounted.current = true;
    Promise.all([modulesApi.getMyBusinessModules(), plansApi.getPlans()])
      .then(([modRes, planRes]) => {
        if (!mounted.current) return;
        if (modRes.success && modRes.data) {
          setModules(modRes.data.modules);
          setPlanName(modRes.data.plan?.name ?? null);
        } else {
          toast.error(modRes.error?.message || "Failed to load modules");
        }
        if (planRes.success && planRes.data) {
          setPlans(planRes.data);
        }
      })
      .catch(() => {
        if (mounted.current) toast.error("Failed to load modules");
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

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
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Modules</h1>
          <p className="text-xs text-[var(--text-tertiary)]">
            {planName ? `Manage add-ons on the ${planName} plan` : "Manage your add-on modules"}
          </p>
        </div>
        <button
          onClick={() => setUpgradeOpen(true)}
          className="text-xs font-bold px-3 py-2 rounded-xl bg-brand text-white flex items-center gap-1.5 flex-shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Upgrade
        </button>
      </div>
      <ModuleList
        modules={modules}
        planName={planName}
        plans={plans}
        pendingKeys={pendingKeys}
        onToggle={toggleModule}
      />
      {upgradeOpen && (
        <UpgradeModal
          plans={plans}
          upgrading={upgrading}
          onClose={() => setUpgradeOpen(false)}
          onSelect={upgradeTo}
        />
      )}
    </div>
  );
}

/** Compact upgrade modal listing plans (prices straight from the API). */
function UpgradeModal({
  plans,
  upgrading,
  onClose,
  onSelect,
}: {
  plans: PlanSummary[];
  upgrading: string | null;
  onClose: () => void;
  onSelect: (planKey: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-[var(--surface)] w-full max-w-md rounded-2xl shadow-card border border-[var(--border-light)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Choose a plan</h2>
          <button
            onClick={onClose}
            aria-label="Close upgrade dialog"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--border-light)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {plans.map((plan) => (
            <button
              key={plan.key}
              disabled={upgrading !== null}
              onClick={() => onSelect(plan.key)}
              className={`w-full text-left p-3 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                upgrading === plan.key
                  ? "border-brand bg-brand/5"
                  : "border-[var(--border-light)] hover:border-brand"
              } ${upgrading && upgrading !== plan.key ? "opacity-50" : ""}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)]">{plan.name}</p>
                <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                  {plan.modules.length} modules · {plan.modules.slice(0, 4).join(", ")}
                  {plan.modules.length > 4 ? "…" : ""}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                {upgrading === plan.key ? (
                  <Loader2 className="h-4 w-4 animate-spin text-brand ml-auto" />
                ) : (
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    KES {plan.price.toLocaleString()}
                    <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
                      /{plan.billingInterval === "yearly" ? "yr" : "mo"}
                    </span>
                  </p>
                )}
              </div>
            </button>
          ))}
          {plans.length === 0 && (
            <p className="text-xs text-[var(--text-tertiary)] text-center py-4">
              No plans available right now.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ModuleList({
  modules,
  planName,
  plans,
  pendingKeys,
  onToggle,
}: {
  modules: BusinessModuleDetail[];
  planName: string | null;
  plans: PlanSummary[];
  pendingKeys: Set<string>;
  onToggle: (mod: BusinessModuleDetail, nextEnabled: boolean) => void;
}) {
  return (
    <div className="px-5 space-y-3 mt-2">
      {moduleRegistry.map((manifest) => {
        const detail = modules.find((m) => m.key === manifest.id);
        if (!detail) return null;
        const Icon = manifest.icon;
        const isPending = pendingKeys.has(detail.key);
        const isCore = detail.isCore;
        const addonPrice = addonPriceFor(plans, detail.key);
        const included = detail.source === "PLAN" || detail.source === "ADMIN";

        return (
          <div
            key={detail.key}
            className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 flex items-center gap-4"
          >
            <div className="h-11 w-11 rounded-xl bg-[var(--border-light)] flex items-center justify-center flex-shrink-0">
              <Icon className="h-5 w-5 text-[var(--text-secondary)]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-[var(--text-primary)]">{manifest.name}</p>
                {isCore && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--border-light)] text-[var(--text-tertiary)]">
                    Core
                  </span>
                )}
                {detail.enabled && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                    {SOURCE_LABEL[detail.source] ?? detail.source}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{manifest.description}</p>
              {!isCore && (
                <p className="text-[11px] font-medium mt-1 flex items-center gap-1 text-[var(--text-secondary)]">
                  {included ? (
                    <>Included in {planName ?? "your plan"}</>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 text-accent-text" />
                      Add-on · {addonPrice ?? "Contact sales"}
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Toggle */}
            {isCore ? (
              <Lock className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
            ) : (
              <button
                role="switch"
                aria-checked={detail.enabled}
                aria-label={`Toggle ${manifest.name}`}
                disabled={isPending}
                onClick={() => onToggle(detail, !detail.enabled)}
                className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${
                  detail.enabled ? "bg-brand" : "bg-[var(--border)]"
                } ${isPending ? "opacity-50" : ""}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    detail.enabled ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            )}
          </div>
        );
      })}

      <p className="text-center text-xs text-[var(--text-tertiary)] pt-2">
        Core modules are always included. Toggling an add-on overrides your plan for this business only.
      </p>
    </div>
  );
}
