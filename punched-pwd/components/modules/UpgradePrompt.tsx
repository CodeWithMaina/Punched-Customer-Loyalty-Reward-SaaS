"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { findModule } from "@/registry/modules";

// ═══════════════════════════════════════════════════════════════
//  UpgradePrompt — locked-module state. Pure UX: the backend filter
//  ([RequireModule] → 403 MODULE_DISABLED) is the security boundary.
// ═══════════════════════════════════════════════════════════════

export function UpgradePrompt({ module: moduleId }: { module: string }) {
  const manifest = findModule(moduleId);
  const Icon = manifest?.icon ?? Lock;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div
        className="
          w-full max-w-md rounded-3xl border border-[var(--border-light)]
          bg-[var(--surface)] p-8 text-center shadow-sm
        "
      >
        <span
          className="
            mx-auto flex h-16 w-16 items-center justify-center
            rounded-2xl bg-[var(--border-light)]
          "
        >
          <Icon className="h-8 w-8 text-[var(--text-tertiary)]" strokeWidth={1.8} aria-hidden="true" />
        </span>

        <h2 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">
          {manifest?.name ?? "This feature"} is not part of your current plan
        </h2>

        <p className="mt-2 text-sm leading-5 text-[var(--text-tertiary)]">
          Upgrade your subscription to unlock{" "}
          {manifest?.name?.toLowerCase() ?? "this module"} and more for your
          business.
        </p>

        <Link
          href="/dashboard/business/profile"
          className="
            mt-6 inline-flex min-h-12 w-full items-center justify-center
            rounded-2xl bg-brand px-6 text-sm font-semibold text-white
            transition-transform active:scale-95
          "
        >
          Upgrade plan
        </Link>
      </div>
    </div>
  );
}

/**
 * Compact locked-state badge for dashboard widgets — render in place of a
 * widget's body when the owning module is not entitled.
 */
export function UpgradeBadge({ module: moduleId, compact = false }: { module: string; compact?: boolean }) {
  const manifest = findModule(moduleId);

  if (compact) {
    return (
      <Link
        href="/dashboard/business/profile"
        className="
          flex h-full min-h-[80px] flex-col items-center justify-center gap-1
          rounded-2xl border border-dashed border-[var(--border-light)]
          bg-[var(--surface)] p-2 text-center transition-colors hover:bg-[var(--surface-raised)]
        "
      >
        <Lock className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden="true" />
        <p className="text-[10px] font-medium text-[var(--text-tertiary)]">
          {manifest?.name ?? "Module"} locked
        </p>
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard/business/profile"
      className="
        flex min-h-[120px] flex-col items-center justify-center gap-2
        rounded-2xl border border-dashed border-[var(--border-light)]
        bg-[var(--surface)] p-4 text-center
      "
    >
      <Lock className="h-5 w-5 text-[var(--text-tertiary)]" aria-hidden="true" />
      <p className="text-xs font-medium text-[var(--text-tertiary)]">
        {manifest?.name ?? "Module"} locked — upgrade to unlock
      </p>
    </Link>
  );
}