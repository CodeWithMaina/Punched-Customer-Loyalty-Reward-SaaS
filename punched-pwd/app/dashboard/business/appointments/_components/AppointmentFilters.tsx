"use client";

import { Filter } from "lucide-react";
import type { BusinessCustomer, ServiceCatalogItemResponse, StaffMember } from "@/types";
import type { AppointmentFilterState } from "../_hooks/useAppointmentFilters";
import { SearchInput, Select } from "@/components/ui";

export const DATE_OPTIONS: Option[] = [
  ["upcoming", "Upcoming"],
  ["today", "Today"],
  ["all", "All dates"],
  ["past", "Past"],
];

export const STATUS_OPTIONS: Option[] = [
  ["all", "All statuses"],
  ["pending", "Pending"],
  ["confirmed", "Confirmed"],
  ["in_progress", "In progress"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["no_show", "No show"],
];

export const PRICE_OPTIONS: Option[] = [
  ["all", "Any price"],
  ["free", "Free"],
  ["under-1000", "Under KES 1,000"],
  ["1000-5000", "KES 1,000–5,000"],
  ["over-5000", "Over KES 5,000"],
];

type Option = readonly [value: string, label: string];

/** Native-select wrapper matching the shared Select API. */
function FilterSelect({
  value,
  onChange,
  options,
  label,
  fullWidth = false,
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

/**
 * Search + filter controls. Desktop shows inline selects; on mobile
 * the extra filters live in a collapsible panel below the search.
 */
export function AppointmentFilters({
  filters,
  setQuery,
  setFilter,
  clearAll,
  services,
  staff,
  customers,
  open,
}: {
  filters: AppointmentFilterState;
  setQuery: (query: string) => void;
  setFilter: (key: keyof AppointmentFilterState, value: string) => void;
  clearAll: () => void;
  services: ServiceCatalogItemResponse[];
  staff: StaffMember[];
  customers: BusinessCustomer[];
  open: boolean;
}) {
  return (
    <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex flex-col gap-3 p-3 lg:flex-row">
        <SearchInput
          value={filters.query}
          onChange={setQuery}
          placeholder="Search customer, service or staff..."
          label="Search appointments"
        />

        {/* Desktop primary filters */}
        <div className="hidden items-center gap-2 lg:flex">
          <Filter className="h-4 w-4 text-[var(--text-tertiary)]" />

          <FilterSelect value={filters.dateFilter} onChange={(value) => setFilter("dateFilter", value)} options={DATE_OPTIONS} label="Filter by date" />
          <FilterSelect value={filters.statusFilter} onChange={(value) => setFilter("statusFilter", value)} options={STATUS_OPTIONS} label="Filter by status" />
          <FilterSelect value={filters.priceFilter} onChange={(value) => setFilter("priceFilter", value)} options={PRICE_OPTIONS} label="Filter by price" />
        </div>
      </div>

      {/* Desktop secondary filters */}
      <div className="hidden border-t border-[var(--border)] px-3 py-3 lg:flex lg:items-center lg:gap-2">
        <FilterSelect
          value={filters.serviceFilter}
          onChange={(value) => setFilter("serviceFilter", value)}
          options={[
            ["all", "All services"],
            ...services.map((service) => [service.id, service.name] as const),
          ]}
          label="Filter by service"
        />

        <FilterSelect
          value={filters.staffFilter}
          onChange={(value) => setFilter("staffFilter", value)}
          options={[
            ["all", "All staff"],
            ...staff.map((member) => [member.userId, member.fullName] as const),
          ]}
          label="Filter by staff"
        />

        <FilterSelect
          value={filters.customerFilter}
          onChange={(value) => setFilter("customerFilter", value)}
          options={[
            ["all", "All customers"],
            ...customers.map((customer) => [
              customer.userId,
              customer.fullName,
            ] as const),
          ]}
          label="Filter by customer"
        />

        <button
          onClick={clearAll}
          className="ml-auto text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand)]"
        >
          Clear filters
        </button>
      </div>

      {open && (
        <MobileFilterPanel
          filters={filters}
          setFilter={setFilter}
          clearAll={clearAll}
          services={services}
          staff={staff}
          customers={customers}
        />
      )}
    </section>
  );
}

function MobileFilterPanel({
  filters,
  setFilter,
  clearAll,
  services,
  staff,
  customers,
}: {
  filters: AppointmentFilterState;
  setFilter: (key: keyof AppointmentFilterState, value: string) => void;
  clearAll: () => void;
  services: ServiceCatalogItemResponse[];
  staff: StaffMember[];
  customers: BusinessCustomer[];
}) {
  return (
    <div className="grid gap-3 border-t border-[var(--border)] p-3 lg:hidden">
      <FilterSelect fullWidth value={filters.dateFilter} onChange={(value) => setFilter("dateFilter", value)} options={DATE_OPTIONS} label="Filter by date" />
      <FilterSelect fullWidth value={filters.statusFilter} onChange={(value) => setFilter("statusFilter", value)} options={STATUS_OPTIONS} label="Filter by status" />
      <FilterSelect
        fullWidth
        value={filters.serviceFilter}
        onChange={(value) => setFilter("serviceFilter", value)}
        options={[
          ["all", "All services"],
          ...services.map((service) => [service.id, service.name] as const),
        ]}
        label="Filter by service"
      />
      <FilterSelect
        fullWidth
        value={filters.staffFilter}
        onChange={(value) => setFilter("staffFilter", value)}
        options={[
          ["all", "All staff"],
          ...staff.map((member) => [member.userId, member.fullName] as const),
        ]}
        label="Filter by staff"
      />
      <FilterSelect
        fullWidth
        value={filters.customerFilter}
        onChange={(value) => setFilter("customerFilter", value)}
        options={[
          ["all", "All customers"],
          ...customers.map((customer) => [customer.userId, customer.fullName] as const),
        ]}
        label="Filter by customer"
      />
      <FilterSelect fullWidth value={filters.priceFilter} onChange={(value) => setFilter("priceFilter", value)} options={PRICE_OPTIONS} label="Filter by price" />

      <button
        onClick={clearAll}
        className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
      >
        Clear filters
      </button>
    </div>
  );
}
