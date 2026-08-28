"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { modulesApi } from "@/lib/api/modules";
import type { BusinessModuleDetail } from "@/types";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

// ═══════════════════════════════════════════════════════════════
//  Admin module management — view a business's plan + effective
//  modules and force-enable/disable any module with an audit reason.
//  Every mutation invalidates the entitlement cache server-side and
//  busts modules:* client caches, so nav updates on next load.
// ═══════════════════════════════════════════════════════════════

const SOURCE_LABEL: Record<string, string> = {
  PLAN: "In plan",
  OVERRIDE: "Owner toggle",
  ADMIN: "Admin forced",
};

export default function AdminBusinessModulesPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();

  const businessId = params.businessId as string;
  const [modules, setModules] = useState<BusinessModuleDetail[]>([]);
  const [planName, setPlanName] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    modulesApi
      .getBusinessModules(businessId)
      .then((res) => {
        if (res.success && res.data) {
          setModules(res.data.modules);
          setPlanName(res.data.plan?.name ?? null);
          setPlanStatus(res.data.plan?.status ?? null);
        } else {
          toast.error(res.error?.message || "Failed to load modules");
        }
      })
      .catch(() => toast.error("Failed to load modules"))
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "Admin") {
      router.replace("/dashboard");
      return;
    }
    load();
  }, [user, authLoading, router, load]);

  const applyOverride = async (mod: BusinessModuleDetail, enabled: boolean) => {
    if (pendingKey) return;
    setPendingKey(mod.key);
    try {
      const res = await modulesApi.setBusinessModuleOverride(
        businessId,
        mod.key,
        enabled,
        reason.trim() || undefined
      );
      if (!res.success) throw new Error(res.error?.message || "Override failed");
      toast.success(`"${mod.name}" ${enabled ? "force-enabled" : "force-disabled"}`);
      setReason("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Override failed");
    } finally {
      setPendingKey(null);
    }
  };

  const removeOverride = async (mod: BusinessModuleDetail) => {
    if (pendingKey) return;
    setPendingKey(mod.key);
    try {
      const res = await modulesApi.removeBusinessModuleOverride(businessId, mod.key);
      if (!res.success) throw new Error(res.error?.message || "Failed to remove override");
      toast.success(`"${mod.name}" reverted to plan entitlement`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove override");
    } finally {
      setPendingKey(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5 pb-24">
      <Link
        href={`/dashboard/admin/businesses/${businessId}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Business
      </Link>

      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand" /> Module Overrides
        </h1>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
          {planName
            ? `Plan: ${planName} (${planStatus ?? "unknown"})`
            : "No active subscription plan"}
        </p>
      </div>

      {/* Audit reason applies to the next force action. */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
        <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest">
          Reason (applies to next override)
        </label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder='e.g. "Enterprise custom agreement"'
          className="mt-2 w-full bg-[var(--background)] rounded-xl border border-[var(--border-light)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-brand"
        />
      </div>

      <ModuleOverrideList
        modules={modules}
        pendingKey={pendingKey}
        onForce={(mod, enabled) => applyOverride(mod, enabled)}
        onRevert={removeOverride}
      />

      <p className="text-center text-xs text-[var(--text-tertiary)]">
        Overrides take precedence over the plan. All actions are logged with your admin id.
      </p>
    </div>
  );
}

function ModuleOverrideList({
  modules,
  pendingKey,
  onForce,
  onRevert,
}: {
  modules: BusinessModuleDetail[];
  pendingKey: string | null;
  onForce: (mod: BusinessModuleDetail, enabled: boolean) => void;
  onRevert: (mod: BusinessModuleDetail) => void;
}) {
  return (
    <div className="space-y-3">
      {modules.map((mod) => (
        <div
          key={mod.key}
          className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-[var(--text-primary)]">{mod.name}</p>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--border-light)] text-[var(--text-tertiary)]">
                  {mod.key}
                </span>
                {mod.isCore && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--border-light)] text-[var(--text-tertiary)]">
                    Core
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    mod.hasAccess ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                  }`}
                >
                  {SOURCE_LABEL[mod.source] ?? mod.source}
                  {mod.hasAccess ? " · access" : " · no access"}
                </span>
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{mod.description}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                disabled={pendingKey === mod.key || mod.enabled}
                onClick={() => onForce(mod, true)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 transition-colors"
              >
                Force on
              </button>
              <button
                disabled={pendingKey === mod.key || !mod.enabled}
                onClick={() => onForce(mod, false)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                Force off
              </button>
              <button
                disabled={
                  pendingKey === mod.key ||
                  (mod.source !== "ADMIN" && mod.source !== "OVERRIDE")
                }
                onClick={() => onRevert(mod)}
                title="Remove override (revert to plan)"
                className="text-xs font-medium px-3 py-1.5 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border-light)] disabled:opacity-40 transition-colors"
              >
                Revert
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
