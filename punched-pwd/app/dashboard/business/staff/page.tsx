"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { businessesApi } from "@/lib/api/businesses";
import { onboardingApi } from "@/lib/api/onboarding";
import type {
  StaffInvitation, StaffListResponse, StaffOverviewResponse, StaffMember,
} from "@/types";
import toast from "react-hot-toast";
import { InviteStaffModal } from "@/components/invitations/InviteStaffModal";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { StaffFilterDrawer, StaffFilterChips } from "./_components/StaffFilterDrawer";
import {
  parseStaffListState, staffListStateToParams,
  type StaffListFilters, type StaffListState,
} from "./_components/filters";

const PAGE_SIZE = 20;

/* ------------------------------------------------------------------------ */
/* Design-system helpers (matches the approved Staff Management mockups)     */
/* ------------------------------------------------------------------------ */

function initialsOf(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function daysSince(iso?: string | null) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function activityLabel(lastActivityAt?: string | null) {
  const d = daysSince(lastActivityAt);
  if (d === null) return { text: "Never active", tone: "inactive" as const };
  if (d < 1) return { text: "Active today", tone: "active" as const };
  if (d < 7) return { text: `Active ${d}d ago`, tone: "idle" as const };
  return { text: `Active ${Math.floor(d / 7)}w ago`, tone: "inactive" as const };
}

function goalPercent(staff: StaffMember) {
  if (!staff.dailyGoal || staff.dailyGoal <= 0) return null;
  return Math.min(Math.round(((staff.stampsToday ?? 0) / staff.dailyGoal) * 100), 100);
}
function escapeCsv(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadStaffCsv(staff: StaffMember[]) {
  const header = ["Name", "Email", "Total Stamps", "Stamps Today", "Daily Goal", "Last Active"].join(",");
  const rows = staff.map((m) =>
    [
      m.fullName,
      m.email,
      m.stampsIssued ?? 0,
      m.stampsToday ?? 0,
      m.dailyGoal ?? "",
      m.lastActivityAt ?? "",
    ]
      .map(escapeCsv)
      .join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `staff_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* Status pill colours per activity tone */
const STATUS_PILL: Record<string, string> = {
  active: "bg-[#166534]/20 text-[#004c22]",
  idle: "bg-[#e8e8e7] text-[#404940]",
  inactive: "bg-[#ffdad6]/30 text-[#ba1a1a]",
};
const STATUS_DOT: Record<string, string> = {
  active: "bg-[#004c22]",
  idle: "bg-[#707a6f]",
  inactive: "bg-[#ba1a1a]",
};

export default function BusinessStaffPage() {
  useRoleGuard("Business");
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-mirrored list state (shareable / refresh-safe).
  const [state, setState] = useState<StaffListState>(() =>
    parseStaffListState(Object.fromEntries(searchParams.entries()))
  );
  const [searchInput, setSearchInput] = useState(state.search);
  const debouncedSearch = useDebouncedValue(searchInput);

  const [list, setList] = useState<StaffListResponse | null>(null);
  const [overview, setOverview] = useState<StaffOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Filter drawer draft state.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<StaffListFilters>({
    status: state.status,
    activity: state.activity,
    goalStatus: state.goalStatus,
  });

  // Debounce the committed search state (single source of truth).
  useEffect(() => {
    setState((s) => (s.search === debouncedSearch ? s : { ...s, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // Mirror committed state into the URL.
  useEffect(() => {
    const qs = new URLSearchParams(staffListStateToParams(state)).toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [state, router]);

  // Paginated staff list (server-side filter / sort / page).
  const fetchStaff = useCallback((s: StaffListState) => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    businessesApi
      .getMyStaff({
        search: s.search || undefined,
        status: s.status,
        activity: s.activity,
        goalStatus: s.goalStatus,
        sortBy: s.sortBy,
        sortDirection: s.sortDirection,
        page: s.page,
        pageSize: PAGE_SIZE,
      })
      .then((res) => {
        if (!cancelled) {
          if (res.success && res.data) setList(res.data);
          else setError(res.error?.message ?? "Failed to load staff.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load staff.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => fetchStaff(state), [state, fetchStaff]);

  const fetchOverview = useCallback(() => {
    setOverviewLoading(true);
    businessesApi
      .getStaffOverview()
      .then((res) => res.success && res.data && setOverview(res.data))
      .catch(() => undefined)
      .finally(() => setOverviewLoading(false));
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const fetchInvitations = useCallback(() => {
    onboardingApi
      .listStaffInvitations()
      .then((res) => {
        if (res.success && res.data) {
          setInvitations(res.data.filter((inv) => inv.status === "Pending"));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const patchState = (patch: Partial<StaffListState>) =>
    setState((s) => ({ ...s, ...patch }));

  const applyDraftFilters = () => {
    patchState({ ...draftFilters, page: 1 });
    setFiltersOpen(false);
  };

  const clearAllFilters = () => {
    const cleared: StaffListFilters = { status: undefined, activity: undefined, goalStatus: undefined };
    setDraftFilters(cleared);
    patchState({ ...cleared, page: 1 });
  };

  const removeFilter = (key: keyof StaffListFilters) => {
    setDraftFilters((d) => ({ ...d, [key]: undefined }));
    patchState({ [key]: undefined, page: 1 } as Partial<StaffListState>);
  };

  const handleResend = async (inv: StaffInvitation) => {
    try {
      const res = await onboardingApi.resendStaffInvitation(inv.id);
      if (res.success) {
        toast.success("Invitation resent");
        fetchInvitations();
      } else {
        toast.error(res.error?.message ?? "Could not resend invitation.");
      }
    } catch {
      toast.error("Could not resend invitation.");
    }
  };

  const handleCancel = async (inv: StaffInvitation) => {
    try {
      const res = await onboardingApi.revokeStaffInvitation(inv.id);
      if (res.success) {
        toast.success("Invitation cancelled");
        fetchInvitations();
        fetchOverview();
      } else {
        toast.error(res.error?.message ?? "Could not cancel invitation.");
      }
    } catch {
      toast.error("Could not cancel invitation.");
    }
  };

  const staff = list?.items ?? [];
  const hasAnyFilter =
    Boolean(state.search) || Boolean(state.status) || Boolean(state.activity) || Boolean(state.goalStatus);
  const activeFilterCount =
    Number(Boolean(state.status)) + Number(Boolean(state.activity)) + Number(Boolean(state.goalStatus));

  const avgGoalPct =
    overview && overview.staffWithGoals > 0
      ? Math.round((overview.goalsMetToday / overview.staffWithGoals) * 100)
      : 0;

  /* Desktop KPIs — matches Mockup 2 (icon-badge cards) */
  const kpis = [
    {
      label: "Total Staff",
      icon: "group",
      value: overviewLoading ? "…" : (overview?.totalStaff ?? 0).toLocaleString(),
      valueClass: "text-[#004c22]",
      boxClass: "bg-[#166534]/20 text-[#004c22]",
    },
    {
      label: "Active This Week",
      icon: "check_circle",
      value: overviewLoading ? "…" : (overview?.activeStaff7d ?? 0).toLocaleString(),
      valueClass: "text-[#1a1c1c]",
      boxClass: "bg-[#8bd79b]/25 text-[#2f6b3f]",
    },
    {
      label: "Avg. Goal Progress",
      icon: "trending_up",
      value: overviewLoading ? "…" : `${avgGoalPct}%`,
      valueClass: "text-[#895200]",
      boxClass: "bg-[#ffb157]/25 text-[#895200]",
    },
    {
      label: "Pending Invites",
      icon: "mail",
      value: invitations.length.toLocaleString(),
      valueClass: "text-[#1a1c1c]",
      boxClass: "bg-[#e2e2e2] text-[#404940]",
    },
  ];

  /* Mobile metric cards — matches Mockup 1 (trend sub-lines) */
  const kpisMobile = [
    {
      label: "Total Staff",
      icon: "groups",
      value: overviewLoading ? "…" : (overview?.totalStaff ?? 0).toLocaleString(),
      subIcon: "trending_up",
      sub: overview && overview.totalStaff > 0 ? `${overview.inactiveStaff} inactive` : "No staff yet",
      valueClass: "text-[#004c22]",
      subClass: "text-[#004c22]",
      accent: "from-[#004c22] to-transparent",
    },
    {
      label: "Active This Week",
      icon: "local_activity",
      value: overviewLoading ? "…" : (overview?.activeStaff7d ?? 0).toLocaleString(),
      subIcon: null,
      sub: "Steady",
      valueClass: "text-[#895200]",
      subClass: "text-[#895200]",
      accent: "from-[#ffb157] to-transparent",
    },
    {
      label: "Stamps Today",
      icon: "sell",
      value: overviewLoading ? "…" : (overview?.stampsToday ?? 0).toLocaleString(),
      subIcon: "trending_up",
      sub: `${overview?.goalsMetToday ?? 0} goals met`,
      valueClass: "text-[#722736]",
      subClass: "text-[#722736]",
      accent: "from-[#8f3e4c] to-transparent",
    },
    {
      label: "Pending Invites",
      icon: "mail",
      value: invitations.length.toLocaleString(),
      subIcon: null,
      sub: `${invitations.filter((i) => i.isExpired).length} expiring soon`,
      valueClass: "text-[#1a1c1c]",
      subClass: "text-[#404940]",
      accent: "from-[#707a6f] to-transparent",
    },
  ];

  /* Reusable pieces */

  /** Mobile staff card — mirrors the approved mobile design. */
  function StaffCard({ member }: { member: StaffMember }) {
    const act = activityLabel(member.lastActivityAt);
    const pct = goalPercent(member);
    return (
      <Link
        href={`/dashboard/business/staff/${member.userId}`}
        className="relative block rounded-[20px] border border-[#e2e2e2]/50 bg-white p-5 shadow-[0_4px_12px_rgba(0,76,34,0.04)] transition-shadow hover:shadow-[0_8px_20px_rgba(0,76,34,0.08)]"
      >
        <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-1 w-full rounded-t-[20px] bg-gradient-to-b from-white/40 to-transparent" />
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            {member.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={member.fullName} src={member.avatarUrl} className="h-14 w-14 rounded-full object-cover shadow-sm" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e2e2e2] font-headline-md text-lg text-[#bfc9bd]">
                {initialsOf(member.fullName)}
              </div>
            )}
            <span
              aria-hidden
              className={`absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${
                act.tone === "active" ? "bg-[#a6f4b5]" : act.tone === "idle" ? "bg-[#ffdcbc]" : "bg-[#ffd9dd]"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[act.tone]}`} />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h3 className="font-headline-md truncate text-base font-semibold leading-tight text-[#1a1c1c]">{member.fullName}</h3>
                <p className="truncate font-body-sm text-sm text-[#404940]">{member.email}</p>
              </div>
              <span aria-hidden className="shrink-0 text-[#707a6f]">
                <span className="material-symbols-outlined">more_vert</span>
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-md border border-[#bfc9bd]/30 bg-[#eeeeed] px-2.5 py-1 text-xs font-medium text-[#404940]">
                {act.text}
              </span>
              <span className="inline-flex items-center rounded-md border border-[#ffb157]/30 bg-[#ffb157]/20 px-2.5 py-1 text-xs font-medium text-[#895200]">
                {(member.stampsIssued ?? 0).toLocaleString()} stamps
              </span>
            </div>
          </div>
        </div>

        {pct !== null && (
          <div className="mt-4 border-t border-[#e2e2e2]/50 pt-4">
            <div className="mb-1 flex items-end justify-between">
              <span className="font-label-caps text-[10px] uppercase text-[#404940]">Daily Goal Progress</span>
              <span className="font-data-emphasis text-sm text-[#004c22]">{pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#eeeeed]">
              <div className={`h-full rounded-full ${act.tone === "active" ? "bg-[#004c22]" : "bg-[#004c22]/70"}`} style={{ width: `${Math.max(pct, 3)}%` }} />
            </div>
          </div>
        )}
      </Link>
    );
  }

  /** Pending invitation card — mobile variant of the approved design. */
  function InvitationCard({ inv }: { inv: StaffInvitation }) {
    return (
      <div className="relative rounded-[20px] border border-[#e2e2e2]/50 bg-white p-5 shadow-[0_4px_12px_rgba(0,76,34,0.04)] opacity-90">
        <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-1 w-full rounded-t-[20px] bg-gradient-to-b from-white/40 to-transparent" />
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e2e2e2] font-headline-md text-lg text-[#bfc9bd]">
              {initialsOf(inv.email)}
            </div>
            <span aria-hidden className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[#ffd9dd]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#722736]" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h3 className="font-headline-md truncate text-base font-semibold italic leading-tight text-[#1a1c1c]">Pending Invite</h3>
                <p className="truncate font-body-sm text-sm text-[#404940]">{inv.email}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-[#722736]/20 bg-[#8f3e4c]/10 px-2.5 py-1 text-xs font-medium text-[#722736]">
                <span className="material-symbols-outlined text-[12px]">schedule</span>
                Sent {daysSince(inv.createdAt) ?? 0}d ago{inv.isExpired ? " · Expired" : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2 border-t border-[#e2e2e2]/50 pt-4">
          <button
            onClick={() => handleResend(inv)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#404940] transition-colors hover:bg-[#e2e2e2]"
          >
            Resend
          </button>
          <button
            onClick={() => handleCancel(inv)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#ba1a1a] transition-colors hover:bg-[#ba1a1a]/10"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const startIdx = list ? (list.page - 1) * list.pageSize + 1 : 0;
  const endIdx = list ? Math.min(list.page * list.pageSize, list.total) : 0;

  return (
    <div className="min-h-screen bg-[#f9f9f8] pb-28 font-body-base text-[#1a1c1c] md:pb-10">
      {/* Design fonts & icons */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
      <style>{`
        .material-symbols-outlined { font-family: 'Material Symbols Outlined'; font-weight: normal; font-style: normal; line-height: 1; letter-spacing: normal; text-transform: none; display: inline-block; white-space: nowrap; word-wrap: normal; direction: ltr; -webkit-font-feature-settings: 'liga'; -webkit-font-smoothing: antialiased; }
        .font-headline-md { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-body-base { font-family: 'Inter', sans-serif; }
        .font-body-sm { font-family: 'Inter', sans-serif; }
        .font-data-emphasis { font-family: 'Space Grotesk', sans-serif; }
        .font-label-caps { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      <main className="mx-auto w-full max-w-[1440px] px-4 pt-6 md:px-6 md:pt-10 lg:px-10">
        {/* Header Section */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-headline-md text-[32px] font-bold leading-[1.2] tracking-[-0.02em] text-[#1a1c1c] md:text-2xl">
              Staff Management
            </h2>
            <p className="mt-2 font-body-base text-[#404940]">Manage your team, track performance, and handle invitations.</p>
          </div>
          <div className="hidden md:flex">
            <button
              onClick={() => setShowInviteModal(true)}
              aria-label="Invite staff member"
              className="flex items-center gap-2 rounded-lg bg-[#004c22] px-6 py-3 font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-95"
            >
              <span className="material-symbols-outlined">person_add</span>
              Invite Staff
            </button>
          </div>
        </div>

        {/* Metrics Grid — Mobile: trend cards (Mockup 1) */}
        <div className="mb-10 grid grid-cols-2 gap-4 md:hidden">
          {kpisMobile.map((kpi) => (
            <div key={kpi.label} className="group relative overflow-hidden rounded-[20px] bg-[#f4f4f3] p-5 shadow-[0_4px_12px_rgba(0,76,34,0.04)]">
              <div aria-hidden className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-0 transition-opacity group-hover:opacity-100 ${kpi.accent}`} />
              <div className="mb-3 flex items-start justify-between">
                <span className="font-label-caps text-[12px] font-bold uppercase tracking-wider text-[#404940]">{kpi.label}</span>
                <span className="material-symbols-outlined rounded-full bg-white p-1.5 text-[#707a6f] shadow-sm">{kpi.icon}</span>
              </div>
              <div className={`font-data-emphasis text-[32px] font-medium leading-[1.1] ${kpi.valueClass}`}>{kpi.value}</div>
              <div className={`mt-2 flex items-center gap-1 text-sm ${kpi.subClass}`}>
                {kpi.subIcon && <span className="material-symbols-outlined text-sm">{kpi.subIcon}</span>}
                <span>{kpi.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Metrics Grid — Desktop: icon-badge KPI cards (Mockup 2) */}
        <div className="mb-10 hidden grid-cols-1 gap-6 md:grid lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="flex flex-col gap-4 rounded-[20px] bg-[#f4f4f3] p-6 shadow-[0_4px_12px_rgba(0,76,34,0.04)]">
              <div className="flex items-start justify-between">
                <span className="font-label-caps text-[12px] font-bold uppercase tracking-wider text-[#404940]">{kpi.label}</span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${kpi.boxClass}`}>
                  <span className="material-symbols-outlined text-[18px]">{kpi.icon}</span>
                </span>
              </div>
              <div className={`font-data-emphasis text-[32px] font-medium leading-none ${kpi.valueClass}`}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Search and Filter Bar — Mobile: search + tune drawer */}
        <div className="mb-3 flex gap-3 md:hidden">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#707a6f]">search</span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search staff by name, email..."
              aria-label="Search staff by name or email"
              className="w-full rounded-xl border-none bg-[#e2e2e2] py-3.5 pl-12 pr-4 font-body-base text-[#1a1c1c] shadow-inner transition-shadow placeholder:text-[#bfc9bd] focus:outline-none focus:ring-2 focus:ring-[#004c22]/20"
            />
          </div>
          <button
            aria-label={`Open filters${activeFilterCount ? ` (${activeFilterCount} active)` : ""}`}
            onClick={() => {
              setDraftFilters({ status: state.status, activity: state.activity, goalStatus: state.goalStatus });
              setFiltersOpen(true);
            }}
            className="relative flex shrink-0 items-center justify-center rounded-xl bg-[#e2e2e2] p-3.5 text-[#1a1c1c] shadow-sm transition-colors hover:bg-[#dadad9]"
          >
            <span className="material-symbols-outlined">tune</span>
            {activeFilterCount > 0 && (
              <span aria-hidden className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#004c22] px-0.5 text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Search and Filter Bar — Desktop: search + tune (Mockup 1 aesthetic) */}
        <div className="mb-6 hidden md:block">
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#707a6f]">search</span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search staff by name, email..."
              aria-label="Search staff by name or email"
              className="w-full rounded-xl border-none bg-[#e2e2e2] py-3 pl-12 pr-4 font-body-base text-[#1a1c1c] shadow-inner transition-shadow placeholder:text-[#bfc9bd] focus:outline-none focus:ring-2 focus:ring-[#004c22]/20"
            />
          </div>
        </div>
        {hasAnyFilter && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StaffFilterChips applied={state} onRemove={removeFilter} onClearAll={clearAllFilters} />
            <span className="ml-auto whitespace-nowrap text-xs text-[#707a6f]" aria-live="polite">
              {isLoading ? "…" : `${list?.total ?? 0} result${list?.total !== 1 ? "s" : ""}`}
            </span>
          </div>
        )}

        {/* Advanced filters: mobile bottom sheet to desktop right drawer */}
        <StaffFilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          draft={draftFilters}
          onDraftChange={setDraftFilters}
          onApply={applyDraftFilters}
          onClear={clearAllFilters}
        />

        {/* Roster */}
        {error ? (
          <div className="py-8">
            <ErrorState message={error} onRetry={() => fetchStaff(state)} />
          </div>
        ) : isLoading ? (
          <div className="space-y-4 pb-24 md:hidden" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[20px] bg-white p-5 shadow-[0_4px_12px_rgba(0,76,34,0.04)]" aria-hidden>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-[#e2e2e2]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded-md bg-[#e2e2e2]" />
                    <div className="h-3 w-48 animate-pulse rounded-md bg-[#e2e2e2]" />
                  </div>
                </div>
                <div className="mt-4 h-1.5 w-full animate-pulse rounded-full bg-[#eeeeed]" />
              </div>
            ))}
          </div>
        ) : staff.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={<span className="material-symbols-outlined text-2xl">search</span>}
              title={state.search ? "No staff members match your search." : "No staff match these filters."}
              description={
                hasAnyFilter
                  ? "Try removing a filter or clearing your search."
                  : "Tap Invite Staff to add your first team member by email."
              }
              action={
                hasAnyFilter ? (
                  <button
                    onClick={() => {
                      setSearchInput("");
                      clearAllFilters();
                    }}
                    className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[#004c22] ring-1 ring-[#004c22] transition-colors hover:bg-[#004c22] hover:text-white"
                  >
                    Clear search &amp; filters
                  </button>
                ) : (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#004c22] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <span className="material-symbols-outlined text-base">person_add</span>
                    Invite Staff
                  </button>
                )
              }
            />
          </div>
        ) : (
          <>
            {/* Staff List — Mobile Cards */}
            <div className="space-y-4 pb-24 md:hidden">
              {staff.map((member: StaffMember) => (
                <StaffCard key={member.userId} member={member} />
              ))}
              {invitations.map((inv) => (
                <InvitationCard key={inv.id} inv={inv} />
              ))}
            </div>

            {/* Team Roster — Desktop Table */}
            <section
              className="mb-8 hidden flex-col overflow-hidden rounded-[24px] bg-white md:flex"
              style={{ boxShadow: "0 4px 12px rgba(0,76,34,0.04), inset 0 1px 0 rgba(255,255,255,0.4)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e2e2] p-6">
                <div className="flex items-center gap-4">
                  <h3 className="font-headline-md text-xl font-semibold text-[#1a1c1c]">Team Roster</h3>
                  <span className="hidden text-sm text-[#404940] sm:inline">{list?.total ?? 0} team members</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#404940]">filter_list</span>
                    <select
                      aria-label="Filter by status"
                      value={state.status ?? ""}
                      onChange={(e) =>
                        patchState({ status: e.target.value === "" ? undefined : (e.target.value as "active" | "inactive"), page: 1 })
                      }
                      className="w-full cursor-pointer appearance-none rounded-lg border-none bg-[#f4f4f3] py-2 pl-10 pr-4 font-body-sm text-[#404940] shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[#004c22]/20 md:w-auto"
                    >
                      <option value="">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <button
                    onClick={() => downloadStaffCsv(staff)}
                    disabled={staff.length === 0}
                    className="rounded-lg bg-[#e2e2e2] px-4 py-2 font-medium text-[#404940] transition-colors hover:bg-[#dadad9] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Export
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#e2e2e2] bg-[#f4f4f3]/50 font-label-caps text-[12px] uppercase tracking-wider text-[#404940]">
                      <th className="p-4 pl-6 font-medium">Staff Member</th>
                      <th className="p-4 font-medium">Total Stamps</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="min-w-[200px] p-4 font-medium">Daily Goal Progress</th>
                      <th className="p-4 pr-6 text-right font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {staff.map((member: StaffMember) => {
                      const act = activityLabel(member.lastActivityAt);
                      const pct = goalPercent(member);
                      return (
                        <tr key={member.userId} className="border-b border-[#e2e2e2]/50 transition-colors hover:bg-[#f4f4f3]/60">
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              {member.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={member.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover shadow-sm" />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e2e2e2] font-medium text-[#404940] shadow-sm">
                                  {initialsOf(member.fullName)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="truncate font-medium text-[#1a1c1c]">{member.fullName}</div>
                                <div className="truncate text-[12px] text-[#404940]">{member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-data-emphasis text-[#1a1c1c]">{(member.stampsIssued ?? 0).toLocaleString()}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${STATUS_PILL[act.tone]}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[act.tone]}`} />
                              {act.text}
                            </span>
                          </td>
                          <td className="p-4">
                            {pct !== null ? (
                              <div className="flex items-center gap-3">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e2e2e2]">
                                  <div
                                    className={`h-full rounded-full ${act.tone === "active" ? "bg-[#004c22]" : act.tone === "idle" ? "bg-[#895200]" : "bg-[#707a6f]"}`}
                                    style={{ width: `${Math.max(pct, 3)}%` }}
                                  />
                                </div>
                                <span
                                  className={`w-10 text-right font-data-emphasis text-[14px] ${
                                    act.tone === "active" ? "text-[#004c22]" : act.tone === "idle" ? "text-[#895200]" : "text-[#707a6f]"
                                  }`}
                                >
                                  {pct}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-[12px] text-[#707a6f]">No goal set</span>
                            )}
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <Link
                              href={`/dashboard/business/staff/${member.userId}`}
                              aria-label={`View details for ${member.fullName}`}
                              className="inline-flex rounded-full p-2 text-[#404940] transition-colors hover:bg-[#166534]/10 hover:text-[#004c22]"
                            >
                              <span className="material-symbols-outlined text-[20px]">more_vert</span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table footer with pagination */}
              <div className="flex items-center justify-between border-t border-[#e2e2e2] bg-[#f4f4f3]/30 p-4 text-sm text-[#404940]">
                <div>
                  {list && list.total > 0
                    ? `Showing ${startIdx} to ${endIdx} of ${list.total} entries`
                    : "No entries"}
                </div>
                <div className="flex gap-1">
                  <button
                    aria-label="Previous page"
                    disabled={(list?.page ?? 1) <= 1}
                    onClick={() => patchState({ page: (list?.page ?? 1) - 1 })}
                    className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-[#e2e2e2] disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(list?.totalPages ?? 1, 5) }).map((_, i) => {
                    const p = i + 1;
                    const current = (list?.page ?? 1) === p;
                    return (
                      <button
                        key={p}
                        onClick={() => patchState({ page: p })}
                        aria-current={current ? "page" : undefined}
                        className={`flex h-8 w-8 items-center justify-center rounded font-medium transition-colors ${
                          current ? "bg-[#166534] text-[#93e0a2]" : "hover:bg-[#e2e2e2]"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    aria-label="Next page"
                    disabled={(list?.page ?? 1) >= (list?.totalPages ?? 1)}
                    onClick={() => patchState({ page: (list?.page ?? 1) + 1 })}
                    className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-[#e2e2e2] disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Floating Action Button (Mobile Only) */}
      <button
        onClick={() => setShowInviteModal(true)}
        aria-label="Invite staff member"
        className="fixed bottom-[88px] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#004c22] text-white shadow-lg shadow-[#004c22]/20 transition-transform active:scale-95 md:hidden"
      >
        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
      </button>

      {/* Invite staff modal */}
      <InviteStaffModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvited={() => {
          fetchInvitations();
          fetchOverview();
          toast.success("Invitation sent");
        }}
      />
    </div>
  );
}
