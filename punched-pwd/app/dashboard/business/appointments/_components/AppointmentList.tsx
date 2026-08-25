"use client";

import { Download } from "lucide-react";
import type { AppointmentResponse, BusinessCustomer, StaffMember } from "@/types";
import { exportWeekCsv } from "../_utils/appointment-utils";
import { AppointmentCard } from "./AppointmentCard";
import { AppointmentsEmptyState } from "./states";

/**
 * The "Appointments" list view: header + CSV export + card grid,
 * with the shared empty state.
 */
export function AppointmentList({
  appointments,
  customerMap,
  staffMap,
  actionLoading,
  onSelect,
  onCancel,
  onBook,
}: {
  appointments: AppointmentResponse[];
  customerMap: Map<string, BusinessCustomer>;
  staffMap: Map<string, StaffMember>;
  actionLoading: string | null;
  onSelect: (id: string) => void;
  onCancel: (id: string) => void;
  onBook: () => void;
}) {
  return (
    <section id="appointments-panel-list" role="tabpanel" aria-labelledby="appointments-tab-list">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">Appointment list</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            All appointments matching your filters
          </p>
        </div>

        <button
          onClick={() => exportWeekCsv(appointments, customerMap, staffMap)}
          disabled={appointments.length === 0}
          className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          Export week (CSV)
        </button>
      </div>

      {appointments.length === 0 ? (
        <AppointmentsEmptyState onBook={onBook} />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {appointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              customerName={
                customerMap.get(appointment.customerId)?.fullName ?? "Guest"
              }
              staffName={
                appointment.staffUserId
                  ? staffMap.get(appointment.staffUserId)?.fullName ??
                    "Assigned staff"
                  : "Unassigned"
              }
              actionLoading={actionLoading}
              onSelect={() => onSelect(appointment.id)}
              onCancel={() => onCancel(appointment.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}