"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { AppointmentResponse } from "@/types";
import { formatPrice, getDuration, getPrice, hhmm } from "../_utils/appointment-utils";
import { Avatar, Button, StatusBadge } from "@/components/ui";

export function AppointmentCard({
  appointment,
  customerName,
  staffName,
  actionLoading,
  onSelect,
  onCancel,
}: {
  appointment: AppointmentResponse;
  customerName: string;
  staffName: string;
  actionLoading: string | null;
  onSelect: () => void;
  onCancel: () => void;
}) {
  const canCancel = ["pending", "draft", "confirmed"].includes(
    appointment.status
  );

  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-brand sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <Avatar name={customerName} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">
                {customerName}
              </h3>

              <p className="mt-1 truncate text-sm text-[var(--brand)]">
                {appointment.services?.[0]?.name ?? "Appointment"}
              </p>
            </div>

            <StatusBadge status={appointment.status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[var(--text-secondary)] sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Time</p>
              <p className="mt-1 font-medium">{hhmm(appointment.scheduledAt)}</p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Duration</p>
              <p className="mt-1 font-medium">{getDuration(appointment)} min</p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Staff</p>
              <p className="mt-1 truncate font-medium">{staffName}</p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Price</p>
              <p className="mt-1 font-medium">{formatPrice(getPrice(appointment))}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border-light)] pt-4">
        <Button size="sm" fullWidth onClick={onSelect} className="flex-1 min-h-[40px]">
          View details
        </Button>

        <Link
          href={`/dashboard/business/appointments/${appointment.id}?action=reschedule`}
          className="flex min-h-[40px] flex-1 items-center justify-center rounded-xl border border-[var(--border)] px-3 text-center text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--border-light)]"
        >
          Reschedule
        </Link>

        {canCancel && (
          <button
            onClick={onCancel}
            disabled={actionLoading === appointment.id}
            aria-label="Cancel appointment"
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--error)] hover:text-[var(--error)] disabled:opacity-50"
          >
            {actionLoading === appointment.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Cancel"
            )}
          </button>
        )}
      </div>
    </article>
  );
}