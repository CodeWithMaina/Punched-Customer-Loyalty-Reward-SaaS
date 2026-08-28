"use client";

import { RequireModule } from "@/components/modules/RequireModule";

import { useEffect, useMemo, useState } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { Plus } from "lucide-react";
import { Button, Drawer, Select } from "@/components/ui";

import { AppointmentsHeader } from "./_components/AppointmentsHeader";
import { SummaryCards } from "./_components/SummaryCards";
import { AppointmentViewTabs, type AppointmentsView } from "./_components/AppointmentViewTabs";
import {
  DATE_OPTIONS,
  PRICE_OPTIONS,
  STATUS_OPTIONS,
} from "./_components/AppointmentFilters";
import { AppointmentCalendar } from "./_components/AppointmentCalendar";
import { AppointmentList } from "./_components/AppointmentList";
import { AppointmentDetailsDrawer } from "./_components/AppointmentDetailsDrawer";
import { BookAppointmentSheet } from "./_components/BookAppointmentSheet";
import {
  AppointmentsErrorState,
  AppointmentsLoadingState,
} from "./_components/states";

import {
  useAppointmentFilterState,
  useFilteredAppointments,
} from "./_hooks/useAppointmentFilters";
import { useAppointmentCalendar } from "./_hooks/useAppointmentCalendar";
import { useAppointments } from "./_hooks/useAppointments";
import { useAppointmentActions } from "./_hooks/useAppointmentActions";

/* ============================================================
   BUSINESS APPOINTMENTS - page orchestrator.

   Responsibilities: composition + view state only. Data lives
   in hooks; UI lives in _components. Theme-aware.
   ============================================================ */

function BusinessAppointmentsPageContent() {
  useRoleGuard("Business");

  /* View state (URL-shareable: /appointments?view=list) */
  const [view, setView] = useState<AppointmentsView>("calendar");

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("view");
    if (param === "calendar" || param === "list") setView(param);
  }, []);

  const changeView = (next: AppointmentsView) => {
    setView(next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState(null, "", url.toString());
  };

  /* Filters / calendar / data / actions */
  const { filters, setQuery, setFilter, clearAll } = useAppointmentFilterState();

  const {
    weekRange,
    weekOffset,
    selectedDate,
    setSelectedDate,
    shiftWeek,
    goCurrentWeek,
  } = useAppointmentCalendar();

  const {
    appointments,
    customers,
    staff,
    services,
    loading,
    error,
    reload,
    customerMap,
    staffMap,
    counts,
  } = useAppointments({
    weekRange,
    statusFilter: filters.statusFilter,
    staffFilter: filters.staffFilter,
    customerFilter: filters.customerFilter,
    serviceFilter: filters.serviceFilter,
  });

  const { filteredAppointments, weekDayCounts } = useFilteredAppointments({
    appointments,
    filters,
    customerMap,
    staffMap,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const selectedAppointment = useMemo(
    () => appointments.find((a) => a.id === selectedId) ?? null,
    [appointments, selectedId]
  );

  const { actionLoading, handleCancel, handleAction, bookForCustomer } =
    useAppointmentActions({
      reload,
      onCompleted: () => setSelectedId(null),
    });

  if (loading) return <AppointmentsLoadingState />;

  if (error) return <AppointmentsErrorState error={error} onRetry={reload} />;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <AppointmentsHeader
        onToggleFilters={() => setFiltersOpen(true)}
        onBook={() => setBookOpen(true)}
        query={filters.query}
        onQueryChange={setQuery}
      />

      <main className="mx-auto max-w-[1600px] px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-8">
        <SummaryCards counts={counts} />

        {/* View switcher */}
        <AppointmentViewTabs view={view} onChange={changeView} />

        {view === "calendar" ? (
          <AppointmentCalendar
            appointments={filteredAppointments}
            customerMap={customerMap}
            staffMap={staffMap}
            selectedDate={selectedDate}
            selectedId={selectedId}
            onSelect={setSelectedId}
            weekStart={weekRange.start}
            weekDayCounts={weekDayCounts}
            weekOffset={weekOffset}
            onShiftWeek={shiftWeek}
            onCurrentWeek={goCurrentWeek}
            onSelectDate={setSelectedDate}
            onOpenFilters={() => setFiltersOpen(true)}
          />
        ) : (
          <AppointmentList
            appointments={filteredAppointments}
            customerMap={customerMap}
            staffMap={staffMap}
            actionLoading={actionLoading}
            onSelect={setSelectedId}
            onCancel={handleCancel}
            onBook={() => setBookOpen(true)}
          />
        )}
      </main>

      {/* Detail drawer / bottom sheet */}
      {selectedAppointment && (
        <AppointmentDetailsDrawer
          appointment={selectedAppointment}
          customer={customerMap.get(selectedAppointment.customerId)}
          staffName={
            selectedAppointment.staffUserId
              ? staffMap.get(selectedAppointment.staffUserId)?.fullName ??
                "Assigned staff"
              : "Unassigned"
          }
          actionLoading={actionLoading}
          onClose={() => setSelectedId(null)}
          onAction={(action) => handleAction(selectedAppointment.id, action)}
        />
      )}

      {/* Mobile booking button */}
      <div className="fixed bottom-5 left-4 right-4 z-20 sm:left-auto sm:right-6 sm:w-auto lg:hidden">
        <Button size="md" fullWidth className="sm:w-auto" leftIcon={<Plus className="h-5 w-5" />} onClick={() => setBookOpen(true)}>
          Book appointment
        </Button>
      </div>

      {/* Filters drawer — small right-side sliding panel */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter appointments"
        description="Narrow down the visible schedule"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={clearAll}>
              Clear filters
            </Button>

            <Button fullWidth onClick={() => setFiltersOpen(false)}>
              Apply filters
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FilterField label="Date">
            <Select fullWidth value={filters.dateFilter} onChange={(event) => setFilter("dateFilter", event.target.value)} aria-label="Filter by date">
              {DATE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Status">
            <Select fullWidth value={filters.statusFilter} onChange={(event) => setFilter("statusFilter", event.target.value)} aria-label="Filter by status">
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Price">
            <Select fullWidth value={filters.priceFilter} onChange={(event) => setFilter("priceFilter", event.target.value)} aria-label="Filter by price">
              {PRICE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Service">
            <Select fullWidth value={filters.serviceFilter} onChange={(event) => setFilter("serviceFilter", event.target.value)} aria-label="Filter by service">
              <option value="all">All services</option>

              {services.map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Staff">
            <Select fullWidth value={filters.staffFilter} onChange={(event) => setFilter("staffFilter", event.target.value)} aria-label="Filter by staff">
              <option value="all">All staff</option>

              {staff.map((member) => (
                <option key={member.userId} value={member.userId}>{member.fullName}</option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Customer">
            <Select fullWidth value={filters.customerFilter} onChange={(event) => setFilter("customerFilter", event.target.value)} aria-label="Filter by customer">
              <option value="all">All customers</option>

              {customers.map((customer) => (
                <option key={customer.userId} value={customer.userId}>{customer.fullName}</option>
              ))}
            </Select>
          </FilterField>
        </div>
      </Drawer>

      {/* Booking sheet */}
      {bookOpen && (
        <BookAppointmentSheet
          customers={customers}
          services={services}
          staff={staff}
          onClose={() => setBookOpen(false)}
          onBook={async (book) => {
            const success = await bookForCustomer(book);
            if (success) setBookOpen(false);
          }}
        />
      )}
    </div>
  );
}


/** Labeled field unit for the filter drawer. */
function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">{label}</p>
      {children}
    </div>
  );
}

export default function BusinessAppointmentsPage() {
  return (
    <RequireModule module="appointments">
      <BusinessAppointmentsPageContent />
    </RequireModule>
  );
}