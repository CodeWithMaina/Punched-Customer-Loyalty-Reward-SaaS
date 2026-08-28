"use client";

import { RequireModule } from "@/components/modules/RequireModule";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download, Eye, SlidersHorizontal,
} from "lucide-react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { businessesApi } from "@/lib/api/businesses";
import type {
  BusinessCustomer, CustomerOverviewResponse,
} from "@/types";
import {
  ActionMenu, Button, Pagination, SearchInput, Select,
} from "@/components/ui";
import { CustomerSummaryCards } from "./_components/CustomerOverview";
import {
  CustomerCard, CustomerItemSkeleton, CustomerRow,
} from "./_components/CustomerCard";
import { CustomersRosterEmptyState } from "./_components/states";
import {
  cycleSort, parseCustomerListState, sortLabel, customerListStateToParams,
  type CustomerListState,
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

function BusinessCustomersPageContent() {
  useRoleGuard("Business");
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-mirrored list state (shareable / refresh-safe).
  const [state, setState] = useState<CustomerListState>(() =>
    parseCustomerListState(Object.fromEntries(searchParams.entries()))
  );
  const [searchInput, setSearchInput] = useState(state.search);
  const debouncedSearch = useDebouncedValue(searchInput);

  const [items, setItems] = useState<BusinessCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<CustomerOverviewResponse | null>(null);

  // Mobile collapsible filter panel.
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Debounce the committed search state.
  useEffect(() => {
    setState((s) => (s.search === debouncedSearch ? s : { ...s, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // Mirror committed state into the URL.
  useEffect(() => {
    const qs = new URLSearchParams(customerListStateToParams(state)).toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [state, router]);

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
    businessesApi
      .getCustomerOverview()
      .then((res) => res.success && res.data && setOverview(res.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const patchState = (patch: Partial<CustomerListState>) =>
    setState((s) => ({ ...s, ...patch }));

  const clearAllFilters = () => {
    setSearchInput("");
    patchState({ status: undefined, enrolledFrom: undefined, enrolledTo: undefined, page: 1 });
  };

  const activeFilterCount =
    Number(Boolean(state.status)) +
    Number(Boolean(state.enrolledFrom)) +
    Number(Boolean(state.enrolledTo));
  const hasAnyFilter =
    Boolean(state.search) ||
    Boolean(state.status) ||
    Boolean(state.enrolledFrom) ||
    Boolean(state.enrolledTo);

  /** Contextual ⋮ actions for one customer. */
  const menuFor = (customer: BusinessCustomer) => (
    <ActionMenu
      label={`Actions for ${customer.fullName}`}
      items={[
        { label: "View details", icon: <Eye className="h-3.5 w-3.5" />, href: `/dashboard/business/customers/${customer.userId}` },
      ]}
    />
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      {/* ── Sticky Action Header + database search ──────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div className="mx-auto max-w-[1600px] space-y-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">Customers</h1>

              <p className="hidden text-xs text-[var(--text-secondary)] sm:block">
                Track loyalty activity across your customer base
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile filter toggle with active-filter count */}
              <button
                onClick={() => setFiltersOpen((value) => !value)}
                aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
                aria-expanded={filtersOpen}
                className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition-colors hover:border-brand hover:text-brand md:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />

                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <Button
                size="sm"
                variant="outline"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => downloadCsv(items)}
                disabled={items.length === 0}
              >
                <span className="hidden sm:inline">Export</span>
                <span className="sr-only">Export customers as CSV</span>
              </Button>
            </div>
          </div>

          {/* Server-backed search — always visible in the sticky header */}
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by name, email or phone…"
            label="Search customers"
            className="md:max-w-xl"
          />
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-5 pb-16 sm:px-6 lg:px-8 lg:py-8">
        {/* ── Overview stat cards (merged into this page) ────────────── */}
        <CustomerSummaryCards overview={overview} isLoading={overview === null} />

        {/* ── Filter bar (search lives in the sticky header) ─────────── */}
        <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
          {/* Desktop inline filters + sort */}
          <div className="hidden flex-wrap items-center gap-2 p-3 md:flex">
            <Select
              value={state.status ?? ""}
              onChange={(event) => patchState({ status: (event.target.value || undefined) as CustomerListState["status"], page: 1 })}
              label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="ready">Ready to redeem</option>
            </Select>

            {activeFilterCount > 0 && (
              <button
                onClick={() => patchState({ enrolledFrom: undefined, enrolledTo: undefined, page: 1 })}
                className="text-xs font-semibold text-[var(--text-secondary)] hover:text-brand"
              >
                Clear filters
              </button>
            )}

            {/* Sort pills double as the desktop sort control */}
            <div className="ml-auto border-l border-[var(--border-light)] pl-3">
              <SortPills state={state} onCycle={(key) => patchState(cycleSort(state, key))} />
            </div>
          </div>

          {/* Mobile collapsible filter panel */}
          {filtersOpen && (
            <div className="grid gap-3 border-t border-[var(--border)] p-3 md:hidden">
              <Select
                fullWidth
                value={state.status ?? ""}
                onChange={(event) => patchState({ status: (event.target.value || undefined) as CustomerListState["status"], page: 1 })}
                label="Filter by status"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="ready">Ready to redeem</option>
              </Select>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">
                  Enrolled from
                </span>

                <input
                  type="date"
                  value={state.enrolledFrom ?? ""}
                  onChange={(event) => patchState({ enrolledFrom: event.target.value || undefined, page: 1 })}
                  aria-label="Enrolled from"
                  className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-[var(--brand-ring)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">
                  Enrolled to
                </span>

                <input
                  type="date"
                  value={state.enrolledTo ?? ""}
                  onChange={(event) => patchState({ enrolledTo: event.target.value || undefined, page: 1 })}
                  aria-label="Enrolled to"
                  className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-[var(--brand-ring)]"
                />
              </label>

              <div className="flex flex-wrap gap-1.5">
                <SortPills state={state} onCycle={(key) => patchState(cycleSort(state, key))} />
              </div>

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

        {/* ── Roster: clickable rows (≥md) / user cards (<md) ─────────── */}
        {error ? (
          <div className="py-10">
            <ErrorInline message={error} onRetry={() => fetchCustomers(state)} />
          </div>
        ) : isLoading && items.length === 0 ? (
          <div
            className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]"
            aria-busy="true"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="border-b border-[var(--border-light)] last:border-b-0">
                <CustomerItemSkeleton variant="row" />
                <CustomerItemSkeleton variant="card" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <CustomersRosterEmptyState hasAnyFilter={hasAnyFilter} onClear={clearAllFilters} />
        ) : (
          <>
            {/* Desktop: bordered surface of clickable rows with ⋮ actions */}
            <div className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] md:block">
              {items.map((customer, index) => (
                <CustomerRow
                  key={customer.cardId ?? customer.userId}
                  customer={customer}
                  rank={(state.page - 1) * PAGE_SIZE + index + 1}
                  showRank={state.sortBy === "stamps" && state.sortDirection === "desc"}
                  menu={menuFor(customer)}
                />
              ))}
            </div>

            {/* Mobile: stacked user cards with ⋮ actions */}
            <div className="grid gap-3 md:hidden">
              {items.map((customer, index) => (
                <CustomerCard
                  key={customer.cardId ?? customer.userId}
                  customer={customer}
                  rank={(state.page - 1) * PAGE_SIZE + index + 1}
                  showRank={state.sortBy === "stamps" && state.sortDirection === "desc"}
                  menu={menuFor(customer)}
                />
              ))}
            </div>

            {/* Shared pager */}
            <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
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
      </main>
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
    <div className="flex flex-wrap gap-1.5">
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onCycle(opt.key)}
          aria-pressed={state.sortBy === opt.key}
          title={state.sortBy === opt.key ? `Current: ${sortLabel(state)} — tap to flip` : undefined}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            state.sortBy === opt.key
              ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--surface)]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-brand"
          }`}
        >
          {opt.label}

          {state.sortBy === opt.key && (
            <span aria-hidden>{state.sortDirection === "asc" ? "↑" : "↓"}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Inline error for a failed roster fetch (retryable). */
function ErrorInline({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
      <h3 className="text-sm font-bold">Could not load customers</h3>

      <p className="mx-auto max-w-sm text-xs leading-5 text-[var(--text-secondary)]">{message}</p>

      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export default function BusinessCustomersPage() {
  return (
    <RequireModule module="customers">
      <BusinessCustomersPageContent />
    </RequireModule>
  );
}