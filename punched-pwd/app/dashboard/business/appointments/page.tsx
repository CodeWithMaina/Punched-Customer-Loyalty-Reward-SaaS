"use client";

import { useEffect, useMemo, useState } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";

import { AppointmentsHeader } from "./_components/AppointmentsHeader";
import { SummaryCards } from "./_components/SummaryCards";
import { AppointmentViewTabs, type AppointmentsView } from "./_components/AppointmentViewTabs";
import { AppointmentFilters } from "./_components/AppointmentFilters";
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

export default function BusinessAppointmentsPage() {
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
    goToToday,
    shiftDay,
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
        onToggleFilters={() => setFiltersOpen((value) => !value)}
        onBook={() => setBookOpen(true)}
      />

      <main className="mx-auto max-w-[1600px] px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-8">
        <SummaryCards counts={counts} />

        {/* View switcher */}
        <AppointmentViewTabs view={view} onChange={changeView} />

        {/* Search + filters */}
        <AppointmentFilters
          filters={filters}
          setQuery={setQuery}
          setFilter={setFilter}
          clearAll={clearAll}
          services={services}
          staff={staff}
          customers={customers}
          open={filtersOpen}
        />

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
            onToday={goToToday}
            onShiftDay={shiftDay}
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

