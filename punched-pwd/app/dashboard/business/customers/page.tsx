"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { businessesApi } from "@/lib/api/businesses";
import type {
  BusinessCustomer, CustomerOverviewResponse,
} from "@/types";
import {
  ChevronLeft, Download, Search,
} from "lucide-react";
import { EmptyState, ErrorState, SearchInput } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { Pagination } from "@/components/ui/Pagination";
import { CustomerOverview } from "./_components/CustomerOverview";
import { CustomerCard, CustomerCardSkeleton } from "./_components/CustomerCard";
import {
  CustomerFilterDrawer, CustomerFilterChips, CustomerFilterTrigger,
} from "./_components/CustomerFilterDrawer";
import {
  cycleSort, parseCustomerListState, sortLabel, customerListStateToParams,
  type CustomerListFilters, type CustomerListState,
} from "./_components/filters";

const PAGE_SIZE = 25;

const SORT_OPTIONS: { key: CustomerListState["sortBy"]; label: string }[] = [
  { key: "recent", label: "Most recent" },
  { key: "stamps", label: "Top stamps" },
  { key: "name", label: "Name" },
];

function escapeCsvField(v?: string | number | null): string {
  if (v == null || v === "") return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(customers: BusinessCustomer[]) {
  const header =
    "Name,Email,Phone,DateOfBirth,Gender,TotalStamps,LifetimeStamps,TotalRedemptions,EnrolledAt,LastStampAt";
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

  // URL-mirrored list state (shareable / refresh-safe).
  const [state, setState] = useState<CustomerListState>(() =>
    parseCustomerListState(Object.fromEntries(searchParams.entries()))
  );
  const [searchInput, setSearchInput] = useState(state.search);
  const debouncedSearch = useDebouncedValue(searchInput);

  const [view, setView] = useState<"overview" | "roster">("overview");

  const [items, setItems] = useState<BusinessCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<CustomerOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Filter drawer draft state.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<CustomerListFilters>({
    status: state.status,
    enrolledFrom: state.enrolledFrom,
    enrolledTo: state.enrolledTo,
  });

  // Debounce the committed search state.
  useEffect(() => {
    setState((s) => (s.search === debouncedSearch ? s : { ...s, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // Mirror committed state into the URL.
  useEffect(() => {
    const qs = new URLSearchParams(customerListStateToParams(state)).toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [state, router]);

  const activeFilterCount =
    Number(Boolean(state.status)) +
    Number(Boolean(state.enrolledFrom)) +
    Number(Boolean(state.enrolledTo));
  const fetchCustomers = useCallback((s: CustomerListState) => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    businessesApi
      .getMyCustomers({
        search: s.search || undefined,
        status: s.status,
        enrolledFrom: s.enrolledFrom,
        enrolledTo: s.enrolledTo,
        sortBy: s.sortBy,
        sortDirection: s.sortDirection,
        page: s.page,
        pageSize: PAGE_SIZE,
      })
      .then((res) => {
        if (!cancelled) {
          if (res.success && res.data) {
            setItems(res.data.items);
            setTotal(res.data.totalCount);
            setTotalPages(Math.max(1, Math.ceil(res.data.totalCount / PAGE_SIZE)));
          } else {
            setError(res.error?.message ?? "Could not load customers.");
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load customers. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => fetchCustomers(state), [state, fetchCustomers]);

  const fetchOverview = useCallback(() => {
    setOverviewLoading(true);
    businessesApi
      .getCustomerOverview()
      .then((res) => res.success && res.data && setOverview(res.data))
      .catch(() => undefined)
      .finally(() => setOverviewLoading(false));
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const patchState = (patch: Partial<CustomerListState>) =>
    setState((s) => ({ ...s, ...patch }));

  const applyDraftFilters = () => {
    patchState({ ...draftFilters, page: 1 });
    setFiltersOpen(false);
  };

  const clearAllFilters = () => {
    const cleared: CustomerListFilters = {
      status: undefined,
      enrolledFrom: undefined,
      enrolledTo: undefined,
    };
    setDraftFilters(cleared);
    patchState({ ...cleared, page: 1 });
  };

  const removeFilter = (key: keyof CustomerListFilters) => {
    setDraftFilters((d) => ({ ...d, [key]: undefined }));
    patchState({ [key]: undefined, page: 1 } as Partial<CustomerListState>);
  };

  const hasAnyFilter =
    Boolean(state.search) ||
    Boolean(state.status) ||
    Boolean(state.enrolledFrom) ||
    Boolean(state.enrolledTo);
return (
    <div className="max-w-xl lg:max-w-4xl mx-auto pb-10">
      {/* Header */}
      <header className="px-5 pt-6 pb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1 flex items-center gap-1.5">
            <Link href="/dashboard/business" aria-label="Back to business dashboard" className="hover:text-brand inline-flex">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
            Customer Relationships
          </p>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Customers</h1>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            Your loyalty base, their progress and who needs attention.
          </p>
        </div>
        <button
          onClick={() => downloadCsv(items)}
          disabled={items.length === 0}
          title="Export current page as CSV"
          aria-label="Export customers as CSV"
          className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-brand bg-brand-surface px-3 py-2 rounded-xl hover:bg-brand-light transition-colors disabled:opacity-40 min-h-[36px]"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </header>

      {/* View switcher */}
      <div className="px-5 pt-2">
        <Tabs
          label="Customer views"
          idPrefix="cust-view"
          value={view}
          onChange={setView}
          items={[
            { value: "overview", label: "Overview" },
            { value: "roster", label: "All customers" },
          ]}
          className="w-full sm:w-auto"
        />
      </div>

      {view === "overview" ? (
        <>
          <CustomerOverview overview={overview} isLoading={overviewLoading} />
          {overview && overview.totalCustomers > 0 && (
            <div className="mx-5 mt-5">
              <button
                onClick={() => setView("roster")}
                className="w-full rounded-2xl border border-brand/40 bg-brand-surface text-brand text-xs font-semibold px-4 py-3 transition-colors hover:bg-brand-light"
              >
                View all {overview.totalCustomers} customer{overview.totalCustomers !== 1 ? "s" : ""}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Search + filter trigger */}
          <div className="sticky top-[57px] z-10 bg-[var(--background)] px-5 pt-3 pb-3 space-y-3">
            <div className="flex gap-2">
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search by name, email or phone…"
                label="Search customers"
              />
              <CustomerFilterTrigger
                count={activeFilterCount}
                active={filtersOpen}
                onClick={() => {
                  setDraftFilters({
                    status: state.status,
                    enrolledFrom: state.enrolledFrom,
                    enrolledTo: state.enrolledTo,
                  });
                  setFiltersOpen(true);
                }}
              />
            </div>

            {/* Active filter chips / sort pills + result count */}
            <div className="flex flex-wrap items-center gap-2 min-h-[24px]">
              {hasAnyFilter ? (
                <CustomerFilterChips applied={state} onRemove={removeFilter} onClearAll={clearAllFilters} />
              ) : (
                <SortPills state={state} onCycle={(key) => patchState(cycleSort(state, key))} />
              )}
              <span
                className="ml-auto text-[11px] text-[var(--text-tertiary)] whitespace-nowrap tabular-nums"
                aria-live="polite"
              >
                {isLoading ? "…" : `${total} result${total !== 1 ? "s" : ""}`}
              </span>
            </div>
          </div>
{/* Advanced filters: mobile bottom sheet → desktop right drawer */}
          <CustomerFilterDrawer
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            draft={draftFilters}
            onDraftChange={setDraftFilters}
            onApply={applyDraftFilters}
            onClear={clearAllFilters}
          />

          {/* Roster */}
          {error ? (
            <ErrorState message={error} onRetry={() => fetchCustomers(state)} />
          ) : isLoading ? (
            <div className="mx-5 rounded-2xl border border-[var(--border-light)] divide-y divide-[var(--border-light)] overflow-hidden" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <CustomerCardSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="mx-5 mt-4">
              <EmptyState
                icon={<Search className="h-6 w-6" />}
                title={state.search ? "No customers match your search." : "No customers match these filters."}
                description={
                  hasAnyFilter
                    ? "Try removing a filter or clearing your search."
                    : "Customers will appear here once they join your loyalty program."
                }
                action={
                  hasAnyFilter ? (
                    <button
                      onClick={() => {
                        setSearchInput("");
                        clearAllFilters();
                      }}
                      className="mt-1 px-4 py-2.5 rounded-xl border border-brand text-brand text-xs font-semibold hover:bg-brand-surface transition-colors"
                    >
                      Clear search &amp; filters
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              <div className="mx-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {items.map((c: BusinessCustomer, index: number) => (
                  <CustomerCard
                    key={c.cardId}
                    customer={c}
                    rank={(state.page - 1) * PAGE_SIZE + index + 1}
                    showRank={state.sortBy === "stamps" && state.sortDirection === "desc"}
                  />
                ))}
              </div>
              <div className="mx-5 mt-3 rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] shadow-card overflow-hidden">
                <Pagination
                  page={state.page}
                  totalPages={totalPages}
                  total={total}
                  noun="customer"
                  onChange={(page) => patchState({ page })}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/** Compact sort selector shown when no filters are applied. */
function SortPills({
  state,
  onCycle,
}: {
  state: CustomerListState;
  onCycle: (key: CustomerListState["sortBy"]) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onCycle(opt.key)}
          aria-pressed={state.sortBy === opt.key}
          title={state.sortBy === opt.key ? `Current: ${sortLabel(state)} — tap to flip` : undefined}
          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
            state.sortBy === opt.key
              ? "bg-[var(--text-primary)] text-[var(--surface)] border-[var(--text-primary)]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-brand"
          }`}
        >
          {opt.label}
          {state.sortBy === opt.key && <span aria-hidden>{state.sortDirection === "asc" ? "↑" : "↓"}</span>}
        </button>
      ))}
    </div>
  );
}
