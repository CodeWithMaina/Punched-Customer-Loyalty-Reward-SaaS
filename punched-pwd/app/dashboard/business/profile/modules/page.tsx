"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { modulesApi } from "@/lib/api/modules";
import { moduleRegistry } from "@/registry/modules";
import type { BusinessModuleDetail } from "@/types";
import { ArrowLeft, Loader2, Lock, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

// ═══════════════════════════════════════════════════════════════
//  Owner module management — toggle add-on modules for the business.
//  Optimistic UI: the switch flips instantly and rolls back if the
//  API call fails. Every successful toggle busts modules:* caches.
//  (Display-level pricing; server-side plan pricing remains the
//  billing authority — see docs/modules-entitlements.md.)
// ═══════════════════════════════════════════════════════════════

/** Monthly add-on pricing shown for modules NOT included in the plan. */
const ADDON_PRICING: Record<string, string> = {
  analytics: "$9/mo",
  loyalty: "$6/mo",
  referral: "$6/mo",
};

const SOURCE_LABEL: Record<string, string> = {
  PLAN: "In plan",
  OVERRIDE: "Your toggle",
  ADMIN: "Granted by admin",
};

export default function BusinessModulesPage() {
  useRoleGuard("Business");

  const [modules, setModules] = useState<BusinessModuleDetail[]>([]);
  const [planName, setPlanName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const mounted = useRef(true);

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
    modulesApi
      .getMyBusinessModules()
      .then((res) => {
        if (!mounted.current) return;
        if (res.success && res.data) {
          setModules(res.data.modules);
          setPlanName(res.data.plan?.name ?? null);
        } else {
          toast.error(res.error?.message || "Failed to load modules");
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
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Modules</h1>
          <p className="text-xs text-[var(--text-tertiary)]">
            {planName ? `Manage add-ons on the ${planName} plan` : "Manage your add-on modules"}
          </p>
        </div>
      </div>
      <ModuleList
        modules={modules}
        planName={planName}
        pendingKeys={pendingKeys}
        onToggle={toggleModule}
      />
    </div>
  );
}

function ModuleList({
  modules,
  planName,
  pendingKeys,
  onToggle,
}: {
  modules: BusinessModuleDetail[];
  planName: string | null;
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
        const addonPrice = ADDON_PRICING[detail.key];
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
