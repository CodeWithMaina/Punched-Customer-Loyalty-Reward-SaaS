"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { businessesApi } from "@/lib/api/businesses";
import type { BusinessCustomer } from "@/types";
import {
  Loader2,
  Search,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Download,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { FilterSheet, FilterChips, SortOptions } from "@/components/ui/FilterSheet";

type FilterKey = "all" | "active" | "ready";
type SortKey = "recent" | "stamps" | "alpha";

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function escapeCsvField(v?: string | number | null): string {
  if (v == null || v === "") return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(customers: BusinessCustomer[]) {
  const header = "Name,Email,Phone,DateOfBirth,Gender,TotalStamps,LifetimeStamps,TotalRedemptions,EnrolledAt,LastStampAt";
  const rows = customers.map((c) =>
    [
      escapeCsvField(c.fullName),
      escapeCsvField(c.email),
      escapeCsvField(c.phoneNumber),
      escapeCsvField(c.dateOfBirth ? c.dateOfBirth.split("T")[0] : ""),
      escapeCsvField(c.gender),
      c.totalStamps,
      c.lifetimeStamps,
      c.totalRedemptions,
      c.enrolledAt.split("T")[0],
      c.lastStampAt ? c.lastStampAt.split("T")[0] : "",
    ].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customers_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BusinessCustomersPage() {
  useRoleGuard("Business");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<BusinessCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(searchParams.get("search") ?? "");
  const [filter, setFilter] = useState<FilterKey>((searchParams.get("status") as FilterKey) ?? "all");
  const [sort, setSort] = useState<SortKey>((searchParams.get("sortBy") as SortKey) ?? "recent");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedQuery = useDebouncedValue(query);

  const [stampsRequired, setStampsRequired] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    businessesApi.getMine().then((biz) => {
      const req = biz.data?.loyaltyProgram?.stampsRequired ?? 0;
      setStampsRequired(req);
    });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, filter, sort]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("search", debouncedQuery);
    if (filter !== "all") params.set("status", filter);
    if (sort !== "recent") params.set("sortBy", sort);
    if (page > 1) params.set("page", String(page));
    router.replace(`/dashboard/business/customers${params.size ? `?${params}` : ""}`, { scroll: false });

    let active = true;
    setLoading(true);
    setError(null);
    businessesApi.getMyCustomers({
      search: debouncedQuery || undefined,
      status: filter === "all" ? undefined : filter,
      sortBy: sort === "alpha" ? "name" : sort,
      sortDirection: sort === "alpha" ? "asc" : "desc",
      page,
      pageSize: 25,
    }).then((response) => {
      if (!active) return;
      if (!response.success || !response.data) {
        setError(response.error?.message ?? "Could not load customers.");
        setData([]);
        return;
      }
      setData(response.data.items);
      setTotalCount(response.data.totalCount);
      setTotalPages(response.data.totalPages);
    }).catch(() => {
      if (active) setError("Could not load customers. Please try again.");
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [debouncedQuery, filter, page, router, sort]);

  return (
    <div className="max-w-xl mx-auto pb-10">

      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Customers</h1>
          <p className="text-xs text-[var(--text-tertiary)]">{totalCount} total</p>
        </div>
        <button
          onClick={() => downloadCsv(data)}
          disabled={data.length === 0}
          title="Export as CSV"
          className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-brand bg-brand-surface px-3 py-2 rounded-xl hover:bg-brand-light transition-colors disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      {/* Search bar + filter button */}
      <div className="sticky top-[57px] z-10 bg-[var(--background)] px-5 pt-3 pb-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email or phone…"
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

        {/* Active filter pills (visible when sheet is closed and filters are non-default) */}
        {(filter !== "all" || sort !== "recent") && !showFilters && (
          <div className="flex gap-1.5 flex-wrap items-center">
            {filter !== "all" && (
              <span className="inline-flex items-center gap-1 bg-brand-surface text-brand text-xs font-semibold px-2.5 py-1 rounded-full">
                {filter === "active" ? "Active" : "Reward Ready"}
                <button onClick={() => setFilter("all")} className="hover:text-brand-dark"><X className="h-3 w-3" /></button>
              </span>
            )}
            {sort !== "recent" && (
              <span className="inline-flex items-center gap-1 bg-[var(--border-light)] text-[var(--text-secondary)] text-xs font-semibold px-2.5 py-1 rounded-full">
                {sort === "stamps" ? "Top Stamps" : "A → Z"}
                <button onClick={() => setSort("recent")} className="hover:text-[var(--text-primary)]"><X className="h-3 w-3" /></button>
              </span>
            )}
            <span className="ml-auto text-[11px] text-[var(--text-tertiary)] whitespace-nowrap">
              {totalCount} result{totalCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* FilterSheet — mobile bottom sheet / desktop inline */}
      <div className="px-5">
        <FilterSheet open={showFilters} onClose={() => setShowFilters(false)} title="Filter & Sort">
          <FilterChips
            label="Status"
            options={["All", "Active", "Reward Ready"]}
            value={filter === "all" ? "All" : filter === "active" ? "Active" : "Reward Ready"}
            onChange={(v) => setFilter(v === "All" ? "all" : v === "Active" ? "active" : "ready")}
          />
          <SortOptions
            options={[
              { key: "recent", label: "Most Recent" },
              { key: "stamps", label: "Top Stamps" },
              { key: "alpha", label: "A → Z" },
            ]}
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
          />
        </FilterSheet>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
        </div>
      ) : error ? (
        <div className="mx-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card py-14 text-center">
          <p className="text-sm font-semibold text-[var(--text-secondary)] mb-3">{error}</p>
          <button onClick={() => setPage((current) => current)} className="text-xs font-semibold text-brand">Retry</button>
        </div>
      ) : data.length === 0 ? (
        <div className="mx-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card py-14 text-center">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-sm font-semibold text-[var(--text-secondary)] mb-1">No customers found</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {filter !== "all" || query
              ? "Try adjusting your filter or search"
              : "Customers will appear here once they join"}
          </p>
          {(filter !== "all" || query) && (
            <button
              onClick={() => { setFilter("all"); setQuery(""); }}
              className="mt-3 text-xs font-semibold text-brand"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="mx-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden divide-y divide-[var(--border-light)]">
          {data.map((c) => {
            const ready = stampsRequired > 0 && c.totalStamps >= stampsRequired;

            return (
              <Link
                key={c.cardId}
                href={`/dashboard/business/customers/${c.userId}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--surface-raised)] active:bg-[var(--border-light)] transition-colors"
              >
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-brand-surface flex items-center justify-center text-sm font-bold text-brand overflow-hidden flex-shrink-0">
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} className="h-full w-full object-cover" alt="" />
                  ) : (
                    c.fullName.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{c.fullName}</p>
                    {ready && <Trophy className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">{c.email}</p>
                  {(c.phoneNumber || c.gender) && (
                    <p className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">
                      {[c.phoneNumber, c.gender].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>

                {/* Stamp progress + time */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-[var(--text-primary)]">{c.totalStamps}</span>
                    {stampsRequired > 0 && (
                      <span className="text-[10px] text-[var(--text-tertiary)]">/ {stampsRequired}</span>
                    )}
                  </div>
                  {c.lastStampAt && (
                    <p className="text-[10px] text-[var(--text-tertiary)]">{timeAgo(c.lastStampAt)}</p>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="mx-5 mt-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-xs text-[var(--text-tertiary)]">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
