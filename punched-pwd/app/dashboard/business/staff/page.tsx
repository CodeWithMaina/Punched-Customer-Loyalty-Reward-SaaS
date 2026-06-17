"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import type { StaffMember } from "@/types";
import toast from "react-hot-toast";
import {
  Loader2, UserPlus, Users, Mail, AlertCircle, ChevronRight, Shield,
  Search, X, SlidersHorizontal, Stamp,
} from "lucide-react";
import { FilterSheet, SortOptions } from "@/components/ui/FilterSheet";

type SortKey = "alpha" | "stamps" | "recent";

export default function BusinessStaffPage() {
  useRoleGuard("Business");

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [staffId, setStaffId] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("alpha");
  const [showFilters, setShowFilters] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Initial load
  useEffect(() => { fetchStaff(query, sort); }, []);

  // Debounced search – fires 400ms after last keystroke
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchStaff(query, sort), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Sort changes trigger immediate refetch
  useEffect(() => { fetchStaff(query, sort); }, [sort]);

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!staffId.trim()) return;
    setIsLinking(true);
    try {
      const res = await businessesApi.linkStaff(staffId.trim());
      if (res.success) {
        toast.success("Staff member linked!");
        setStaffId("");
        setShowForm(false);
        fetchStaff(query, sort);
      } else {
        toast.error(res.error?.message || "Failed to link staff.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLinking(false);
    }
  }

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
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors">
          <UserPlus className="h-4 w-4" />Add
        </button>
      </div>

      {/* Add staff form */}
      {showForm && (
        <div className="mx-5 mb-4 bg-[var(--surface)] rounded-2xl border border-brand/20 shadow-card p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="h-4 w-4 text-brand" />
            <p className="text-sm font-bold text-[var(--text-primary)]">Link a Staff Member</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">Staff can scan customer QR codes and award stamps. They cannot edit your programs or view financial data.</p>
          </div>
          <form onSubmit={handleLink} className="flex gap-2">
            <input type="text" value={staffId} onChange={(e) => setStaffId(e.target.value)}
              placeholder="Paste staff user ID (UUID)"
              className="flex-1 border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand font-mono text-xs" />
            <button type="submit" disabled={isLinking || !staffId.trim()}
              className="flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white font-semibold text-sm rounded-xl px-4 py-2.5 disabled:opacity-50 transition-colors flex-shrink-0">
              {isLinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}

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
              : "Tap Add to link a staff member using their user ID"}
          </p>
          {query && (
            <button onClick={() => setQuery("")} className="mt-2 text-xs font-semibold text-brand">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="mx-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden divide-y divide-[var(--border-light)]">
          {staff.map((s) => (
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
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{s.fullName}</p>
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
              </div>

              <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
