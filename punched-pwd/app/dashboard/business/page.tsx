"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import { loyaltyApi } from "@/lib/api/loyalty";
import type {
  Business,
  BusinessCustomer,
  BusinessDashboardResponse,
  LoyaltyProgram,
  StaffMember,
  StaffMini,
} from "@/types";
import {
  Loader2,
  Store,
  ScanLine,
  AlertCircle,
  Plus,
  Users,
  UserCheck,
  Gift,
  BarChart3,
  ChevronRight,
  Sparkles,
  Flame,
  CircleCheck,
} from "lucide-react";
import { MomentumRing } from "@/components/business/DashboardPrimitives";

/* ═══════════════════════════════════════════════════════════════
   BUSINESS DASHBOARD
   Mobile-first / PWA-native / overflow-safe / premium
   ═══════════════════════════════════════════════════════════════ */

export default function BusinessOverviewPage() {
  useRoleGuard("Business");

  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<BusinessCustomer[]>([]);
  const [dashboard, setDashboard] =
    useState<BusinessDashboardResponse | null>(null);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  /*
   * Phase 1:
   * Load the minimum information required for the first viewport.
   */
  useEffect(() => {
    Promise.all([
      businessesApi.getMine(),
      businessesApi.getDashboard().catch(() => null),
    ])
      .then(([bizRes, dashRes]) => {
        if (bizRes.success && bizRes.data) {
          setBusiness(bizRes.data);

          if (bizRes.data.loyaltyPrograms) {
            setPrograms(bizRes.data.loyaltyPrograms);
          }
        } else {
          setNotFound(true);
          return;
        }

        if (dashRes?.success && dashRes.data) {
          setDashboard(dashRes.data);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, []);

  /*
   * Phase 2:
   * Secondary information can load after the dashboard shell exists.
   */
  useEffect(() => {
    if (isLoading || notFound) return;

    Promise.all([
      businessesApi.getMyCustomers().catch(() => null),
      loyaltyApi.listPrograms().catch(() => null),
      businessesApi.getMyStaff({ sort: "stamps" }).catch(() => null),
    ]).then(([custRes, progRes, staffRes]) => {
      if (custRes?.success && custRes.data) {
        setCustomers(custRes.data.items);
      }

      if (progRes?.success && progRes.data) {
        setPrograms(progRes.data);
      }

      if (staffRes?.success && staffRes.data) {
        setStaff(staffRes.data);
      }
    });
  }, [isLoading, notFound]);

  /* ─────────────────────────────────────────────────────────────
     Derived values
     ──────────────────────────────────────────────────────────── */

  const newThisWeek = useMemo(
    () =>
      customers.filter(
        (customer) =>
          Date.now() - new Date(customer.enrolledAt).getTime() <
          7 * 86400000,
      ).length,
    [customers],
  );

  const activeProgram = useMemo(
    () => programs.find((program) => program.isActive),
    [programs],
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";

    return "Good evening";
  }, []);

  /*
   * Composite momentum score.
   * Kept intentionally lightweight until a backend-computed
   * momentum metric becomes available.
   */
  const momentum = useMemo(() => {
    const stampsToday = dashboard?.stampsToday ?? 0;
    const rewardReady = dashboard?.rewardReadyCards ?? 0;

    let score = 20;

    score += Math.min(40, stampsToday * 4);
    score += Math.min(20, newThisWeek * 4);
    score += rewardReady > 0 ? 20 : 0;

    score = Math.max(0, Math.min(100, score));

    const tier =
      score >= 75
        ? "Excellent"
        : score >= 45
          ? "Steady"
          : "Building";

    return {
      score,
      tier,
    };
  }, [dashboard, newThisWeek]);

  const insights = useMemo(() => {
    const items: {
      icon: React.ElementType;
      text: string;
      href: string;
      tone: "warn" | "info" | "positive";
    }[] = [];

    const rewardReady = dashboard?.rewardReadyCards ?? 0;

    if (rewardReady > 0) {
      items.push({
        icon: Gift,
        text: `${rewardReady} customer${
          rewardReady === 1 ? "" : "s"
        } ready to redeem a reward`,
        href: "/dashboard/business/customers",
        tone: "warn",
      });
    }

    if (!activeProgram) {
      items.push({
        icon: AlertCircle,
        text: "Set up a loyalty program to start rewarding customers",
        href: "/dashboard/business/profile/programs",
        tone: "info",
      });
    }

    if (newThisWeek > 0) {
      items.push({
        icon: Sparkles,
        text: `${newThisWeek} new customer${
          newThisWeek === 1 ? "" : "s"
        } joined this week`,
        href: "/dashboard/business/customers",
        tone: "positive",
      });
    }

    if (staff.length === 0) {
      items.push({
        icon: UserCheck,
        text: "No staff linked yet — add staff to help award stamps",
        href: "/dashboard/business/staff",
        tone: "info",
      });
    }

    return items;
  }, [dashboard, activeProgram, newThisWeek, staff]);

  /* ─────────────────────────────────────────────────────────────
     Loading
     ──────────────────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <main className="min-h-[60vh] w-full px-4">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-lg items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-surface">
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
            </div>

            <p className="text-xs font-medium text-[var(--text-tertiary)]">
              Loading your dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (notFound) {
    return <CreateBusinessPrompt />;
  }

  const activeCards =
    dashboard?.activeCards ?? customers.length;

  const stampsToday =
    dashboard?.stampsToday ?? 0;

  const rewardReadyCards =
    dashboard?.rewardReadyCards ?? 0;

  const totalRedemptions =
    dashboard?.totalRedemptions ?? 0;

  const totalStampsIssued =
    dashboard?.totalStampsIssued ?? 0;

  return (
    <main className="min-h-full w-full overflow-x-clip pb-28">
      <div className="mx-auto w-full max-w-lg px-4 sm:max-w-xl lg:max-w-2xl">
        {/* ═══════════════════════════════════════════════════════
            HEADER
            ═══════════════════════════════════════════════════════ */}

        <header className="flex w-full items-center gap-3 pb-4 pt-4 sm:pt-6">
          {/* Business logo */}
          {/* <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-brand/10 bg-brand-surface shadow-sm">
            {business?.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Store className="h-5 w-5 text-brand" />
            )}
          </div> */}

          {/* Business identity */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium leading-none text-[var(--text-tertiary)]">
              {greeting}
            </p>

            <h1 className="mt-1 truncate text-[15px] font-bold leading-tight text-[var(--text-primary)]">
              {business?.name}
            </h1>
          </div>

          {/* Primary action */}
          <Link
            href="/dashboard/business/scan"
            aria-label="Scan QR"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_6px_18px_var(--brand-ring)] transition-transform active:scale-95"
          >
            <ScanLine className="h-5 w-5" />
          </Link>
        </header>

        {/* ═══════════════════════════════════════════════════════
            MOMENTUM HERO
            ═══════════════════════════════════════════════════════ */}

        <section className="mb-4 w-full">
          <Link
            href="/dashboard/business/analytics"
            className="animate-scale-in relative block w-full overflow-hidden rounded-[28px] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] transition-transform active:scale-[0.99]"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-dark), var(--brand))",
            }}
          >
            {/* Decorative glow */}
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-20"
              style={{
                background:
                  "radial-gradient(circle, #fff, transparent 70%)",
              }}
            />

            <div className="relative flex min-w-0 items-center gap-4">
              {/* Score */}
              <div className="shrink-0">
                <MomentumRing
                  score={momentum.score}
                  label="Score"
                  dark
                  size={68}
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[9px] font-bold uppercase tracking-[0.16em] text-white/65">
                  Today&apos;s momentum
                </p>

                <p
                  className="mt-1 truncate text-lg font-bold leading-tight text-white"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {momentum.tier}
                </p>

                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/70">
                  {stampsToday > 0
                    ? `${stampsToday} stamp${
                        stampsToday === 1 ? "" : "s"
                      } issued today`
                    : "No stamps yet — scan a customer to get going"}
                </p>
              </div>
            </div>

            {/* Analytics CTA */}
            <div className="relative mt-4 flex w-fit max-w-full items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm">
              <span className="truncate">View full analytics</span>
              <ChevronRight className="h-3 w-3 shrink-0" />
            </div>
          </Link>
        </section>

        {/* ═══════════════════════════════════════════════════════
            KEY METRICS
            Responsive wrapping grid.
            No horizontal overflow.
            ═══════════════════════════════════════════════════════ */}

        <section className="mb-5 grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4">
          <MetricCard
            label="Customers"
            value={activeCards}
            sub={
              newThisWeek > 0
                ? `+${newThisWeek} this week`
                : "Total active"
            }
            icon={Users}
            tone="brand"
          />

          <MetricCard
            label="Stamps today"
            value={stampsToday}
            sub="Since midnight"
            icon={ScanLine}
            tone="accent"
          />

          <MetricCard
            label="Ready to redeem"
            value={rewardReadyCards}
            sub={
              rewardReadyCards > 0
                ? "Waiting"
                : "None pending"
            }
            icon={Gift}
            tone={
              rewardReadyCards > 0
                ? "warning"
                : "default"
            }
          />

          <MetricCard
            label="Redeemed"
            value={totalRedemptions}
            sub={
              totalStampsIssued > 0
                ? `${totalStampsIssued} issued`
                : "All time"
            }
            icon={CircleCheck}
            tone="default"
          />
        </section>

        {/* ═══════════════════════════════════════════════════════
            QUICK ACTIONS
            2 columns on small screens.
            4 columns when enough room exists.
            ═══════════════════════════════════════════════════════ */}

        <section className="mb-5">
          <div className="mb-2.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                Quick actions
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4">
            <QuickAction
              icon={ScanLine}
              label="Scan"
              description="Award stamp"
              href="/dashboard/business/scan"
            />

            <QuickAction
              icon={BarChart3}
              label="Stats"
              description="View insights"
              href="/dashboard/business/analytics"
            />

            <QuickAction
              icon={Users}
              label="Clients"
              description="Manage customers"
              href="/dashboard/business/customers"
            />

            <QuickAction
              icon={UserCheck}
              label="Staff"
              description="Manage team"
              href="/dashboard/business/staff"
            />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            ATTENTION / INSIGHTS
            Cards wrap naturally instead of creating viewport
            overflow.
            ═══════════════════════════════════════════════════════ */}

        {insights.length > 0 && (
          <section className="mb-5">
            <div className="mb-2.5 flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-brand-surface">
                <Flame className="h-3.5 w-3.5 text-brand" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                  Needs your attention
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
              {insights.map((item, index) => (
                <InsightCard
                  key={`${item.href}-${index}`}
                  item={item}
                  index={index}
                />
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════
            LOYALTY PROGRAMS
            ═══════════════════════════════════════════════════════ */}

        <section className="mb-5 w-full">
          <ProgramsSection programs={programs} />
        </section>

        {/* ═══════════════════════════════════════════════════════
            TEAM
            ═══════════════════════════════════════════════════════ */}

        {(dashboard?.staffMini?.length ?? 0) > 0 && (
          <section className="mb-5 w-full">
            <YourTeamSection staff={dashboard!.staffMini!} />
          </section>
        )}

      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════
   METRIC CARD
   ═══════════════════════════════════════════════════════════════ */

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
  tone?: "default" | "brand" | "accent" | "warning";
}) {
  const toneStyles = {
    default: {
      iconBg: "bg-[var(--border-light)]",
      iconColor: "text-[var(--text-secondary)]",
    },
    brand: {
      iconBg: "bg-brand-surface",
      iconColor: "text-brand",
    },
    accent: {
      iconBg: "bg-[var(--accent-light)]",
      iconColor: "text-[var(--accent)]",
    },
    warning: {
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  };

  const styles = toneStyles[tone];

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.025)]">
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}
        >
          <Icon className={`h-4 w-4 ${styles.iconColor}`} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-medium text-[var(--text-tertiary)]">
            {label}
          </p>

          <p className="mt-0.5 truncate text-xl font-bold leading-none tracking-tight text-[var(--text-primary)]">
            {value}
          </p>
        </div>
      </div>

      {sub && (
        <p className="mt-2 truncate text-[9.5px] font-medium text-[var(--text-tertiary)]">
          {sub}
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   QUICK ACTION
   ═══════════════════════════════════════════════════════════════ */

function QuickAction({
  icon: Icon,
  label,
  description,
  href,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] p-3 shadow-[0_2px_10px_rgba(0,0,0,0.025)] transition-all active:scale-[0.98] sm:flex-col sm:items-center sm:justify-center sm:p-3.5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-surface transition-transform group-active:scale-95">
        <Icon className="h-[17px] w-[17px] text-brand" />
      </div>

      <div className="min-w-0 flex-1 sm:w-full sm:text-center">
        <p className="truncate text-xs font-bold text-[var(--text-primary)]">
          {label}
        </p>

        <p className="mt-0.5 truncate text-[9px] text-[var(--text-tertiary)]">
          {description}
        </p>
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INSIGHT CARD
   ═══════════════════════════════════════════════════════════════ */

function InsightCard({
  item,
  index,
}: {
  item: {
    icon: React.ElementType;
    text: string;
    href: string;
    tone: "warn" | "info" | "positive";
  };
  index: number;
}) {
  const Icon = item.icon;

  const styles = {
    warn: {
      bg: "bg-amber-50",
      icon: "text-amber-600",
    },
    positive: {
      bg: "bg-emerald-50",
      icon: "text-emerald-600",
    },
    info: {
      bg: "bg-brand-surface",
      icon: "text-brand",
    },
  };

  const style = styles[item.tone];

  return (
    <Link
      href={item.href}
      className="animate-slide-in-right flex min-w-0 w-full items-start gap-3 rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.025)] transition-transform active:scale-[0.99]"
      style={{
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.bg}`}
      >
        <Icon className={`h-4 w-4 ${style.icon}`} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-[var(--text-secondary)]">
          {item.text}
        </p>

        <div className="mt-1.5 flex items-center gap-1 text-[9px] font-semibold text-brand">
          <span>Take action</span>
          <ChevronRight className="h-3 w-3 shrink-0" />
        </div>
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROGRAMS
   ═══════════════════════════════════════════════════════════════ */

function ProgramsSection({
  programs,
}: {
  programs: LoyaltyProgram[];
}) {
  if (programs.length === 0) {
    return (
      <Link
        href="/dashboard/business/profile/programs"
        className="flex min-w-0 w-full items-center gap-3 rounded-2xl border border-brand/10 bg-brand-surface p-4 transition-transform active:scale-[0.99]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10">
          <Gift className="h-4 w-4 text-brand" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-brand">
            Create your first loyalty program
          </p>

          <p className="mt-0.5 truncate text-[11px] text-brand/60">
            Set up stamps &amp; rewards
          </p>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-brand/40" />
      </Link>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] shadow-[0_2px_12px_rgba(0,0,0,0.025)]">
      {/* Header */}
      <div className="flex min-w-0 items-center justify-between gap-3 px-4 pb-2.5 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-surface">
            <Gift className="h-3.5 w-3.5 text-brand" />
          </div>

          <p className="truncate text-sm font-bold text-[var(--text-primary)]">
            Programs
          </p>

          <span className="shrink-0 rounded-full bg-brand-surface px-1.5 py-0.5 text-[9px] font-bold text-brand">
            {programs.length}
          </span>
        </div>

        <Link
          href="/dashboard/business/profile/programs"
          className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-brand"
        >
          <Plus className="h-3 w-3" />
          Add
        </Link>
      </div>

      {/* Program list */}
      <div className="divide-y divide-[var(--border-light)]">
        {programs.map((program) => (
          <Link
            key={program.id}
            href={`/dashboard/business/programs/${program.id}`}
            className="flex min-w-0 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--surface-raised)]"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                program.isActive
                  ? "bg-emerald-500"
                  : "bg-[var(--text-muted)]"
              }`}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {program.name}
              </p>

              <p className="mt-0.5 truncate text-[10px] text-[var(--text-tertiary)]">
                {program.stampsRequired} stamps →{" "}
                {program.rewardDescription}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                program.isActive
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-[var(--border-light)] text-[var(--text-tertiary)]"
              }`}
            >
              {program.isActive ? "Active" : "Paused"}
            </span>

            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   YOUR TEAM
   ═══════════════════════════════════════════════════════════════ */

function YourTeamSection({
  staff,
}: {
  staff: StaffMini[];
}) {
  return (
    <div className="w-full">
      {/* Section heading */}
      <div className="mb-2.5 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-surface">
            <UserCheck className="h-3.5 w-3.5 text-brand" />
          </div>

          <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            Your team
          </p>
        </div>

        <Link
          href="/dashboard/business/staff"
          className="shrink-0 text-xs font-semibold text-brand"
        >
          Manage
        </Link>
      </div>

      {/* Responsive team grid */}
      <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
        {staff.map((member) => {
          const percentage =
            member.dailyGoal > 0
              ? Math.min(
                  Math.round(
                    (member.stampsToday / member.dailyGoal) * 100,
                  ),
                  100,
                )
              : 0;

          const reached =
            member.dailyGoal > 0 &&
            member.stampsToday >= member.dailyGoal;

          return (
            <Link
              key={member.userId}
              href={`/dashboard/business/staff/${member.userId}`}
              className="min-w-0 rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.025)] transition-transform active:scale-[0.99]"
            >
              <div className="flex min-w-0 items-center gap-3">
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-surface">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-brand">
                      {member.fullName
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Identity */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight text-[var(--text-primary)]">
                    {member.fullName}
                  </p>

                  <div className="mt-1 flex min-w-0 items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        member.isOnShift
                          ? "bg-emerald-500"
                          : "bg-[var(--text-muted)]"
                      }`}
                    />

                    <span className="truncate text-[10px] text-[var(--text-tertiary)]">
                      {member.isOnShift
                        ? "On shift"
                        : "Off shift"}
                    </span>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              </div>

              {/* Goal */}
              <div className="mt-3">
                <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
                  <span
                    className={`truncate text-[10px] font-bold ${
                      reached
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {member.stampsToday}/{member.dailyGoal} stamps
                  </span>

                  <span className="shrink-0 text-[9px] font-semibold text-[var(--text-tertiary)]">
                    {percentage}%
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-light)]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      reached
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CREATE BUSINESS
   ═══════════════════════════════════════════════════════════════ */

function CreateBusinessPrompt() {
  const [form, setForm] = useState({
    name: "",
    category: "",
    location: "",
    mpesaNumber: "",
  });

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setIsCreating(true);
    setError(null);

    try {
      const response = await businessesApi.create(form);

      if (response.success) {
        window.location.reload();
      } else {
        setError(
          response.error?.message ??
            "Failed to create business",
        );
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsCreating(false);
    }
  }

  const fields = [
    {
      key: "name",
      label: "Business Name",
      placeholder: "Artisan Brews",
    },
    {
      key: "category",
      label: "Category",
      placeholder: "Cafe, Fitness, Retail…",
    },
    {
      key: "location",
      label: "Location",
      placeholder: "Nairobi, Kenya",
    },
    {
      key: "mpesaNumber",
      label: "M-Pesa Number",
      placeholder: "2547XXXXXXXX",
    },
  ] as const;

  return (
    <main className="min-h-full w-full overflow-x-clip pb-10">
      <div className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
        {/* Intro */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-brand-surface shadow-sm">
            <Store className="h-7 w-7 text-brand" />
          </div>

          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Set Up Your Business
          </h1>

          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
            Create your profile to start running loyalty
            programs.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleCreate}
          className="w-full rounded-[24px] border border-[var(--border-light)] bg-[var(--surface)] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] sm:p-5"
        >
          <div className="space-y-4">
            {fields.map(
              ({ key, label, placeholder }) => (
                <div key={key} className="min-w-0">
                  <label className="mb-1.5 block text-xs font-bold text-[var(--text-secondary)]">
                    {label}
                  </label>

                  <input
                    type="text"
                    value={form[key]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    placeholder={placeholder}
                    className="box-border w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>
              ),
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 px-3 py-2.5">
              <p className="text-xs font-medium text-red-600">
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isCreating}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-[0_6px_18px_var(--brand-ring)] transition-all hover:bg-brand-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Store className="h-4 w-4" />
            )}

            <span>
              {isCreating
                ? "Creating..."
                : "Create Business"}
            </span>
          </button>
        </form>
      </div>
    </main>
  );
}

