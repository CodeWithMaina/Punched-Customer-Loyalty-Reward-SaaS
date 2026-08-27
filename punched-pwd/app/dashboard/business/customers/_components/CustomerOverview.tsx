"use client";

import Link from "next/link";
import {
  AlertTriangle, ChevronRight, Gift, Sparkles, Stamp, Trophy, UserPlus, Users,
} from "lucide-react";
import type { BusinessCustomer, CustomerOverviewResponse } from "@/types";
import { EmptyState } from "@/components/ui/States";
import { RewardProgress } from "./CustomerCard";

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone = "brand",
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  tone?: "brand" | "amber" | "emerald" | "red";
}) {
  const tones = {
    brand: "bg-brand-surface text-brand",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-500",
  } as const;

  return (
    <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] shadow-card p-4">
      <div className={`h-8 w-8 rounded-xl flex items-center justify-center mb-2 ${tones[tone]}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums leading-none">
        {value}
      </p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </p>
    </div>
  );
}

function MiniCustomerList({
  title,
  icon: Icon,
  customers,
  emptyText,
}: {
  title: string;
  icon: typeof Trophy;
  customers: BusinessCustomer[];
  emptyText: string;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] shadow-card overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-light)]">
        <Icon className="h-3.5 w-3.5 text-brand" aria-hidden />
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
          {title}
        </h3>
        <span className="ml-auto text-[11px] text-[var(--text-muted)]">{customers.length}</span>
      </header>
      {customers.length === 0 ? (
        <p className="px-4 py-5 text-xs text-[var(--text-tertiary)]">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-[var(--border-light)]">
          {customers.map((c) => (
            <li key={c.userId}>
              <Link
                href={`/dashboard/business/customers/${c.userId}`}
                className="group flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-raised)] transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-brand-surface flex items-center justify-center text-xs font-bold text-brand overflow-hidden flex-shrink-0">
                  {c.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    c.fullName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                    {c.fullName}
                  </p>
                  {c.stampsRequired ? (
                    <div className="mt-1 max-w-[120px]">
                      <RewardProgress value={c.totalStamps} goal={c.stampsRequired} compact />
                    </div>
                  ) : null}
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-[var(--text-primary)] tabular-nums flex-shrink-0">
                  <Stamp className="h-3 w-3 text-brand" />
                  {c.lifetimeStamps}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-brand transition-colors flex-shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
/**
 * Customer management overview: who is enrolled, how they're doing and who
 * needs attention. Links into the roster and individual detail pages.
 */
/**
 * Summary stat tiles only — used on the combined Customers page
 * above the roster list.
 */
export function CustomerSummaryCards({
  overview,
  isLoading,
}: {
  overview: CustomerOverviewResponse | null;
  isLoading: boolean;
}) {
  if (isLoading || !overview) {
    return (
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[104px] rounded-[var(--radius-lg)] skeleton" />
        ))}
      </div>
    );
  }

  if (overview.totalCustomers === 0) return null;

  return (
    <section aria-label="Customer summary" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 animate-fade-in motion-reduce:animate-none">
      <SummaryTile icon={Users} label="Total customers" value={overview.totalCustomers} />
      <SummaryTile icon={Sparkles} label="Active 7 days" value={overview.active7d} tone="emerald" />
      <SummaryTile icon={Gift} label="Ready to redeem" value={overview.rewardReady} tone="amber" />
      <SummaryTile icon={UserPlus} label="New this week" value={overview.newThisWeek} />
      <SummaryTile icon={AlertTriangle} label="Cooling / at risk" value={overview.atRisk} tone="red" />
    </section>
  );
}

export function CustomerOverview({
  overview,
  isLoading,
}: {
  overview: CustomerOverviewResponse | null;
  isLoading: boolean;
}) {
  if (isLoading || !overview) {
    return (
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[104px] rounded-2xl skeleton" />
        ))}
      </div>
    );
  }

  if (overview.totalCustomers === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          icon={<UserPlus className="h-6 w-6" />}
          title="No customers yet"
          description="Customers appear here as soon as they join your loyalty program."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in motion-reduce:animate-none">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryTile icon={Users} label="Total customers" value={overview.totalCustomers} />
        <SummaryTile icon={Sparkles} label="Active 7 days" value={overview.active7d} tone="emerald" />
        <SummaryTile icon={Gift} label="Ready to redeem" value={overview.rewardReady} tone="amber" />
        <SummaryTile icon={UserPlus} label="New this week" value={overview.newThisWeek} />
        <SummaryTile icon={AlertTriangle} label="Cooling / at risk" value={overview.atRisk} tone="red" />
      </div>

      {/* Engagement snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] shadow-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-2 mb-2">
            <Stamp className="h-3.5 w-3.5 text-brand" />This week
          </p>
          <p className="text-2xl font-bold leading-none tabular-nums">
            {overview.stampsThisWeek}
            <span className="text-sm font-medium text-[var(--text-tertiary)]"> stamps issued</span>
          </p>
          <div className="mt-3">
            <RewardProgress value={overview.active7d} goal={overview.totalCustomers} />
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
            {Math.round((overview.active7d / Math.max(overview.totalCustomers, 1)) * 100)}% of your
            base visited in the last 7 days
          </p>
        </div>

        <MiniCustomerList
          title="Soon to reward"
          icon={Gift}
          customers={overview.soonToReward}
          emptyText={
            overview.rewardReady > 0
              ? `${overview.rewardReady} customer${overview.rewardReady !== 1 ? "s" : ""} ready to redeem now.`
              : "No customers close to a reward yet."
          }
        />
      </div>

      {/* Performance lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MiniCustomerList
          title="Top customers"
          icon={Trophy}
          customers={overview.topCustomers}
          emptyText="No stamp activity recorded yet."
        />
        <MiniCustomerList
          title="Recently active"
          icon={Sparkles}
          customers={overview.recentlyActive}
          emptyText="No visits recorded yet."
        />
      </div>
    </div>
  );
}

