"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity, Download, Eye, SlidersHorizontal, Mail, Clock, TrendingUp,
  Users, UserPlus, UserMinus,
} from "lucide-react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { businessesApi } from "@/lib/api/businesses";
import { onboardingApi } from "@/lib/api/onboarding";
import type {
  StaffInvitation, StaffListResponse, StaffOverviewResponse, StaffMember,
} from "@/types";
import toast from "react-hot-toast";
import { InviteStaffModal } from "@/components/invitations/InviteStaffModal";
import {
  ActionMenu, Avatar, Badge, Button, ConfirmationDialog, Pagination,
  SearchInput, Select,
} from "@/components/ui";
import {
  StaffCard, StaffRow, type ActivityTone,
} from "./_components/StaffCard";
import {
  StaffErrorState, StaffListEmptyState, StaffLoadingState,
} from "./_components/states";
import {
  parseStaffListState, staffListStateToParams,
  type StaffListFilters, type StaffListState,
} from "./_components/filters";

const PAGE_SIZE = 20;

/* ------------------------------------------------------------------------ */
/* Formatting helpers (business logic — unchanged)                          */
/* ------------------------------------------------------------------------ */

function daysSince(iso?: string | null) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function activityLabel(lastActivityAt?: string | null): {
  text: string;
  tone: ActivityTone;
} {
  const d = daysSince(lastActivityAt);
  if (d === null) return { text: "Never active", tone: "inactive" };
  if (d < 1) return { text: "Active today", tone: "active" };
  if (d < 7) return { text: `Active ${d}d ago`, tone: "idle" };
  return { text: `Active ${Math.floor(d / 7)}w ago`, tone: "inactive" };
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

/* Filter option tuples ([value, label]) per the control-bar pattern */
const STATUS_OPTIONS = [
  ["", "All statuses"],
  ["active", "Active"],
  ["inactive", "Inactive"],
] as const;

const ACTIVITY_OPTIONS = [
  ["", "Any activity"],
  ["today", "Active today"],
  ["week", "Active this week"],
  ["idle", "Idle"],
] as const;

const GOAL_OPTIONS = [
  ["", "Any goal"],
  ["met", "Goal met"],
  ["behind", "Behind goal"],
  ["none", "No goal set"],
] as const;

type Option = readonly [value: string, label: string];

/** Native-select wrapper matching the shared Select API. */
function FilterSelect({
  value, onChange, options, label, fullWidth = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly Option[];
  label: string;
  fullWidth?: boolean;
}) {
  return (
    <Select
      fullWidth={fullWidth}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      label={label}
    >
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </Select>
  );
}

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
  const [error, setError] = useState<string | null>(null);

  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Mobile collapsible filter panel.
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Deactivation confirmation flow.
  const [pendingDeactivate, setPendingDeactivate] = useState<StaffMember | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // Debounce the committed search state (single source of truth).
  useEffect(() => {
    setState((s) => (s.search === debouncedSearch ? s : { ...s, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // Mirror committed state into the URL.
  useEffect(() => {
    const qs = new URLSearchParams(staffListStateToParams(state)).toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [state, router]);

  // Paginated staff list (server-side search / filter / sort / page).
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
    businessesApi
      .getStaffOverview()
      .then((res) => res.success && res.data && setOverview(res.data))
      .catch(() => undefined);
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

  const setFilter = (key: keyof StaffListFilters, value: string) =>
    patchState({ [key]: value || undefined, page: 1 } as Partial<StaffListState>);

  const clearAllFilters = () => {
    setSearchInput("");
    patchState({ status: undefined, activity: undefined, goalStatus: undefined, page: 1 });
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

  const handleCancelInvite = async (inv: StaffInvitation) => {
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

  const handleDeactivate = async () => {
    if (!pendingDeactivate) return;
    setDeactivating(true);
    try {
      const res = await businessesApi.setStaffStatus(pendingDeactivate.userId, false);
      if (res.success) {
        toast.success(`${pendingDeactivate.fullName} deactivated`);
        setPendingDeactivate(null);
        fetchStaff(state);
        fetchOverview();
      } else {
        toast.error(res.error?.message ?? "Could not deactivate staff member.");
      }
    } catch {
      toast.error("Could not deactivate staff member.");
    } finally {
      setDeactivating(false);
    }
  };

  /* Derived values */
  const staff = list?.items ?? [];
  const activeFilterCount =
    Number(Boolean(state.status)) +
    Number(Boolean(state.activity)) +
    Number(Boolean(state.goalStatus));
  const hasAnyFilter = Boolean(state.search) || activeFilterCount > 0;

  const avgGoalPct =
    overview && overview.staffWithGoals > 0
      ? Math.round((overview.goalsMetToday / overview.staffWithGoals) * 100)
      : 0;

  const summary = [
    { icon: <Users className="h-4 w-4" />, label: "Total staff", value: overview?.totalStaff ?? 0, suffix: "" },
    { icon: <Clock className="h-4 w-4" />, label: "Active this week", value: overview?.activeStaff7d ?? 0, suffix: "" },
    { icon: <TrendingUp className="h-4 w-4" />, label: "Avg. goal progress", value: avgGoalPct, suffix: "%" },
    { icon: <Mail className="h-4 w-4" />, label: "Pending invites", value: invitations.length, suffix: "" },
  ];

  /** Contextual ⋮ actions for one staff member. */
  const menuFor = (member: StaffMember) => (
    <ActionMenu
      label={`Actions for ${member.fullName}`}
      items={[
        { label: "View details", icon: <Eye className="h-3.5 w-3.5" />, href: `/dashboard/business/staff/${member.userId}` },
        { label: "Activity", icon: <Activity className="h-3.5 w-3.5" />, href: `/dashboard/business/staff/${member.userId}/activity` },
        { label: "Deactivate staff", icon: <UserMinus className="h-3.5 w-3.5" />, danger: true, onSelect: () => setPendingDeactivate(member) },
      ]}
    />
  );

  const reload = () => {
    fetchStaff(state);
    fetchOverview();
    fetchInvitations();
  };

  if (isLoading && !list) return <StaffLoadingState />;

  if (error && !list) return <StaffErrorState error={error} onRetry={reload} />;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      {/* ── Sticky Action Header + database search ──────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div className="mx-auto max-w-[1600px] space-y-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">Staff</h1>

              <p className="hidden text-xs text-[var(--text-secondary)] sm:block">
                Manage your team, track performance and invitations
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile filter toggle with active-filter count */}
              <button
                onClick={() => setFiltersOpen((value) => !value)}
                aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
                aria-expanded={filtersOpen}
                className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition-colors hover:border-brand hover:text-brand lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />

                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <Button size="sm" leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setShowInviteModal(true)}>
                <span className="hidden sm:inline">Invite staff</span>
                <span className="sm:hidden">Invite</span>
              </Button>
            </div>
          </div>

          {/* Server-backed search — always visible in the sticky header */}
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search staff by name or email..."
            label="Search staff"
            className="md:max-w-xl"
          />
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-8">
        {/* ── Summary strip ──────────────────────────────────────────── */}
        <section aria-label="Staff summary" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map(({ icon, label, value, suffix }) => (
            <div
              key={label}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-light)] text-[var(--brand)]">
                  {icon}
                </span>

                <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  {value.toLocaleString()}
                  {suffix}
                </span>
              </div>

              <p className="mt-3 text-xs font-medium text-[var(--text-secondary)]">{label}</p>
            </div>
          ))}
        </section>

        {/* ── Filter bar (search lives in the sticky header) ─────────── */}
        <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
          {/* Desktop inline filters */}
          <div className="hidden items-center gap-2 p-3 lg:flex">
            <FilterSelect
              value={state.status ?? ""}
              onChange={(value) => setFilter("status", value)}
              options={STATUS_OPTIONS}
              label="Filter by status"
            />

            <FilterSelect
              value={state.activity ?? ""}
              onChange={(value) => setFilter("activity", value)}
              options={ACTIVITY_OPTIONS}
              label="Filter by activity"
            />

            <FilterSelect
              value={state.goalStatus ?? ""}
              onChange={(value) => setFilter("goalStatus", value)}
              options={GOAL_OPTIONS}
              label="Filter by goal"
            />

            {activeFilterCount > 0 && (
              <button
                onClick={() => patchState({ status: undefined, activity: undefined, goalStatus: undefined, page: 1 })}
                className="ml-auto text-xs font-semibold text-[var(--text-secondary)] hover:text-brand"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Mobile collapsible filter panel */}
          {filtersOpen && (
            <div className="grid gap-3 border-t border-[var(--border)] p-3 lg:hidden">
              <FilterSelect fullWidth value={state.status ?? ""} onChange={(value) => setFilter("status", value)} options={STATUS_OPTIONS} label="Filter by status" />
              <FilterSelect fullWidth value={state.activity ?? ""} onChange={(value) => setFilter("activity", value)} options={ACTIVITY_OPTIONS} label="Filter by activity" />
              <FilterSelect fullWidth value={state.goalStatus ?? ""} onChange={(value) => setFilter("goalStatus", value)} options={GOAL_OPTIONS} label="Filter by goal" />

              <button
                onClick={clearAllFilters}
                disabled={!hasAnyFilter}
                className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-40"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        {/* ── Pending invitations ────────────────────────────────────── */}
        {invitations.length > 0 && (
          <section aria-label="Pending invitations" className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Pending invitations</h2>

                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {invitations.length} awaiting response
                </p>
              </div>
            </div>

            <ul className="grid gap-3 xl:grid-cols-2">
              {invitations.map((invitation) => (
                <li
                  key={invitation.id}
                  className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={invitation.email} size="sm" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                        {invitation.email}
                      </p>

                      <Badge variant={invitation.isExpired ? "danger" : "warning"} dot>
                        {invitation.isExpired ? "Expired" : `Sent ${daysSince(invitation.createdAt) ?? 0}d ago`}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-[var(--border-light)] pt-4">
                    <Button size="sm" variant="outline" fullWidth className="min-h-[40px] flex-1" onClick={() => handleResend(invitation)}>
                      Resend
                    </Button>

                    <button
                      onClick={() => handleCancelInvite(invitation)}
                      className="min-h-[40px] flex-1 rounded-xl px-4 text-sm font-semibold text-[var(--error)] transition-colors hover:bg-red-50"
                    >
                      Cancel invitation
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Team list ──────────────────────────────────────────────── */}
        <section aria-label="Team members" role="region">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Team</h2>

              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                All staff matching your filters
              </p>
            </div>

            <button
              onClick={() => downloadStaffCsv(staff)}
              disabled={staff.length === 0}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Export (CSV)
            </button>
          </div>

          {staff.length === 0 ? (
            <StaffListEmptyState filtered={hasAnyFilter} onInvite={() => setShowInviteModal(true)} />
          ) : (
            <>
              {/* Desktop: bordered surface of clickable rows with ⋮ actions */}
              <div className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] md:block">
                {staff.map((member) => (
                  <StaffRow
                    key={member.userId}
                    member={member}
                    activity={activityLabel(member.lastActivityAt)}
                    goalPercent={goalPercent(member)}
                    menu={menuFor(member)}
                  />
                ))}
              </div>

              {/* Mobile: stacked entity cards */}
              <div className="grid gap-3 md:hidden">
                {staff.map((member) => (
                  <StaffCard
                    key={member.userId}
                    member={member}
                    activity={activityLabel(member.lastActivityAt)}
                    goalPercent={goalPercent(member)}
                  />
                ))}
              </div>

              {/* Shared pager */}
              <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
                <Pagination
                  page={list?.page ?? 1}
                  totalPages={list?.totalPages ?? 1}
                  total={list?.total ?? 0}
                  noun="staff"
                  onChange={(page) => patchState({ page })}
                />
              </div>
            </>
          )}
        </section>

      </main>

      {/* Floating mobile invite button */}
      <div className="fixed bottom-5 left-4 right-4 z-20 lg:hidden">
        <Button
          size="md"
          fullWidth
          leftIcon={<UserPlus className="h-5 w-5" />}
          onClick={() => setShowInviteModal(true)}
        >
          Invite staff
        </Button>
      </div>

      {/* Deactivate confirmation */}
      <ConfirmationDialog
        open={pendingDeactivate !== null}
        onClose={() => setPendingDeactivate(null)}
        onConfirm={handleDeactivate}
        title="Deactivate staff member"
        message={`${pendingDeactivate?.fullName ?? "This member"} will no longer be able to issue stamps or redeem rewards. You can reactivate them at any time.`}
        confirmLabel="Deactivate"
        loading={deactivating}
      />

      {/* Invite modal */}
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

