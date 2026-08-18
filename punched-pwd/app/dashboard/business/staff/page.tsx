"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { businessesApi } from "@/lib/api/businesses";
import { onboardingApi } from "@/lib/api/onboarding";
import type { StaffInvitation, StaffMember } from "@/types";
import toast from "react-hot-toast";
import {
  Loader2, UserPlus, Users, Mail, ChevronRight, Shield,
  Search, X, SlidersHorizontal, Stamp, Star, Target,
} from "lucide-react";
import { FilterSheet, SortOptions } from "@/components/ui/FilterSheet";
import { InviteStaffModal } from "@/components/invitations/InviteStaffModal";

type SortKey = "alpha" | "stamps" | "recent";

export default function BusinessStaffPage() {
  useRoleGuard("Business");

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("stamps");
  const [showFilters, setShowFilters] = useState(false);
  const debouncedQuery = useDebouncedValue(query);

  // ── Daily goal configuration ─────────────────────────────
  const [showGoals, setShowGoals] = useState(false);
  const [businessGoal, setBusinessGoal] = useState<number | undefined>(undefined);
  const [goalEdits, setGoalEdits] = useState<Record<string, string>>({});
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  useEffect(() => {
    businessesApi.getMine().then((res) => {
      if (res.success && res.data) setBusinessGoal(res.data.defaultDailyGoal);
    });
  }, []);

  async function saveBusinessGoal() {
    setIsSavingGoal(true);
    try {
      const v = businessGoal;
      const res = await businessesApi.setBusinessDailyGoal(v && v > 0 ? Math.round(v) : undefined);
      if (res.success) {
        setBusinessGoal(res.data?.defaultDailyGoal);
        toast.success(res.data?.defaultDailyGoal ? "Default daily goal updated" : "Default daily goal cleared");
        fetchStaff(query, sort);
      } else {
        toast.error(res.error?.message ?? "Failed to update default goal.");
      }
    } catch {
      toast.error("Unexpected error.");
    } finally {
      setIsSavingGoal(false);
    }
  }

  async function saveStaffGoal(userId: string) {
    try {
      const raw = goalEdits[userId];
      const v = raw && Number(raw) > 0 ? Math.round(Number(raw)) : undefined;
      const res = await businessesApi.setStaffDailyGoal(userId, v);
      if (res.success) {
        setGoalEdits((g) => ({ ...g, [userId]: res.data?.dailyGoalOverride?.toString() ?? "" }));
        toast.success(res.data?.dailyGoalOverride ? "Staff goal updated" : "Staff goal cleared (uses default)");
        fetchStaff(query, sort);
      } else {
        toast.error(res.error?.message ?? "Failed to update staff goal.");
      }
    } catch {
      toast.error("Unexpected error.");
    }
  }

  const fetchStaff = useCallback(
    (search?: string, sortBy?: string) => {
      setIsLoading(true);
      const params: { search?: string; sort?: string } = {};
      if (search?.trim()) params.search = search.trim();
      if (sortBy && sortBy !== "alpha") params.sort = sortBy;
      businessesApi
        .getMyStaff(Object.keys(params).length ? params : undefined)
        .then((res) => {
          if (res.success && res.data) setStaff(res.data);
        })
        .finally(() => setIsLoading(false));
    },
    []
  );

  useEffect(() => {
    fetchStaff(debouncedQuery, sort);
  }, [debouncedQuery, fetchStaff, sort]);

  const fetchInvitations = useCallback(() => {
    onboardingApi
      .listStaffInvitations()
      .then((res) => {
        if (res.success && res.data) {
          setInvitations(res.data.filter((inv) => inv.status === "Pending"));
        }
      })
      .catch(() => {
        /* keep current list on transient errors */
      });
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  return (
    <div className="max-w-lg mx-auto pb-10">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Staff</h1>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {staff.length} member{staff.length !== 1 ? "s" : ""} with scan access
          </p>
        </div>
        <button onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors">
          <UserPlus className="h-4 w-4" />Invite
        </button>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="mx-5 mb-4 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-light)]">
            <Mail className="h-4 w-4 text-brand" />
            <p className="text-sm font-bold text-[var(--text-primary)]">Pending Invitations</p>
          </div>
          <div className="divide-y divide-[var(--border-light)]">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-9 w-9 rounded-full bg-brand-surface flex items-center justify-center flex-shrink-0">
                  <Mail className="h-4 w-4 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{inv.email}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Awaiting acceptance</p>
                </div>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

{/* Daily goals configuration */}
       <div className="mx-5 mb-4 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card">
         <button
           onClick={() => setShowGoals((v) => !v)}
           className="w-full flex items-center justify-between px-4 py-3 text-left"
         >
           <div className="flex items-center gap-2">
             <Target className="h-4 w-4 text-brand" />
             <span className="text-sm font-semibold text-[var(--text-primary)]">Daily Stamp Goals</span>
           </div>
           <span className="text-xs text-[var(--text-tertiary)]">{showGoals ? "Hide" : "Show"}</span>
         </button>
         {showGoals && (
           <div className="px-4 pb-4 border-t border-[var(--border-light)] space-y-3">
             <div className="flex items-end gap-2">
               <div className="flex-1">
                 <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Business default</label>
                 <input
                   type="number" min={1} max={1000}
                   value={businessGoal === undefined ? "" : businessGoal}
                   onChange={(e) => setBusinessGoal(e.target.value ? parseInt(e.target.value) : undefined)}
                   placeholder="e.g. 20"
                   className="mt-1 w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                 />
               </div>
               <button
                 onClick={saveBusinessGoal} disabled={isSavingGoal}
                 className="px-3.5 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-xl disabled:opacity-50 flex items-center gap-1"
               >
                 {isSavingGoal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Save business goal
               </button>
             </div>
             <p className="text-[10px] text-[var(--text-tertiary)]">Per-staff overrides below. Staff with no override use this business default.</p>
             {staff.length === 0 ? null : (
               <div className="space-y-2">
                 {staff.map((s) => (
                   <div key={s.userId} className="flex items-center gap-2">
                     <div className="flex-1 min-w-0">
                       <p className="text-xs font-medium text-[var(--text-primary)] truncate">{s.fullName}</p>
                       <p className="text-[10px] text-[var(--text-tertiary)]">Effective goal: {s.dailyGoal ?? businessGoal ?? "—"}</p>
                     </div>
                     <input
                       type="number" min={1} max={1000}
                       value={goalEdits[s.userId] ?? (s.dailyGoalOverride?.toString() ?? "")}
                       onChange={(e) => setGoalEdits((g) => ({ ...g, [s.userId]: e.target.value }))}
                       placeholder="override"
                       className="w-24 border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand"
                     />
                     <button
                       onClick={() => saveStaffGoal(s.userId)}
                       className="px-2.5 py-1 bg-brand hover:bg-brand-hover text-white text-[10px] font-semibold rounded-xl"
                     >Set
                     </button>
                   </div>
                 ))}
               </div>
             )}
           </div>
         )}
       </div>
      {/* Search bar + filter button */}
      <div className="sticky top-[57px] z-10 bg-[var(--background)] px-5 pt-3 pb-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/30 transition shadow-card"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`h-10 w-10 rounded-2xl border flex items-center justify-center flex-shrink-0 transition-all ${
              showFilters
                ? "bg-brand border-brand text-white shadow-sm"
                : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)]"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Active sort pill (when sheet closed and sort is non-default) */}
        {sort !== "alpha" && !showFilters && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="inline-flex items-center gap-1 bg-[var(--border-light)] text-[var(--text-secondary)] text-xs font-semibold px-2.5 py-1 rounded-full">
              {sort === "stamps" ? "Top Stamps" : "Most Recent"}
              <button onClick={() => setSort("alpha")} className="hover:text-[var(--text-primary)]"><X className="h-3 w-3" /></button>
            </span>
            <span className="ml-auto text-[11px] text-[var(--text-tertiary)] whitespace-nowrap">
              {staff.length} result{staff.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* FilterSheet */}
      <div className="px-5">
        <FilterSheet open={showFilters} onClose={() => setShowFilters(false)} title="Sort Staff">
          <SortOptions
            options={[
              { key: "alpha", label: "A → Z" },
              { key: "stamps", label: "Top Stamps" },
              { key: "recent", label: "Most Recent" },
            ]}
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
          />
        </FilterSheet>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>
      ) : staff.length === 0 ? (
        <div className="mx-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-10 text-center space-y-3">
          <Users className="h-10 w-10 text-[var(--text-muted)] mx-auto" />
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            {query ? "No staff found" : "No staff linked yet"}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {query
              ? "Try adjusting your search"
              : "Tap Invite to send a staff member an invitation by email"}
          </p>
          {query && (
            <button onClick={() => setQuery("")} className="mt-2 text-xs font-semibold text-brand">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="mx-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden divide-y divide-[var(--border-light)]">
          {staff.map((s, index) => (
            <Link
              key={s.userId}
              href={`/dashboard/business/staff/${s.userId}`}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--surface-raised)] active:bg-[var(--border-light)] transition-colors"
            >
              {/* Avatar */}
              <div className="h-11 w-11 rounded-full bg-brand-surface text-brand text-sm font-bold flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-brand/10">
                {s.avatarUrl ? <img src={s.avatarUrl} alt={s.fullName} className="h-full w-full object-cover" /> : s.fullName.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{s.fullName}</p>
                  {sort === "stamps" && index < 3 && <Star className="h-3.5 w-3.5 flex-shrink-0 fill-amber-400 text-amber-500" aria-label={`Rank ${index + 1}`} />}
                </div>
                <p className="text-xs text-[var(--text-tertiary)] truncate flex items-center gap-1">
                  <Mail className="h-3 w-3" />{s.email}
                </p>
              </div>

              {/* Stamps + badge */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-[10px] font-bold text-brand bg-brand-surface px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Shield className="h-2.5 w-2.5" />Staff
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-0.5">
                  <Stamp className="h-3 w-3" />{s.stampsIssued}
                </span>
                {sort === "stamps" && <span className="text-[10px] text-[var(--text-tertiary)]">Rank {index + 1}</span>}
              </div>

              <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* Invite staff modal */}
      <InviteStaffModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvited={fetchInvitations}
      />
    </div>
  );
}
