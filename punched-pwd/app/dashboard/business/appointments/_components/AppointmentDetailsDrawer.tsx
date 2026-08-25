"use client";

import Link from "next/link";
import { CalendarDays, Circle, Clock, Users } from "lucide-react";
import type { AppointmentResponse, BusinessCustomer } from "@/types";
import {
  formatPrice,
  getDuration,
  getPrice,
  hhmm,
  shortDate,
} from "../_utils/appointment-utils";
import { Avatar, Button, Drawer, StatusBadge } from "@/components/ui";

/**
 * Appointment details: bottom sheet on mobile, side drawer on
 * desktop. Composed from shared UI primitives.
 */
export function AppointmentDetailsDrawer({
  appointment,
  customer,
  staffName,
  actionLoading,
  onClose,
  onAction,
}: {
  appointment: AppointmentResponse;
  customer?: BusinessCustomer;
  staffName: string;
  actionLoading: string | null;
  onClose: () => void;
  onAction: (
    action: "complete" | "no-show" | "confirm" | "cancel"
  ) => void;
}) {
  const duration = getDuration(appointment);
  const busy = actionLoading === appointment.id;

  return (
    <Drawer open onClose={onClose} title="Appointment details" size="lg">
      <div className="space-y-6">
        {/* Customer */}
        <div className="flex items-center gap-4 rounded-[var(--radius-lg)] bg-[var(--background)] p-4">
          <Avatar
            name={customer?.fullName ?? "Guest"}
            src={customer?.avatarUrl}
            size="lg"
          />

          <div className="min-w-0">
            <p className="truncate font-bold">{customer?.fullName ?? "Guest"}</p>

            <p className="mt-1 text-xs text-[var(--text-secondary)]">Customer</p>
          </div>
        </div>

        {/* Status */}
        <div>
          <StatusBadge status={appointment.status} />
        </div>

        {/* Details */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]">
          <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="Date" value={shortDate(appointment.scheduledAt)} />
          <DetailRow icon={<Clock className="h-4 w-4" />} label="Time" value={`${hhmm(appointment.scheduledAt)} - ${hhmm(appointment.endAt)}`} />
          <DetailRow icon={<Clock className="h-4 w-4" />} label="Duration" value={`${duration} minutes`} />
          <DetailRow icon={<Circle className="h-4 w-4" />} label="Service" value={appointment.services?.[0]?.name ?? "Appointment"} />
          <DetailRow icon={<Users className="h-4 w-4" />} label="Staff" value={staffName} />
          <DetailRow icon={<span className="text-xs font-bold">KES</span>} label="Price" value={formatPrice(getPrice(appointment))} last />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {(appointment.status === "pending" ||
            appointment.status === "draft") && (
            <Button fullWidth onClick={() => onAction("confirm")} disabled={busy} isLoading={busy}>
              Confirm appointment
            </Button>
          )}

          {appointment.status === "confirmed" && (
            <>
              <Button variant="success" fullWidth onClick={() => onAction("complete")} disabled={busy} isLoading={busy}>
                Mark completed
              </Button>

              <Button variant="outline" fullWidth onClick={() => onAction("no-show")} disabled={busy}>
                Mark no-show
              </Button>
            </>
          )}

          <Link
            href={`/dashboard/business/appointments/${appointment.id}`}
            className="flex h-12 w-full items-center justify-center rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--border-light)]"
          >
            Open appointment
          </Link>

          {!['completed', 'cancelled', 'no_show'].includes(appointment.status) && (
            <button
              onClick={() => onAction("cancel")}
              disabled={busy}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-[var(--error)] hover:bg-red-50 disabled:opacity-50"
            >
              Cancel appointment
            </button>
          )}
        </div>
      </div>
    </Drawer>
  );
}

function DetailRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3 ${
        !last ? "border-b border-[var(--border-light)]" : ""
      }`}
    >
      <div className="flex items-center gap-3 text-[var(--text-secondary)]">
        {icon}

        <span className="text-xs font-medium">{label}</span>
      </div>

      <span className="max-w-[55%] truncate text-right text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

